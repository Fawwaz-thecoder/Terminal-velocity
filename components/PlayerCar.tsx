import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, CAR_CATALOG } from '../store';
import { GameState, GameMode, Weather } from '../types';
import { CarVisuals } from './CarVisuals';

interface PlayerCarProps {
  onCollide: () => void;
  setPlayerZ: (z: number) => void;
  trafficRef: React.MutableRefObject<any[]>;
  botZRef: React.MutableRefObject<number>;
  botXRef: React.MutableRefObject<number>;
}

const BOUNDS = 9;

const NitroFlash = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Create a lightning bolt shape
  const geometry = useMemo(() => {
      const shape = new THREE.Shape();
      // Start bottom center
      shape.moveTo(0, 0);
      // Zig right
      shape.lineTo(0.2, 0.4);
      // Zag left slightly
      shape.lineTo(0.1, 0.4);
      // Long bolt to tip
      shape.lineTo(0.3, 1.5); // Tip
      // Return path
      shape.lineTo(-0.1, 0.7);
      shape.lineTo(0.05, 0.7);
      shape.lineTo(-0.15, 0);
      shape.lineTo(0, 0);
      
      const extrudeSettings = {
        steps: 1,
        depth: 0.1,
        bevelEnabled: false,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center(); // Center geometry for rotation
      return geo;
  }, []);

  useFrame((state) => {
      if (groupRef.current) {
          // Rapid flickering scale
          const scaleZ = 1 + Math.random() * 1.5; // Stretch length
          const scaleXY = 0.8 + Math.random() * 0.4; // Pulse width
          groupRef.current.scale.set(scaleXY, scaleXY, scaleZ);
          
          // Random Z rotation jitter for chaotic energy look
          groupRef.current.rotation.z = Math.random() * Math.PI * 2;
      }
  });

  return (
      <group ref={groupRef} position={[0, 0.5, 3.2]}> {/* Positioned behind car */}
          {/* Main Bolt */}
          <mesh geometry={geometry} rotation={[Math.PI / 2, 0, Math.PI]}>
              <meshBasicMaterial color="#00ffff" />
          </mesh>
          {/* Cross Bolt for volume */}
          <mesh geometry={geometry} rotation={[Math.PI / 2, Math.PI / 2, Math.PI]}>
              <meshBasicMaterial color="#ccffff" />
          </mesh>
           <pointLight distance={8} intensity={8} color="#00ffff" />
      </group>
  );
};

