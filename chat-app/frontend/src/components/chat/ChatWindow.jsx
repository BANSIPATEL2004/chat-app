import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useSocket } from "../../context/SocketContext";
import { useTyping } from "../../hooks/useTyping";
import { uploadAPI } from "../../api";
import EmojiPicker from "emoji-picker-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Avatar from "../ui/Avatar";
import AddMemberModal from "./AddMemberModal";
import GroupInfo from "./GroupInfo";
import ImagePreviewModal from "./ImagePreviewModal";
import ForwardModal from "./ForwardModal";
import { formatLastSeen } from "../../utils/date";
import toast from "react-hot-toast";

export default function ChatWindow() {
  const { user } = useAuth();
  const { 
    selectedUser, setSelectedUser, 
    selectedGroup, setSelectedGroup, 
    messages, loadingMessages, 
    sendMessage, deleteMessage,
    clearChat, deleteGroup, leaveGroup,
    addMemberToGroup, toggleReaction,
    pinMessage, unpinMessage,
    isTyping 
  } = useChat();
  const { isOnline } = useSocket();
  const { startTyping, stopTyping } = useTyping(selectedGroup ? selectedGroup._id : selectedUser?._id);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length <= 20 ? "auto" : "smooth");
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (selectedUser || selectedGroup) {
      inputRef.current?.focus();
      scrollToBottom("auto");
    }
  }, [selectedUser, selectedGroup, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input, "text", replyingTo?._id);
      setInput("");
      setReplyingTo(null);
      stopTyping();
    } catch (err) {
      console.error("Send failed", err);
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const { data } = await uploadAPI.upload(formData);
      await sendMessage(data.data.url, type, replyingTo?._id);
      setReplyingTo(null);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIsImagePreviewOpen(true);
    }
    e.target.value = null; // Clear input
  };

  const handleConfirmUpload = async () => {
    if (selectedFile) {
      await handleUpload(selectedFile, "image");
      setIsImagePreviewOpen(false);
      setSelectedFile(null);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Browser not supported for recording");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: "audio/webm" });
        await handleUpload(file, "audio");
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        toast.error("Microphone not found. Please plug in a mic.");
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please enable it.");
      } else {
        toast.error("Could not access microphone");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const onEmojiClick = (emojiObject) => {
    setInput((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const online = selectedUser ? isOnline(selectedUser._id) : false;
  const typing = (selectedGroup || selectedUser) ? isTyping(selectedGroup?._id || selectedUser?._id) : false;

  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  const groupedMessages = filteredMessages.reduce((groups, msg, idx) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    const prevMsg = filteredMessages[idx - 1];
    const showAvatar = !prevMsg || prevMsg.sender._id !== msg.sender._id;
    groups[date].push({ msg, showAvatar });
    return groups;
  }, {});

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-surface-950 p-8">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-surface-800 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-surface-700">
            <svg className="w-10 h-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Start a conversation</h2>
          <p className="text-surface-300 text-sm max-w-xs">
            Select a person from the sidebar to start chatting in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-fade-in relative z-50">
      <div className="flex-1 flex flex-col h-full bg-surface-950">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-surface-900/80 backdrop-blur-md shadow-sm z-10">
          {/* Back Button (Mobile) */}
          <button 
            onClick={() => {
              setSelectedUser(null);
              setSelectedGroup(null);
            }}
            className="md:hidden p-2 -ml-2 text-surface-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        {selectedGroup ? (
          <Avatar user={{ avatar: selectedGroup.avatar, username: selectedGroup.name }} size="md" />
        ) : (
          <Avatar user={selectedUser} size="md" showOnline isOnline={online} />
        )}
        <div 
          className="flex-1 min-w-0 cursor-pointer hover:bg-surface-800/50 p-1 rounded-lg transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <h3 className="font-semibold text-white">{selectedGroup ? selectedGroup.name : selectedUser.username}</h3>
          <p className="text-xs text-surface-300">
            {selectedGroup ? (
              `${selectedGroup.members.length} members`
            ) : typing ? (
              <span className="text-brand-400 font-medium animate-pulse">typing...</span>
            ) : online ? (
              <span className="text-emerald-400">Online</span>
            ) : (
              `Last seen ${formatLastSeen(selectedUser.lastSeen)}`
            )}
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-all ${showSearch ? "text-brand-400 bg-brand-500/10" : "text-surface-400 hover:text-white hover:bg-surface-800"}`}
            title="Search in chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-all ${showInfo ? "text-brand-400 bg-brand-500/10" : "text-surface-400 hover:text-white hover:bg-surface-800"}`}
            title="Info"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-2 rounded-lg transition-all ${showMoreMenu ? "text-white bg-surface-800" : "text-surface-400 hover:text-white hover:bg-surface-800"}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-surface-900 border border-surface-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear this chat?")) clearChat();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-surface-200 hover:bg-surface-800 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Chat
                  </button>
                
                {selectedGroup && (
                  <>
                    <div className="border-t border-surface-700" />
                    {selectedGroup.admin === user._id && (
                      <button
                        onClick={() => {
                          setIsAddMemberModalOpen(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Member
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to leave this group?")) leaveGroup(selectedGroup._id);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-surface-200 hover:bg-surface-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Group
                    </button>
                    
                    {selectedGroup.admin === user._id && (
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this group?")) deleteGroup(selectedGroup._id);
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-surface-700 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Group
                      </button>
                    )}
                  </>
                )}
                </div>
              </>
            )}
          </div>
        </div>
        </div>

      {/* In-Chat Search Bar */}
      {showSearch && (
        <div className="bg-surface-900 border-b border-surface-800 px-4 py-2 flex items-center gap-3 animate-slide-down">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              placeholder="Search in conversation..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-surface-950 border border-surface-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <button 
            onClick={() => {
              setShowSearch(false);
              setChatSearchQuery("");
            }}
            className="text-xs font-medium text-surface-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {selectedGroup?.pinnedMessages?.length > 0 && (
        <div className="bg-surface-900/80 backdrop-blur-md border-b border-surface-800 px-6 py-2 flex items-center justify-between animate-slide-down sticky top-0 z-40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-1.5 bg-brand-600/20 rounded-lg">
              <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v4l2 2v2h-1v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5H3v-2l2-2V4z" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Pinned Message</p>
              <p className="text-xs text-surface-200 truncate">
                {selectedGroup.pinnedMessages[selectedGroup.pinnedMessages.length - 1].content}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedGroup.admin === user._id && (
              <button 
                onClick={() => unpinMessage(selectedGroup.pinnedMessages[selectedGroup.pinnedMessages.length - 1]._id)}
                className="text-surface-400 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {loadingMessages ? (
          <div className="flex justify-center py-8">
            <svg className="w-6 h-6 text-surface-300 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-300 py-8">
            <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mb-4 border border-surface-700">
              <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-surface-200">No messages yet</p>
            <p className="text-xs mt-1">Say hi to {selectedGroup ? selectedGroup.name : selectedUser.username}! 👋</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgGroup]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-surface-800" />
                <span className="text-xs text-surface-300 bg-surface-950 px-2 whitespace-nowrap">
                  {new Date(date).toDateString() === new Date().toDateString()
                    ? "Today"
                    : new Date(date).toDateString() === new Date(Date.now() - 86400000).toDateString()
                    ? "Yesterday"
                    : date}
                </span>
                <div className="flex-1 h-px bg-surface-800" />
              </div>
              <div className="space-y-1">
                {msgGroup.map(({ msg }) => (
                  <MessageBubble 
                    key={msg._id} 
                    message={msg} 
                    isGroup={!!selectedGroup} 
                    onReply={setReplyingTo} 
                    onForward={setForwardingMessage}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {typing && <TypingIndicator username={selectedUser?.username} />}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 bg-surface-950/40 backdrop-blur-lg">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-surface-800/80 p-3 rounded-t-2xl shadow-sm animate-slide-up">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-1 h-8 bg-brand-500 rounded-full" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-brand-400">Replying to {replyingTo.sender.username}</p>
                <p className="text-xs text-surface-400 truncate">
                  {replyingTo.messageType === "text" ? replyingTo.content : `[${replyingTo.messageType}]`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1 text-surface-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1 relative flex items-end gap-2">
            <div className="relative">
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme="dark"
                    searchDisabled
                    skinTonesDisabled
                  />
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
            />

            <div className="flex-1 flex items-center bg-surface-800/50 rounded-2xl px-2 transition-all shadow-lg backdrop-blur-md">
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-surface-200">Recording... {formatRecordingTime(recordingTime)}</span>
                  </div>
                  <button 
                    onClick={stopRecording}
                    className="text-red-400 hover:text-red-300 font-semibold text-sm"
                  >
                    Stop & Send
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-surface-400 hover:text-brand-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="p-2.5 text-surface-400 hover:text-brand-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedGroup ? selectedGroup.name : selectedUser.username}...`}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-surface-100 placeholder:text-surface-500 py-3 px-2 resize-none max-h-32 text-sm"
                    rows="1"
                  />
                </>
              )}
            </div>

            {input.trim() || isRecording ? (
              <button
                onClick={isRecording ? stopRecording : handleSend}
                disabled={sending || uploading}
                className={`p-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center ${
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse shadow-red-500/20" 
                    : "bg-brand-600 text-white hover:bg-brand-500 shadow-brand-600/20"
                }`}
              >
                {sending || uploading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isRecording ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 rotate-45" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3.5 bg-surface-800 text-surface-400 hover:text-brand-400 hover:bg-surface-700 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-surface-300 mt-2 pl-1">
          Press <kbd className="bg-surface-700 px-1.5 py-0.5 rounded text-xs font-mono">Enter</kbd> to send • <kbd className="bg-surface-700 px-1.5 py-0.5 rounded text-xs font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>

      <GroupInfo isOpen={showInfo} onClose={() => setShowInfo(false)} />

      <ImagePreviewModal
        isOpen={isImagePreviewOpen}
        onClose={() => {
          setIsImagePreviewOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onSend={handleConfirmUpload}
        loading={uploading}
      />

      <ForwardModal 
        isOpen={!!forwardingMessage} 
        onClose={() => setForwardingMessage(null)} 
        message={forwardingMessage} 
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        groupId={selectedGroup?._id}
        currentMembers={selectedGroup?.members || []}
      />
    </div>
    </div>
  );
}
