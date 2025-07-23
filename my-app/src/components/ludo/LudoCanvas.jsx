'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, DragControls } from '@react-three/drei'
import { useRef, useState } from 'react'
import LudoBoard from './LudoBoard'
import Dice from './Dice'
import DiceAnimator from './DiceAnimator'

function PawnDragger({ pawnRefs }) {
  const { camera, gl } = useThree()

  return (
    pawnRefs.length > 0 && (
      <DragControls
        transformGroup={false}
        objects={pawnRefs}
        camera={camera}
        domElement={gl.domElement}
        onDragStart={() => (document.body.style.cursor = 'grabbing')}
        onDragEnd={(e) => {
          document.body.style.cursor = 'default'

          // Optional: Snap to grid
          const tileSize = 1
          const pos = e.object.position
          pos.set(
            Math.round(pos.x / tileSize) * tileSize,
            pos.y,
            Math.round(pos.z / tileSize) * tileSize
          )

          console.log(`Dropped: ${e.object.name} →`, pos)
        }}
      />
    )
  )
}

export default function LudoCanvas() {
  const diceRef = useRef()
  const [triggerRoll, setTriggerRoll] = useState(false)
  const [pawnRefs, setPawnRefs] = useState([])

  const handleRollDice = () => {
    setTriggerRoll(true)
  }

  return (
    <div className='relative w-full h-[32rem] bg-purple-800 flex items-center justify-center rounded-md overflow-hidden shadow-lg'>
      <Canvas shadows camera={{ position: [0, 12, 5], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 0.5, 3]} intensity={1.2} castShadow />
        <Environment preset='sunset' />

        {/* ✅ Drag Controller for Pawns */}
        <PawnDragger pawnRefs={pawnRefs} />

        {/* 🧩 Ludo Game Assets */}
        <LudoBoard position={[-1.5, 0, 0]} scale={[1.2, 1.2, 1.2]} setPawnRefs={setPawnRefs} />

        {/* 🎲 Dice */}
        <group ref={diceRef}>
          <Dice position={[4, 0.5, 0]} scale={[9, 9, 9]} />
        </group>

        {/* 🌀 Dice Animator */}
        <DiceAnimator diceRef={diceRef} trigger={triggerRoll} onFinish={() => setTriggerRoll(false)} />

        {/* 🚫 Orbit Controls: Locked View */}
        <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} target={[0, 0, 0]} />
      </Canvas>

      {/* 🎯 Roll Dice Button */}
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
