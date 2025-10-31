'use client'

import { Canvas } from '@react-three/fiber'
import { useGLTF, OrthographicCamera, Environment, OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import Dice from './Dice'
import GameChat from '../gameChat/GameChat'
import { useSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getColorHex } from '@/src/utils/ludoUtils'
import { Toaster } from 'react-hot-toast'

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
  const { socket } = useSocket()
  const [localDiceValue, setLocalDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [remoteRollingPlayer, setRemoteRollingPlayer] = useState(null)
  const [screenSize, setScreenSize] = useState('desktop')

  // Detect mobile screen
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width <= 460) setScreenSize('small')
      else setScreenSize('desktop')
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Sync game state values
  useEffect(() => {
    if (gameState?.diceValue !== undefined) setLocalDiceValue(gameState.diceValue)
    if (gameState?.isRolling !== undefined) setIsRolling(gameState.isRolling)
    if (gameState?.rollingPlayerId !== undefined) setRemoteRollingPlayer(gameState.rollingPlayerId)
  }, [gameState])

  // Update current player name
  useEffect(() => {
    const player = players.find((p) => p.id === currentTurn)
    setCurrentTurnName(player?.name || '')
  }, [currentTurn, players])

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
      setIsRolling(true)
      setLocalDiceValue(0)
    } catch (error) {
      toast.error('Failed to start dice roll')
    }
  }

  const handleRollComplete = async (result) => {
    try {
      setLocalDiceValue(result)
      setIsRolling(false)
      onRollDice(result)
    } catch {
      setIsRolling(false)
    }
  }

  const handleRollDice = () => {
    if (canRollDice()) handleRollStart()
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

  const getButtonText = () => {
    if (isRolling) return 'Rolling...'
    if (remoteRollingPlayer) return 'Wait for roll...'
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId !== currentTurn) return `Waiting for ${currentTurnName}`
    return gameState?.diceValue ? 'Make Your Move' : 'ROLL DICE 🎲'
  }

  const handlePawnMove = (moveData) => {
    onPawnMove?.({
      gameId,
      playerId: currentPlayerId,
      pawnId: `${moveData.color}-${moveData.pawnIndex}`,
      newPosition: moveData.newPosition,
      timestamp: Date.now(),
    })
  }

  return (
    <div
      className={`relative w-full ${screenSize === 'small' ? 'h-96' : 'h-screen'}  overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600`}
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />

      {/* Scaled Canvas container */}
      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        <OrthographicCamera makeDefault position={[0, 25, 0]} zoom={screenSize === 'small' ? 28 : 45} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
        <Environment preset='park' />

        <LudoBoard
          ref={ludoBoardRef}
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          currentTurn={currentTurn}
          onPawnMove={currentTurn === currentPlayerId && handlePawnMove}
          passTurn={passTurn}
          players={players}
          socket={socket}
          gameId={gameId}
          nodes={nodes}
          materials={materials}
        />

        <Dice
          onRollEnd={currentTurn === currentPlayerId && handleRollComplete}
          isRolling={isRolling}
          rollingPlayerId={currentTurn}
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

      {/* Toasts */}
      <Toaster
        position='bottom-center'
        containerStyle={{ position: 'absolute', bottom: '80px', zIndex: 1000 }}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(to right, #6d28d9, #2563eb)',
            color: '#fff',
            borderRadius: '0.5rem',
            padding: '10px 14px',
            fontSize: '0.8rem',
            maxWidth: '280px',
          },
        }}
      />

      <GameChat gameId={gameId} gameStatus={gameStatus} />

      {/* Roll Button */}
      <div
        className={`absolute bottom-8  gap-2   ${
          screenSize === 'small' ? 'left-1/2 transform -translate-x-12' : 'left-0 right-0 flex flex-col items-center'
        }`}
      >
        <button
          onClick={handleRollDice}
          className={` md:px-8 md:py-3 text-sm md:text-lg rounded-full font-bold shadow-lg 
            
            transition-all 
   ${screenSize === 'small' ? 'px-2 py-2' : 'px-8 py-3'}
        
            
            ${
              canRollDice()
                ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
                : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            } ${isRolling || remoteRollingPlayer ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
          disabled={!canRollDice()}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Dice Value */}
      {(gameState?.diceValue || localDiceValue > 0) && (
        <div
          className={`absolute top-4 bg-black bg-opacity-70 text-white p-2 rounded-lg z-10
            ${screenSize === 'small' ? 'top-40 text-sm right-2' : 'top-4  right-4'}
          `}
        >
          {screenSize === 'small' ? 'dice' :'🎲 Dice' }: {gameState?.diceValue || localDiceValue}
        </div>
      )}

      {/* Player Colors */}
      {gameStatus === 'playing' && (
        <div className='absolute md:absolute md:top-20 md:bottom-auto left-2 bg-black bg-opacity-70 text-white p-2 md:p-4 sm:p-4  rounded-lg z-20 absolute bottom-2 top-auto'>
          <h3 className='text-sm md:text-lg font-bold mb-2'>Player Colors</h3>
          <div className='space-y-1 md:space-y-2'>
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-start space-x-2 text-xs md:text-sm ${
                  player.id === currentPlayerId ? 'bg-gray-700 p-2 rounded' : ''
                }`}
              >
                <div
                  className='w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white'
                  style={{
                    backgroundColor: getColorHex(player.color),
                    boxShadow: player.id === currentTurn ? '0 0 8px 2px white' : 'none',
                  }}
                />
                <span>
                  {player.name} {player.id === currentPlayerId && '(You)'}
                  {player.id === currentTurn && ' 🎯'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turn Indicator */}
      {gameStatus === 'playing' && (
        <div
          className={`absolute bg-black bg-opacity-70 text-white p-2 md:p-3 rounded-lg z-20 text-xs md:text-base
            ${screenSize === 'small' ? 'top-0 right-2' : 'top-4 left-4'}`}
        >
          {currentPlayerId === currentTurn ? 'Your turn!' : `${currentTurnName}'s turn`}
        </div>
      )}
    </div>
  )
}

useGLTF.preload('/ludo_board_games.glb')
