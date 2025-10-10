'use client'

export default function PlayerList({ players, currentPlayerId }) {
  return (
    <section className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-md font-semibold text-gray-700 mb-2">Players</h3>
      <ul className="space-y-2">
        {players.map(player => (
          <li
            key={player.id}
            className={`p-2 rounded-lg ${
              player.id === currentPlayerId
                ? 'bg-yellow-100 font-bold'
                : 'bg-gray-50'
            }`}
          >
            <span>{player.name}</span>
            <span className="ml-2 text-sm text-gray-500">({player.color})</span>
            {player.resigned && (
              <span className="ml-2 text-xs text-red-500">Resigned</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
