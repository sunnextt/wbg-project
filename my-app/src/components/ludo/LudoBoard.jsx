import React, { useRef, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { DragControls } from 'three/examples/jsm/controls/DragControls'

// Make DragControls available in R3F
extend({ DragControls })

export default function LudoBoard(props) {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  const { camera, gl, scene } = useThree()
  const groupRef = useRef()
  const controlsRef = useRef()
  
  // Pawns organized with correct color assignments
  const [pawns] = useState([
    // Green pawns
    { id: 1, geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711], scale: 12.073 },
    { id: 2, geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001], scale: 12.073 },
    { id: 3, geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688], scale: 12.073 },
    { id: 4, geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37], scale: 12.073 },

    // Red pawns
    { id: 5, geo: nodes.Object_10.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-2.592, 0.253, 0.711], scale: 12.073 },
    { id: 6, geo: nodes.Object_34.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.2, 0.253, 0.016], scale: 12.073 },
    { id: 7, geo: nodes.Object_36.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.888, 0.253, 0.711], scale: 12.073 },
    { id: 8, geo: nodes.Object_38.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.223, 0.253, 1.37], scale: 12.073 },

    // Blue pawns
    { id: 9, geo: nodes.Object_12.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-2.592, 0.253, -4.089], scale: 12.073 },
    { id: 10, geo: nodes.Object_22.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.212, 0.253, -4.777], scale: 12.073 },
    { id: 11, geo: nodes.Object_24.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.906, 0.253, -4.089], scale: 12.073 },
    { id: 12, geo: nodes.Object_26.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.229, 0.253, -3.44], scale: 12.073 },

    // Yellow pawns
    { id: 13, geo: nodes.Object_14.geometry, mat: materials['LUDO_COIN_M.001'], pos: [0.918, 0.253, -4.106], scale: 12.073 },
    { id: 14, geo: nodes.Object_16.geometry, mat: materials['LUDO_COIN_M.001'], pos: [2.22, 0.253, -4.083], scale: 12.073 },
    { id: 15, geo: nodes.Object_18.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -4.777], scale: 12.073 },
    { id: 16, geo: nodes.Object_20.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -3.446], scale: 12.073 }
  ])

  // Create refs for all pawns
  const pawnRefs = useRef([])
  
  useEffect(() => {
    if (pawnRefs.current.length > 0) {
      // Initialize DragControls
      controlsRef.current = new DragControls(
        pawnRefs.current,
        camera,
        gl.domElement
      )
      
      // Optional: Add event listeners
      controlsRef.current.addEventListener('dragstart', (event) => {
        event.object.material.opacity = 0.8
      })
      controlsRef.current.addEventListener('dragend', (event) => {
        event.object.material.opacity = 1
      })
      
      return () => {
        // Clean up
        controlsRef.current?.dispose()
      }
    }
  }, [camera, gl])

  return (
    <group {...props} dispose={null}>
      <group position={[-0.856, 0.465, -1.715]} rotation={[Math.PI / 2, 0, 0]} scale={11.346}>
        <mesh castShadow receiveShadow geometry={nodes.Object_40.geometry} material={materials.DICE_M} />
        <mesh castShadow receiveShadow geometry={nodes.Object_41.geometry} material={materials['Material.002']} />
      </group>
      
      {/* Board components */}
      <mesh castShadow receiveShadow geometry={nodes.Object_6.geometry} material={materials['LUDO_BOARD_UPPER.001']} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      <mesh castShadow receiveShadow geometry={nodes.Object_8.geometry} material={materials.LUDO_BOARD_UPPER} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      
      {/* Draggable pawns */}
      <group ref={groupRef}>
        {pawns.map((pawn, index) => (
          <mesh
            key={pawn.id}
            ref={el => pawnRefs.current[index] = el}
            geometry={pawn.geo}
            material={pawn.mat}
            position={pawn.pos}
            scale={pawn.scale}
            castShadow
            receiveShadow
          />
        ))}
      </group>
    </group>
  )
}

useGLTF.preload('/ludo_board_games.glb')