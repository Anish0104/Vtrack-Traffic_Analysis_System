import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';

function Vehicle({ color, startZ, speed, laneX }) {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.z += speed * delta;
      if (meshRef.current.position.z > 50) {
        meshRef.current.position.z = -50;
      }
      if (meshRef.current.position.z < -50) {
          meshRef.current.position.z = 50;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[laneX, 0.5, startZ]} castShadow>
      <boxGeometry args={[1.5, 1, 3]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  );
}

function TrafficSystem() {
  const vehicles = useMemo(() => {
    const v = [];
    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b'];
    // Lane 1
    for (let i = 0; i < 5; i++) {
        v.push({ id: `l1-${i}`, color: colors[i%colors.length], startZ: -i * 20, speed: 15, laneX: -3 });
    }
    // Lane 2
    for (let i = 0; i < 4; i++) {
        v.push({ id: `l2-${i}`, color: colors[(i+2)%colors.length], startZ: -i * 25 - 10, speed: 18, laneX: -6.5 });
    }
    // Lane 3 (opposite)
    for (let i = 0; i < 5; i++) {
        v.push({ id: `l3-${i}`, color: colors[(i+1)%colors.length], startZ: i * 20 - 50, speed: -14, laneX: 3 });
    }
    // Lane 4 (opposite)
    for (let i = 0; i < 4; i++) {
        v.push({ id: `l4-${i}`, color: colors[(i+3)%colors.length], startZ: i * 22 - 40, speed: -20, laneX: 6.5 });
    }
    return v;
  }, []);

  return (
    <group>
      {vehicles.map(v => (
        <Vehicle key={v.id} {...v} />
      ))}
    </group>
  );
}

function SceneCamera() {
  const cameraRef = useRef();

  useFrame((state) => {
    // Subtle float and following mouse
    const x = (state.pointer.x * 2);
    const y = (state.pointer.y * 2);
    
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 8 + y, 0.05);
    state.camera.lookAt(0, 0, -10);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 8, 15]} fov={50} />;
}

export default function TrafficScene() {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#0f172a] overflow-hidden pointer-events-none">
      <Canvas shadows dpr={[1, 2]}>
        <SceneCamera />
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 20, 60]} />
        
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[10, 20, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[0, 5, -20]} intensity={2} color="#0ea5e9" distance={50} />
        <pointLight position={[0, 5, 20]} intensity={2} color="#8b5cf6" distance={50} />

        <Grid renderOrder={-1} position={[0, 0, 0]} infiniteGrid fadeDistance={50} cellColor="#1e293b" sectionColor="#334155" />
        
        {/* Road Surface */}
        <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 100]} />
          <meshStandardMaterial color="#020617" roughness={0.8} metalness={0.2} />
        </mesh>

        <TrafficSystem />
      </Canvas>
    </div>
  );
}
