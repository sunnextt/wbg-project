'use client'

import { Canvas } from '@react-three/fiber'
import { useGLTF, OrthographicCamera } from '@react-three/drei'
import { OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import { useSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Dice from './Dice'
import GameStatusDisplay from '../GameStatusDisplay'
import { getColorHex } from '@/src/utils/ludoUtils'
import GameChat from '../gameChat/GameChat'

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  gameState,
  onPawnMove,
  onRollDice,
  passTurn,
}) {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  const ludoBoardRef = useRef()
  const socket = useSocket()
  const [localDiceValue, setLocalDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [remoteRollingPlayer, setRemoteRollingPlayer] = useState(null)

  useEffect(() => {
    if (gameState?.diceValue !== undefined) {
      setLocalDiceValue(gameState.diceValue)
    }
    if (gameState?.isRolling !== undefined) {
      setIsRolling(gameState?.isRolling)
    }
    if (gameState?.rollingPlayerId !== undefined) {
      setRemoteRollingPlayer(gameState?.rollingPlayerId)
    }
  }, [gameState?.diceValue, gameState?.isRolling, gameState?.rollingPlayerId])

  // Update current player name
  useEffect(() => {
    const player = players.find((p) => p.id === currentTurn)
    setCurrentTurnName(player?.name || '')
  }, [currentTurn, players])

  // Socket listeners
  useEffect(() => {
    if (!socket) return

    const handleRollStart = (data) => {
      if (data.gameId === gameId && data.playerId !== currentPlayerId) {
        setRemoteRollingPlayer(data.playerId)
        setLocalDiceValue(0)
      }
    }

    const handleRollComplete = (data) => {
      if (data.gameId === gameId) {
        setRemoteRollingPlayer(null)
        setLocalDiceValue(data.value)
      }
    }

    socket.on('dice-roll-start', handleRollStart)
    socket.on('dice-roll-complete', handleRollComplete)

    return () => {
      socket.off('dice-roll-start', handleRollStart)
      socket.off('dice-roll-complete', handleRollComplete)
    }
  }, [socket, gameId, currentPlayerId])

  const handleRollStart = async () => {
    try {
      const gameRef = doc(db, 'games', gameId)

      await updateDoc(gameRef, {
        isRolling: true,
        rollingPlayerId: currentPlayerId,
        diceValue: 0,
        lastAction: {
          type: 'dice_roll_start',
          playerId: currentPlayerId,
          timestamp: serverTimestamp(),
        },
      })

      socket.emit('dice-roll-start', {
        gameId,
        playerId: currentPlayerId,
        timestamp: Date.now(),
      })

      setIsRolling(true)
      setLocalDiceValue(0)
    } catch (error) {
      toast.error('Failed to start dice roll')
    }
  }

  const handleRollComplete = async (result) => {
    try {
      const gameRef = doc(db, 'games', gameId)

      await updateDoc(gameRef, {
        isRolling: false,
        rollingPlayerId: null,
        diceValue: result,
        lastAction: {
          type: 'dice_roll_complete',
          value: result,
          playerId: currentPlayerId,
          timestamp: serverTimestamp(),
        },
      })

      socket.emit('dice-roll-complete', {
        gameId,
        playerId: currentPlayerId,
        value: result,
        timestamp: Date.now(),
      })

      setLocalDiceValue(result)
      setIsRolling(false)

      onRollDice(result)
    } catch (error) {
      toast.error('Failed to update dice roll')
      setIsRolling(false)
    }
  }

  const handleRollDice = () => {
    if (canRollDice()) {
      handleRollStart()
    }
  }

  const canRollDice = () => {
    return (
      !isRolling &&
      !remoteRollingPlayer &&
      currentPlayerId === currentTurn &&
      gameStatus === 'playing' &&
      !gameState?.diceValue
    )
  }

  // const getRollingStatus = () => {
  //   if (isRolling) return currentPlayerId !== currentTurn ? `${currentTurnName} is rolling...` : 'You are rolling...'
  //   if (currentPlayerId !== currentTurn) return `${currentTurnName} is making move`
  //   return null
  // }

  const getButtonText = () => {
    if (isRolling) return 'Rolling...'
    if (remoteRollingPlayer) return 'Wait for roll...'
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId !== currentTurn) return `Waiting for ${currentTurnName}`
    return gameState?.diceValue ? 'Make Your Move' : 'ROLL DICE 🎲'
  }

  const handlePawnMove = (moveData) => {
    if (onPawnMove) {
      onPawnMove({
        gameId,
        playerId: currentPlayerId,
        pawnId: `${moveData.color}-${moveData.pawnIndex}`,
        newPosition: moveData.newPosition,
        timestamp: Date.now(),
      })
    }
  }

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />

      <Canvas
        shadows
        // camera={{ position: [0, 25, 0], fov: 45, far: 1000 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <OrthographicCamera makeDefault position={[0, 25, 0]} zoom={45} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <Environment preset='sunset' />

        <LudoBoard
          ref={ludoBoardRef}
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          onPawnMove={handlePawnMove}
          passTurn={passTurn}
          players={players}
          socket={socket}
          gameId={gameId}
          nodes={nodes}
          materials={materials}
        />

        <Dice
          onRollEnd={handleRollComplete}
          isRolling={isRolling}
          rollingPlayerId={remoteRollingPlayer || currentPlayerId}
          currentPlayerId={currentPlayerId}
          currentValue={localDiceValue}
        />

        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Game UI Controls */}

      <GameStatusDisplay />
      <GameChat gameId={gameId} players={players} />


      <div className='absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2'>
        <button
          onClick={handleRollDice}
          className={`px-6 py-2 rounded-full font-bold text-base shadow-lg transition-all md:px-8 md:py-2 md:text-lg
            ${
              canRollDice()
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            } 
            ${isRolling || remoteRollingPlayer ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
          disabled={!canRollDice()}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Dice value display */}
      {(gameState?.diceValue || localDiceValue > 0) && (
        <div className='absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10'>
          Dice: {gameState?.diceValue || localDiceValue}
        </div>
      )}

      {/* Player Color Indicators */}
      {gameStatus === 'playing' && (
        <div className='absolute md:absolute md:top-20 md:bottom-auto left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-20 absolute bottom-2 top-auto'>
          <h3 className='text-lg font-bold mb-2'>Player Colors</h3>
          <div className='space-y-2'>
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center space-x-2 p-2 rounded ${
                  player.id === currentPlayerId ? 'bg-gray-700' : ''
                }`}
              >
                <div
                  className='w-4 h-4 rounded-full border-2 border-white'
                  style={{
                    backgroundColor: getColorHex(player.color),
                    boxShadow: player.id === currentTurn ? '0 0 8px 2px white' : 'none',
                  }}
                />
                <span className='text-sm'>
                  {player.name} {player.id === currentPlayerId && '(You)'}
                  {player.id === currentTurn && ' 🎯'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      {gameStatus == 'playing' && (
        <div className='absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-20'>
          {currentPlayerId === currentTurn ? 'Your turn!' : `${currentTurnName}'s turn`}
        </div>
      )}
    </div>
  )
}

useGLTF.preload('/ludo_board_games.glb')
