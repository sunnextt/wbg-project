import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function LudoBoard(props) {
  const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  return (
    <group {...props} dispose={null}>
      <group position={[-0.856, 0.465, -1.715]} rotation={[Math.PI / 2, 0, 0]} scale={11.346}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Object_40.geometry}
          material={materials.DICE_M}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Object_41.geometry}
          material={materials['Material.002']}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        material={materials.LUDO_COIN_M}
        position={[2.232, 0.253, 0.711]}
        scale={12.073}
      />
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
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_10.geometry}
        material={materials['LUDO_COIN_M.003']}
        position={[-2.592, 0.253, 0.711]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_12.geometry}
        material={materials['LUDO_COIN_M.002']}
        position={[-2.592, 0.253, -4.089]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_14.geometry}
        material={materials['LUDO_COIN_M.001']}
        position={[0.918, 0.253, -4.106]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_16.geometry}
        material={materials['LUDO_COIN_M.001']}
        position={[2.22, 0.253, -4.083]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_18.geometry}
        material={materials['LUDO_COIN_M.001']}
        position={[1.607, 0.253, -4.777]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_20.geometry}
        material={materials['LUDO_COIN_M.001']}
        position={[1.607, 0.253, -3.446]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_22.geometry}
        material={materials['LUDO_COIN_M.002']}
        position={[-3.212, 0.253, -4.777]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_24.geometry}
        material={materials['LUDO_COIN_M.002']}
        position={[-3.906, 0.253, -4.089]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_26.geometry}
        material={materials['LUDO_COIN_M.002']}
        position={[-3.229, 0.253, -3.44]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_28.geometry}
        material={materials.LUDO_COIN_M}
        position={[1.635, 0.253, -0.001]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_30.geometry}
        material={materials.LUDO_COIN_M}
        position={[0.918, 0.253, 0.688]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_32.geometry}
        material={materials.LUDO_COIN_M}
        position={[1.612, 0.253, 1.37]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_34.geometry}
        material={materials['LUDO_COIN_M.003']}
        position={[-3.2, 0.253, 0.016]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_36.geometry}
        material={materials['LUDO_COIN_M.003']}
        position={[-3.888, 0.253, 0.711]}
        scale={12.073}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_38.geometry}
        material={materials['LUDO_COIN_M.003']}
        position={[-3.223, 0.253, 1.37]}
        scale={12.073}
      />
    </group>
    
  )
}

useGLTF.preload('/ludo_board_games.glb')