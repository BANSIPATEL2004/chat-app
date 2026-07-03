import { useState, useEffect } from "react";
import { userAPI } from "../../api";
import { useChat } from "../../context/ChatContext";
import toast from "react-hot-toast";
import Avatar from "../ui/Avatar";

export default function AddMemberModal({ isOpen, onClose, groupId, currentMembers }) {
  const { addMemberToGroup } = useChat();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      // Filter out users who are already in the group
      const memberIds = currentMembers.map(m => m._id);
      const available = data.data.users.filter(u => !memberIds.includes(u._id));
      setUsers(available);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (userId) => {
    setLoading(true);
    await addMemberToGroup(groupId, userId);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add Member</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-surface-400 py-8 text-sm">No other users found</p>
            ) : (
              filteredUsers.map(u => (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-800 transition-colors border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size="md" />
                    <div>
                      <p className="text-sm font-medium text-white">{u.username}</p>
                      <p className="text-xs text-surface-400">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(u._id)}
                    disabled={loading}
                    className="btn-primary py-1.5 px-3 text-xs w-auto"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
