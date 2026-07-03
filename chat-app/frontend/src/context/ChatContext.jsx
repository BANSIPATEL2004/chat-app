import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { messageAPI, groupAPI } from "../api";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { getSocket } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const typingTimerRef = useRef({});

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await messageAPI.getConversations();
      const convs = data.data.conversations;
      setConversations(convs);
      // Build unread map
      const counts = {};
      convs.forEach((c) => { counts[c.user?._id] = c.unreadCount; });
      setUnreadCounts(counts);
    } catch { /* silent */ }
  }, []);

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      const { data } = await groupAPI.getMyGroups();
      setGroups(data.data.groups);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!selectedUser && !selectedGroup) return;
    setLoadingMessages(true);
    try {
      const { data } = selectedGroup 
        ? await messageAPI.getGroupMessages(selectedGroup._id)
        : await messageAPI.getMessages(selectedUser._id);
      setMessages(data.data.messages);
      if (selectedUser) setUnreadCounts((prev) => ({ ...prev, [selectedUser._id]: 0 }));
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedUser, selectedGroup]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const selectUser = (u) => {
    setSelectedGroup(null);
    setSelectedUser(u);
    setMessages([]);
  };

  const selectGroup = (g) => {
    setSelectedUser(null);
    setSelectedGroup(g);
    setMessages([]);
  };

  // Send message
  const sendMessage = useCallback(async (content, type = "text", replyToId = null) => {
    if (!selectedUser && !selectedGroup) return;

    try {
      setSending(true);
      const { data } = selectedGroup
        ? await messageAPI.sendGroup(selectedGroup._id, { content, messageType: type, replyTo: replyToId })
        : await messageAPI.send(selectedUser._id, { content, messageType: type, replyTo: replyToId });
      setMessages((prev) => [...prev, data.data.message]);
      // Update lists
      loadConversations();
      loadGroups();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }, [selectedUser, selectedGroup, loadConversations, loadGroups]);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: "This message was deleted" }
            : m
        )
      );
    } catch {
      toast.error("Failed to delete message");
    }
  }, []);

  const clearChat = useCallback(async () => {
    const target = selectedGroup || selectedUser;
    if (!target) return;
    const type = selectedGroup ? "group" : "user";
    try {
      await messageAPI.clearChat(target._id, type);
      setMessages((prev) => prev.map(m => ({ ...m, isDeleted: true, content: "This message was deleted" })));
      toast.success("Chat cleared");
    } catch {
      toast.error("Failed to clear chat");
    }
  }, [selectedUser, selectedGroup]);

  const deleteGroup = useCallback(async (groupId) => {
    try {
      await groupAPI.delete(groupId);
      setSelectedGroup(null);
      loadGroups();
      toast.success("Group deleted");
    } catch {
      toast.error("Failed to delete group");
    }
  }, [loadGroups]);

  const leaveGroup = useCallback(async (groupId) => {
    try {
      await groupAPI.leave(groupId);
      setSelectedGroup(null);
      loadGroups();
      toast.success("Left group");
    } catch {
      toast.error("Failed to leave group");
    }
  }, [loadGroups]);

  const updateGroup = useCallback(async (groupId, updateData) => {
    try {
      const { data } = await groupAPI.update(groupId, updateData);
      setSelectedGroup(data.data.group);
      loadGroups();
      toast.success("Group updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update group");
    }
  }, [loadGroups]);

  const addMemberToGroup = useCallback(async (groupId, userId) => {
    try {
      const { data } = await groupAPI.addMember({ groupId, userId });
      setSelectedGroup(data.data.group);
      loadGroups();
      toast.success("Member added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
    }
  }, [loadGroups]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    try {
      const { data } = await messageAPI.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions: data.data.reactions } : m
        )
      );
    } catch {
      toast.error("Failed to update reaction");
    }
  }, []);

  const pinMessage = useCallback(async (messageId) => {
    if (!selectedGroup) return;
    try {
      const { data } = await groupAPI.pin(selectedGroup._id, messageId);
      setSelectedGroup(data.data.group);
      toast.success("Message pinned");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to pin message");
    }
  }, [selectedGroup]);

  const unpinMessage = useCallback(async (messageId) => {
    if (!selectedGroup) return;
    try {
      const { data } = await groupAPI.unpin(selectedGroup._id, messageId);
      setSelectedGroup(data.data.group);
      toast.success("Message unpinned");
    } catch (err) {
      toast.error("Failed to unpin message");
    }
  }, [selectedGroup]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handleNewMessage = (message) => {
      const senderId = message.sender._id || message.sender;
      if (selectedUser && senderId === selectedUser._id) {
        setMessages((prev) => [...prev, message]);
        // Mark read
        socket.emit("messageRead", { senderId, messageId: message._id });
      } else if (!selectedGroup) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
        toast(`New message from ${message.sender.username}`, { icon: "💬" });
      }
      loadConversations();
    };

    const handleTyping = ({ senderId, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: isTyping }));
      if (typingTimerRef.current[senderId]) {
        clearTimeout(typingTimerRef.current[senderId]);
      }
      if (isTyping) {
        typingTimerRef.current[senderId] = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
        }, 3000);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
        )
      );
    };

    const handleReactionUpdate = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };

    const handleMessagesRead = ({ by }) => {
      if (selectedUser && selectedUser._id === by) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      }
    };

    const handleNewGroupMessage = ({ groupId, message }) => {
      if (selectedGroup && selectedGroup._id === groupId) {
        setMessages((prev) => [...prev, message]);
      }
      loadGroups();
    };

    const handleGroupUpdate = ({ group }) => {
      if (selectedGroup && selectedGroup._id === group._id) {
        setSelectedGroup(group);
      }
      loadGroups();
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleTyping);
    socket.on("groupUpdate", handleGroupUpdate);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("newGroupMessage", handleNewGroupMessage);
    socket.on("reactionUpdate", handleReactionUpdate);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleTyping);
      socket.off("groupUpdate", handleGroupUpdate);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("newGroupMessage", handleNewGroupMessage);
      socket.off("reactionUpdate", handleReactionUpdate);
    };
  }, [getSocket, user, selectedUser, selectedGroup, loadConversations, loadGroups]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadConversations();
      loadGroups();
    }
  }, [user, loadConversations, loadGroups]);

  const isTyping = (userId) => !!typingUsers[userId];

  return (
    <ChatContext.Provider value={{
      selectedUser,
      setSelectedUser: selectUser,
      selectedGroup,
      setSelectedGroup: selectGroup,
      messages,
      setMessages,
      loadingMessages,
      sending,
      conversations,
      groups,
      loadGroups,
      loadConversations,
      sendMessage,
      deleteMessage,
      clearChat,
      deleteGroup,
      leaveGroup,
      updateGroup,
      addMemberToGroup,
      toggleReaction,
      pinMessage,
      unpinMessage,
      isTyping,
      unreadCounts,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};
