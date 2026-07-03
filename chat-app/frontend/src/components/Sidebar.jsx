import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoChatbubbles, IoSearch, IoPeople, IoPersonCircle,
  IoLogOut, IoAdd, IoClose,
} from "react-icons/io5";
import { toast } from "react-hot-toast";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import API from "../services/api";
import Avatar from "./Avatar";
import styles from "./Sidebar.module.css";

export default function Sidebar({ onChatSelect, isMobile, onClose }) {
  const { user, logout } = useAuthStore();
  const { recentChats, fetchRecentChats, groups, fetchGroups, onlineUsers, setActiveChat } = useChatStore();
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentChats();
    fetchGroups();
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (search.trim().length < 1) return setSearchResults([]);
      setSearching(true);
      try {
        const res = await API.get(`/users/search?q=${search}`);
        setSearchResults(res.data);
      } catch { }
      setSearching(false);
    }, 400);
    return () => clearTimeout(delay);
  }, [search]);

  const handleSelectUser = (u) => {
    setActiveChat({ type: "user", data: u });
    onChatSelect({ type: "user", data: u });
    setSearch("");
    setSearchResults([]);
    if (isMobile && onClose) onClose();
  };

  const handleSelectGroup = (g) => {
    setActiveChat({ type: "group", data: g });
    onChatSelect({ type: "group", data: g });
    if (isMobile && onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  return (
    <aside className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IoChatbubbles size={24} color="var(--primary)" />
          <span className={styles.appName}>ChatApp</span>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => navigate("/profile")} title="Profile">
            <IoPersonCircle size={22} />
          </button>
          <button onClick={handleLogout} title="Logout">
            <IoLogOut size={22} />
          </button>
          {isMobile && (
            <button onClick={onClose}>
              <IoClose size={22} />
            </button>
          )}
        </div>
      </div>

      {/* User Info */}
      <div className={styles.userInfo}>
        <Avatar src={user?.avatar} name={user?.name} size={42} />
        <div>
          <div className={styles.userName}>{user?.name}</div>
          <div className={styles.userStatus}>
            <span className={styles.onlineDot} />
            Online
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <IoSearch size={16} color="var(--text-muted)" />
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button onClick={() => { setSearch(""); setSearchResults([]); }}><IoClose size={14} /></button>}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className={styles.searchResults}>
          <div className={styles.sectionLabel}>Users</div>
          {searchResults.map((u) => (
            <div key={u._id} className={styles.chatItem} onClick={() => handleSelectUser(u)}>
              <div style={{ position: "relative" }}>
                <Avatar src={u.avatar} name={u.name} size={44} />
                {onlineUsers.includes(u._id) && <span className={styles.statusDot} />}
              </div>
              <div className={styles.chatInfo}>
                <div className={styles.chatName}>{u.name}</div>
                <div className={styles.chatSub}>{u.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {!search && (
        <>
          <div className={styles.tabs}>
            <button className={tab === "chats" ? styles.activeTab : ""} onClick={() => setTab("chats")}>
              <IoChatbubbles size={16} /> Chats
            </button>
            <button className={tab === "groups" ? styles.activeTab : ""} onClick={() => setTab("groups")}>
              <IoPeople size={16} /> Groups
            </button>
          </div>

          {tab === "chats" && (
            <div className={styles.list}>
              {recentChats.length === 0 && (
                <div className={styles.empty}>Search users to start chatting</div>
              )}
              {recentChats.map(({ user: u, lastMessage, unreadCount }) => (
                <div key={u._id} className={styles.chatItem} onClick={() => handleSelectUser(u)}>
                  <div style={{ position: "relative" }}>
                    <Avatar src={u.avatar} name={u.name} size={44} />
                    {onlineUsers.includes(u._id) && <span className={styles.statusDot} />}
                  </div>
                  <div className={styles.chatInfo}>
                    <div className={styles.chatTop}>
                      <span className={styles.chatName}>{u.name}</span>
                      <span className={styles.chatTime}>{formatTime(lastMessage?.createdAt)}</span>
                    </div>
                    <div className={styles.chatBottom}>
                      <span className={styles.chatSub}>
                        {lastMessage?.messageType === "file" ? `📎 ${lastMessage.fileType}` : lastMessage?.text || ""}
                      </span>
                      {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "groups" && (
            <div className={styles.list}>
              <button className={styles.newGroupBtn} onClick={() => setShowGroupModal(true)}>
                <IoAdd size={18} /> New Group
              </button>
              {groups.length === 0 && (
                <div className={styles.empty}>No groups yet. Create one!</div>
              )}
              {groups.map((g) => (
                <div key={g._id} className={styles.chatItem} onClick={() => handleSelectGroup(g)}>
                  <Avatar src={g.groupImage} name={g.name} size={44} />
                  <div className={styles.chatInfo}>
                    <div className={styles.chatName}>{g.name}</div>
                    <div className={styles.chatSub}>{g.members.length} members</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showGroupModal && <NewGroupModal onClose={() => setShowGroupModal(false)} />}
    </aside>
  );
}

function NewGroupModal({ onClose }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const createGroup = useChatStore((s) => s.createGroup);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) return setResults([]);
      const res = await API.get(`/users/search?q=${search}`);
      setResults(res.data);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const toggle = (u) => {
    setSelected((prev) =>
      prev.find((x) => x._id === u._id)
        ? prev.filter((x) => x._id !== u._id)
        : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Enter group name");
    if (selected.length < 1) return toast.error("Add at least 1 member");
    setLoading(true);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("members", JSON.stringify(selected.map((u) => u._id)));
    try {
      await createGroup(fd);
      toast.success("Group created!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>New Group</h3>
          <button onClick={onClose}><IoClose size={20} /></button>
        </div>
        <input
          className={styles.modalInput}
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.modalInput}
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {selected.length > 0 && (
          <div className={styles.selectedChips}>
            {selected.map((u) => (
              <span key={u._id} className={styles.chip}>
                {u.name} <button onClick={() => toggle(u)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className={styles.modalList}>
          {results.map((u) => (
            <div
              key={u._id}
              className={`${styles.chatItem} ${selected.find((x) => x._id === u._id) ? styles.selected : ""}`}
              onClick={() => toggle(u)}
            >
              <Avatar src={u.avatar} name={u.name} size={36} />
              <div>
                <div className={styles.chatName}>{u.name}</div>
                <div className={styles.chatSub}>{u.email}</div>
              </div>
            </div>
          ))}
        </div>
        <button className={styles.createBtn} onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}
