'use client'
import Link from 'next/link'

export default function LobbyItem({ id, title, players, tag, creator, status}) {
  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-sm flex items-center justify-between border">
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <div className="flex gap-2 text-xs text-gray-500">
          <span>{tag}</span>
          {creator && <span>• Host: {creator}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-700">👥 {players}</p>
        <h4 className="text-sm text-gray-700">{status}</h4>
        <Link 
          href={`/games/ludo/${id}`} // Use the correct URL for the game pageludo/${id}`}
          className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700"
        >
          Join
        </Link>
      </div>
    </div>
  )
}