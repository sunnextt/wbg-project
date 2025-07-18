import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export default function Dice(props) {
  const { nodes, materials } = useGLTF('/dice.glb')
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.053}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial.geometry}
            material={materials.defaultMat}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.defaultMaterial_1.geometry}
            material={materials.defaultMat}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/dice.glb')
