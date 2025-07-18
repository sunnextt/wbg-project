'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import LudoBoard from './LudoBoard';
import Dice from './Dice';

export default function LudoCanvas() {
  return (
<div className="w-full max-w-4xl mx-auto h-screen bg-green-600">
      <Canvas
        shadows
        camera={{ position: [0, 12, 12], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />

        <Environment preset="sunset" />

        <LudoBoard />
        <Dice position={[4, 0, 0]} scale={[2, 2, 2]} /> 

        <OrbitControls
          enablePan={false}
          minDistance={10}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}