import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { PlayerCar } from './PlayerCar';
import { BotCar } from './BotCar';
import { RoadManager } from './RoadManager';
import { TrafficManager } from './TrafficManager';
import { Environment } from './Environment';
import { useGameStore } from '../store';
import { GameState, GameMode } from '../types';

export const GameScene: React.FC = () => {
  const [playerZ, setPlayerZ] = useState(0);
  
  // We use a ref for botZ to pass to PlayerCar without re-rendering everything constantly
  // Alternatively, we could put it in store, but refs are faster for per-frame physics checks
  const botZRef = useRef(0);
  const setBotZ = (z: number) => { botZRef.current = z; };

  const botXRef = useRef(6); // Default bot start X
  const setBotX = (x: number) => { botXRef.current = x; };

  const { crash, gameKey, gameMode } = useGameStore();
  
  // Shared ref for traffic data
  const trafficRef = useRef<any[]>([]);

  const handleCollision = () => {
    crash();
  };

  return (
    <Canvas key={gameKey} shadows camera={{ position: [0, 5, 10], fov: 50 }}>
      {/* Environment & Lighting */}
      <Environment />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Game Objects */}
      <PlayerCar 
        onCollide={handleCollision} 
        setPlayerZ={setPlayerZ} 
        trafficRef={trafficRef}
        botZRef={botZRef}
        botXRef={botXRef}
      />
      
      {(gameMode === GameMode.RACE || gameMode === GameMode.DRIFT) && (
          <BotCar setBotZ={setBotZ} setBotX={setBotX} trafficRef={trafficRef} />
      )}

      <TrafficManager playerZ={playerZ} trafficDataRef={trafficRef} />
      <RoadManager playerZ={playerZ} />
    </Canvas>
  );
};