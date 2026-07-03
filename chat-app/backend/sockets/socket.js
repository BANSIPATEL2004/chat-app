const User = require("../models/User");

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // User comes online
    socket.on("setup", async (userId) => {
      socket.join(userId);
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);

      // Update user status in DB
      await User.findByIdAndUpdate(userId, { status: "online" });

      // Broadcast online status
      socket.broadcast.emit("user-online", userId);
      io.emit("online-users", Array.from(onlineUsers.keys()));
    });

    // One-to-one message
    socket.on("send-message", async (data) => {
      const { receiverId, message } = data;
      const receiver = await User.findById(receiverId);
      if (receiver && !receiver.blockedUsers.includes(socket.userId)) {
        io.to(receiverId).emit("receive-message", message);
      }
    });

    // Group message
    socket.on("send-group-message", (data) => {
      const { groupId, message, memberIds } = data;
      memberIds.forEach((memberId) => {
        if (memberId !== socket.userId) {
          io.to(memberId).emit("receive-group-message", { groupId, message });
        }
      });
    });

    // Typing indicators
    socket.on("typing", async ({ receiverId, senderName }) => {
      const receiver = await User.findById(receiverId);
      if (receiver && !receiver.blockedUsers.includes(socket.userId)) {
        io.to(receiverId).emit("typing", { senderId: socket.userId, senderName });
      }
    });

    socket.on("stop-typing", ({ receiverId }) => {
      io.to(receiverId).emit("stop-typing", { senderId: socket.userId });
    });

    socket.on("group-typing", ({ groupId, senderName, memberIds }) => {
      memberIds.forEach((memberId) => {
        if (memberId !== socket.userId) {
          io.to(memberId).emit("group-typing", {
            groupId,
            senderId: socket.userId,
            senderName,
          });
        }
      });
    });

    socket.on("group-stop-typing", ({ groupId, memberIds }) => {
      memberIds.forEach((memberId) => {
        if (memberId !== socket.userId) {
          io.to(memberId).emit("group-stop-typing", {
            groupId,
            senderId: socket.userId,
          });
        }
      });
    });

    // Read receipts
    socket.on("message-read", ({ senderId, receiverId }) => {
      io.to(senderId).emit("message-read", { receiverId });
    });

    // Reactions
    socket.on("message-reaction", ({ messageId, receiverId, groupId, memberIds, reactions }) => {
      if (groupId && memberIds) {
        memberIds.forEach((memberId) => {
          if (memberId !== socket.userId) {
            io.to(memberId).emit("message-reaction", { messageId, groupId, reactions });
          }
        });
      } else if (receiverId) {
        io.to(receiverId).emit("message-reaction", { messageId, reactions });
      }
    });

    // Message Deleted
    socket.on("message-deleted", ({ message, receiverId, groupId, memberIds }) => {
      if (groupId && memberIds) {
        memberIds.forEach((memberId) => {
          if (memberId !== socket.userId) {
            io.to(memberId).emit("message-deleted", { message, groupId });
          }
        });
      } else if (receiverId) {
        io.to(receiverId).emit("message-deleted", { message });
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        await User.findByIdAndUpdate(socket.userId, {
          status: "offline",
          lastSeen: new Date(),
        });
        socket.broadcast.emit("user-offline", socket.userId);
        io.emit("online-users", Array.from(onlineUsers.keys()));
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};

module.exports = initSocket;
