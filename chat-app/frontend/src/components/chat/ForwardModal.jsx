import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import Avatar from "../ui/Avatar";
import { messageAPI } from "../../api";
import toast from "react-hot-toast";

export default function ForwardModal({ isOpen, onClose, message }) {
  const { conversations, groups, loadConversations, loadGroups, selectedUser, selectedGroup } = useChat();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState([]);

  if (!isOpen || !message) return null;

  const filteredConversations = conversations.filter(c => c.user._id !== selectedUser?._id);
  const filteredGroups = groups.filter(g => g._id !== selectedGroup?._id);

  const handleForward = async (target, type) => {
    try {
      if (type === "private") {
        await messageAPI.send(target._id, { content: message.content, messageType: message.messageType });
      } else {
        await messageAPI.sendGroup(target._id, { content: message.content, messageType: message.messageType });
      }
      setSentTo([...sentTo, target._id]);
      toast.success(`Forwarded to ${target.username || target.name}`);
      loadConversations();
      loadGroups();
    } catch (err) {
      toast.error("Forward failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-5 border-b border-surface-800 flex items-center justify-between bg-surface-900/50 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold text-white">Forward Message</h2>
            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mt-1">Select recipients</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                const targets = [...filteredConversations.map(c => ({ data: c.user, type: 'private' })), ...filteredGroups.map(g => ({ data: g, type: 'group' }))];
                const unsent = targets.filter(t => !sentTo.includes(t.data._id));
                if (unsent.length === 0) return toast.error("Already sent to all");
                setLoading(true);
                for (const t of unsent) {
                  await handleForward(t.data, t.type);
                }
                setLoading(false);
                toast.success("Forwarded to all contacts");
              }}
              disabled={loading}
              className="text-[11px] font-bold bg-brand-600/10 text-brand-400 border border-brand-500/20 px-3 py-1.5 rounded-full hover:bg-brand-600 hover:text-white transition-all disabled:opacity-50"
            >
              Forward to All
            </button>
            <button onClick={onClose} className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-full transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="p-2">
            <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2 px-2">Recent Chats</p>
            {filteredConversations.map((conv) => (
              <div key={conv.user._id} className="flex items-center justify-between p-3 hover:bg-surface-800/50 rounded-2xl transition-all group/item">
                <div className="flex items-center gap-4">
                  <Avatar user={conv.user} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover/item:text-brand-400 transition-colors">{conv.user.username}</p>
                    <p className="text-[10px] text-surface-500 font-medium">Recent Chat</p>
                  </div>
                </div>
                <button 
                  disabled={sentTo.includes(conv.user._id)}
                  onClick={() => handleForward(conv.user, "private")}
                  className={`text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                    sentTo.includes(conv.user._id) 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-surface-800 text-surface-300 hover:bg-brand-600 hover:text-white border border-surface-700 hover:border-brand-500 shadow-lg active:scale-95"
                  }`}
                >
                  {sentTo.includes(conv.user._id) ? "Sent" : "Send"}
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 space-y-2">
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.1em] mb-4 px-2">Your Groups</p>
            {filteredGroups.map((group) => (
              <div key={group._id} className="flex items-center justify-between p-3 hover:bg-surface-800/50 rounded-2xl transition-all group/item">
                <div className="flex items-center gap-4">
                  <Avatar user={{ avatar: group.avatar, username: group.name }} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover/item:text-brand-400 transition-colors">{group.name}</p>
                    <p className="text-[10px] text-surface-500 font-medium">{group.members.length} Members</p>
                  </div>
                </div>
                <button 
                  disabled={sentTo.includes(group._id)}
                  onClick={() => handleForward(group, "group")}
                  className={`text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                    sentTo.includes(group._id) 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-surface-800 text-surface-300 hover:bg-brand-600 hover:text-white border border-surface-700 hover:border-brand-500 shadow-lg active:scale-95"
                  }`}
                >
                  {sentTo.includes(group._id) ? "Sent" : "Send"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
