import { create } from "zustand";
import API from "../services/api";
import { initSocket, disconnectSocket } from "../services/socket";

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,
  socket: null,

  signup: async (data) => {
    set({ loading: true });
    const res = await API.post("/auth/signup", data);
    localStorage.setItem("token", res.data.token);
    const socket = initSocket(res.data._id);
    set({ user: res.data, token: res.data.token, socket, loading: false });
    return res.data;
  },

  login: async (data) => {
    set({ loading: true });
    const res = await API.post("/auth/login", data);
    localStorage.setItem("token", res.data.token);
    const socket = initSocket(res.data._id);
    set({ user: res.data, token: res.data.token, socket, loading: false });
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    disconnectSocket();
    set({ user: null, token: null, socket: null });
  },

  fetchMe: async () => {
    try {
      const res = await API.get("/auth/me");
      const socket = initSocket(res.data._id);
      set({ user: res.data, socket });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null });
    }
  },

  updateUser: (data) => set((s) => ({ user: { ...s.user, ...data } })),

  toggleBlockUser: async (userId) => {
    try {
      const res = await API.put(`/users/block/${userId}`);
      set({ user: res.data });
      return res.data;
    } catch (error) {
      throw error;
    }
  },
}));

export default useAuthStore;
