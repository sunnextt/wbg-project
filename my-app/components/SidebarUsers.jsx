"use client"
import { useState } from "react"
import { X } from "lucide-react"

const friendsList = [
  { id: 1, name: "GamerGirl77", status: "Playing Ludo Frenzy" },
  { id: 2, name: "PixelKing", status: "In Trivia Lobby" },
  { id: 3, name: "GameGuru", status: "Ready to play" },
  { id: 4, name: "MysticPlayer", status: "Searching lobby" },
]

export default function SidebarFriends() {
  const [openChats, setOpenChats] = useState([])

  const toggleChat = (friend) => {
    if (openChats.find((f) => f.id === friend.id)) return
    setOpenChats([...openChats, friend])
  }

  const closeChat = (id) => {
    setOpenChats(openChats.filter((f) => f.id !== id))
  }

  return (
    <>
      {/* Online Friends List */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between mb-2">
          <h3 className="font-semibold">🧑‍🤝‍🧑 Online Friends</h3>
          <span className="text-xs text-gray-500">Chat</span>
        </div>
        <ul className="space-y-3">
          {friendsList.map((friend) => (
            <li
              key={friend.id}
              onClick={() => toggleChat(friend)}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
            >
              <div className="w-8 h-8 bg-pink-200 rounded-full flex items-center justify-center font-bold text-pink-800">
                {friend.name[0]}
              </div>
              <div className="text-sm">
                <div className="font-medium">{friend.name}</div>
                <div className="text-xs text-gray-500">{friend.status}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Tabs (Bottom right) */}
      <div className="fixed bottom-0 right-4 flex gap-4 z-50">
        {openChats.map((friend) => (
          <div
            key={friend.id}
            className="bg-white w-72 shadow-xl rounded-t-xl border border-gray-200 flex flex-col"
          >
            <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-2 rounded-t-xl">
              <span className="font-semibold">{friend.name}</span>
              <button onClick={() => closeChat(friend.id)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-3 h-40 overflow-y-auto text-sm text-gray-600">
              <p><strong>{friend.name}:</strong> Hey, wanna play?</p>
              <p><strong>You:</strong> Sure! Let's go!</p>
            </div>
            <div className="p-2 border-t">
              <input
                type="text"
                className="w-full text-sm px-2 py-1 border rounded"
                placeholder="Type a message..."
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
