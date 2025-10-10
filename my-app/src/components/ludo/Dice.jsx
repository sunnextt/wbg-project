'use client'
import { useRef, useState, useEffect, forwardRef } from 'react'
import { a, useSpring } from '@react-spring/three'
import { useGLTF } from '@react-three/drei'

const Dice = forwardRef(
  (
    {
      onRollEnd,
      isRolling = false,
      rollingPlayerId = null,
      currentPlayerId = null,
      currentValue = 0,
      ...props
    },
    ref,
  ) => {
    const { nodes, materials } = useGLTF('/Dice-D6_by_get3dmodels.glb')
    const diceRef = useRef()
    const [targetRotation, setTargetRotation] = useState([0, 0, 0])
    const [isAnimating, setIsAnimating] = useState(false)
    const [finalValue, setFinalValue] = useState(0)

    const valueToRotation = {
      1: [0, 0, 0], 
      2: [Math.PI / 2, 0, 0], 
      4: [0, 0, Math.PI / 2], 
      3: [0, 0, -Math.PI / 2], 
      5: [-Math.PI / 2, 0, 0],
      6: [Math.PI, 0, 0],
    }


    const { rotation } = useSpring({
      rotation: targetRotation,
      config: { mass: 1, tension: 200, friction: 20 },
      onStart: () => setIsAnimating(true),
      onRest: () => {
        setIsAnimating(false)
        if ( rollingPlayerId === currentPlayerId && currentValue === 0 && finalValue > 0) {
          if (onRollEnd) onRollEnd(finalValue)
        }
      },
    })

    useEffect(() => {
        if (isRolling && !isAnimating) {
          handleRoll()
        } else if (!isRolling && currentValue > 0) {
          setDiceToValue(currentValue)
        }
    }, [isRolling, currentValue, isAnimating])


    const setDiceToValue = (value) => {
      if (value > 0 && valueToRotation[value]) {
        setTargetRotation(valueToRotation[value])
        setFinalValue(value)
      }
    }

    const spinToValue = (value) => {
      const isLocalRoll = rollingPlayerId === currentPlayerId

      let extraRotations

      const rand = () => (Math.floor(Math.random() * 4) * Math.PI) / 2

      if (isLocalRoll) {
        extraRotations = Math.floor(Math.random() * 4) + 5
      } else {
        extraRotations = Math.floor(Math.random() * 3) + 2
      }

      const baseRotation = valueToRotation[value] || [0, 0, 0]

      setTargetRotation([
        baseRotation[0] + rand() + extraRotations * Math.PI * 2,
        baseRotation[1] + rand() + extraRotations * Math.PI * 2,
        baseRotation[2] + rand() + extraRotations * Math.PI * 2,
      ])
    }

    const handleRoll = () => {
      if (isRolling) {
        const randomValue = Math.floor(Math.random() * 6) + 1
        setFinalValue(randomValue)
        spinToValue(randomValue)
      } else {
        if (currentValue > 0) {
          setFinalValue(currentValue)
        }
      }
    }

    const boardPos = [-0.841, 0.215, -1.715]

    return (
      <a.group
        ref={diceRef}
        face={1}
        position={[boardPos[0] + 6, boardPos[1] + 0.2, boardPos[2]]}
        rotation={rotation}
        scale={35}
        {...props}
      >
        <group rotation={[-Math.PI / 2, 0, 0]} scale={0.01}>
          <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.redo_uv_Material001_0.geometry}
              material={materials['Material.001']}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={100}
            />
          </group>
        </group>
      </a.group>
    )
  },
)

Dice.displayName = 'Dice'

export default Dice
