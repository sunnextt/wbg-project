'use client'

import { useParams } from 'next/navigation'
import useLudoGameManager from '@/components/LudoGameManager'
import LudoCanvas from '@/components/ludo/LudoCanvas'
import GameStatusBanner from '@/components/GameStatusBanner'
import GameControls from '@/components/GameControls'
import PlayerList from '@/components/PlayerList'

export default function LudoGamePage() {
  const { gameId } = useParams()
  const {
    gameState,
    players,
    gameStatus,
    currentTurn,
    joinGame,
    startGame,
    leaveGame,
    makeMove,
    currentPlayerId,
    isGameCreator,
    currentPlayer,
    isLoading,
    error,
    handleDiceRoll,
  } = useLudoGameManager(gameId)

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-red-500 text-xl'>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-red-500 text-xl'>{error}</div>
      </div>
    )
  }

  return (
    <main className='bg-green-50 min-h-screen'>
      <div className='container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6'>
        <div className='lg:col-span-9 flex flex-col items-center'>
          <div className='w-full max-w-4xl'>
            <GameStatusBanner
              status={gameStatus}
              playerCount={players.length}
              currentTurn={currentTurn}
              players={players}
              currentPlayerId={currentPlayerId}
            />

            <LudoCanvas
              gameId={gameId}
              players={players}
              gameStatus={gameStatus}
              currentTurn={currentTurn}
              currentPlayerId={currentPlayerId}
              onRollDice={handleDiceRoll}
            />

            <GameControls
              gameStatus={gameStatus}
              players={players}
              currentPlayerId={currentPlayerId}
              isGameCreator={isGameCreator}
              currentPlayer={currentPlayer}
              onJoin={joinGame}
              onStart={startGame}
              onLeave={leaveGame}
            />
          </div>
        </div>

        <div className='lg:col-span-3 space-y-6'>
          <PlayerList players={players} currentPlayerId={currentPlayerId} />

          <section>
            <h3 className='text-md font-semibold text-gray-700 mb-2'>Game Info</h3>
            <div className='bg-white p-4 rounded-lg shadow'>
              <p>Status: {gameStatus}</p>
              <p>Players: {players.length}/4</p>
              {gameStatus === 'playing' && <p>Current Turn: {players.find((p) => p.id === currentTurn)?.name}</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
