'use client'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'

export default function DiceAnimator({
  diceRef,
  trigger,
  rollingPlayerId,
  currentPlayerId,
  onFinish,
  currentValue
}) {
  const animationRef = useRef({
    started: false,
    duration: 2,
    elapsed: 0
  })

  // console.log(rollingPlayerId);
  

  useEffect(() => {
    if (!diceRef) return

    if (trigger) {
      // Only the rolling player triggers the animation
      const isLocalRoll = rollingPlayerId === currentPlayerId
      
      animationRef.current = {
        started: true,
        duration: isLocalRoll ? 2 : 1.5, // Shorter animation for remote players
        elapsed: 0
      }

      // For visual consistency, immediately orient dice randomly
      diceRef.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )

      // If this is a remote roll and we already have a value
      if (!isLocalRoll && currentValue > 0) {
        animationRef.current.started = false
        setDiceRotation(diceRef, currentValue)
      }
    }
  }, [trigger, diceRef, rollingPlayerId, currentPlayerId, currentValue])

  useFrame((_, delta) => {
    if (!trigger || !diceRef || !animationRef.current.started) return

    animationRef.current.elapsed += delta
    const progress = Math.min(animationRef.current.elapsed / animationRef.current.duration, 1.5)

    //  console.log("isRolling Now", trigger);


    if (progress < 1) {
      // Animate spinning
      const speed = 10 + Math.sin(animationRef.current.elapsed * 3) * 5
      diceRef.rotation.x += delta * speed
      diceRef.rotation.y += delta * (speed * 1.1)
      diceRef.rotation.z += delta * (speed * 0.9)
    } else {

      // Animation complete
      const result = currentValue > 0 ? currentValue : Math.floor(Math.random() * 6) + 1
      setDiceRotation(diceRef, result)
      animationRef.current.started = false
      
      // Only the rolling player reports completion
      // console.log("progress niwww",result, rollingPlayerId, currentPlayerId);

      if (rollingPlayerId === currentPlayerId) {
        onFinish(result)
      }
    }
  })

  return null
}

function setDiceRotation(dice, value) {
  const rotations = {
    1: [0, Math.PI/2, 0],
    2: [0, 0, -Math.PI/2],
    3: [0, Math.PI, 0],
    4: [0, 0, 0],
    5: [0, 0, Math.PI/2],
    6: [0, -Math.PI/2, 0]
  }
  if (dice && rotations[value]) {
    dice.rotation.set(...rotations[value])
  }
}