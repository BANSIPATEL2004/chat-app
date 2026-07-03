import { io } from "socket.io-client";

let socket = null;

export const initSocket = (userId) => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:5000", {
      withCredentials: true,
    });
    
    // Automatically re-join the user's room upon any reconnection
    socket.on("connect", () => {
      socket.emit("setup", userId);
    });
  }
  
  // Emit immediately if already connected or connecting
  socket.emit("setup", userId);
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
