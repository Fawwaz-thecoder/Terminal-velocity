import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameScene } from './components/GameScene';
import { useGameStore, CAR_CATALOG } from './store';
import { GameState, GameMode, Weather, RaceDifficulty } from './types';
import { CarVisuals } from './components/CarVisuals';
import { ContactShadows, Environment as DreiEnvironment, OrbitControls } from '@react-three/drei';

const playTickSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
  }
};

const ShopCarPreview = ({ carId }: { carId: string }) => {
    const car = CAR_CATALOG.find(c => c.id === carId) || CAR_CATALOG[0];
    const meshRef = useRef<any>(null);

    useEffect(() => {
        let r = 0;
        const interval = setInterval(() => {
            if(meshRef.current) {
                r += 0.01;
                meshRef.current.rotation.y = r;
            }
        }, 16);
        return () => clearInterval(interval);
    }, []);

    return (
        <group>
            <group ref={meshRef} position={[0, 0, 0]}>
                <CarVisuals type={car.type} color={car.color} name={car.name} />
            </group>
            <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={10} blur={2} far={4} />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <DreiEnvironment preset="city" />
        </group>
    );
};

// --- REDESIGNED DASHBOARD COMPONENTS ---

const RPMGauge = ({ rpm, gear }: { rpm: number, gear: number }) => {
    // Range 1000 (1) to 8000+ (8)
    // Scale ticks 1 to 8
    const maxVisualRPM = 8000;
    // Normalized 0 to 1 based on 1000-8000 range
    const pct = Math.min(1, Math.max(0, (rpm - 1000) / (maxVisualRPM - 1000)));
    
    const ticks = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="flex items-end gap-4 select-none">
            {/* Gear Indicator */}
            <div className="flex flex-col items-center justify-end pb-1">
                 <span className="text-gray-500 text-[10px] font-bold tracking-widest mb-[-2px]">GEAR</span>
                 <span className="text-4xl font-black italic text-yellow-400 leading-none">{gear}</span>
            </div>

            {/* RPM Meter - Long Bar */}
            <div className="flex flex-col mb-1">
                 <div className="flex justify-between w-48 sm:w-64 px-1 mb-1">
                     {ticks.map(t => (
                         <span key={t} className={`text-[10px] font-bold ${t >= 7 ? 'text-red-500' : 'text-blue-300'}`}>{t}</span>
                     ))}
                 </div>
                 <div className="w-48 sm:w-64 h-6 sm:h-8 bg-gray-900 border border-gray-600 rounded transform -skew-x-12 overflow-hidden relative shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex justify-between px-2 z-10">
                          {ticks.map(t => <div key={t} className="h-full w-[1px] bg-white/10" />)}
                      </div>
                      
                      {/* The Bar */}
                      <div 
                         className="h-full transition-all duration-75 ease-out"
                         style={{ 
                             width: `${pct * 100}%`,
                             background: 'linear-gradient(90deg, #0044aa 0%, #0088ff 60%, #ff0000 90%)',
                             boxShadow: '0 0 15px rgba(0, 136, 255, 0.6)'
                         }}
                      />
                 </div>
                 <div className="text-[8px] text-gray-500 font-bold mt-1 text-right">RPM x1000</div>
            </div>
        </div>
    );
};

