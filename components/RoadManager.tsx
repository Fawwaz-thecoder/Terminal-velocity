import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';

const SEGMENT_LENGTH = 100;
const ROAD_WIDTH = 20;
const VISIBLE_SEGMENTS = 10;
const BUILDING_OFFSET = 25;

// Shared geometries/materials
const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
const roadMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
const stripeGeo = new THREE.PlaneGeometry(0.3, SEGMENT_LENGTH);
const stripeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

interface BuildingBlockProps {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    isNight: boolean;
}

const BuildingBlock: React.FC<BuildingBlockProps> = ({ position, size, color, isNight }) => {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Window Strips - Lights on only at night */}
      <mesh position={[0, size[1] / 2, size[2]/2 + 0.05]}>
         <planeGeometry args={[size[0] * 0.6, size[1] * 0.9]} />
         <meshStandardMaterial 
            color={isNight ? "#ffffaa" : "#333"} 
            emissive={isNight ? "#ffffaa" : "#000"} 
            emissiveIntensity={isNight ? 0.5 : 0} 
            roughness={0.1}
            transparent
            opacity={0.5}
         />
      </mesh>
      {/* Neon Rim */}
      <mesh position={[0, size[1] - 0.5, 0]}>
        <boxGeometry args={[size[0] + 0.2, 0.5, size[2] + 0.2]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

const RoadSegment: React.FC<{ z: number }> = ({ z }) => {
  const isNight = useGameStore(s => s.isNight);
  
  const buildings = useMemo(() => {
    const b = [];
    // Add 2-3 buildings per segment per side
    for (let i = 0; i < 2; i++) {
        // Left
        if (Math.random() > 0.2) {
             b.push({
                position: [-BUILDING_OFFSET - (Math.random() * 20), 0, (Math.random() - 0.5) * 80] as [number, number, number],
                size: [15 + Math.random() * 15, 30 + Math.random() * 80, 20 + Math.random() * 15] as [number, number, number],
                color: Math.random() > 0.5 ? '#220033' : '#001133'
            });
        }
        // Right
        if (Math.random() > 0.2) {
            b.push({
               position: [BUILDING_OFFSET + (Math.random() * 20), 0, (Math.random() - 0.5) * 80] as [number, number, number],
               size: [15 + Math.random() * 15, 30 + Math.random() * 80, 20 + Math.random() * 15] as [number, number, number],
               color: Math.random() > 0.5 ? '#330000' : '#110022'
           });
       }
    }
    return b;
  }, []);

  return (
    <group position={[0, 0, z]}>
      {/* Road Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={roadGeo} material={roadMat} />
      
      {/* Stripes */}
      <mesh position={[-ROAD_WIDTH / 6, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={stripeGeo} material={stripeMat} />
      <mesh position={[ROAD_WIDTH / 6, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={stripeGeo} material={stripeMat} />
      
      {/* Neon Barriers - Updated Colors */}
      <mesh position={[-ROAD_WIDTH / 2 - 0.5, 1, 0]}>
        <boxGeometry args={[0.5, 2, SEGMENT_LENGTH]} />
        {/* Neon Yellow (Purple replaced) */}
        <meshStandardMaterial color="#ccff00" emissive="#ccff00" emissiveIntensity={isNight ? 1 : 0.2} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 0.5, 1, 0]}>
        <boxGeometry args={[0.5, 2, SEGMENT_LENGTH]} />
        {/* Neon Blue (Cyan updated to electric blue) */}
        <meshStandardMaterial color="#0088ff" emissive="#0088ff" emissiveIntensity={isNight ? 1 : 0.2} />
      </mesh>

      {/* Buildings */}
      {buildings.map((b, i) => (
        <BuildingBlock key={i} position={b.position} size={b.size} color={b.color} isNight={isNight} />
      ))}
    </group>
  );
};

const MovingGround = ({ playerZ }: { playerZ: number }) => {
    const zOffset = Math.floor(playerZ / 100) * 100;
    
    return (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.2, zOffset - 100]}>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color="#080808" roughness={1} />
        </mesh>
    );
};

export const RoadManager: React.FC<{ playerZ: number }> = ({ playerZ }) => {
  const currentSegment = Math.floor(playerZ / SEGMENT_LENGTH);
  const segments = [];
  for (let i = -2; i < VISIBLE_SEGMENTS; i++) {
    segments.push((currentSegment - i) * SEGMENT_LENGTH);
  }

  return (
    <group>
      <MovingGround playerZ={playerZ} />
      {segments.map((z) => (
        <RoadSegment key={z} z={z} />
      ))}
    </group>
  );
};
