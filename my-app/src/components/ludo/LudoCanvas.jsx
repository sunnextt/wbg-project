'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import Dice from './Dice'
import DiceAnimator from './DiceAnimator'

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  onRollDice,
  gameState,
  onPawnMove
}) {
  const diceRef = useRef()
  const [triggerRoll, setTriggerRoll] = useState(false)
  const [localDiceValue, setLocalDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')

  // Sync dice value with game state
  useEffect(() => {
    if (gameState?.diceValue && gameState.diceValue !== localDiceValue) {
      setLocalDiceValue(gameState.diceValue)
    }
  }, [gameState?.diceValue])

  useEffect(() => {
    const player = players.find(p => p.id === currentTurn)
    setCurrentTurnName(player?.name || '')
  }, [currentTurn, players])

  const handleRollComplete = (result) => {
    console.log('Dice roll complete:', result)
    setLocalDiceValue(result)
    onRollDice(result) // This should update the game state
    setTriggerRoll(false)
  }

  const handleRollDice = () => {
    if (canRollDice()) {
      setTriggerRoll(true)
      setLocalDiceValue(0) // Reset dice value while rolling
    }
  }

  const canRollDice = () => {
    return !triggerRoll && 
           currentPlayerId === currentTurn && 
           gameStatus === 'playing'
  }

  const getButtonText = () => {
    if (triggerRoll) return 'Rolling...'
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId === currentTurn) return 'ROLL DICE 🎲'
    return `Waiting for ${currentTurnName}`
  }

  const handlePawnMove = (moveData) => {
    if (onPawnMove) {
      onPawnMove({
        gameId,
        playerId: currentPlayerId,
        pawnId: `${moveData.color}-${moveData.pawnIndex}`,
        newPosition: moveData.newPosition,
        timestamp: Date.now()
      })
    }
  }

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />
       <Canvas
        shadows
        camera={{ position: [0, 25, 0], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset="sunset" />

        <group scale={[1.6, 1.6, 1.6]}>
          <LudoBoard 
            position={[0, 0, 0]} 
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onPawnMove={handlePawnMove}
            players={players}
          />
        </group>

        <group ref={diceRef}>
          <Dice position={[8, 0.5, 0]} scale={[9, 9, 9]} renderOrder={10} />
        </group>

        <DiceAnimator
          diceRef={diceRef}
          trigger={triggerRoll} 
          onFinish={handleRollComplete}
        />

        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>


      

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleRollDice}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
            ${canRollDice()
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
              : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            }
            ${triggerRoll ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
          disabled={!canRollDice()}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Always show dice value from game state if available */}
      {(gameState?.diceValue || localDiceValue > 0) && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10">
          Dice: {gameState?.diceValue || localDiceValue}
        </div>
      )}
    </div>
  )
}