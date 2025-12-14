import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GameState, GameMode, VehicleType, TrafficCar, RaceDifficulty } from '../types';

interface TrafficManagerProps {
  playerZ: number;
  trafficDataRef: React.MutableRefObject<TrafficCar[]>;
}

const CAR_GEOMETRIES = {
  [VehicleType.CAR]: new THREE.BoxGeometry(1.8, 1.3, 4),
  [VehicleType.TRUCK]: new THREE.BoxGeometry(2.5, 3.5, 8),
  [VehicleType.BUS]: new THREE.BoxGeometry(2.6, 3, 11),
};

const Wheel = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
        <meshStandardMaterial color="#111" />
    </mesh>
);

const TrafficCarMesh = React.memo(({ x, z, color, type, speed, isNight }: { x: number, z: number, color: string, type: VehicleType, speed: number, isNight: boolean }) => {
  const geometry = CAR_GEOMETRIES[type];
  const yPos = type === VehicleType.CAR ? 0.75 : 1.8;
  const wheelZOffset = type === VehicleType.CAR ? 1.3 : (type === VehicleType.TRUCK ? 2.5 : 3.5);
  const wheelXOffset = type === VehicleType.CAR ? 0.9 : 1.3;
  
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, yPos, 0]} castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      
      <Wheel position={[-wheelXOffset, 0.35, wheelZOffset]} />
      <Wheel position={[wheelXOffset, 0.35, wheelZOffset]} />
      <Wheel position={[-wheelXOffset, 0.35, -wheelZOffset]} />
      <Wheel position={[wheelXOffset, 0.35, -wheelZOffset]} />

      <mesh position={[type === VehicleType.CAR ? 0.6 : 0.9, yPos, type === VehicleType.CAR ? 2.01 : 4.01]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[type === VehicleType.CAR ? -0.6 : -0.9, yPos, type === VehicleType.CAR ? 2.01 : 4.01]}>
        <planeGeometry args={[0.5, 0.2]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {isNight && (
        <>
            <mesh position={[type === VehicleType.CAR ? 0.6 : 0.9, yPos, type === VehicleType.CAR ? -2.01 : -4.01]}>
                <planeGeometry args={[0.5, 0.2]} />
                <meshBasicMaterial color="#ffffcc" />
            </mesh>
            <mesh position={[type === VehicleType.CAR ? -0.6 : -0.9, yPos, type === VehicleType.CAR ? -2.01 : -4.01]}>
                <planeGeometry args={[0.5, 0.2]} />
                <meshBasicMaterial color="#ffffcc" />
            </mesh>
             <pointLight position={[0, yPos, type === VehicleType.CAR ? -4 : -6]} distance={20} intensity={2} color="#ffffcc" />
        </>
      )}
    </group>
  );
});

