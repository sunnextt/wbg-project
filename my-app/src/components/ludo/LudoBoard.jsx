import React, { useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'

export default function LudoBoard(props) {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  
  const [pawns, setPawns] = useState([
    // Green pawns
    { id: 1, geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711], scale: 12.073, color: 'green' },
    { id: 2, geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001], scale: 12.073, color: 'green' },
    { id: 3, geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688], scale: 12.073, color: 'green' },
    { id: 4, geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37], scale: 12.073, color: 'green' },

    // Red pawns
    { id: 5, geo: nodes.Object_10.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-2.592, 0.253, 0.711], scale: 12.073, color: 'red' },
    { id: 6, geo: nodes.Object_34.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.2, 0.253, 0.016], scale: 12.073, color: 'red' },
    { id: 7, geo: nodes.Object_36.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.888, 0.253, 0.711], scale: 12.073, color: 'red' },
    { id: 8, geo: nodes.Object_38.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.223, 0.253, 1.37], scale: 12.073, color: 'red' },

    // Blue pawns 
    { id: 9, geo: nodes.Object_12.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-2.592, 0.253, -4.089], scale: 12.073, color: 'blue' },
    { id: 10, geo: nodes.Object_22.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.212, 0.253, -4.777], scale: 12.073, color: 'blue' },
    { id: 11, geo: nodes.Object_24.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.906, 0.253, -4.089], scale: 12.073, color: 'blue' },
    { id: 12, geo: nodes.Object_26.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.229, 0.253, -3.44], scale: 12.073, color: 'blue' },

    // Yellow pawns 
    { id: 13, geo: nodes.Object_14.geometry, mat: materials['LUDO_COIN_M.001'], pos: [0.918, 0.253, -4.106], scale: 12.073, color: 'yellow' },
    { id: 14, geo: nodes.Object_16.geometry, mat: materials['LUDO_COIN_M.001'], pos: [2.22, 0.253, -4.083], scale: 12.073, color: 'yellow' },
    { id: 15, geo: nodes.Object_18.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -4.777], scale: 12.073, color: 'yellow' },
    { id: 16, geo: nodes.Object_20.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -3.446], scale: 12.073, color: 'yellow' }
  ])

  const DraggablePawn = ({ pawn }) => {
    const ref = useRef()
    const { size, viewport } = useThree()
    const aspect = size.width / viewport.width
    // const aspect = 100;
    
    const bind = useDrag(
      ({ offset: [x,z], first, last }) => {
        const [,y,] = pawn.pos
        const newPosition = [x / aspect, y, z / aspect]
        
        ref.current.position.set(...newPosition)
        
        if (last) {
          setPawns(prev => prev.map(p => 
            p.id === pawn.id ? { ...p, pos: newPosition } : p
          ))
        }
      },
      { pointerEvents: true }
    )

    return (
      <mesh
        ref={ref}
        geometry={pawn.geo}
        material={pawn.mat}
        position={pawn.pos}
        scale={pawn.scale}
        {...bind()}
        castShadow
        receiveShadow
      />
    )
  }

  return (
    <group {...props} dispose={null}>
      {/* <group position={[-0.856, 0.465, -1.715]} rotation={[Math.PI / 2, 0, 0]} scale={11.346}>
        <mesh castShadow receiveShadow geometry={nodes.Object_40.geometry} material={materials.DICE_M} />
        <mesh castShadow receiveShadow geometry={nodes.Object_41.geometry} material={materials['Material.002']} />
      </group> */}
      
      <mesh castShadow receiveShadow geometry={nodes.Object_6.geometry} material={materials['LUDO_BOARD_UPPER.001']} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      <mesh castShadow receiveShadow geometry={nodes.Object_8.geometry} material={materials.LUDO_BOARD_UPPER} position={[-0.841, 0.215, -1.715]} scale={14.023} />
      
      {pawns.map(pawn => (
        <DraggablePawn key={pawn.id} pawn={pawn} />
      ))}
    </group>
  )
}

useGLTF.preload('/ludo_board_games.glb')