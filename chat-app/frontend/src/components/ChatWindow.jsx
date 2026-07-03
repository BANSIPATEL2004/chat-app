import { useState, useEffect, useRef, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import {
  IoSend, IoAttach, IoArrowBack, IoInformation,
  IoClose, IoDownload, IoTrash, IoHappy, IoMic, IoStop
} from "react-icons/io5";
import { toast } from "react-hot-toast";
import useAuthStore from "../store/authStore";
import useChatStore from "../store/chatStore";
import Avatar from "./Avatar";
import GroupInfoModal from "./GroupInfoModal";
import API from "../services/api";
import styles from "./ChatWindow.module.css";

export default function ChatWindow({ onBack }) {
  const { user, socket } = useAuthStore();
  const {
    activeChat, messages, loading,
    fetchMessages, fetchGroupMessages,
    sendMessage, sendGroupMessage, deleteMessage,
    typingUsers, setTyping, clearTyping, updateMessageReactions, markMessageDeleted
  } = useChatStore();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const chatId = activeChat?.type === "user"
    ? activeChat.data._id
    : activeChat?.data._id;

  const typingKey = chatId;
  const isTyping = (typingUsers[typingKey] || []).length > 0;

  useEffect(() => {
    if (!activeChat) return;
    if (activeChat.type === "user") {
      fetchMessages(chatId);
      socket?.emit("message-read", { senderId: chatId, receiverId: user?._id });
    } else {
      fetchGroupMessages(chatId);
    }
  }, [chatId, socket, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onReceiveMsg = async (msg) => {
      await useChatStore.getState().receiveMessage(msg);
      if (activeChat?.type === "user" && (msg.sender._id || msg.sender) === chatId) {
        socket.emit("message-read", { senderId: chatId, receiverId: user?._id });
      }
    };
    const onReceiveGroupMsg = (data) => useChatStore.getState().receiveGroupMessage(data);

    const onTyping = ({ senderId, senderName }) => {
      if (activeChat?.type === "user" && senderId === chatId) setTyping(chatId, senderId);
    };
    const onStopTyping = ({ senderId }) => clearTyping(chatId, senderId);
    const onGroupTyping = ({ groupId, senderId }) => {
      if (activeChat?.type === "group" && groupId === chatId) setTyping(chatId, senderId);
    };
    const onGroupStopTyping = ({ groupId, senderId }) => {
      if (activeChat?.type === "group" && groupId === chatId) clearTyping(chatId, senderId);
    };

    const onMessageReaction = ({ messageId, reactions }) => updateMessageReactions(messageId, reactions);
    const onMessageDeleted = ({ message }) => markMessageDeleted(message._id);
    const onMessageRead = ({ receiverId }) => {
      useChatStore.setState(s => ({
        messages: s.messages.map(m => m.receiver?._id === receiverId ? { ...m, isRead: true } : m)
      }));
    };

    socket.on("receive-message", onReceiveMsg);
    socket.on("receive-group-message", onReceiveGroupMsg);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("group-typing", onGroupTyping);
    socket.on("group-stop-typing", onGroupStopTyping);
    socket.on("message-reaction", onMessageReaction);
    socket.on("message-deleted", onMessageDeleted);
    socket.on("message-read", onMessageRead);

    return () => {
      socket.off("receive-message", onReceiveMsg);
      socket.off("receive-group-message", onReceiveGroupMsg);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("group-typing", onGroupTyping);
      socket.off("group-stop-typing", onGroupStopTyping);
      socket.off("message-reaction", onMessageReaction);
      socket.off("message-deleted", onMessageDeleted);
      socket.off("message-read", onMessageRead);
    };
  }, [socket, chatId, activeChat]);

  const handleTyping = (val) => {
    setText(val);
    if (!socket) return;

    if (activeChat?.type === "user") {
      socket.emit("typing", { receiverId: chatId, senderName: user.name });
    } else {
      const memberIds = activeChat.data.members.map((m) => m._id || m);
      socket.emit("group-typing", { groupId: chatId, senderName: user.name, memberIds });
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (activeChat?.type === "user") {
        socket.emit("stop-typing", { receiverId: chatId });
      } else {
        const memberIds = activeChat.data.members.map((m) => m._id || m);
        socket.emit("group-stop-typing", { groupId: chatId, memberIds });
      }
    }, 1500);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("Max file size is 10MB");
    setFile(f);
    if (f.type.startsWith("image")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });
        setFile(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    setSending(true);

    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);
      if (replyTo) fd.append("replyTo", replyTo._id);

      let newMsg;
      if (activeChat.type === "user") {
        fd.append("receiverId", chatId);
        newMsg = await sendMessage(fd);
        socket?.emit("send-message", { receiverId: chatId, message: newMsg });
        socket?.emit("stop-typing", { receiverId: chatId });
        socket?.emit("message-read", { senderId: user._id, receiverId: chatId });
      } else {
        newMsg = await sendGroupMessage(chatId, fd);
        const memberIds = activeChat.data.members.map((m) => m._id || m);
        socket?.emit("send-group-message", { groupId: chatId, message: newMsg, memberIds });
        socket?.emit("group-stop-typing", { groupId: chatId, memberIds });
      }

      setText("");
      setFile(null);
      setPreview(null);
      setReplyTo(null);
      setShowEmoji(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
    setSending(false);
  };

  const handleDelete = async (msg) => {
    try {
      await deleteMessage(msg._id);
      const isGroup = activeChat.type === "group";
      const memberIds = isGroup ? activeChat.data.members.map(m => m._id || m) : undefined;
      const receiverId = isGroup ? undefined : chatId;
      socket?.emit("message-deleted", { 
        message: { ...msg, deleted: true, text: "This message was deleted", fileUrl: "", messageType: "text" }, 
        receiverId, 
        groupId: isGroup ? chatId : undefined, 
        memberIds 
      });
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleReact = (msgId, emoji) => {
    if (!socket) return;
    const isGroup = activeChat.type === "group";
    const memberIds = isGroup ? activeChat.data.members.map(m => m._id || m) : undefined;
    const receiverId = isGroup ? undefined : chatId;
    
    // Optimistic update
    const msg = messages.find(m => m._id === msgId);
    let newReactions = [...(msg.reactions || [])];
    const existing = newReactions.findIndex(r => r.userId === user._id);
    if (existing !== -1) {
       if (newReactions[existing].emoji === emoji) newReactions.splice(existing, 1);
       else newReactions[existing].emoji = emoji;
    } else {
       newReactions.push({ userId: user._id, emoji });
    }
    updateMessageReactions(msgId, newReactions);

    socket.emit("message-reaction", {
      messageId: msgId,
      receiverId,
      groupId: isGroup ? chatId : undefined,
      memberIds,
      reactions: newReactions
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChat) {
    return (
      <div className={styles.empty}>
        <IoInformation size={40} />
        <h2>Select a chat to start messaging</h2>
        <p>Choose from your recent conversations or search for a user</p>
      </div>
    );
  }

  const chatName = activeChat.type === "user"
    ? activeChat.data.name
    : activeChat.data.name;
  const chatAvatar = activeChat.type === "user"
    ? activeChat.data.avatar
    : activeChat.data.groupImage;
  const chatSubtitle = activeChat.type === "user"
    ? (activeChat.data.status === "online" ? "Online" : `Last seen ${formatLastSeen(activeChat.data.lastSeen)}`)
    : `${activeChat.data.members?.length || 0} members`;

  const isBlockedByMe = activeChat?.type === "user" && user?.blockedUsers?.includes(chatId);

  const handleToggleBlock = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to ${isBlockedByMe ? "unblock" : "block"} this user?`)) return;
    try {
      await useAuthStore.getState().toggleBlockUser(chatId);
      toast.success(`User ${isBlockedByMe ? "unblocked" : "blocked"}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle block status");
    }
  };

  const handleReportUser = async (e) => {
    e.stopPropagation();
    const reason = window.prompt("Why are you reporting this user? (Spam, Harassment, etc.)");
    if (!reason || !reason.trim()) return;
    try {
      await API.post("/reports", { reportedUser: chatId, reason: reason.trim() });
      toast.success("Report submitted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit report");
    }
  };

  return (
    <div className={styles.window}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <IoArrowBack size={20} />
        </button>
        <div 
          onClick={() => activeChat.type === "group" && setShowGroupInfo(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: activeChat.type === 'group' ? 'pointer' : 'default', flex: 1 }}
          title={activeChat.type === "group" ? "Click for Group Info" : ""}
        >
          <Avatar src={chatAvatar} name={chatName} size={40} />
          <div className={styles.headerInfo}>
            <div className={styles.headerName}>{chatName}</div>
            <div className={`${styles.headerSub} ${activeChat.data.status === "online" ? styles.online : ""}`}>
              {isTyping ? "typing..." : chatSubtitle}
            </div>
          </div>
        </div>
        
        {/* Actions for Users */}
        {activeChat?.type === "user" && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={styles.reportBtn} 
              onClick={handleReportUser}
              title="Report User"
            >
              Report
            </button>
            <button 
              className={styles.blockBtn} 
              onClick={handleToggleBlock}
              title={isBlockedByMe ? "Unblock User" : "Block User"}
            >
              {isBlockedByMe ? "Unblock" : "Block"}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loading && <div className={styles.loadingMsg}>Loading...</div>}
        {messages.map((msg) => {
          const isMine = (msg.sender._id || msg.sender) === user._id;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMine={isMine}
              onDelete={() => handleDelete(msg)}
              onReply={() => setReplyTo(msg)}
              onReact={(emoji) => handleReact(msg._id, emoji)}
              isGroup={activeChat.type === "group"}
            />
          );
        })}
        {isTyping && (
          <div className={styles.typingIndicator}>
            <span /><span /><span />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && !isBlockedByMe && (
        <div className={styles.replyPreview}>
          <div className={styles.replyContent}>
            <div className={styles.replyLabel}>Replying to</div>
            <div className={styles.replyText}>
              {replyTo.text || `📎 ${replyTo.fileType}`}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)}><IoClose size={18} /></button>
        </div>
      )}

      {/* File Preview */}
      {file && !isBlockedByMe && (
        <div className={styles.filePreview}>
          {preview
            ? <img src={preview} alt="preview" />
            : <div className={styles.fileIcon}>📄 {file.name}</div>}
          <button onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>
            <IoClose size={18} />
          </button>
        </div>
      )}

      {/* Input Area */}
      {!isBlockedByMe ? (
        <div className={styles.inputArea}>
          <button className={styles.iconBtn} onClick={() => setShowEmoji((v) => !v)} title="Emoji">
            <IoHappy size={22} />
          </button>

          {showEmoji && (
            <div className={styles.emojiPickerWrap}>
              <EmojiPicker onEmojiClick={(e) => { setText((t) => t + e.emoji); }} />
            </div>
          )}

          <button className={styles.iconBtn} onClick={() => fileRef.current?.click()} title="Attach file">
            <IoAttach size={22} />
          </button>
          <input ref={fileRef} type="file" hidden onChange={handleFileChange} />

          {isRecording ? (
            <div className={styles.recordingIndicator}>
               <span className={styles.blinkDot}></span> Recording Voice Note...
               <button className={styles.stopRecordingBtn} onClick={stopRecording}>
                 <IoStop size={20} /> Stop
               </button>
            </div>
          ) : (
            <textarea
              className={styles.input}
              placeholder="Type a message..."
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          )}

          {!text.trim() && !file && !isRecording ? (
             <button className={styles.iconBtn} onClick={startRecording} title="Record Voice">
               <IoMic size={22} />
             </button>
          ) : (
            <button
              className={`${styles.sendBtn} ${(text.trim() || file) ? styles.sendActive : ""}`}
              onClick={handleSend}
              disabled={sending || (!text.trim() && !file)}
              title="Send"
            >
              <IoSend size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className={styles.blockedArea}>
          You have blocked this user. Unblock them to send a message.
        </div>
      )}

      {showGroupInfo && activeChat?.type === "group" && (
        <GroupInfoModal group={activeChat} onClose={() => setShowGroupInfo(false)} />
      )}
    </div>
  );
}

function MessageBubble({ msg, isMine, onDelete, onReply, onReact, isGroup }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const QUICK_EMOJIS = ["❤️","😂","👍","😢","😡","🙏"];

  return (
    <div
      className={`${styles.msgRow} ${isMine ? styles.mine : styles.theirs}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {!isMine && isGroup && (
        <Avatar src={msg.sender?.avatar} name={msg.sender?.name} size={28} />
      )}
      <div className={styles.bubbleWrap}>
        <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs} ${msg.deleted ? styles.deletedBubble : ""}`}>
          {!isMine && isGroup && (
            <div className={styles.senderName}>{msg.sender?.name}</div>
          )}
          {msg.replyTo && (
            <div className={styles.replyQuote}>
              {msg.replyTo.text || `📎 ${msg.replyTo.fileType}`}
            </div>
          )}
          {msg.messageType === "file" && !msg.deleted && (
            <FileContent fileUrl={msg.fileUrl} fileType={msg.fileType} />
          )}
          {msg.text && <div className={styles.msgText} style={{ fontStyle: msg.deleted ? "italic" : "normal" }}>{msg.text}</div>}
          <div className={styles.msgMeta}>
            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {isMine && (
              <span className={styles.readTick}>
                {msg.isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>

        {/* Reactions Display */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`${styles.reactionsDisplay} ${isMine ? styles.reactionsMine : styles.reactionsTheirs}`}>
            {msg.reactions.map((r, i) => (
              <span key={i} className={styles.reactionItem}>{r.emoji}</span>
            ))}
          </div>
        )}
      </div>

      {showActions && !msg.deleted && (
        <div className={`${styles.actions} ${isMine ? styles.actionsLeft : styles.actionsRight}`}>
          <button onClick={onReply} title="Reply">↩</button>
          <button onClick={() => setShowReactionPicker(!showReactionPicker)} title="React">☺</button>
          {isMine && <button onClick={onDelete} title="Delete"><IoTrash size={14} /></button>}
        </div>
      )}

      {showReactionPicker && (
         <div className={`${styles.quickReactions} ${isMine ? styles.quickReactLeft : styles.quickReactRight}`}>
           {QUICK_EMOJIS.map(e => (
             <button key={e} onClick={() => { onReact(e); setShowReactionPicker(false); }}>{e}</button>
           ))}
         </div>
      )}
    </div>
  );
}

function FileContent({ fileUrl, fileType }) {
  if (!fileUrl) return null;

  if (fileType === "image") {
    return (
      <a href={fileUrl} target="_blank" rel="noreferrer">
        <img src={fileUrl} alt="shared" className={styles.imgMsg} />
      </a>
    );
  }
  if (fileType === "video") {
    return <video src={fileUrl} controls className={styles.videoMsg} />;
  }
  if (fileType === "audio") {
    return <audio src={fileUrl} controls className={styles.audioMsg} />;
  }
  return (
    <a href={fileUrl} download className={styles.fileDownload} target="_blank" rel="noreferrer">
      <IoDownload size={16} />
      {fileType?.toUpperCase()} File
    </a>
  );
}

function formatLastSeen(date) {
  if (!date) return "a while ago";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString();
}
