import { useState } from "react";
import useGameChat from "./useGameChat";
import { useAuth } from "@/lib/AuthContext";

export default function GameChat({ gameId }) {
  const { user } = useAuth();
  const { messages, sendMessage } = useGameChat(gameId);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const quickMessages = [
  "Good luck! 🎲",
  "Well played 👏",
  "Oops 😅",
  "Hurry up ⏳",
  "Haha 😂",
  "Nice move 👍",
  "Close one 😮",
  "GG 🎉",
];

  const handleSend = (msg) => {
    const messageToSend = msg || input;
    if (messageToSend.trim()) {
      sendMessage(messageToSend);
      setInput("");
    }
  };

if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-2 right-4 bg-gradient-to-br from-purple-700 to-blue-600 text-white p-3 rounded-full shadow-lg hover:from-purple-600 hover:to-blue-500 transition-all z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute bottom-2 right-4 w-80 bg-gradient-to-br from-purple-900 to-blue-800 rounded-lg shadow-xl border border-purple-600/30 z-50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-700 to-blue-600 text-white rounded-t-lg border-b border-purple-500/30">
        <h3 className="font-semibold">Team Chat</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
<div className="h-64 overflow-y-auto p-3 space-y-2 bg-gradient-to-br from-purple-50/40 via-blue-50/30 to-purple-50/40">
        {messages.length === 0 ? (
          <div className="text-center text-purple-200/70 text-sm py-8">
            No messages yet
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.senderId === user?.uid ? "items-end" : "items-start"
              }`}
            >
              <div className="text-xs text-purple-200/80 mb-1">
                {m.senderName}
              </div>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm backdrop-blur-sm ${
                  m.senderId === user?.uid
                    ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-lg"
                    : "bg-gray-800/60 text-purple-100 border border-purple-500/30"
                }`}
              >
                {m.text}
              </div>
              <div className="text-xs text-purple-300/60 mt-1">
                {new Date(m.timestamp?.toDate?.() || m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Messages */}
      <div className="p-2 border-t border-purple-600/30 bg-gradient-to-r from-purple-800/90 to-blue-800/90">
        <div className="flex flex-wrap gap-1 mb-2">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => handleSend(msg)}
              className="px-2 py-1 text-xs bg-purple-700/40 text-purple-100 rounded border border-purple-500/30 hover:bg-purple-600/60 transition-all hover:scale-105"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 px-3 py-2 text-sm bg-purple-800/40 text-purple-100 border border-purple-500/30 rounded-l focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-purple-300/60"
            placeholder="Type message..."
          />
          <button
            onClick={() => handleSend()}
            className="px-4 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-r hover:from-purple-500 hover:to-blue-400 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}