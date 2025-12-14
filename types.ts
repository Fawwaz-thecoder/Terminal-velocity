export enum GameState {
  MENU = 'MENU',
  SHOP = 'SHOP',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  LEVEL_SELECT = 'LEVEL_SELECT',
  RACE_MENU = 'RACE_MENU',
  RACE_WIN = 'RACE_WIN',
  RACE_LOSS = 'RACE_LOSS'
}

export enum GameMode {
  FREE_RIDE = 'FREE_RIDE',
  CAREER = 'CAREER',
  RACE = 'RACE',
  DRIFT = 'DRIFT'
}

export enum RaceDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum Weather {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  SNOW = 'SNOW'
}

export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  BUS = 'BUS'
}

export enum CarModelType {
  BASIC = 'BASIC',
  SPORTS = 'SPORTS',
  SUPER = 'SUPER',
  SUV = 'SUV',
  F1 = 'F1'
}

export interface CarModel {
  id: string;
  name: string;
  type: CarModelType;
  price: number;
  color: string;
  speedStat: number; // 0-100 (for UI)
  topSpeedKmh: number; // Actual physics limit
  handlingStat: number; // 0-100
  brakingStat: number; // 0-100
}

export interface TrafficCar {
  id: string;
  x: number;
  lane: number;
  z: number;
  speed: number;
  type: VehicleType;
  color: string;
  changingLane: boolean;
}