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
}) {
  const diceRef = useRef()
  const [triggerRoll, setTriggerRoll] = useState(false)
  const [diceValue, setDiceValue] = useState(0)
  const [currentTurnName, setCurrentTurnName] = useState('')

  // Update current player name when turn changes
  useEffect(() => {
    const player = players.find(p => p.id === currentTurn)
    setCurrentTurnName(player?.name || '')
  }, [currentTurn, players])

  const handleRollComplete = (result) => {
    console.log('Result:', result);
    
    setDiceValue(result)
    onRollDice(result)
    setTriggerRoll(false)
  }

  const handleRollDice = () => {
    if (canRollDice()) {
      setTriggerRoll(true)
    }
  }

  const canRollDice = () => {
    return !triggerRoll && 
           currentPlayerId === currentTurn && 
           gameStatus === 'playing'
  }


  return (
    <div
      className='relative w-full h-screen overflow-hidden flex items-center justify-center'
      style={{
        background: 'linear-gradient(135deg, #1e3a8a, #9333ea)' // Indigo to purple
      }}
    >
      {/* Optional background image with blur */}
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
          <LudoBoard position={[0, 0, 0]} />
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

      {/* HUD Overlay */}
      {/* <div className="absolute top-6 left-6 z-10 text-white space-y-2">
        <h2 className="text-2xl font-bold">Game ID: {gameId}</h2>
        <p>Status: {gameStatus}</p>
        {players.map((player, index) => (
          <p key={player.id}>
            Player {index + 1}: {player.name}{' '}
            {currentTurn === player.id && '(Current Turn)'}
          </p>
        ))}
      </div> */}

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
          {triggerRoll ? 'Rolling...' : (
            currentPlayerId === currentTurn 
              ? 'ROLL DICE 🎲' 
              : `Waiting for ${currentTurnName}`
          )}
        </button>
      </div>

      {diceValue > 0 && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg z-10">
          Dice: {diceValue}
        </div>
      )}
    </div>
  )
}
