import { useState, useEffect } from "react";
import { userAPI, groupAPI } from "../../api";
import { useChat } from "../../context/ChatContext";
import toast from "react-hot-toast";
import Avatar from "../ui/Avatar";

export default function GroupModal({ isOpen, onClose }) {
  const { loadGroups } = useChat();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const { data } = await userAPI.getAll();
      setUsers(data.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Please enter group name");
    if (selectedUsers.length < 1) return toast.error("Please select at least one member");

    setLoading(true);
    try {
      await groupAPI.create({
        name: name.trim(),
        description: description.trim(),
        members: selectedUsers
      });
      await loadGroups();
      toast.success("Group created!");
      onClose();
      // Reset
      setName("");
      setDescription("");
      setSelectedUsers([]);
    } catch (err) {
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-surface-800 flex justify-between items-center bg-surface-800/50">
          <h2 className="text-xl font-bold text-white">Create Group</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work Team"
              className="input-field py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="input-field py-2.5 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">
              Select Members ({selectedUsers.length})
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {users.map(u => (
                <div
                  key={u._id}
                  onClick={() => toggleUser(u._id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.includes(u._id) ? "bg-brand-600/20 border border-brand-500/30" : "hover:bg-surface-800 border border-transparent"
                  }`}
                >
                  <Avatar user={u} size="sm" />
                  <span className="text-sm text-surface-100 flex-1">{u.username}</span>
                  {selectedUsers.includes(u._id) && (
                    <svg className="w-5 h-5 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-ghost py-2.5">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedUsers.length < 1}
            className="flex-1 btn-primary py-2.5"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
