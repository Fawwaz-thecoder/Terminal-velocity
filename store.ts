import { create } from 'zustand';
import { GameState, GameMode, Weather, CarModel, CarModelType, RaceDifficulty } from './types';

// Generate 30 Cars with specific grouping
const generateCars = (): CarModel[] => {
  const cars: CarModel[] = [];
  
  const f1Names = ['Sauber', 'Haas', 'Williams', 'Mclarenn', 'Mercedess', 'Ferrarii'];
  
  const colors = [
    '#D2042D', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', 
    '#e67e22', '#ecf0f1', '#95a5a6', '#34495e', '#1abc9c'
  ];

  for (let i = 0; i < 30; i++) {
    let type = CarModelType.BASIC;
    let name = `Model ${i}`;
    let basePrice = 0;
    let speedKmh = 90;
    let color = colors[i % colors.length];
    
    if (i < 6) {
        type = CarModelType.BASIC;
        name = `Civic ${i+1}00`;
        basePrice = 500 + (i * 200);
        speedKmh = 90 + (i * 10);
    } else if (i < 12) {
        type = CarModelType.SPORTS;
        name = `Racer ${i-5}00`;
        basePrice = 5000 + ((i-6) * 1000);
        speedKmh = 180 + ((i-6) * 20);
    } else if (i < 18) {
        type = CarModelType.SUPER;
        name = `Viper ${i-11}00`;
        basePrice = 20000 + ((i-12) * 5000);
        speedKmh = 320 + ((i-12) * 30);
    } else if (i < 24) {
        type = CarModelType.SUV;
        name = `Titan ${i-17}00`;
        basePrice = 40000 + ((i-18) * 4000);
        speedKmh = 280 + ((i-18) * 25);
    } else {
        type = CarModelType.F1;
        name = f1Names[i - 24];
        basePrice = 150000 + ((i-24) * 25000) + 7500;
        speedKmh = 450 + ((i-24) * 50);

        // Specific F1 Colors
        if (name === 'Sauber') color = '#00D2BE'; // Bright Green/Teal
        if (name === 'Haas') color = '#FFFFFF'; // White
        if (name === 'Williams') color = '#00008B'; // Dark Blue
        if (name === 'Mclarenn') color = '#FF8700'; // Orange
        if (name === 'Mercedess') color = '#C0C0C0'; // Grey/Silver
        if (name === 'Ferrarii') color = '#DC0000'; // Red
    }

    let handling = 20 + (i * 2.5);
    let braking = 30 + (i * 2);
    
    if (i >= 28) {
        speedKmh = 900; 
        handling = 100;
        braking = 100;
    }

    const speedStat = Math.min(100, (speedKmh / 900) * 100);

    cars.push({
      id: `car_${i}`,
      name: name,
      type: type,
      price: Math.floor(basePrice),
      color: color,
      speedStat: speedStat,
      topSpeedKmh: speedKmh,
      handlingStat: Math.min(100, handling),
      brakingStat: Math.min(100, braking),
    });
  }
  return cars;
};

export const CAR_CATALOG = generateCars();

interface ControlsState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
    nitro: boolean;
}

interface GameStore {
  gameState: GameState;
  gameMode: GameMode;
  gameKey: number;
  
  // Gameplay
  score: number;
  highScore: number;
  speed: number;
  rpm: number;
  gear: number;
  distance: number;
  weather: Weather;
  isNight: boolean;
  
  // Drift Mode
  driftScore: number;
  botDriftScore: number;

  // Controls (On-screen)
  controls: ControlsState;

  // Career / Level System
  currentLevel: number;
  unlockedLevels: number;
  targetDistance: number;
  levelTimer: number;
  
  // Race Mode
  raceDifficulty: RaceDifficulty;
  
  // Nitro
  nitro: number;
  isNitroActive: boolean;

  // Economy & Garage
  totalMoney: number;
  sessionEarnings: number; // Tracks earnings for the current run
  ownedCarIds: string[];
  selectedCarId: string;
  
  // Actions
  setGameState: (state: GameState) => void;
  setGameMode: (mode: GameMode) => void;
  increaseScore: (amount: number) => void;
  addMoney: (amount: number) => void;
  setSpeed: (speed: number) => void;
  setRPM: (rpm: number) => void;
  setGear: (gear: number) => void;
  setDistance: (dist: number) => void;
  setWeather: (weather: Weather) => void;
  toggleNight: () => void;
  togglePause: () => void;
  
