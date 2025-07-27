'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import Dice from './Dice'
import DiceAnimator from './DiceAnimator'

export default function LudoCanvas() {
  const diceRef = useRef()
  const [triggerRoll, setTriggerRoll] = useState(false)

  const handleRollDice = () => {
    if (!triggerRoll) {
      setTriggerRoll(true)
    }
  }

  return (
    <div
      className='relative w-full h-screen overflow-hidden flex items-center justify-center'
      style={{
        background: 'linear-gradient(135deg, #1e3a8a, #9333ea)' // Indigo to purple gradient
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
        <Environment preset='sunset' />
        {/* Optional: use Environment preset='city' for urban look */}

        {/* Board + pawns scaled up together */}
        <group scale={[1.6, 1.6, 1.6]}>
          <LudoBoard position={[0, 0, 0]} />
        </group>

        {/* Dice positioned beside the board */}
        <group ref={diceRef}>
          <Dice position={[8, 0.5, 0]} scale={[9, 9, 9]} renderOrder={10}/>
        </group>

        <DiceAnimator
          diceRef={diceRef}
          trigger={triggerRoll}
          onFinish={() => setTriggerRoll(false)}
        />

        <OrbitControls
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-6 left-6 z-10 text-white space-y-2">
        <h2 className="text-2xl font-bold tracking-wide">🎮 Ludo Arena</h2>
        <p className="text-sm">Current Turn: <span className="text-yellow-300 font-semibold">Player 1</span></p>
        <p className="text-sm">Players 1: 🟢</p>
        <p className="text-sm">Players 2: 🔴</p>
        <p className="text-sm">Players 3: 🔵</p>
        <p className="text-sm">Players 4: 🟡</p>
      </div>

      {/* Roll Dice Button */}
      <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10'>
        <button
          onClick={handleRollDice}
          className={`bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 ${
            triggerRoll ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={triggerRoll}
        >
          {triggerRoll ? 'Rolling...' : 'ROLL DICE 🎲'}
        </button>
      </div>
    </div>
  )
}
