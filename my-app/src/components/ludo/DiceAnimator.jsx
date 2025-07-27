'use client'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

export default function DiceAnimator({ diceRef, trigger, onFinish }) {
  const animationRef = useRef({
    started: false,
    phase: 'rolling', // 'rolling', 'showing-result', 'returning'
    duration: 2,
    elapsed: 0,
    resultShown: false
  })
  
  const originalPosition = useRef(new THREE.Vector3())
  const originalRotation = useRef(new THREE.Euler())
  const [diceResult, setDiceResult] = useState(null)

  // Store original position and rotation
  useEffect(() => {
    if (diceRef.current) {
      originalPosition.current.copy(diceRef.current.position)
      originalRotation.current.copy(diceRef.current.rotation)
    }
  }, [diceRef])

  useFrame((state, delta) => {
    if (!trigger || !diceRef.current) return

    if (!animationRef.current.started) {
      // Initialize animation
      animationRef.current = {
        started: true,
        phase: 'rolling',
        duration: 1.5, // Rolling duration
        elapsed: 0,
        resultShown: false
      }
      // Generate random dice result (1-6)
      setDiceResult(Math.floor(Math.random() * 6) + 1)
    }

    animationRef.current.elapsed += delta
    const progress = Math.min(animationRef.current.elapsed / animationRef.current.duration, 1)

    if (animationRef.current.phase === 'rolling') {
      // Random rotation during rolling phase
      diceRef.current.rotation.x += delta * 10
      diceRef.current.rotation.y += delta * 12
      diceRef.current.rotation.z += delta * 8

      // Jumping motion
      const jumpHeight = 3
      const jumpProgress = Math.sin(progress * Math.PI)
      diceRef.current.position.y = originalPosition.current.y + jumpProgress * jumpHeight

      if (progress >= 1) {
        // Switch to showing result phase
        animationRef.current.phase = 'showing-result'
        animationRef.current.elapsed = 0
        animationRef.current.duration = 1.5 // Time to show result
        
        // Set dice to show the result
        setDiceRotation(diceRef.current, diceResult)
      }
    } 
    else if (animationRef.current.phase === 'showing-result') {
      // Just wait while showing the result
      if (progress >= 1) {
        // Switch to returning phase
        animationRef.current.phase = 'returning'
        animationRef.current.elapsed = 0
        animationRef.current.duration = 0.8 // Return duration
      }
    }
    else if (animationRef.current.phase === 'returning') {
      // Smoothly return to original position
      const returnProgress = Math.min(progress * 1.5, 1) // Speed up return
      
      diceRef.current.position.lerpVectors(
        diceRef.current.position,
        originalPosition.current,
        returnProgress
      )
      
      // Smooth rotation back to original
      diceRef.current.rotation.x = THREE.MathUtils.lerp(
        diceRef.current.rotation.x,
        originalRotation.current.x,
        returnProgress
      )
      diceRef.current.rotation.y = THREE.MathUtils.lerp(
        diceRef.current.rotation.y,
        originalRotation.current.y,
        returnProgress
      )
      diceRef.current.rotation.z = THREE.MathUtils.lerp(
        diceRef.current.rotation.z,
        originalRotation.current.z,
        returnProgress
      )

      if (progress >= 1) {
        // Animation complete
        diceRef.current.position.copy(originalPosition.current)
        diceRef.current.rotation.copy(originalRotation.current)
        
        // Reset animation state
        animationRef.current = {
          started: false,
          phase: 'rolling',
          duration: 2,
          elapsed: 0,
          resultShown: false
        }
        
        onFinish()
      }
    }
  })

  return null
}

// Helper function to set dice rotation based on result (1-6)
function setDiceRotation(dice, result) {
  // These rotations correspond to standard dice face orientations
  const rotations = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: Math.PI/2, z: 0 },
    3: { x: Math.PI/2, y: 0, z: 0 },
    4: { x: -Math.PI/2, y: 0, z: 0 },
    5: { x: 0, y: -Math.PI/2, z: 0 },
    6: { x: Math.PI, y: 0, z: 0 }
  }
  
  const rot = rotations[result] || rotations[1]
  dice.rotation.set(rot.x, rot.y, rot.z)
}