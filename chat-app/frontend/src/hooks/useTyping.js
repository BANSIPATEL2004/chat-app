import { useRef, useCallback } from "react";
import { useSocket } from "../context/SocketContext";

const TYPING_DEBOUNCE = 1000;

export const useTyping = (receiverId) => {
  const { getSocket } = useSocket();
  const isTypingRef = useRef(false);
  const timerRef = useRef(null);

  const startTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !receiverId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", { receiverId });
    }

    // Reset timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stopTyping", { receiverId });
    }, TYPING_DEBOUNCE);
  }, [getSocket, receiverId]);

  const stopTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !receiverId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("stopTyping", { receiverId });
    }
  }, [getSocket, receiverId]);

  return { startTyping, stopTyping };
};
