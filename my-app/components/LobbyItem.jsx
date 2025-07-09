// components/LobbyItem.jsx
export default function LobbyItem({ title, players, tag }) {
  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-between border">
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-500">{tag}</span>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-700">👥 {players}</p>
        <button className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700">
          Join Lobby
        </button>
      </div>
    </div>
  )
}
