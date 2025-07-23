'use client'

import React, { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'

export default function LudoBoard({ setPawnRefs, ...props }) {
  const groupRef = useRef()
  const pawnRefs = useRef([])

  const { nodes, materials } = useGLTF('/ludo_board_games.glb')

  const pawnMeshes = [
    { geo: nodes.Object_4.geometry, mat: materials.LUDO_COIN_M, pos: [2.232, 0.253, 0.711] },
    { geo: nodes.Object_10.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-2.592, 0.253, 0.711] },
    { geo: nodes.Object_12.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-2.592, 0.253, -4.089] },
    { geo: nodes.Object_14.geometry, mat: materials['LUDO_COIN_M.001'], pos: [0.918, 0.253, -4.106] },
    { geo: nodes.Object_16.geometry, mat: materials['LUDO_COIN_M.001'], pos: [2.22, 0.253, -4.083] },
    { geo: nodes.Object_18.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -4.777] },
    { geo: nodes.Object_20.geometry, mat: materials['LUDO_COIN_M.001'], pos: [1.607, 0.253, -3.446] },
    { geo: nodes.Object_22.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.212, 0.253, -4.777] },
    { geo: nodes.Object_24.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.906, 0.253, -4.089] },
    { geo: nodes.Object_26.geometry, mat: materials['LUDO_COIN_M.002'], pos: [-3.229, 0.253, -3.44] },
    { geo: nodes.Object_28.geometry, mat: materials.LUDO_COIN_M, pos: [1.635, 0.253, -0.001] },
    { geo: nodes.Object_30.geometry, mat: materials.LUDO_COIN_M, pos: [0.918, 0.253, 0.688] },
    { geo: nodes.Object_32.geometry, mat: materials.LUDO_COIN_M, pos: [1.612, 0.253, 1.37] },
    { geo: nodes.Object_34.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.2, 0.253, 0.016] },
    { geo: nodes.Object_36.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.888, 0.253, 0.711] },
    { geo: nodes.Object_38.geometry, mat: materials['LUDO_COIN_M.003'], pos: [-3.223, 0.253, 1.37] }
  ]

  useEffect(() => {
    if (setPawnRefs) {
      setPawnRefs(pawnRefs.current.filter(Boolean))
    }
  }, [setPawnRefs])

  return (
    <group {...props} dispose={null} ref={groupRef}>
      {pawnMeshes.map((data, idx) => (
        <mesh
          key={idx}
          name={`Pawn_${idx}`}
          ref={(ref) => {
            if (ref) {
              ref.matrixAutoUpdate = true
              pawnRefs.current[idx] = ref
            }
          }}
          castShadow
          receiveShadow
          geometry={data.geo}
          material={data.mat}
          position={data.pos}
          scale={12.073}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'default')}
        />
      ))}

      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        material={materials['LUDO_BOARD_UPPER.001']}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_8.geometry}
        material={materials.LUDO_BOARD_UPPER}
        position={[-0.841, 0.215, -1.715]}
        scale={14.023}
      />
    </group>
  )
}

useGLTF.preload('/ludo_board_games.glb')
