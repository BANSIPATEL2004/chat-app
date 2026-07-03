import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { getReceiverSocketId } from "../socket/socketManager.js";
import { getIO } from "../socket/socketManager.js";

// Helper: Get or create conversation
const getOrCreateConversation = async (userId1, userId2) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [userId1, userId2] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId1, userId2],
      unreadCount: { [userId1]: 0, [userId2]: 0 },
    });
  }

  return conversation;
};

// @desc    Send a message
// @route   POST /api/messages/send/:receiverId
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { content, messageType = "text", replyTo = null } = req.body;
    const { receiverId } = req.params;
    const senderId = req.user._id;

    if (!content || content.trim() === "") {
      return sendError(res, 400, "Message content cannot be empty.");
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return sendError(res, 404, "Receiver not found.");
    }

    // Create message
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content: content.trim(),
      messageType,
      replyTo,
      isDelivered: !!getReceiverSocketId(receiverId.toString()),
      deliveredAt: !!getReceiverSocketId(receiverId.toString()) ? new Date() : null,
    });

    await message.populate("sender", "username avatar");
    await message.populate("receiver", "username avatar");
    if (replyTo) {
      await message.populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      });
    }

    // Update conversation
    const conversation = await getOrCreateConversation(senderId, receiverId);

    // Increment unread for receiver
    const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
    conversation.lastMessage = message._id;
    await conversation.save();

    // Emit to receiver via socket if online
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
      io.to(receiverSocketId).emit("updateConversation", {
        senderId: senderId.toString(),
        lastMessage: message,
      });
    }

    return sendSuccess(res, 201, "Message sent successfully.", { message });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message to group
// @route   POST /api/messages/send/group/:groupId
// @access  Private
export const sendGroupMessage = async (req, res, next) => {
  try {
    const { content, messageType = "text", replyTo = null } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return sendError(res, 404, "Group not found.");

    const message = await Message.create({
      sender: senderId,
      group: groupId,
      content: content.trim(),
      messageType,
      replyTo,
    });

    await message.populate("sender", "username avatar");
    if (replyTo) {
      await message.populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      });
    }

    group.lastMessage = message._id;
    await group.save();

    // Emit to all group members
    const io = getIO();
    group.members.forEach(memberId => {
      if (memberId.toString() !== senderId.toString()) {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", { groupId, message });
        }
      }
    });

    return sendSuccess(res, 201, "Group message sent.", { message });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      isDeleted: false,
    })
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { sender: userId, receiver: myId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count in conversation
    const conversation = await Conversation.findOne({
      participants: { $all: [myId, userId] },
    });
    if (conversation) {
      conversation.unreadCount.set(myId.toString(), 0);
      await conversation.save();
    }

    // Notify sender that messages were read via socket
    const io = getIO();
    const senderSocketId = getReceiverSocketId(userId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { by: myId.toString() });
    }

    return sendSuccess(res, 200, "Messages fetched successfully.", {
      messages: messages.reverse(),
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group messages
// @route   GET /api/messages/group/:groupId
// @access  Private
export const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      group: groupId,
      isDeleted: false,
    })
      .populate("sender", "username avatar")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "username" }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return sendSuccess(res, 200, "Group messages fetched.", {
      messages: messages.reverse(),
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for logged-in user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const myId = req.user._id;

    const conversations = await Conversation.find({
      participants: myId,
    })
      .populate("participants", "username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username" },
      })
      .sort({ updatedAt: -1 });

    // Shape response: exclude self from participants
    const shaped = conversations.map((conv) => {
      const other = conv.participants.find(
        (p) => p._id.toString() !== myId.toString()
      );
      return {
        _id: conv._id,
        user: other,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount.get(myId.toString()) || 0,
        updatedAt: conv.updatedAt,
      };
    });

    return sendSuccess(res, 200, "Conversations fetched.", { conversations: shaped });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return sendError(res, 404, "Message not found.");

    if (message.sender.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "You can only delete your own messages.");
    }

    message.isDeleted = true;
    message.content = "This message was deleted";
    await message.save();

    const io = getIO();
    const receiverSocketId = message.receiver ? getReceiverSocketId(message.receiver.toString()) : null;
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId: message._id });
    } else if (message.group) {
      // Notify group members
      const group = await Group.findById(message.group);
      if (group) {
        group.members.forEach(memberId => {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) io.to(socketId).emit("messageDeleted", { messageId: message._id });
        });
      }
    }

    return sendSuccess(res, 200, "Message deleted.", { message });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all messages in a conversation or group
// @route   DELETE /api/messages/clear/:id?type=user|group
// @access  Private
export const clearChat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const myId = req.user._id;

    const query = type === "group" 
      ? { group: id }
      : { 
          $or: [
            { sender: myId, receiver: id },
            { sender: id, receiver: myId },
          ]
        };

    // Soft delete all messages
    await Message.updateMany(query, { 
      isDeleted: true, 
      content: "This message was deleted" 
    });

    return sendSuccess(res, 200, "Chat cleared successfully.");
  } catch (error) {
    next(error);
  }
};

export const toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return sendError(res, 404, "Message not found.");

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Remove reaction if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    await message.populate("reactions.user", "username avatar");

    // Notify others via socket
    const io = getIO();
    const targetId = message.group || (message.sender.toString() === userId.toString() ? message.receiver : message.sender);
    
    if (message.group) {
      const group = await Group.findById(message.group);
      group.members.forEach(memberId => {
        const socketId = getReceiverSocketId(memberId.toString());
        if (socketId) io.to(socketId).emit("reactionUpdate", { messageId, reactions: message.reactions });
      });
    } else {
      const receiverSocketId = getReceiverSocketId(targetId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("reactionUpdate", { messageId, reactions: message.reactions });
    }

    return sendSuccess(res, 200, "Reaction toggled.", { reactions: message.reactions });
  } catch (error) {
    next(error);
  }
};