const SpeedometerGauge = ({ speed, nitro }: { speed: number, nitro: number }) => {
    return (
        <div className="flex flex-col items-end gap-1 select-none">
            {/* Speed Readout */}
            <div className="flex items-baseline">
                <span className="text-5xl sm:text-6xl font-black italic text-white tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                    {Math.floor(speed)}
                </span>
                <span className="text-lg text-cyan-400 font-bold ml-1">KMH</span>
            </div>

            {/* Nitro Gauge - Explicit Bar */}
            <div className="flex items-center gap-2 mt-1 w-full justify-end">
                <span className="text-[8px] text-cyan-400 font-bold tracking-widest">NITRO</span>
                <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-white shadow-[0_0_5px_#00ffff]" 
                        style={{ width: `${nitro}%`, transition: 'width 0.1s' }}
                    />
                </div>
            </div>
        </div>
    );
};

const CombinedDashboard = ({ speed, rpm, gear, nitro }: { speed: number, rpm: number, gear: number, nitro: number }) => {
    return (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
             <div className="bg-black border-[3px] border-blue-500 shadow-[0_0_20px_rgba(0,100,255,0.6)] rounded-xl px-6 py-3 flex items-end gap-6 sm:gap-10 scale-75 sm:scale-100 origin-bottom">
                {/* Left: RPM & Gear */}
                <RPMGauge rpm={rpm} gear={gear} />
                
                {/* Divider */}
                <div className="w-[1px] h-12 bg-gray-800"></div>
                
                {/* Right: Speed & Nitro */}
                <SpeedometerGauge speed={speed} nitro={nitro} />
             </div>
        </div>
    );
};

// ----------------------------

const LevelSelect = () => {
    const { unlockedLevels, startCareerLevel, setGameState } = useGameStore();
    const TOTAL_LEVELS_TO_SHOW = 250;

    return (
        <div className="absolute inset-0 bg-neutral-900 z-50 p-8 overflow-y-auto pointer-events-auto">
            <div className="sticky top-0 bg-neutral-900/95 backdrop-blur z-20 pb-6 border-b border-gray-800 mb-6">
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 italic tracking-tighter">
                    CAREER MODE
                </h2>
                <p className="text-gray-400 mt-2">Complete levels to earn cash and unlock faster cars.</p>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3 pb-24">
                {Array.from({ length: TOTAL_LEVELS_TO_SHOW }, (_, i) => i + 1).map(level => {
                    const isBonus = level % 20 === 0;
                    const isLocked = level > unlockedLevels;
                    
                    let containerClass = "aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all relative overflow-hidden group p-2 select-none";
                    let labelClass = "text-[10px] font-bold tracking-widest mb-0.5 uppercase";
                    let numberClass = "text-3xl font-black italic";

                    if (isLocked) {
                        containerClass += " bg-gray-950/80 cursor-not-allowed";
                        if (isBonus) {
                            containerClass += " border-yellow-900/30";
                            labelClass += " text-yellow-900/60";
                            numberClass += " text-yellow-900/40"; 
                        } else {
                            containerClass += " border-gray-800";
                            labelClass += " text-gray-800";
                            numberClass += " text-gray-800";
                        }
                    } else {
                        containerClass += " bg-black cursor-pointer hover:scale-105 active:scale-95";
                        if (isBonus) {
                            containerClass += " border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] hover:bg-yellow-900/20";
                            labelClass += " text-yellow-200";
                            numberClass += " text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]";
                        } else {
                            containerClass += " border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:bg-cyan-900/20";
                            labelClass += " text-cyan-200";
                            numberClass += " text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]";
                        }
                    }

                    return (
                        <button 
                            key={level} 
                            onClick={() => !isLocked && startCareerLevel(level)}
                            disabled={isLocked}
                            className={containerClass}
                        >
                            <span className={labelClass}>
                                {isBonus ? 'BONUS' : 'LEVEL'}
                            </span>
                            <span className={numberClass}>
                                {level}
                            </span>
                            {isLocked && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <span className="text-2xl opacity-40 grayscale">🔒</span>
                                </div>
                            )}
                            {isBonus && !isLocked && (
                                <div className="absolute bottom-1 bg-yellow-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-yellow-200 tracking-widest border border-yellow-500/50">
                                    6X CASH
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            
            <button 
                onClick={() => setGameState(GameState.MENU)}
                className="fixed bottom-8 right-8 px-10 py-4 bg-white text-black font-black text-xl rounded-full shadow-lg hover:scale-105 transition-transform z-50 border-4 border-gray-200"
            >
                BACK
            </button>
        </div>
    );
};

const RaceMenu = () => {
    const { startRace, setGameState } = useGameStore();

    return (
        <div className="absolute inset-0 bg-neutral-900 z-50 flex items-center justify-center pointer-events-auto">
            <div className="bg-black border-2 border-purple-500 p-12 rounded-xl text-center max-w-2xl w-full box-shadow-neon">
                <h2 className="text-5xl font-black text-purple-500 italic mb-8">MULTIPLAYER RACE</h2>
                <p className="text-gray-400 mb-8">Race against a bot opponent. First to 2500m wins.</p>
                
                <div className="grid grid-cols-1 gap-4 mb-8">
                    <button onClick={() => startRace(RaceDifficulty.EASY)} className="p-4 bg-green-900/50 hover:bg-green-700 border border-green-500 text-white font-bold text-xl rounded">
                        EASY (Reward $10,000)
                    </button>
                    <button onClick={() => startRace(RaceDifficulty.MEDIUM)} className="p-4 bg-yellow-900/50 hover:bg-yellow-700 border border-yellow-500 text-white font-bold text-xl rounded">
                        MEDIUM (Reward $25,000)
                    </button>
                    <button onClick={() => startRace(RaceDifficulty.HARD)} className="p-4 bg-red-900/50 hover:bg-red-700 border border-red-500 text-white font-bold text-xl rounded">
                        HARD (Reward $50,000)
                    </button>
                </div>
                
                <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="text-gray-500 hover:text-white underline"
                >
                    Back to Menu
                </button>
            </div>
        </div>
    );
};

const DriftMenu = () => {
    const { startDriftMode, setGameState } = useGameStore();

    return (
        <div className="absolute inset-0 bg-neutral-900 z-50 flex items-center justify-center pointer-events-auto">
            <div className="bg-black border-2 border-yellow-500 p-12 rounded-xl text-center max-w-2xl w-full box-shadow-neon">
                <h2 className="text-5xl font-black text-yellow-500 italic mb-2">DRIFT BATTLE</h2>
                <div className="text-xs font-bold text-yellow-200 tracking-widest mb-8">SCORE ATTACK MODE</div>
                
                <p className="text-gray-400 mb-8">Out-drift the bot. Maintain high speeds and sharp angles.</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <button onClick={() => startDriftMode(RaceDifficulty.EASY)} className="p-6 bg-green-900/50 hover:bg-green-600 border border-green-400 text-green-100 font-bold rounded flex flex-col items-center gap-2 group transition-all">
                        <span className="text-2xl italic">EASY</span>
                        <span className="text-[10px] text-green-300 opacity-60 group-hover:opacity-100">LOW BOT SKILL</span>
                    </button>
                    <button onClick={() => startDriftMode(RaceDifficulty.MEDIUM)} className="p-6 bg-yellow-900/50 hover:bg-yellow-600 border border-yellow-400 text-yellow-100 font-bold rounded flex flex-col items-center gap-2 group transition-all">
                        <span className="text-2xl italic">MEDIUM</span>
                        <span className="text-[10px] text-yellow-300 opacity-60 group-hover:opacity-100">COMPETITIVE</span>
                    </button>
                    <button onClick={() => startDriftMode(RaceDifficulty.HARD)} className="p-6 bg-red-900/50 hover:bg-red-600 border border-red-400 text-red-100 font-bold rounded flex flex-col items-center gap-2 group transition-all">
                        <span className="text-2xl italic">HARD</span>
                        <span className="text-[10px] text-red-300 opacity-60 group-hover:opacity-100">PRO DRIFTER</span>
                    </button>
                </div>
                
                <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="text-gray-500 hover:text-white underline"
                >
                    Back to Menu
                </button>
            </div>
        </div>
    );
};

const ShopMenu = () => {
  const { totalMoney, ownedCarIds, selectedCarId, buyCar, selectCar, setGameState } = useGameStore();
  const [previewId, setPreviewId] = useState(selectedCarId);

  return (
    <div className="absolute inset-0 bg-neutral-900 z-50 flex flex-col md:flex-row pointer-events-auto">
        <div className="w-full md:w-1/3 h-[40vh] md:h-full bg-gradient-to-b from-gray-900 to-black relative border-r border-gray-800">
             <div className="absolute top-4 left-4 z-10">
                 <h2 className="text-4xl font-bold text-cyan-400 italic">TERMINAL GARAGE</h2>
                 <div className="text-2xl text-green-400 font-mono mt-2">${totalMoney.toLocaleString()}</div>
             </div>
             <Canvas shadows camera={{ position: [4, 2, 5], fov: 45 }}>
                 <ShopCarPreview carId={previewId} />
                 <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
             </Canvas>
        </div>

        <div className="w-full md:w-2/3 h-[60vh] md:h-full overflow-y-auto p-8 bg-neutral-900">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                {CAR_CATALOG.map(car => {
                    const isOwned = ownedCarIds.includes(car.id);
                    const isSelected = selectedCarId === car.id;
                    const isPreviewing = previewId === car.id;
                    
                    return (
                        <div 
                            key={car.id} 
                            onMouseEnter={() => setPreviewId(car.id)}
                            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${isPreviewing ? 'bg-gray-800 border-cyan-500' : 'bg-black border-gray-700'}`}
                        >
                            <div className="flex justify-between mb-2">
                                <h3 className="text-xl font-bold text-white">{car.name}</h3>
                                <div className="text-xs text-gray-400">{car.type}</div>
                            </div>
                            
                            <div className="space-y-1 mb-4">
                                <div className="flex items-center text-xs text-gray-400">
                                    <span className="w-12">SPEED</span>
                                    <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                                        <div className="h-full bg-cyan-500" style={{ width: `${car.speedStat}%` }} />
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-gray-400">
                                    <span className="w-12">HNDL</span>
                                    <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                                        <div className="h-full bg-purple-500" style={{ width: `${car.handlingStat}%` }} />
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-gray-400">
                                    <span className="w-12">BRK</span>
                                    <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                                        <div className="h-full bg-red-500" style={{ width: `${car.brakingStat}%` }} />
                                    </div>
                                </div>
                            </div>

                            {isOwned ? (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); selectCar(car.id); }}
                                    disabled={isSelected}
                                    className={`w-full py-2 font-bold rounded ${isSelected ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                                >
                                    {isSelected ? 'SELECTED' : 'SELECT'}
                                </button>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); buyCar(car.id); }}
                                    disabled={totalMoney < car.price}
                                    className={`w-full py-2 font-bold rounded ${totalMoney >= car.price ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-gray-800 text-gray-500'}`}
                                >
                                    BUY ${car.price.toLocaleString()}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={() => setGameState(GameState.MENU)}
                className="fixed bottom-8 right-8 px-8 py-4 bg-white text-black font-bold text-xl rounded shadow-lg hover:scale-105 transition-transform z-50"
            >
                BACK TO MENU
            </button>
        </div>
    </div>
  );
};

const TouchControls = () => {
    const { setControl } = useGameStore();

    const handlePress = (key: any, val: boolean) => {
        setControl(key, val);
    };
    
    // In Career/Race/Drift, Gas is automated, but Brake is manual
    const { gameMode } = useGameStore();
    const showGas = gameMode === GameMode.FREE_RIDE;
    const showBrake = true; 

    // Responsive button sizes
    const btnSize = "w-20 h-20 sm:w-28 sm:h-28";
    const pedalHeight = "h-32 sm:h-40";
    const arrowSize = "text-3xl sm:text-5xl";

    return (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-auto select-none touch-none z-20">
            {/* Left/Right Steering */}
            <div className="flex gap-4 sm:gap-6">
                <button 
                    onPointerDown={() => handlePress('left', true)} 
                    onPointerUp={() => handlePress('left', false)}
                    onPointerLeave={() => handlePress('left', false)}
                    className={`${btnSize} bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40 active:scale-95 transition-transform shadow-lg`}
                >
                    <span className={`${arrowSize} text-white font-black`}>←</span>
                </button>
                <button 
                    onPointerDown={() => handlePress('right', true)} 
                    onPointerUp={() => handlePress('right', false)}
                    onPointerLeave={() => handlePress('right', false)}
                    className={`${btnSize} bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40 active:scale-95 transition-transform shadow-lg`}
                >
                    <span className={`${arrowSize} text-white font-black`}>→</span>
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 sm:gap-6 items-end">
                {/* Handbrake */}
                <button 
                    onPointerDown={() => handlePress('handbrake', true)} 
                    onPointerUp={() => handlePress('handbrake', false)}
                    onPointerLeave={() => handlePress('handbrake', false)}
                    className={`${btnSize} bg-orange-600/70 hover:bg-orange-500/90 backdrop-blur-md rounded-full flex flex-col items-center justify-center border-2 border-orange-400 active:scale-95 transition-transform mb-2 shadow-lg shadow-orange-900/40`}
                >
                    <span className="text-[10px] sm:text-xs font-bold text-white leading-tight">HAND</span>
                    <span className="text-[10px] sm:text-xs font-bold text-white leading-tight">BRAKE</span>
                </button>

                {/* Pedals */}
                <div className="flex flex-col gap-4 sm:gap-6">
                     {/* Nitro (Shift) */}
                     <button 
                        onPointerDown={() => handlePress('nitro', true)} 
                        onPointerUp={() => handlePress('nitro', false)}
                        onPointerLeave={() => handlePress('nitro', false)}
                        className={`${btnSize} bg-cyan-600/70 hover:bg-cyan-500/90 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-cyan-400 active:scale-95 transition-transform shadow-lg shadow-cyan-900/40`}
                    >
                        <span className="text-sm sm:text-xl font-bold text-white tracking-widest italic">NITRO</span>
                    </button>

                    <div className="flex flex-col">
                         {showGas && (
                            <button 
                                onPointerDown={() => handlePress('up', true)} 
                                onPointerUp={() => handlePress('up', false)}
                                onPointerLeave={() => handlePress('up', false)}
                                className={`w-20 sm:w-28 ${pedalHeight} bg-green-600/70 hover:bg-green-500/90 backdrop-blur-md rounded-t-2xl flex items-center justify-center border-2 border-green-400 active:scale-95 transition-transform shadow-lg shadow-green-900/40`}
                            >
                                <span className="text-lg sm:text-xl font-bold text-white">GAS</span>
                            </button>
                         )}
                         {showBrake && (
                             <button 
                                onPointerDown={() => handlePress('down', true)} 
                                onPointerUp={() => handlePress('down', false)}
                                onPointerLeave={() => handlePress('down', false)}
                                className={`w-20 sm:w-28 ${showGas ? 'h-20 sm:h-28 rounded-b-2xl' : 'h-20 sm:h-28 rounded-full'} bg-red-600/70 hover:bg-red-500/90 backdrop-blur-md flex items-center justify-center border-2 border-red-400 active:scale-95 transition-transform shadow-lg shadow-red-900/40`}
                            >
                                <span className="text-lg sm:text-xl font-bold text-white">BRAKE</span>
                            </button>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const UIOverlay = () => {
  const store = useGameStore();
  const { 
      score, highScore, totalMoney, sessionEarnings, speed, rpm, gear, distance, 
      gameState, gameMode, currentLevel, levelTimer, targetDistance, 
      weather, setWeather, setGameState, isNight, toggleNight,
      nitro, startFreeRide, togglePause, startDriftMode,
      driftScore, botDriftScore
  } = store;

  const [driftDifficultyMenu, setDriftDifficultyMenu] = useState(false);
  
  const handleDriftClick = () => {
      setDriftDifficultyMenu(true);
  };
  
  const [showDriftMenu, setShowDriftMenu] = useState(false);

  const prevTimeRef = useRef(levelTimer);
  useEffect(() => {
    if (gameState === GameState.PLAYING && levelTimer < 10 && levelTimer > 0) {
        if (Math.floor(levelTimer) < Math.floor(prevTimeRef.current)) {
            playTickSound();
        }
    }
    prevTimeRef.current = levelTimer;
  }, [levelTimer, gameState]);
  
  useEffect(() => {
      if (gameState !== GameState.MENU) setShowDriftMenu(false);
  }, [gameState]);

  const getModeLabel = () => {
      if (gameMode === GameMode.FREE_RIDE) return "SCORE";
      if (gameMode === GameMode.RACE) return "RACE DIST";
      if (gameMode === GameMode.DRIFT) return "DRIFT BATTLE";
      return `LEVEL ${currentLevel}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      
      {/* HUD */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <>
            <div className="flex flex-col gap-2 pointer-events-auto">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="bg-black/50 p-4 rounded-lg border border-cyan-500 backdrop-blur-sm min-w-[140px] hidden sm:block">
                            <div className="text-cyan-400 text-xs font-bold tracking-wider">
                                {getModeLabel()}
                            </div>
                            <div className="text-2xl font-mono text-white">{score.toLocaleString()}</div>
                        </div>
                        
                        <div className="bg-black/50 p-4 rounded-lg border border-green-500 backdrop-blur-sm hidden sm:block">
                             <div className="text-green-400 text-xs font-bold tracking-wider">BANK</div>
                             <div className="text-xl font-mono text-white">${totalMoney.toLocaleString()}</div>
                        </div>

                        {/* Mobile compacted HUD */}
                        <div className="sm:hidden flex flex-col gap-2 bg-black/60 p-2 rounded border border-cyan-500">
                             <div className="text-white text-xs font-mono">SC: {score}</div>
                             <div className="text-green-400 text-xs font-mono">${totalMoney}</div>
                        </div>

                        <button onClick={togglePause} className="w-12 h-12 bg-white/20 hover:bg-white/40 rounded flex items-center justify-center backdrop-blur text-white font-bold">
                            {gameState === GameState.PAUSED ? '▶' : '||'}
                        </button>

                        <div className="flex flex-col gap-2">
                            <button onClick={toggleNight} className={`px-3 py-1 text-xs rounded border font-bold ${isNight ? 'bg-indigo-900 border-indigo-400 text-white' : 'bg-orange-400 border-orange-200 text-black'}`}>
                                {isNight ? 'DAY' : 'NIGHT'}
                            </button>
                            <div className="flex gap-1 hidden sm:flex">
                                <button onClick={() => setWeather(Weather.CLEAR)} className={`px-2 py-1 text-xs rounded border ${weather === Weather.CLEAR ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-black/50 text-white border-white/20'}`}>SUN</button>
                                <button onClick={() => setWeather(Weather.RAIN)} className={`px-2 py-1 text-xs rounded border ${weather === Weather.RAIN ? 'bg-blue-600 text-white border-blue-500' : 'bg-black/50 text-white border-white/20'}`}>RAIN</button>
                                <button onClick={() => setWeather(Weather.SNOW)} className={`px-2 py-1 text-xs rounded border ${weather === Weather.SNOW ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/20'}`}>SNOW</button>
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    {gameMode === GameMode.CAREER && levelTimer !== Infinity && (
                        <div className={`p-4 rounded-lg border-2 backdrop-blur-sm ${levelTimer < 10 ? 'bg-red-900/80 border-red-500 animate-pulse' : 'bg-black/50 border-white'}`}>
                            <div className={`text-4xl font-mono font-bold ${levelTimer < 10 ? 'text-red-500' : 'text-white'}`}>
                                {levelTimer.toFixed(1)}s
                            </div>
                        </div>
                    )}
                    
                    {/* Drift Score HUD */}
                    {gameMode === GameMode.DRIFT && (
                        <div className="flex gap-4">
                             <div className={`p-2 sm:p-4 rounded-lg border-2 backdrop-blur-sm text-center ${driftScore > botDriftScore ? 'bg-green-900/50 border-green-500' : 'bg-black/50 border-gray-500'}`}>
                                 <div className="text-[10px] sm:text-xs text-gray-400 font-bold">PLAYER</div>
                                 <div className="text-xl sm:text-3xl font-black italic text-white">{driftScore.toLocaleString()}</div>
                             </div>
                             <div className={`p-2 sm:p-4 rounded-lg border-2 backdrop-blur-sm text-center ${botDriftScore > driftScore ? 'bg-red-900/50 border-red-500' : 'bg-black/50 border-gray-500'}`}>
                                 <div className="text-[10px] sm:text-xs text-gray-400 font-bold">BOT</div>
                                 <div className="text-xl sm:text-3xl font-black italic text-white">{botDriftScore.toLocaleString()}</div>
                             </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 items-end">
                        <div className="bg-black/50 p-4 rounded-lg border border-pink-500 backdrop-blur-sm text-right min-w-[100px] sm:min-w-[140px]">
                            <div className="text-pink-400 text-xs font-bold tracking-wider">
                                {gameMode === GameMode.RACE || gameMode === GameMode.DRIFT ? "TARGET" : "DIST"}
                            </div>
                            <div className="text-xl sm:text-2xl font-mono text-white">{distance} m</div>
                            {(gameMode === GameMode.CAREER || gameMode === GameMode.RACE || gameMode === GameMode.DRIFT) && (
                                <div className="w-full bg-gray-800 h-2 rounded mt-2">
                                    <div className="bg-pink-500 h-full rounded" style={{ width: `${Math.min(100, (distance / targetDistance) * 100)}%` }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Touch Controls Overlay */}
            <TouchControls />

            {/* Combined Dashboard */}
            <CombinedDashboard speed={speed} rpm={rpm} gear={gear} nitro={nitro} />
        </>
      )}

      {/* Paused Overlay */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto backdrop-blur">
             <div className="flex flex-col gap-4 text-center">
                 <h2 className="text-6xl text-white font-black italic">PAUSED</h2>
                 <button onClick={togglePause} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded text-xl">RESUME</button>
                 <button onClick={() => setGameState(GameState.MENU)} className="px-8 py-3 bg-red-600 text-white font-bold rounded text-xl">QUIT</button>
             </div>
        </div>
      )}

      {/* Main Menu */}
      {gameState === GameState.MENU && !showDriftMenu && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="text-center max-w-lg p-8 border-2 border-cyan-500 bg-black box-shadow-neon transform scale-90 sm:scale-100">
            <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-6 italic tracking-tighter">
              TERMINAL VELOCITY
            </h1>
            <div className="mb-8 flex flex-col gap-2">
                 <div className="text-xl sm:text-2xl text-green-400 font-mono">BANK: ${totalMoney.toLocaleString()}</div>
                 <div className="text-lg sm:text-xl text-yellow-600 font-mono">HIGH SCORE: {highScore.toLocaleString()}</div>
            </div>
            
            <div className="flex flex-col gap-4">
                <button onClick={() => startFreeRide()} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded shadow hover:scale-105 transition-all">
                    FREE RIDE
                </button>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => setGameState(GameState.LEVEL_SELECT)} className="flex-1 px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xl rounded shadow hover:scale-105 transition-all">
                        CAREER
                    </button>
                </div>
                <div className="flex gap-2 justify-center">
                    <button onClick={() => setGameState(GameState.RACE_MENU)} className="flex-1 px-4 sm:px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg rounded shadow transition-all">
                        RACE
                    </button>
                    <button onClick={() => setShowDriftMenu(true)} className="flex-1 px-4 sm:px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-lg rounded shadow transition-all">
                        DRIFT
                    </button>
                </div>
                <button onClick={() => setGameState(GameState.SHOP)} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg rounded shadow transition-all">
                    CAR DEALERSHIP
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Menus */}
      {gameState === GameState.SHOP && <ShopMenu />}
      {gameState === GameState.LEVEL_SELECT && <LevelSelect />}
      {gameState === GameState.RACE_MENU && <RaceMenu />}
      
      {/* Drift Menu Overlay */}
      {showDriftMenu && gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/90 pointer-events-auto">
             <DriftMenu />
             <button onClick={() => setShowDriftMenu(false)} className="absolute top-8 right-8 text-white font-bold">X CLOSE</button>
          </div>
      )}

      {/* Game Over / Win Screens */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.RACE_LOSS) && (
        <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm">
          <div className="text-center p-8 bg-black border-4 border-red-600 rounded-xl shadow-2xl max-w-md w-full">
            <h2 className="text-6xl font-black text-red-500 mb-2 italic">
                {gameMode === GameMode.RACE || gameMode === GameMode.DRIFT ? "YOU LOST" : "CRASHED"}
            </h2>
            {gameMode === GameMode.DRIFT && (
                <div className="mb-4 text-white">
                    Bot scored higher: {botDriftScore} vs {driftScore}
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-left bg-gray-900 p-4 rounded">
                <div>
                    <div className="text-gray-400 text-xs">SCORE</div>
                    <div className="text-xl text-white">{score}</div>
                </div>
                <div className="text-right">
                     <div className="text-gray-400 text-xs">TOTAL EARNED</div>
                    <div className="text-xl text-green-400">+${sessionEarnings.toLocaleString()}</div> 
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => {
                        if(gameMode === GameMode.CAREER) setGameState(GameState.LEVEL_SELECT);
                        else if(gameMode === GameMode.RACE) setGameState(GameState.RACE_MENU);
                        else if(gameMode === GameMode.DRIFT) {
                             const diff = useGameStore.getState().raceDifficulty;
                             startDriftMode(diff);
                        }
                        else startFreeRide();
                    }}
                    className="w-full py-4 bg-white text-black hover:bg-gray-200 font-black text-xl rounded uppercase tracking-widest shadow-lg"
                >
                    RETRY
                </button>
                <button onClick={() => setGameState(GameState.MENU)} className="w-full py-3 bg-gray-800 text-white hover:bg-gray-700 font-bold text-lg rounded">
                    MAIN MENU
                </button>
            </div>
          </div>
        </div>
      )}

      {(gameState === GameState.LEVEL_COMPLETE || gameState === GameState.RACE_WIN) && (
        <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center pointer-events-auto backdrop-blur-sm">
          <div className="text-center p-8 bg-black border-4 border-green-500 rounded-xl shadow-2xl max-w-md w-full">
            <h2 className="text-5xl font-black text-green-400 mb-2 italic">
                {gameMode === GameMode.RACE || gameMode === GameMode.DRIFT ? "VICTORY" : "COMPLETE"}
            </h2>
            
            <div className="bg-gray-900 p-4 rounded mb-6">
                 <div className="text-gray-400 text-xs text-center">TOTAL EARNED</div>
                 <div className="text-3xl text-green-400 text-center font-bold">+${sessionEarnings.toLocaleString()}</div>
            </div>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => {
                         if(gameMode === GameMode.CAREER) setGameState(GameState.LEVEL_SELECT);
                         else if(gameMode === GameMode.RACE) setGameState(GameState.RACE_MENU);
                         else if(gameMode === GameMode.DRIFT) {
                             const diff = useGameStore.getState().raceDifficulty;
                             startDriftMode(diff);
                         }
                    }}
                    className="w-full py-4 bg-white text-black hover:bg-gray-200 font-black text-xl rounded uppercase tracking-widest shadow-lg"
                >
                    {gameMode === GameMode.CAREER ? "NEXT LEVEL" : (gameMode === GameMode.DRIFT ? "DRIFT AGAIN" : "CONTINUE")}
                </button>
                <button onClick={() => setGameState(GameState.MENU)} className="w-full py-3 bg-gray-800 text-white hover:bg-gray-700 font-bold text-lg rounded">
                    MAIN MENU
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="w-full h-screen bg-neutral-900 relative overflow-hidden">
      <GameScene />
      <UIOverlay />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}