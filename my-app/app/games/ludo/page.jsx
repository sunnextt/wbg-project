"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import Dice from "@/src/components/ludo/Dice.jsx"; 
import { useState } from "react";

export default function HomePage() {
const { nodes, materials } = useGLTF('/ludo_board_games.glb')
  const [rolled, setRolled] = useState(null);

  return (
    <div className="w-screen h-screen">
      <Canvas
        shadows
        camera={{ position: [0, 25, 0], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[-3, 10, 3]} intensity={1.2} castShadow />
        <Environment preset="sunset" />

        <Dice
          nodes={nodes}
          materials={materials}
          position={[0, 0, 0]}
          onRollEnd={(value) => setRolled(value)}
        />

        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>

      {rolled && (
        <div className="absolute top-5 left-5 p-4 bg-white shadow-lg rounded-lg text-black">
          🎲 Rolled: {rolled}
        </div>
      )}
    </div>
  );
}
