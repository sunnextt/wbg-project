'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import DiceAnimator from './DiceAnimator'
import { useSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  gameState,
  onPawnMove,
}) {
  const ludoBoardRef = useRef()
  const socket = useSocket()
  const [localDiceValue, setLocalDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [remoteRollingPlayer, setRemoteRollingPlayer] = useState(null)

  // Sync dice value with game state
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
        setLocalDiceValue(0) // Reset for animation
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

      // Start rolling (visible to all players)
      await updateDoc(gameRef, {
        isRolling: true,
        rollingPlayerId: currentPlayerId,
        diceValue: 0, // Reset while rolling
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
      console.error('Failed to start dice roll:', error)
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
    } catch (error) {
      console.error('Failed to update dice value:', error)
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

  const getRollingStatus = () => {
    if (isRolling) return currentPlayerId !== currentTurn? `${currentTurnName} is rolling...` : 'You are rolling...'
    if (currentPlayerId !== currentTurn) return `${currentTurnName} is making move`
    return null
  }

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

  // console.log(isRolling)

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />

      <Canvas shadows camera={{ position: [0, 25, 0], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset='sunset' />

        <group scale={[1.6, 1.6, 1.6]}>
          <LudoBoard
            ref={ludoBoardRef}
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onPawnMove={handlePawnMove}
            players={players}
            socket={socket}
            gameId={gameId}
          />
        </group>
        {ludoBoardRef.current?.diceRef && (
          <DiceAnimator
            diceRef={ludoBoardRef.current.diceRef}
            trigger={isRolling}
            rollingPlayerId={remoteRollingPlayer}
            currentPlayerId={currentPlayerId}
            onFinish={handleRollComplete}
            currentValue={localDiceValue}
          />
        )}

        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} target={[0, 0, 0]} />
      </Canvas>

      {/* Game UI Controls */}
      <div className='absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2'>
        {gameStatus == 'playing' && getRollingStatus() && (
          <div className='text-white text-lg font-semibold bg-black bg-opacity-70 px-4 py-2 rounded-full'>
            {getRollingStatus()}
          </div>
        )}
        <button
          onClick={handleRollDice}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
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

      {/* Turn indicator */}
{gameStatus == 'playing' && 
  <div className='absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-20'>
    {currentPlayerId === currentTurn ? 'Your turn!' : `${currentTurnName}'s turn`}
  </div>
}
    </div>
  )
}
