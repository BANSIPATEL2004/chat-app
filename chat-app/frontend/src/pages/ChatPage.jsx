import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <div className="h-screen flex overflow-hidden bg-surface-950">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