  setDriftScore: (score: number) => void;
  setBotDriftScore: (score: number) => void;

  setControl: (key: keyof ControlsState, value: boolean) => void;

  startFreeRide: () => void;
  startCareerLevel: (level: number) => void;
  startRace: (difficulty: RaceDifficulty) => void;
  startDriftMode: (difficulty: RaceDifficulty) => void;
  
  completeLevel: () => void;
  winRace: () => void;
  loseRace: () => void;
  crash: () => void;
  
  setNitroActive: (active: boolean) => void;
  useNitro: (amount: number) => void;
  regenNitro: (amount: number) => void;
  
  tickTimer: (dt: number) => void;

  buyCar: (id: string) => void;
  selectCar: (id: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: GameState.MENU,
  gameMode: GameMode.FREE_RIDE,
  gameKey: 0,
  
  score: 0,
  highScore: 0,
  speed: 0,
  rpm: 0,
  gear: 1,
  distance: 0,
  weather: Weather.CLEAR,
  isNight: false,

  driftScore: 0,
  botDriftScore: 0,

  controls: { up: false, down: false, left: false, right: false, handbrake: false, nitro: false },

  currentLevel: 1,
  unlockedLevels: 1,
  targetDistance: 0,
  levelTimer: Infinity,
  
  raceDifficulty: RaceDifficulty.MEDIUM,
  
  nitro: 100,
  isNitroActive: false,

  totalMoney: 1000,
  sessionEarnings: 0,
  ownedCarIds: [CAR_CATALOG[0].id],
  selectedCarId: CAR_CATALOG[0].id,

  setGameState: (state) => set({ gameState: state }),
  setGameMode: (mode) => set({ gameMode: mode }),
  
  increaseScore: (amount) => set((state) => ({ score: state.score + amount })),
  
  // Adds money to wallet AND accumulates for session display
  addMoney: (amount) => set((state) => ({ 
      totalMoney: state.totalMoney + amount,
      sessionEarnings: state.sessionEarnings + amount
  })),

  setSpeed: (speed) => set({ speed }),
  setRPM: (rpm) => set({ rpm }),
  setGear: (gear) => set({ gear }),
  setDistance: (distance) => set({ distance }),
  setWeather: (weather) => set({ weather }),
  toggleNight: () => set((state) => ({ isNight: !state.isNight })),
  
  setDriftScore: (score) => set({ driftScore: score }),
  setBotDriftScore: (score) => set({ botDriftScore: score }),

  togglePause: () => set((state) => {
      if (state.gameState === GameState.PLAYING) return { gameState: GameState.PAUSED };
      if (state.gameState === GameState.PAUSED) return { gameState: GameState.PLAYING };
      return {};
  }),

  setControl: (key, value) => set((state) => ({ controls: { ...state.controls, [key]: value } })),

  startFreeRide: () => {
    const { score, highScore } = get();
    set((state) => ({ 
      gameState: GameState.PLAYING,
      gameMode: GameMode.FREE_RIDE,
      score: 0, 
      driftScore: 0,
      botDriftScore: 0,
      speed: 0, 
      rpm: 0,
      gear: 1,
      distance: 0,
      highScore: Math.max(score, highScore),
      gameKey: state.gameKey + 1,
      targetDistance: Infinity,
      levelTimer: Infinity,
      nitro: 100,
      sessionEarnings: 0
    }));
  },

  startCareerLevel: (level) => {
    const dist = 250 + ((level - 1) * 50); 
    
    let time = Infinity;
    if (level >= 25) {
       const expectedKmh = 90 + ((level / 250) * 800);
       const expectedMs = expectedKmh / 3.6;
       const buffer = 5; 
       time = (dist / expectedMs) + buffer;
    }

    set((state) => ({
      gameState: GameState.PLAYING,
      gameMode: GameMode.CAREER,
      currentLevel: level,
      score: 0,
      driftScore: 0,
      botDriftScore: 0,
      speed: 0,
      rpm: 0,
      gear: 1,
      distance: 0,
      gameKey: state.gameKey + 1,
      targetDistance: dist,
      levelTimer: time,
      nitro: 100,
      sessionEarnings: 0
    }));
  },

  startRace: (difficulty) => {
      let dist = 1000;
      if (difficulty === RaceDifficulty.MEDIUM) dist = 1500;
      if (difficulty === RaceDifficulty.HARD) dist = 3000;
      
      set((state) => ({
        gameState: GameState.PLAYING,
        gameMode: GameMode.RACE,
        raceDifficulty: difficulty,
        score: 0,
        driftScore: 0,
        botDriftScore: 0,
        speed: 0,
        rpm: 0,
        gear: 1,
        distance: 0,
        gameKey: state.gameKey + 1,
        targetDistance: dist,
        levelTimer: Infinity,
        nitro: 100,
        sessionEarnings: 0
      }));
  },

  startDriftMode: (difficulty) => {
      set((state) => ({
          gameState: GameState.PLAYING,
          gameMode: GameMode.DRIFT,
          raceDifficulty: difficulty,
          score: 0,
          driftScore: 0,
          botDriftScore: 0,
          speed: 0,
          rpm: 0,
          gear: 1,
          distance: 0,
          gameKey: state.gameKey + 1,
          targetDistance: 400, // Shortened to 400m for drift battle
          levelTimer: Infinity,
          nitro: 100,
          sessionEarnings: 0
      }));
  },

  completeLevel: () => {
    const { currentLevel, totalMoney, unlockedLevels, sessionEarnings } = get();
    const isBonus = currentLevel % 20 === 0;
    const multiplier = isBonus ? 6 : 1;
    const baseReward = 5000 + (currentLevel * 1000);
    const finalReward = baseReward * multiplier;
    
    set((state) => ({
      gameState: GameState.LEVEL_COMPLETE,
      totalMoney: totalMoney + finalReward,
      sessionEarnings: sessionEarnings + finalReward,
      unlockedLevels: Math.max(unlockedLevels, currentLevel + 1)
    }));
  },

  winRace: () => {
      const { totalMoney, gameMode, sessionEarnings, raceDifficulty } = get();
      let reward = 10000;
      
      // Reward based on difficulty
      if (raceDifficulty === RaceDifficulty.MEDIUM) reward = 25000;
      if (raceDifficulty === RaceDifficulty.HARD) reward = 50000;
      
      set((state) => ({
          gameState: GameState.RACE_WIN,
          totalMoney: totalMoney + reward,
          sessionEarnings: sessionEarnings + reward
      }));
  },

  loseRace: () => {
      set({ gameState: GameState.RACE_LOSS });
  },

  crash: () => {
    const { gameMode, distance, totalMoney, sessionEarnings } = get();
    
    // In Race/Drift, crashing is an instant loss
    if (gameMode === GameMode.RACE || gameMode === GameMode.DRIFT) {
        set({ gameState: GameState.RACE_LOSS });
        return;
    }
    
    // Free ride earnings are already added via addMoney as we drive
    // So sessionEarnings is correct.
    set({ gameState: GameState.GAME_OVER });
  },

  setNitroActive: (active) => set({ isNitroActive: active }),
  useNitro: (amount) => set((state) => ({ nitro: Math.max(0, state.nitro - amount) })),
  regenNitro: (amount) => set((state) => ({ nitro: Math.min(100, state.nitro + amount) })),

  tickTimer: (dt) => set((state) => {
      if (state.gameState !== GameState.PLAYING || state.gameMode !== GameMode.CAREER || state.levelTimer === Infinity) return {};
      
      const newTime = state.levelTimer - dt;
      if (newTime <= 0) {
          return { levelTimer: 0, gameState: GameState.GAME_OVER };
      }
      return { levelTimer: newTime };
  }),

  buyCar: (id) => set((state) => {
    const car = CAR_CATALOG.find(c => c.id === id);
    if (car && state.totalMoney >= car.price && !state.ownedCarIds.includes(id)) {
      return {
        totalMoney: state.totalMoney - car.price,
        ownedCarIds: [...state.ownedCarIds, id],
        selectedCarId: id
      };
    }
    return state;
  }),

  selectCar: (id) => set((state) => {
    if (state.ownedCarIds.includes(id)) {
      return { selectedCarId: id };
    }
    return state;
  })
}));