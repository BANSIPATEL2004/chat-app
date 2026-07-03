import { create } from "zustand";
import API from "../services/api";
import useAuthStore from "./authStore";

const useChatStore = create((set, get) => ({
  recentChats: [],
  activeChat: null, // { type: "user"|"group", data: {...} }
  messages: [],
  groups: [],
  onlineUsers: [],
  typingUsers: {}, // { userId/groupId: [senderIds] }
  loading: false,

  setOnlineUsers: (users) => {
    if (typeof users === "function") {
      set((s) => ({ onlineUsers: users(s.onlineUsers) }));
    } else {
      set({ onlineUsers: users });
    }
  },

  setActiveChat: (chat) => {
    set((s) => {
      // If clicking the same chat, don't clear messages
      const isSameChat =
        s.activeChat?.type === chat?.type &&
        s.activeChat?.data?._id === chat?.data?._id;
      
      if (isSameChat) return { activeChat: chat };
      return { activeChat: chat, messages: [] };
    });
  },

  fetchRecentChats: async () => {
    const res = await API.get("/chat/recent");
    set({ recentChats: res.data });
  },

  fetchMessages: async (userId) => {
    set({ loading: true });
    const res = await API.get(`/chat/${userId}`);
    set({ messages: res.data, loading: false });
    get().fetchRecentChats(); // Update unread count locally
  },

  fetchGroupMessages: async (groupId) => {
    set({ loading: true });
    const res = await API.get(`/group/${groupId}/messages`);
    set({ messages: res.data, loading: false });
  },

  sendMessage: async (formData) => {
    const res = await API.post("/chat/send", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    set((s) => ({ messages: [...s.messages, res.data] }));
    return res.data;
  },

  sendGroupMessage: async (groupId, formData) => {
    const res = await API.post(`/group/${groupId}/send`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    set((s) => ({ messages: [...s.messages, res.data] }));
    return res.data;
  },

  receiveMessage: async (message) => {
    const { activeChat, fetchRecentChats } = get();
    const isActive =
      activeChat?.type === "user" &&
      ((message.sender._id || message.sender) === activeChat.data._id ||
        (message.receiver?._id || message.receiver) === activeChat.data._id);
        
    if (isActive) {
      set((s) => {
        if (s.messages.find(m => m._id === message._id)) return s;
        return { messages: [...s.messages, message] };
      });
      
      const senderId = message.sender._id || message.sender;
      if (senderId !== useAuthStore.getState().user?._id) {
        await API.put(`/chat/read/${senderId}`);
      }
    }
    // Update recent chats
    fetchRecentChats();
  },

  receiveGroupMessage: ({ groupId, message }) => {
    const { activeChat, fetchGroups, fetchRecentChats } = get();
    if (activeChat?.type === "group" && activeChat.data._id === groupId) {
      set((s) => {
        if (s.messages.find(m => m._id === message._id)) return s;
        return { messages: [...s.messages, message] };
      });
    }
    fetchGroups();
    fetchRecentChats();
  },

  deleteMessage: async (msgId) => {
    await API.delete(`/chat/message/${msgId}`);
    set((s) => ({
      messages: s.messages.map((m) =>
        m._id === msgId
          ? { ...m, deleted: true, text: "This message was deleted", fileUrl: "", messageType: "text" }
          : m
      ),
    }));
  },

  updateMessageReactions: (messageId, reactions) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      ),
    }));
  },

  markMessageDeleted: (messageId) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m._id === messageId
          ? { ...m, deleted: true, text: "This message was deleted", fileUrl: "", messageType: "text" }
          : m
      ),
    }));
  },

  fetchGroups: async () => {
    const res = await API.get("/group/my");
    set({ groups: res.data });
  },

  createGroup: async (formData) => {
    const res = await API.post("/group/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    set((s) => ({ groups: [res.data, ...s.groups] }));
    return res.data;
  },

  updateGroup: async (groupId, formData) => {
    const res = await API.put(`/group/${groupId}/update`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    set((s) => ({
      groups: s.groups.map(g => g._id === groupId ? res.data : g),
      activeChat: s.activeChat?.type === "group" && s.activeChat.data._id === groupId
        ? { ...s.activeChat, data: res.data }
        : s.activeChat
    }));
    return res.data;
  },

  addGroupMember: async (groupId, userId) => {
    const res = await API.put(`/group/${groupId}/add-member`, { userId });
    set((s) => ({
      groups: s.groups.map(g => g._id === groupId ? res.data : g),
      activeChat: s.activeChat?.type === "group" && s.activeChat.data._id === groupId
        ? { ...s.activeChat, data: res.data }
        : s.activeChat
    }));
    return res.data;
  },

  removeGroupMember: async (groupId, userId) => {
    const res = await API.put(`/group/${groupId}/remove-member`, { userId });
    set((s) => ({
      groups: s.groups.map(g => g._id === groupId ? res.data : g),
      activeChat: s.activeChat?.type === "group" && s.activeChat.data._id === groupId
        ? { ...s.activeChat, data: res.data }
        : s.activeChat
    }));
    return res.data;
  },

  deleteGroup: async (groupId) => {
    await API.delete(`/group/${groupId}`);
    set((s) => ({
      groups: s.groups.filter(g => g._id !== groupId),
      activeChat: s.activeChat?.type === "group" && s.activeChat.data._id === groupId
        ? null
        : s.activeChat,
      recentChats: s.recentChats.filter(c => !(c.type === "group" && c.data?._id === groupId)) // recentChats might have different structure, usually we re-fetch them. let's just fetchRecentChats
    }));
    get().fetchRecentChats();
  },

  setTyping: (key, senderId) => {
    set((s) => {
      const prev = s.typingUsers[key] || [];
      if (prev.includes(senderId)) return {};
      return { typingUsers: { ...s.typingUsers, [key]: [...prev, senderId] } };
    });
  },

  clearTyping: (key, senderId) => {
    set((s) => {
      const prev = s.typingUsers[key] || [];
      return {
        typingUsers: {
          ...s.typingUsers,
          [key]: prev.filter((id) => id !== senderId),
        },
      };
    });
  },
}));

export default useChatStore;
