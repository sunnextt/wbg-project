'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import DiceAnimator from './DiceAnimator'

export default function LudoCanvas({
  gameId,
  players = [],
  gameStatus,
  currentTurn,
  currentPlayerId,
  onRollDice,
  gameState,
  onPawnMove,
  isDiceRolling
}) {
  const ludoBoardRef = useRef();
  const [triggerRoll, setTriggerRoll] = useState(false);
  const [currentTurnName, setCurrentTurnName] = useState('Unknown Player'); // Add this line

  useEffect(() => {
    const player = players.find(p => p.id === currentTurn);
    setCurrentTurnName(player?.name || 'Unknown Player');
  }, [currentTurn, players]);

const handleRollComplete = (result) => {
    setTriggerRoll(false)
    onRollDice(result)
  }

  const handleRollClick = () => {
    if (canRollDice()) {
      setTriggerRoll(true)
    }
  }

  const canRollDice = () => {
    return !isDiceRolling &&
           currentPlayerId === currentTurn &&
           gameStatus === 'playing'
  }

  const getButtonText = () => {
    if (isDiceRolling) {
      return currentPlayerId === currentTurn ? 'Rolling...' : `${currentTurnName} is rolling...`
    }
    if (gameStatus !== 'playing') return 'Game Not Started'
    if (currentPlayerId === currentTurn) return 'ROLL DICE 🎲'
    return `Waiting for ${currentTurnName}`
  }

  return (
    <div className='relative w-full h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-600'>
      <div className="absolute inset-0 bg-[url('/images/ludo-bg.jpg')] bg-cover bg-center opacity-10 blur-sm z-0 pointer-events-none" />
      
      <Canvas
        shadows
        camera={{ position: [0, 10, 0], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset="sunset" />

        <group scale={[0.65, 0.65, 0.65]}>
<LudoBoard 
  ref={ludoBoardRef} 
  gameState={gameState} 
  currentPlayerId={currentPlayerId} 
  onPawnMove={onPawnMove} 
  players={players} 
/>        </group>

        {ludoBoardRef.current?.diceRef && (
          <DiceAnimator
            diceRef={ludoBoardRef.current.diceRef}
            trigger={isDiceRolling || triggerRoll}
            onFinish={handleRollComplete}
          />
        )}

        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleRollClick}
          disabled={!canRollDice()}
          className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
            ${canRollDice()
              ? 'bg-yellow-400 hover:bg-yellow-500 text-black'
              : 'bg-gray-500 text-gray-200 cursor-not-allowed'
            }
            ${isDiceRolling ? 'opacity-70 scale-95' : 'hover:scale-105'}`}
        >
          {getButtonText()}
        </button>
      </div>

      {gameState?.diceValue > 0 && !isDiceRolling && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10">
          Dice: {gameState.diceValue}
        </div>
      )}
     <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-20">
        {currentPlayerId === currentTurn ? 
          "Your turn!" : 
          `${currentTurnName}'s turn`
        }
      </div>
    </div>
  )
}