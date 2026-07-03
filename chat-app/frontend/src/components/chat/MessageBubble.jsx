import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../ui/Avatar";
import ImageViewer from "./ImageViewer";
import { formatMessageTime } from "../../utils/date";

export default function MessageBubble({ message, isGroup, onReply, onForward }) {
  const { user, toggleStar } = useAuth();
  const { deleteMessage, toggleReaction, pinMessage, unpinMessage, selectedGroup } = useChat();
  const isMe = message.sender?._id === user?._id || message.sender === user?._id;
  const isStarred = user?.starredMessages?.includes(message._id);
  const [showReactions, setShowReactions] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const reactions = [
    { emoji: "❤️", label: "love" },
    { emoji: "👍", label: "like" },
    { emoji: "😂", label: "haha" },
    { emoji: "😮", label: "wow" },
    { emoji: "😢", label: "sad" },
    { emoji: "🔥", label: "fire" },
  ];

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4 px-4`}>
        <div className="max-w-[70%] bg-surface-900 border border-surface-800 rounded-2xl px-4 py-2 italic text-surface-400 text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  const renderStatus = () => {
    if (!isMe || isGroup) return null;
    if (message.isRead) return <span className="text-brand-400 ml-1">✓✓</span>;
    if (message.isDelivered) return <span className="text-surface-500 ml-1">✓✓</span>;
    return <span className="text-surface-500 ml-1">✓</span>;
  };

  const reactionCounts = message.reactions?.reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <>
      <div className={`group flex ${isMe ? "justify-end" : "justify-start"} mb-6 px-4 relative`}>
      {!isMe && isGroup && (
        <div className="mr-2 mt-1">
          <Avatar user={message.sender} size="sm" />
        </div>
      )}
      
      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] md:max-w-[75%]`}>
        {!isMe && isGroup && (
          <span className="text-[10px] font-semibold text-surface-400 mb-1 ml-1 uppercase tracking-wider">
            {message.sender?.username}
          </span>
        )}
        
        <div
          className={`relative group px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 ${
            isMe 
              ? "bg-brand-600 text-white rounded-tr-none shadow-lg shadow-brand-600/10" 
              : "bg-surface-800 text-surface-100 rounded-tl-none"
          }`}
        >
          {/* Quoted Message */}
          {message.replyTo && (
            <div className={`mb-2 p-2 rounded-lg text-xs flex gap-2 overflow-hidden border-l-2 min-w-[120px] ${
              isMe ? "bg-black/20 border-white/40" : "bg-black/10 border-brand-500/50"
            }`}>
              <div className="flex-1 overflow-hidden">
                <p className={`font-bold truncate ${isMe ? "text-white/90" : "text-brand-400"}`}>
                  {message.replyTo.sender?.username}
                </p>
                <p className="truncate opacity-70">
                  {message.replyTo.messageType === "text" ? message.replyTo.content : `[${message.replyTo.messageType}]`}
                </p>
              </div>
            </div>
          )}

          {message.messageType === "image" ? (
            <img 
              src={message.content} 
              alt="sent" 
              className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => setIsViewerOpen(true)}
            />
          ) : message.messageType === "audio" ? (
            <audio controls className="max-w-full h-8 brightness-90 filter invert">
              <source src={message.content} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
          ) : (
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          )}
            <div className={`flex items-center gap-1.5 mt-1.5 justify-end ${isMe ? "text-white/60" : "text-surface-400"}`}>
              {isStarred && (
                <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              <span className="text-[10px] tabular-nums font-medium">
                {formatMessageTime(message.createdAt)}
              </span>
              {renderStatus()}
            </div>

          {/* Reaction badges */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className={`absolute -bottom-3 ${isMe ? "right-0" : "left-0"} flex gap-1 z-10`}>
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(message._id, emoji)}
                  className="bg-surface-900 border border-surface-800 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 hover:bg-surface-800 transition-colors shadow-lg"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="font-bold text-surface-300">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? "justify-end" : "justify-start"}`}>
          <button 
            onClick={() => onReply(message)}
            className="p-1.5 rounded-full hover:bg-black/10 text-surface-400 hover:text-white transition-colors"
            title="Reply"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <button 
            onClick={() => onForward(message)}
            className="p-1.5 rounded-full hover:bg-black/10 text-surface-400 hover:text-white transition-colors"
            title="Forward"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <button 
            onClick={() => toggleStar(message._id)}
            className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${isStarred ? "text-amber-400" : "text-surface-400 hover:text-white"}`}
            title={isStarred ? "Unstar" : "Star"}
          >
            <svg className={`w-3.5 h-3.5 ${isStarred ? "fill-current" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          
          {isGroup && selectedGroup?.admin === user?._id && (
            <button 
              onClick={() => pinMessage(message._id)}
              className="p-1.5 rounded-full hover:bg-black/10 text-surface-400 hover:text-white transition-colors"
              title="Pin Message"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v2l2 2v2h-1v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6H4V9l2-2V5z" />
              </svg>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1.5 rounded-full hover:bg-black/10 text-surface-400 hover:text-white transition-colors"
              title="React"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showReactions && (
              <div className={`absolute bottom-full mb-2 ${isMe ? "right-0" : "left-0"} bg-surface-800 border border-surface-700 rounded-full p-1.5 flex gap-1 shadow-2xl z-50 animate-slide-up`}>
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() => {
                      toggleReaction(message._id, r.emoji);
                      setShowReactions(false);
                    }}
                    className="hover:scale-125 transition-transform p-1 text-lg"
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        src={message.content} 
      />
    </div>
    </>
  );
}