export const PlayerCar: React.FC<PlayerCarProps> = ({ onCollide, setPlayerZ, trafficRef, botZRef, botXRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  const { 
      gameState, gameMode, currentLevel, weather, isNight, distance,
      setSpeed, setDistance, increaseScore, selectedCarId,
      nitro, isNitroActive, setNitroActive, useNitro, regenNitro,
      targetDistance, completeLevel, winRace, loseRace, tickTimer,
      controls, setRPM, setGear, addMoney,
      setDriftScore, driftScore, botDriftScore
  } = useGameStore();
  
  // Get Current Car Stats
  const carStats = useMemo(() => 
    CAR_CATALOG.find(c => c.id === selectedCarId) || CAR_CATALOG[0]
  , [selectedCarId]);

  // Derived Constants based on stats
  const BASE_MAX_SPEED = carStats.topSpeedKmh / 2;
  const ACCELERATION = carStats.topSpeedKmh * 0.5; 
  const BRAKING = 20 + (carStats.brakingStat * 0.8); 
  const HANDLING = 0.5 + (carStats.handlingStat / 100);

  const keys = useRef<{ [key: string]: boolean }>({});
  const steeringValue = useRef(0);
  const driftPointsRef = useRef(0);

  // Gear & RPM Logic
  const gearRef = useRef(1);
  const rpmRef = useRef(1000);
  const shiftingRef = useRef(false);
  const shiftTimerRef = useRef(0);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Reset drift score on mount
    driftPointsRef.current = 0;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (gameState !== GameState.PLAYING || !meshRef.current) return;

    tickTimer(delta);

    // --- CONTROLS MAPPING ---
    const isAccelerating = keys.current['ArrowUp'] || keys.current['KeyW'] || controls.up;
    const isBraking = keys.current['ArrowDown'] || keys.current['KeyS'] || controls.down;
    const isLeft = keys.current['ArrowLeft'] || keys.current['KeyA'] || controls.left;
    const isRight = keys.current['ArrowRight'] || keys.current['KeyD'] || controls.right;
    const isHandbrake = keys.current['Space'] || controls.handbrake;
    const isNitro = keys.current['ShiftLeft'] || keys.current['ShiftRight'] || controls.nitro; 

    // Nitro Logic
    const useNitroBool = isNitro && nitro > 0;
    if (useNitroBool !== isNitroActive) {
        setNitroActive(useNitroBool);
    }
    if (useNitroBool) {
        useNitro(30 * delta); 
    } else {
        regenNitro(5 * delta);
    }
    const nitroMultiplier = useNitroBool ? 1.5 : 1.0;

    // --- PHYSICS SETTINGS FOR DRIFT MODE ---
    const isDriftMode = gameMode === GameMode.DRIFT;
    
    // Friction & Grip Logic
    let friction = 0.98;
    let turnGrip = 1.0;
    
    if (isDriftMode) {
        friction = 0.99; // Slide longer (less Z friction)
        turnGrip = 0.2;  // Very low grip to allow sliding
    }

    if (weather === Weather.RAIN) { friction *= 0.98; turnGrip *= 0.8; }
    if (weather === Weather.SNOW) { friction *= 0.97; turnGrip *= 0.6; }

    // --- GEARBOX & RPM SIMULATION ---
    const currentSpeedKm = Math.abs(velocity.current.z) * 2;
    const maxSpeed = carStats.topSpeedKmh;
    const gearRatios = [0, maxSpeed * 0.15, maxSpeed * 0.30, maxSpeed * 0.50, maxSpeed * 0.70, maxSpeed * 0.85, maxSpeed * 1.50];

    const currentGearIndex = gearRef.current;
    
    // Auto Shift
    if (!shiftingRef.current && currentGearIndex < 6 && currentSpeedKm > gearRatios[currentGearIndex]) {
        shiftingRef.current = true;
        shiftTimerRef.current = 0.25; 
    }
    if (!shiftingRef.current && currentGearIndex > 1 && currentSpeedKm < gearRatios[currentGearIndex - 1] * 0.9) {
        gearRef.current--;
    }

    let effectiveAcceleration = ACCELERATION;
    
    // RPM Logic
    // If NOT using nitro, cap RPM visuals lower to satisfy "stay between 2 to 3" request (roughly)
    // We map the gear progress (0-1) to a smaller RPM range when nitro is off.
    const idleRPM = 1000;
    const maxRPM = useNitroBool ? 9000 : 5000; // 5000 RPM max when cruising looks like "3-4" on the gauge usually

    if (shiftingRef.current) {
        effectiveAcceleration = 0;
        shiftTimerRef.current -= delta;
        rpmRef.current = THREE.MathUtils.lerp(rpmRef.current, 3500, delta * 15);
        if (shiftTimerRef.current <= 0) {
            shiftingRef.current = false;
            gearRef.current++;
        }
    } else {
        const minGearSpeed = gearRatios[currentGearIndex - 1];
        const maxGearSpeed = gearRatios[currentGearIndex];
        const range = maxGearSpeed - minGearSpeed;
        const currentOffset = Math.max(0, currentSpeedKm - minGearSpeed);
        // Calculate percentage through the gear
        const percent = Math.min(1.1, currentOffset / range); 
        
        let targetRPM = idleRPM + (percent * (maxRPM - idleRPM)); 
        
        // Random fluctuation at idle
        if (currentSpeedKm < 1 && !isAccelerating) targetRPM = 900 + Math.random() * 200;
        
        rpmRef.current = THREE.MathUtils.lerp(rpmRef.current, targetRPM, delta * 8);
    }
    
    setRPM(rpmRef.current);
    setGear(gearRef.current);

    // --- ACCELERATION LOGIC ---
    const autoThrottle = gameMode === GameMode.CAREER || gameMode === GameMode.RACE || gameMode === GameMode.DRIFT;
    
    if (autoThrottle) {
        let targetSpeed = -BASE_MAX_SPEED * nitroMultiplier;
        
        if (isBraking) {
            velocity.current.z += BRAKING * delta; 
            if (velocity.current.z > 0) velocity.current.z = 0; 
        } 
        else if (isHandbrake) {
            // Handbrake Logic: Decelerate but allow sliding
            // If drifting, we don't want to stop instantly, we want to lose speed gradually while maintaining yaw control
            const brakingForce = isDriftMode ? 1.0 : 2.5; 
            // Apply braking force against direction of travel
            if (velocity.current.z < 0) {
                 velocity.current.z += brakingForce * delta * 20; 
                 if (velocity.current.z > 0) velocity.current.z = 0;
            }
        }
        else {
             if (!shiftingRef.current) {
                 velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetSpeed, delta * 0.8);
             }
        }
    } else {
        // Free Mode
        const maxSpeed = BASE_MAX_SPEED * nitroMultiplier;
        if (isHandbrake) {
             // Free mode handbrake
             if (velocity.current.z < 0) {
                 velocity.current.z += 40 * delta; // Stronger brake
                 if (velocity.current.z > 0) velocity.current.z = 0;
             } else if (velocity.current.z > 0) {
                 velocity.current.z -= 40 * delta;
                 if (velocity.current.z < 0) velocity.current.z = 0;
             }
        } else if (isAccelerating) {
            if (!shiftingRef.current) {
                velocity.current.z -= effectiveAcceleration * delta * (weather === Weather.SNOW ? 0.8 : 1) * nitroMultiplier;
            }
        } else if (isBraking) {
            velocity.current.z += BRAKING * delta; 
        }
        velocity.current.z = Math.max(Math.min(velocity.current.z, 50), -maxSpeed);
    }

    // --- STEERING LOGIC ---
    const speedFactor = Math.min(Math.abs(velocity.current.z) / 50, 1.0); 
    let targetSteering = 0;
    if (isLeft) targetSteering = 1;
    else if (isRight) targetSteering = -1;
    
    // Handbrake Drifting Logic
    const driftFactor = (isHandbrake || isDriftMode) ? 2.5 : 1.0; 
    const driftFriction = (isHandbrake || isDriftMode) ? 0.1 : 1.0; 
    
    steeringValue.current = THREE.MathUtils.lerp(steeringValue.current, targetSteering, delta * 5 * HANDLING * driftFactor);

    // Apply Lateral Velocity
    if (Math.abs(velocity.current.z) > 1) {
        const lateralForce = -steeringValue.current * (isDriftMode ? 60 : 30) * speedFactor * turnGrip * HANDLING * driftFriction;
        // In Drift mode, x velocity persists much longer (slide)
        const xLerp = isDriftMode ? delta * 1.5 : delta * 5; 
        velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, lateralForce, xLerp);
    } else {
        velocity.current.x = 0;
    }

    // --- DRIFT SCORING (Only in Drift Mode) ---
    if (isDriftMode) {
        if (currentSpeedKm > 80 && Math.abs(steeringValue.current) > 0.1) {
            const points = currentSpeedKm * Math.abs(steeringValue.current) * delta * 2;
            driftPointsRef.current += points;
            setDriftScore(Math.floor(driftPointsRef.current));
        }
    }

    // --- VISUALS ---
    const visualDriftAngle = (isHandbrake || isDriftMode) ? 1.2 : 0.3;
    const targetYaw = steeringValue.current * visualDriftAngle * speedFactor; 
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetYaw, delta * 10);
    
    const targetRoll = -steeringValue.current * 0.15 * speedFactor * (Math.abs(velocity.current.z) / 150);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRoll, delta * 5);
    
    const accelerationPitch = (isAccelerating || (gameMode !== GameMode.FREE_RIDE && !isBraking)) ? -0.02 : (isBraking || isHandbrake ? 0.03 : 0);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, accelerationPitch, delta * 5);

    // Physics update
    velocity.current.x *= isDriftMode ? 0.98 : 0.9; 
    if (gameMode === GameMode.FREE_RIDE && !isAccelerating && !isBraking) velocity.current.z *= friction;
    
    meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta));

    // Bounds check
    if (meshRef.current.position.x > BOUNDS) {
      meshRef.current.position.x = BOUNDS;
      velocity.current.x = 0;
      if(isDriftMode) driftPointsRef.current = Math.max(0, driftPointsRef.current - 50);
    } else if (meshRef.current.position.x < -BOUNDS) {
      meshRef.current.position.x = -BOUNDS;
      velocity.current.x = 0;
      if(isDriftMode) driftPointsRef.current = Math.max(0, driftPointsRef.current - 50);
    }

    // Camera
    const currentSpeed = Math.abs(velocity.current.z);
    const camTargetZ = meshRef.current.position.z + 15 + (currentSpeed * 0.1);
    const camTargetY = 6 + (currentSpeed * 0.03);
    const nitroOffset = useNitroBool ? 5 : 0;
    
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, meshRef.current.position.x * 0.7, delta * 4);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, camTargetZ + nitroOffset, delta * 5);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, camTargetY, delta * 2);
    state.camera.lookAt(meshRef.current.position.x * 0.5, 2, meshRef.current.position.z - 20);

    // State Updates
    const newDistTraveled = Math.abs(Math.floor(meshRef.current.position.z / 10));
    
    if (newDistTraveled > distance) {
        const diff = newDistTraveled - distance;
        addMoney(diff * 2);
    }

    setSpeed(Math.floor(currentSpeedKm));
    setPlayerZ(meshRef.current.position.z);
    setDistance(newDistTraveled);
    increaseScore(Math.floor(currentSpeed * delta * 1.5));

    // Win Logic
    if (gameMode === GameMode.CAREER && newDistTraveled >= targetDistance) {
        completeLevel();
    } else if (gameMode === GameMode.RACE && newDistTraveled >= targetDistance) {
        if (meshRef.current.position.z < botZRef.current) winRace();
        else loseRace();
    } else if (gameMode === GameMode.DRIFT && newDistTraveled >= targetDistance) {
        if (driftScore > botDriftScore) winRace();
        else loseRace();
    }

    // Traffic Collision
    if (trafficRef.current) {
        for (const car of trafficRef.current) {
            const distZ = Math.abs(car.z - meshRef.current.position.z);
            const distX = Math.abs(car.x - meshRef.current.position.x);
            const length = car.type === 'TRUCK' ? 8 : (car.type === 'BUS' ? 10 : 4);
            const width = car.type === 'TRUCK' || car.type === 'BUS' ? 2.5 : 1.8;
            if (distZ < (length / 2 + 2) && distX < (width / 2 + 0.9)) {
                onCollide();
            }
        }
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      <CarVisuals 
        type={carStats.type} 
        color={carStats.color} 
        name={carStats.name}
        wheelRotation={steeringValue.current * 0.5} 
        isNight={isNight}
      />
      <mesh position={[-0.7, 0.7, 2.15]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh position={[0.7, 0.7, 2.15]}>
        <boxGeometry args={[0.4, 0.2, 0.1]} />
        <meshBasicMaterial color="red" />
      </mesh>
      
      {isNight && (
        <>
            <spotLight position={[-0.7, 0.8, -2]} angle={0.5} penumbra={0.5} intensity={50} color="#fff" distance={100} target-position={[-0.7, 0, -50]} />
            <spotLight position={[0.7, 0.8, -2]} angle={0.5} penumbra={0.5} intensity={50} color="#fff" distance={100} target-position={[0.7, 0, -50]} />
        </>
      )}

      {isNitroActive && nitro > 0 && <NitroFlash />}
    </group>
  );
};