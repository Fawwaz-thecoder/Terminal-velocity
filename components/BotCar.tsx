import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, CAR_CATALOG } from '../store';
import { GameMode, GameState, RaceDifficulty } from '../types';
import { CarVisuals } from './CarVisuals';

interface BotCarProps {
  setBotZ: (z: number) => void;
  setBotX: (x: number) => void;
  trafficRef: React.MutableRefObject<any[]>;
}

export const BotCar: React.FC<BotCarProps> = ({ setBotZ, setBotX, trafficRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const visualsRef = useRef<THREE.Group>(null);
  
  const velocityZ = useRef(0);
  const lane = useRef(0); // -1, 0, 1
  const laneSwitchProgress = useRef(0); // 0 to 1
  const laneSwitchDir = useRef(0); // -1 or 1
  const driftPointsRef = useRef(0);
  
  // Drift specific refs
  const driftTime = useRef(0);
  const targetDriftAngle = useRef(0);
  
  const { gameState, selectedCarId, raceDifficulty, isNight, gameMode, setBotDriftScore } = useGameStore();
  
  const playerCar = CAR_CATALOG.find(c => c.id === selectedCarId) || CAR_CATALOG[0];
  
  let perfMultiplier = 0.9;
  if (raceDifficulty === RaceDifficulty.MEDIUM) perfMultiplier = 1.05;
  if (raceDifficulty === RaceDifficulty.HARD) perfMultiplier = 1.2;
  // In drift mode, bot drives slightly slower to focus on "drifting" visual
  if (gameMode === GameMode.DRIFT) perfMultiplier = 0.9;

  const TOP_SPEED = (playerCar.topSpeedKmh / 2) * perfMultiplier;

  useFrame((state, delta) => {
    if (gameState !== GameState.PLAYING || !meshRef.current) return;

    velocityZ.current = THREE.MathUtils.lerp(velocityZ.current, -TOP_SPEED, delta * 0.8);

    // Traffic Avoidance
    const lookAheadDist = 60;
    const myZ = meshRef.current.position.z;
    
    let blocked = false;
    
    if (trafficRef.current) {
        for (const car of trafficRef.current) {
            if (car.lane === lane.current && car.z < myZ && (myZ - car.z) < lookAheadDist) {
                blocked = true;
                break;
            }
        }
    }

    if (blocked && laneSwitchDir.current === 0) {
        const canGoLeft = lane.current > -1;
        const canGoRight = lane.current < 1;
        
        let targetLane = lane.current;
        if (canGoLeft && canGoRight) {
            targetLane = Math.random() > 0.5 ? lane.current - 1 : lane.current + 1;
        } else if (canGoLeft) {
            targetLane = lane.current - 1;
        } else if (canGoRight) {
            targetLane = lane.current + 1;
        }
        
        if (targetLane !== lane.current) {
            laneSwitchDir.current = targetLane - lane.current;
            lane.current = targetLane;
            laneSwitchProgress.current = 0;
        } else {
             velocityZ.current *= 0.95;
        }
    }

    // Lane Switch / Drift Animation
    if (laneSwitchDir.current !== 0) {
        laneSwitchProgress.current += delta * 3;
        if (laneSwitchProgress.current >= 1) {
            laneSwitchProgress.current = 1;
            laneSwitchDir.current = 0;
        }
        
        const previousLaneX = (lane.current - laneSwitchDir.current) * 6;
        const targetLaneX = lane.current * 6;
        meshRef.current.position.x = THREE.MathUtils.lerp(previousLaneX, targetLaneX, laneSwitchProgress.current);
        
        // Drastic angle if in drift mode (Drift visual roll)
        const rollMult = gameMode === GameMode.DRIFT ? 0.3 : 0.1;
        meshRef.current.rotation.z = -laneSwitchDir.current * rollMult * Math.sin(laneSwitchProgress.current * Math.PI);
        
        // If switching lanes in Drift Mode, it counts as a big drift
        if (gameMode === GameMode.DRIFT) {
            // Difficulty Tuning for Points
            let diffMult = 100; // Easy
            if (raceDifficulty === RaceDifficulty.MEDIUM) diffMult = 300;
            if (raceDifficulty === RaceDifficulty.HARD) diffMult = 600;

            driftPointsRef.current += delta * diffMult * Math.random();
            setBotDriftScore(Math.floor(driftPointsRef.current));
            
            // Set drift angle for visual slide
            targetDriftAngle.current = -laneSwitchDir.current * 0.5;
        }

    } else {
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, delta * 5);
        
        if (gameMode === GameMode.DRIFT) {
             // Even when straight, add small drift score in Drift Mode if "maintaining"
             // Difficulty Tuning
             let diffMult = 50;
             if (raceDifficulty === RaceDifficulty.MEDIUM) diffMult = 100;
             if (raceDifficulty === RaceDifficulty.HARD) diffMult = 200;
             
             if (Math.random() > 0.4) {
                 driftPointsRef.current += delta * diffMult;
                 setBotDriftScore(Math.floor(driftPointsRef.current));
             }
             
             // Fake weaving for drift visual
             driftTime.current += delta;
             meshRef.current.position.x += Math.sin(driftTime.current * 2) * delta * 2;
             
             // Rotate body based on weave
             targetDriftAngle.current = Math.cos(driftTime.current * 2) * 0.4;
        } else {
            targetDriftAngle.current = 0;
        }
    }

    // Apply Drift Rotation (Yaw) separate from path rotation
    if (visualsRef.current) {
        visualsRef.current.rotation.y = THREE.MathUtils.lerp(visualsRef.current.rotation.y, targetDriftAngle.current, delta * 3);
        
        // Visual Sideways displacement (Crab walk effect)
        // If we are rotated Y, shift the visual X slightly opposite to look like rear is sliding out
        visualsRef.current.position.x = THREE.MathUtils.lerp(visualsRef.current.position.x, targetDriftAngle.current * 1.5, delta * 2);
    }

    meshRef.current.position.z += velocityZ.current * delta;
    
    setBotZ(meshRef.current.position.z);
    setBotX(meshRef.current.position.x);
  });

  return (
    <group ref={meshRef} position={[6, 0, 0]}>
      {/* Bot Indicator */}
      <mesh position={[0, 3, 0]}>
          <boxGeometry args={[2, 0.5, 0.1]} />
          <meshBasicMaterial color={gameMode === GameMode.DRIFT ? "orange" : "red"} />
      </mesh>
      
      {/* Visuals container for independent rotation */}
      <group ref={visualsRef}>
        <CarVisuals 
            type={playerCar.type} 
            color="#333333" 
            wheelRotation={0} 
            isNight={isNight}
        />
        {/* Underglow for bot in drift mode */}
        {gameMode === GameMode.DRIFT && (
             <pointLight position={[0, 1, 0]} color="orange" distance={8} intensity={5} />
        )}
      </group>
      
      {gameMode !== GameMode.DRIFT && (
        <pointLight position={[0, 1, 0]} color="red" distance={5} intensity={2} />
      )}
    </group>
  );
};