'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function DiceAnimator({ diceRef, trigger, onFinish }) {
  const isRolling = useRef(false)
  const frameCount = useRef(0)

  useEffect(() => {
    if (trigger && diceRef.current) {
      isRolling.current = true
      frameCount.current = 0
    }
  }, [trigger])

  useFrame(() => {
    if (!isRolling.current || !diceRef.current) return

    frameCount.current += 1
    const speed = 0.3

    // Spin the dice randomly
    diceRef.current.rotation.x += speed + Math.random() * 0.1
    diceRef.current.rotation.y += speed + Math.random() * 0.1
    diceRef.current.rotation.z += speed + Math.random() * 0.1

    // Stop after ~60 frames (~1 second at 60 FPS)
    if (frameCount.current > 60) {
      isRolling.current = false
      frameCount.current = 0

      // Snap to random face
      const faces = [
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
        [-Math.PI / 2, 0, 0],
        [0, Math.PI / 2, 0],
        [0, -Math.PI / 2, 0],
        [Math.PI, 0, 0],
      ]
      const [rx, ry, rz] = faces[Math.floor(Math.random() * faces.length)]
      diceRef.current.rotation.set(rx, ry, rz)

      onFinish?.()
    }
  })

  return null
}
