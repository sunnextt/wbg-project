// components/GameStatusBanner.jsx
'use client'
export default function GameStatusBanner({ status, playerCount, currentPlayerId }) {
  const getStatusMessage = () => {
    switch(status) {
      case 'waiting':
        return playerCount < 2 
          ? `Waiting for players (${playerCount}/4)`
          : 'Ready to start!'
      case 'playing':
        return 'Game in progress'
      case 'finished':
        return 'Game completed'
      default:
        return 'Loading game...'
    }
  }

  return (
    <div className={`p-3 mb-4 rounded-lg text-center font-medium ${
      status === 'waiting' ? 'bg-blue-100 text-blue-800' :
      status === 'playing' ? 'bg-yellow-100 text-yellow-800' :
      'bg-green-100 text-green-800'
    }`}>
      {getStatusMessage()}
    </div>
  )
}