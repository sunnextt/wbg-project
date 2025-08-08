'use client'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function DiceAnimator({ diceRef, trigger, onFinish }) {
  const animationRef = useRef({
    started: false,
    duration: 1.2, 
    elapsed: 0
  })

  const originalRotation = useRef(new THREE.Euler())

  useEffect(() => {
    if (!diceRef) return

    if (trigger) {
      console.log('Starting dice animation')
      animationRef.current.started = true
      animationRef.current.elapsed = 0
      originalRotation.current.copy(diceRef.rotation)
    } else {
      animationRef.current.started = false
    }
  }, [trigger, diceRef])

  useFrame((_, delta) => {
    if (!trigger || !diceRef || !animationRef.current.started) return

    animationRef.current.elapsed += delta
    const progress = Math.min(animationRef.current.elapsed / animationRef.current.duration, 1)

    if (progress < 1) {
      // Animate spinning
      diceRef.rotation.x += delta * 10
      diceRef.rotation.y += delta * 12
      diceRef.rotation.z += delta * 8
    } else {
      // Animation complete
      const result = Math.floor(Math.random() * 6) + 1
      setDiceRotation(diceRef, result)
      animationRef.current.started = false
      onFinish?.(result)
    }
  })

  return null
}

function setDiceRotation(dice, result) {
  const rotations = {
    1: [0, Math.PI/2, 0],    
    2: [0, 0, -Math.PI/2],  
    3: [0, Math.PI, 0],     
    4: [0, 0, 0],           
    5: [0, 0, Math.PI/2],   
    6: [0, -Math.PI/2, 0]  
  }
  dice.rotation.set(...(rotations[result] || rotations[1]))
}