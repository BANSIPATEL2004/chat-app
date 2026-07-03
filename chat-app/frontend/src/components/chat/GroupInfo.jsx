import { useState, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import { formatLastSeen } from "../../utils/date";

export default function GroupInfo({ isOpen, onClose }) {
  const { user } = useAuth();
  const { selectedGroup, selectedUser, updateGroup } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedGroup) {
      setEditName(selectedGroup.name);
      setEditDesc(selectedGroup.description || "");
    }
  }, [selectedGroup]);

  const target = selectedGroup || selectedUser;
  const isAdmin = selectedGroup && selectedGroup.admin === user?._id;

  if (!target || !isOpen) return null;

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    setLoading(true);
    await updateGroup(selectedGroup._id, { name: editName, description: editDesc });
    setLoading(false);
    setIsEditing(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      
      <div className={`fixed top-0 right-0 bottom-0 z-[150] w-full max-w-[350px] bg-surface-900 flex flex-col h-full shadow-2xl transition-transform duration-500 ease-out border-l border-surface-800 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-5 border-b border-surface-800 flex items-center justify-between bg-surface-900/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-bold text-white">Info</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-full transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-950/20">
          {/* Profile Card */}
          <div className="p-8 flex flex-col items-center text-center bg-gradient-to-b from-surface-800/20 to-transparent">
            <div className="relative group">
              <Avatar 
                user={selectedGroup ? { avatar: selectedGroup.avatar, username: selectedGroup.name } : selectedUser} 
                size="xl" 
              />
              <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            {isEditing ? (
              <div className="w-full mt-5 px-4 space-y-3">
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-2 text-white font-bold text-center focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                  placeholder="Group Name"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleUpdate}
                    disabled={loading}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2 rounded-lg transition-all shadow-lg shadow-brand-600/20"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-bold py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mt-5 tracking-tight flex items-center gap-2">
                  {selectedGroup ? selectedGroup.name : selectedUser.username}
                  {isAdmin && (
                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-surface-500 hover:text-brand-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </h3>
                <p className="text-brand-400 text-sm font-medium mt-1">{selectedGroup ? `${selectedGroup.members.length} Members` : (selectedUser.isOnline ? "Online" : "Offline")}</p>
              </>
            )}
          </div>

          <div className="p-6 space-y-8">
            {selectedGroup && (
              <div>
                <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.1em] mb-3">About Group</h4>
                {isEditing ? (
                  <textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-800 rounded-2xl p-4 text-[14px] text-surface-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all resize-none h-24"
                    placeholder="Tell us about this group..."
                  />
                ) : (
                  <p className="text-[14px] text-surface-300 leading-relaxed bg-surface-900 p-4 rounded-2xl border border-surface-800 shadow-sm">
                    {selectedGroup.description || "Building something amazing together. 🚀"}
                  </p>
                )}
              </div>
            )}

            {selectedGroup && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.1em]">Group Members</h4>
                  <span className="text-[10px] bg-surface-800 text-surface-400 px-2 py-0.5 rounded-full border border-surface-700">
                    {selectedGroup.members.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {selectedGroup.members.map((m) => (
                    <div key={m._id} className="flex items-center justify-between group/member">
                      <div className="flex items-center gap-3">
                        <Avatar user={m} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-surface-100 flex items-center gap-2">
                            {m.username}
                            {m._id === selectedGroup.admin && (
                              <span className="text-[9px] font-bold bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-md border border-brand-500/20 uppercase tracking-wider">Admin</span>
                            )}
                          </p>
                          <p className="text-[11px] text-surface-500 truncate w-32 md:w-auto">{m.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!selectedGroup && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-[0.1em] mb-4">User Details</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-surface-300 bg-surface-900/50 p-3 rounded-xl border border-surface-800/50">
                      <div className="p-2 bg-brand-500/10 rounded-lg">
                        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Username</p>
                        <p className="text-sm font-medium">@{selectedUser.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-surface-300 bg-surface-900/50 p-3 rounded-xl border border-surface-800/50">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Email Address</p>
                        <p className="text-sm font-medium">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-surface-300 bg-surface-900/50 p-3 rounded-xl border border-surface-800/50">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">Last Seen</p>
                        <p className="text-sm font-medium">{formatLastSeen(selectedUser.lastSeen)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
