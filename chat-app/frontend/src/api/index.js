import api from "./axios";

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const userAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  search: (q) => api.get(`/users/search?q=${q}`),
  updateProfile: (data) => api.put("/users/profile", data),
  star: (messageId) => api.post(`/users/star/${messageId}`),
};

export const messageAPI = {
  send: (receiverId, data) => api.post(`/messages/send/${receiverId}`, data),
  getMessages: (userId, page = 1) =>
    api.get(`/messages/${userId}?page=${page}`),
  getConversations: () => api.get("/messages/conversations"),
  getGroupMessages: (groupId) => api.get(`/messages/group/${groupId}`),
  sendGroup: (groupId, data) => api.post(`/messages/send/group/${groupId}`, data),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  clearChat: (id, type) => api.delete(`/messages/clear/${id}?type=${type}`),
  toggleReaction: (messageId, emoji) => api.post(`/messages/${messageId}/reaction`, { emoji }),
};


export const groupAPI = {
  create: (data) => api.post("/groups", data),
  getMyGroups: () => api.get("/groups"),
  getById: (id) => api.get(`/groups/${id}`),
  delete: (id) => api.delete(`/groups/${id}`),
  leave: (id) => api.post(`/groups/${id}/leave`),
  addMember: (data) => api.post("/groups/add-member", data),
  removeMember: (data) => api.post("/groups/remove-member", data),
  pin: (groupId, messageId) => api.post(`/groups/${groupId}/pin/${messageId}`),
  unpin: (groupId, messageId) => api.post(`/groups/${groupId}/unpin/${messageId}`),
  update: (id, data) => api.put(`/groups/${id}`, data),
};


export const uploadAPI = {
  upload: (formData) => api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};
