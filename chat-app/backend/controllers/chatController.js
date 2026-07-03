const Message = require("../models/Message");
const User = require("../models/User");

// GET /api/chat/:userId - get conversation between two users
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId },
      ],
      deletedFor: { $ne: myId },
    })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar")
      .populate("replyTo", "text sender fileType")
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { sender: userId, receiver: myId, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/chat/send - send a message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, replyTo } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check if receiver blocked sender
    let isBlockedByReceiver = false;
    if (receiverUser.blockedUsers.includes(senderId)) {
      isBlockedByReceiver = true;
    }

    // If sender blocked receiver, we should still throw an error (WhatsApp prevents you from sending)
    const me = await User.findById(senderId);
    if (me.blockedUsers.includes(receiverId)) {
      return res.status(403).json({ message: "You have blocked this user. Unblock to send message." });
    }

    let messageData = {
      sender: senderId,
      receiver: receiverId,
      text: text || "",
      replyTo: replyTo || null,
      deletedFor: isBlockedByReceiver ? [receiverId] : [], // Silent drop for receiver
    };

    if (req.file) {
      messageData.fileUrl = req.file.path;
      messageData.messageType = "file";
      const mime = req.file.mimetype;
      if (mime.startsWith("image")) messageData.fileType = "image";
      else if (mime.startsWith("video")) messageData.fileType = "video";
      else if (mime.startsWith("audio")) messageData.fileType = "audio";
      else if (mime === "application/pdf") messageData.fileType = "pdf";
      else messageData.fileType = "doc";
    }

    const message = await Message.create(messageData);
    const populated = await message.populate([
      { path: "sender", select: "name avatar" },
      { path: "receiver", select: "name avatar" },
      { path: "replyTo", select: "text sender fileType" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/chat/message/:id
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Mark as deleted for everyone if sender
    if (message.sender.toString() === req.user._id.toString()) {
      message.deleted = true;
      message.text = "This message was deleted";
      message.fileUrl = "";
      message.messageType = "text";
      await message.save();
    } else {
      // Just delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/chat/recent - get recent chats list with last message
const getRecentChats = async (req, res) => {
  try {
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [{ sender: myId }, { receiver: myId }],
      group: { $exists: false },
      deletedFor: { $ne: myId },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar status lastSeen")
      .populate("receiver", "name avatar status lastSeen");

    // Build unique chats map
    const chatMap = new Map();
    for (const msg of messages) {
      const other =
        msg.sender._id.toString() === myId.toString()
          ? msg.receiver
          : msg.sender;

      if (!other) continue;
      const otherId = other._id.toString();

      if (!chatMap.has(otherId)) {
        const unread = await Message.countDocuments({
          sender: other._id,
          receiver: myId,
          isRead: false,
        });
        chatMap.set(otherId, {
          user: other,
          lastMessage: msg,
          unreadCount: unread,
        });
      }
    }

    res.json(Array.from(chatMap.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/chat/read/:userId
const markAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getConversation,
  sendMessage,
  deleteMessage,
  getRecentChats,
  markAsRead,
};
