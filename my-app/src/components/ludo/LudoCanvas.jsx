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

  const handleRollDice = () => setTriggerRoll(true)

  return (
    <div className='relative w-full h-[32rem] bg-purple-800 flex items-center justify-center'>
      <Canvas shadows camera={{ position: [0, 1, 0], fov: 50, near: 0.1, far: 100 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 0.5, 3]} intensity={1.2} castShadow />
        <Environment preset='sunset' />

        <LudoBoard position={[0, -10, 0]} scale={[0.7, 0.7, 0.7]} />

        <group ref={diceRef}>
          <Dice position={[4, 0.5, 0]} scale={[6, 6, 6]} />
        </group>
        <DiceAnimator diceRef={diceRef} trigger={triggerRoll} onFinish={() => setTriggerRoll(false)} />

        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} target={[0, 0, 0]} />
      </Canvas>

      <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2'>
        <button
          onClick={handleRollDice}
          className='bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-full shadow-lg'
          disabled={triggerRoll}
        >
          {triggerRoll ? 'Rolling...' : 'ROLL DICE 🎲'}
        </button>
      </div>
    </div>
  )
}
