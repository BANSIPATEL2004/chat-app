import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, userAPI } from "../api";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authAPI.getMe();
        setUser(data.data.user);
        localStorage.setItem("user", JSON.stringify(data.data.user));
      } catch {
        // Token invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user: userData, token: userToken } = data.data;
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await authAPI.register({ username, email, password });
    const { user: userData, token: userToken } = data.data;
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }, []);

  const updateProfile = useCallback(async (data) => {
    const response = await userAPI.updateProfile(data);
    const updatedUser = response.data.data.user;
    updateUser(updatedUser);
    return updatedUser;
  }, [updateUser]);

  const toggleStar = useCallback(async (messageId) => {
    try {
      const { data } = await userAPI.star(messageId);
      const updatedUser = { ...user, starredMessages: data.data.starredMessages };
      updateUser(updatedUser);
      return updatedUser;
    } catch (err) {
      toast.error("Failed to star message");
      throw err;
    }
  }, [user, updateUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, updateProfile, toggleStar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