export const TrafficManager: React.FC<TrafficManagerProps> = ({ playerZ, trafficDataRef }) => {
  const { gameState, isNight, gameMode, currentLevel, raceDifficulty } = useGameStore();
  const [cars, setCars] = React.useState<TrafficCar[]>([]);
  const lastSpawnZ = useRef(playerZ - 100);
  
  useFrame((state, delta) => {
    if (gameState !== GameState.PLAYING) return;

    let updatedCars = [...trafficDataRef.current];
    const laneXPositions = { '-1': -6, '0': 0, '1': 6 };

    for (let i = 0; i < updatedCars.length; i++) {
        const car = updatedCars[i];
        car.z -= car.speed * delta;
        
        const targetX = laneXPositions[car.lane as -1 | 0 | 1];
        if (Math.abs(car.x - targetX) > 0.1) {
            car.x = THREE.MathUtils.lerp(car.x, targetX, delta * 3);
            car.changingLane = true;
        } else {
            car.x = targetX;
            car.changingLane = false;
        }

        let blocked = false;
        for (let j = 0; j < updatedCars.length; j++) {
            if (i === j) continue;
            const other = updatedCars[j];
            if (other.lane === car.lane && other.z < car.z && (car.z - other.z) < 25) {
                blocked = true;
                car.speed = THREE.MathUtils.lerp(car.speed, other.speed * 0.8, delta * 2);
            }
        }

        if (blocked && !car.changingLane) {
            const possibleLanes = [];
            if (car.lane > -1) possibleLanes.push(car.lane - 1);
            if (car.lane < 1) possibleLanes.push(car.lane + 1);
            
            for (const targetLane of possibleLanes) {
                const laneFree = !updatedCars.some(o => 
                    o.lane === targetLane && Math.abs(o.z - car.z) < 40
                );
                if (laneFree) {
                    car.lane = targetLane;
                    break;
                }
            }
        } else if (!blocked && car.speed < 60) {
             car.speed += 10 * delta;
        }
    }

    updatedCars = updatedCars.filter(car => {
       const dist = car.z - playerZ;
       return dist > -400 && dist < 100; 
    });

    // Spawn Logic
    // Only spawn if player has traveled 35m (350 units) - Applied to ALL modes
    if (playerZ < -350) {
        let spawnDistance = 25; 
        let spawnChance = 0.8;

        if (gameMode === GameMode.CAREER) {
            spawnDistance = Math.max(15, 30 - (currentLevel * 0.1));
            spawnChance = 0.85;
        } else if (gameMode === GameMode.RACE || gameMode === GameMode.DRIFT) {
            // Traffic appears in race and drift modes
            if (raceDifficulty === RaceDifficulty.EASY) {
                spawnDistance = 30; 
                spawnChance = 0.7;
            } else if (raceDifficulty === RaceDifficulty.MEDIUM) {
                spawnDistance = 20; 
                spawnChance = 0.85;
            } else if (raceDifficulty === RaceDifficulty.HARD) {
                spawnDistance = 15;
                spawnChance = 0.95;
            }
            // For drift mode specifically, slightly less traffic to allow sliding
            if (gameMode === GameMode.DRIFT) {
                spawnDistance += 10;
                spawnChance = 0.7;
            }
        } else {
            // Free Ride
            spawnDistance = 25;
            spawnChance = 0.8;
        }

        const spawnTarget = playerZ - 300; 
        if (Math.abs(spawnTarget - lastSpawnZ.current) > spawnDistance) {
            if (Math.random() < spawnChance) {
                const lanes = [-1, 0, 1];
                const laneIdx = lanes[Math.floor(Math.random() * lanes.length)];
                const laneX = laneXPositions[laneIdx as -1|0|1];
                
                const blocked = updatedCars.some(c => Math.abs(c.z - spawnTarget) < 30 && c.lane === laneIdx);
                
                if (!blocked) {
                    const rand = Math.random();
                    let type = VehicleType.CAR;
                    let speed = 40 + Math.random() * 30;
                    if (rand > 0.7) { type = VehicleType.TRUCK; speed = 30 + Math.random() * 20; }
                    if (rand > 0.9) { type = VehicleType.BUS; speed = 25 + Math.random() * 10; }

                    const carColors = ['#ffffff', '#aa0000', '#0044aa', '#111111', '#dddddd', '#00ff00', '#ffff00', '#ff00ff'];

                    updatedCars.push({
                        id: Math.random().toString(),
                        x: laneX,
                        lane: laneIdx,
                        z: spawnTarget - (Math.random() * 20),
                        speed: speed,
                        type: type,
                        color: carColors[Math.floor(Math.random() * carColors.length)],
                        changingLane: false
                    });
                }
            }
            lastSpawnZ.current = spawnTarget;
        }
    }

    trafficDataRef.current = updatedCars;
    setCars(updatedCars);
  });

  return (
    <group>
      {cars.map(car => (
        <TrafficCarMesh key={car.id} x={car.x} z={car.z} color={car.color} type={car.type} speed={car.speed} isNight={isNight} />
      ))}
    </group>
  );
};