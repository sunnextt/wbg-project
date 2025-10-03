'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

export default function GameControls({ gameStatus, players, onJoin, onStart, onLeave }) {
  const { user } = useAuth()
  const router = useRouter() 

  const isInGame = players.some((p) => p.id === user?.uid)

  const canStart = isInGame && players.length >= 2 && gameStatus === 'waiting'
  const canJoin = !isInGame && players.length < 4 && gameStatus === 'waiting'

  return (
    <div className='flex flex-col items-center justify-center gap-4 mt-4 mb-4'>
      {canJoin && (
        <button onClick={onJoin} className='bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg'>
          Join Game
        </button>
      )}

      {canStart && (
        <button onClick={onStart} className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg'>
          Start Game
        </button>
      )}

      {gameStatus === 'playing' && isInGame && (
        <div className='text-center py-2 text-gray-600'>Game in progress - waiting for your turn</div>
      )}

      {isInGame && (

        <button
          onClick={async () => {
            const success = await onLeave()
            if (success) {
              router.push('/')
            }
          }}
          className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 mt-2 rounded-lg'
        >
          Leave Game
        </button>
      )}
    </div>
  )
}
