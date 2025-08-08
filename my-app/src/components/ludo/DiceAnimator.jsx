'use client'
import { useFrame } from '@react-three/fiber';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function DiceAnimator({ diceRef, trigger, onFinish }) {
  const animationRef = useRef({
    started: false,
    duration: 1.5,
    elapsed: 0
  });

  const originalRotation = useRef(new THREE.Euler());
  const [diceResult, setDiceResult] = useState(null);

  useEffect(() => {
    if (diceRef) {
      originalRotation.current.copy(diceRef.rotation);
    }
  }, [diceRef]);

  useFrame((state, delta) => {
    if (!trigger) return;
    if (!diceRef) return;

    if (!animationRef.current.started) {
      animationRef.current.started = true;
      animationRef.current.elapsed = 0;
      animationRef.current.duration = 1.2;
      setDiceResult(Math.floor(Math.random() * 6) + 1);
    }

    animationRef.current.elapsed += delta;
    const progress = Math.min(animationRef.current.elapsed / animationRef.current.duration, 1);

    if (progress < 1) {
      diceRef.rotation.x += delta * 10;
      diceRef.rotation.y += delta * 12;
      diceRef.rotation.z += delta * 8;
    } else {
      setDiceRotation(diceRef, diceResult);
      animationRef.current.started = false;
      onFinish(diceResult);
    }
  });

  return null;
}

function setDiceRotation(dice, result) {
  const rotations = {
    4: { x: 0, y: 0, z: 0 },
    2: { x: 0, y: Math.PI / 2, z: 0 },
    6: { x: Math.PI / 2, y: 0, z: 0 },
    4: { x: -Math.PI / 2, y: 0, z: 0 },
    1: { x: 0, y: -Math.PI / 2, z: 0 },
    3: { x: Math.PI, y: 0, z: 0 }
  };

  const rot = rotations[result] || rotations[1];
  dice.rotation.set(rot.x, rot.y, rot.z);
}
