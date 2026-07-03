import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import { userAPI } from "../../api";
import Avatar from "../ui/Avatar";
import GroupModal from "./GroupModal";
import { formatConversationTime } from "../../utils/date";
import toast from "react-hot-toast";

export default function Sidebar() {
  const { user, logout, updateProfile } = useAuth();
  const { 
    selectedUser, setSelectedUser, 
    selectedGroup, setSelectedGroup,
    conversations, groups, unreadCounts 
  } = useChat();
  const { isOnline, connected } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState("conversations"); // 'conversations' | 'users' | 'groups'
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      setAllUsers(data.data.users);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await userAPI.search(searchQuery);
        setSearchResults(data.data.users);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserClick = (chatUser) => {
    setSelectedUser(chatUser);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setSearchQuery("");
  };

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) return;
    try {
      await updateProfile({ username: newUsername.trim() });
      setIsEditingProfile(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const displayList = searchQuery
    ? searchResults
    : view === "conversations"
    ? conversations.map((c) => c.user).filter(Boolean)
    : allUsers;

  return (
    <div className={`flex flex-col h-full bg-surface-900 border-r border-surface-800 w-full md:w-80 transition-all duration-300 ${
      (selectedUser || selectedGroup) ? "hidden md:flex" : "flex"
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-surface-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-soft" />
            <span className="font-bold text-white text-lg">ChatFlow</span>
            {totalUnread > 0 && (
              <span className="bg-brand-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Connection status */}
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} title={connected ? "Connected" : "Disconnected"} />
            <button
              onClick={logout}
              className="btn-ghost p-2 rounded-lg"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 py-2 text-sm"
          />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        {/* View toggle */}
        {!searchQuery && (
          <div className="flex bg-surface-800 rounded-lg p-1 mt-3">
            <button
              onClick={() => setView("conversations")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                view === "conversations"
                  ? "bg-brand-600 text-white"
                  : "text-surface-300 hover:text-white"
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setView("users")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                view === "users"
                  ? "bg-brand-600 text-white"
                  : "text-surface-300 hover:text-white"
              }`}
            >
              People
            </button>
            <button
              onClick={() => setView("groups")}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                view === "groups"
                  ? "bg-brand-600 text-white"
                  : "text-surface-300 hover:text-white"
              }`}
            >
              Groups
            </button>
          </div>
        )}
      </div>

      {/* Group Actions */}
      {view === "groups" && !searchQuery && (
        <div className="px-4 py-2">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-surface-800 hover:bg-surface-700 text-brand-400 text-xs font-semibold rounded-xl border border-surface-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Group
          </button>
        </div>
      )}


      {/* User/Group List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {view === "groups" ? (
          groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-300 py-8">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">No groups yet</p>
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g._id}
                onClick={() => handleGroupClick(g)}
                className={`w-full text-left sidebar-item ${selectedGroup?._id === g._id ? "sidebar-item-active" : ""}`}
              >
                <div className="relative">
                  <Avatar user={{ avatar: g.avatar, username: g.name }} size="md" />
                  <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-surface-800 rounded-full flex items-center justify-center border-2 border-surface-900">
                    <svg className="w-2 h-2 text-surface-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-white truncate">{g.name}</span>
                    <span className="text-xs text-surface-300 ml-1">{g.members.length} members</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-300 truncate flex-1">
                      {g.lastMessage 
                        ? (typeof g.lastMessage.sender === 'object' 
                            ? `${g.lastMessage.sender.username}: ${g.lastMessage.content}`
                            : g.lastMessage.content)
                        : g.description || "No messages yet"}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )
        ) : (
          displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-300 py-8">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm">
                {searchQuery ? "No users found" : view === "conversations" ? "No conversations yet" : "No other users"}
              </p>
            </div>
          ) : (
            displayList.map((u) => {
              if (!u) return null;
              const conv = conversations.find((c) => c.user?._id === u._id);
              const unread = unreadCounts[u._id] || 0;
              const isSelected = selectedUser?._id === u._id;
              const online = isOnline(u._id);

              return (
                <button
                  key={u._id}
                  onClick={() => handleUserClick(u)}
                  className={`w-full text-left sidebar-item ${isSelected ? "sidebar-item-active" : ""}`}
                >
                  <Avatar user={u} size="md" showOnline isOnline={online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-white truncate">{u.username}</span>
                      {conv?.lastMessage && (
                        <span className="text-xs text-surface-300 ml-1 flex-shrink-0">
                          {formatConversationTime(conv.updatedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-surface-300 truncate">
                        {conv?.lastMessage
                          ? conv.lastMessage.isDeleted
                            ? "Message deleted"
                            : conv.lastMessage.content
                          : online ? "Online" : "Offline"}
                      </p>
                      {unread > 0 && (
                        <span className="ml-1 bg-brand-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )
        )}
      </div>


      {/* Current user footer */}
      <div className="p-3 border-t border-surface-800 bg-surface-950/30">
        {isEditingProfile ? (
          <div className="flex items-center gap-2 animate-fade-in">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="input-field py-1.5 text-xs flex-1"
              autoFocus
            />
            <button onClick={handleUpdateProfile} className="text-emerald-400 hover:text-emerald-300 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button onClick={() => setIsEditingProfile(false)} className="text-red-400 hover:text-red-300 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar user={user} size="sm" showOnline isOnline={true} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-emerald-400">Online</p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewUsername(user?.username || "");
                setIsEditingProfile(true);
              }}
              className="opacity-0 group-hover:opacity-100 btn-ghost p-1.5 rounded-lg transition-opacity"
              title="Edit Profile"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <GroupModal isOpen={isGroupModalOpen} onClose={() => {
        setIsGroupModalOpen(false);
        // fetchGroups is handled by context now
      }} />
    </div>
  );
}
