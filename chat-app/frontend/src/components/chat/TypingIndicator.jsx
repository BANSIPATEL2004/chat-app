export default function TypingIndicator({ username }) {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="msg-bubble-received flex items-center gap-1.5 py-3">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
