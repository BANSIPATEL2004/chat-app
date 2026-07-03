import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

let io;

// Map: userId -> socketId
const onlineUsers = new Map();

export const getReceiverSocketId = (userId) => {
  return onlineUsers.get(userId);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Socket Auth Middleware ───────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Authentication error: No token"));

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Authentication error: User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🟢 User connected: ${socket.user.username} [${socket.id}]`);

    // Register user as online
    onlineUsers.set(userId, socket.id);

    // Update DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
    });

    // Broadcast online status
    io.emit("userOnline", { userId, isOnline: true });
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    // ─── Typing Events ─────────────────────────────────────────
    socket.on("typing", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", {
          senderId: userId,
          isTyping: true,
        });
      }
    });

    socket.on("stopTyping", ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", {
          senderId: userId,
          isTyping: false,
        });
      }
    });

    // ─── Join private room ──────────────────────────────────────
    socket.on("joinRoom", ({ roomId }) => {
      socket.join(roomId);
      console.log(`User ${socket.user.username} joined room: ${roomId}`);
    });

    // ─── Message Read Acknowledgment ───────────────────────────
    socket.on("messageRead", async ({ senderId, messageId }) => {
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReadAck", { messageId, by: userId });
      }
    });

    // ─── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null,
      });

      io.emit("userOnline", { userId, isOnline: false });
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};
