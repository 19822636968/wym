export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export enum TargetType {
  NORMAL = 'NORMAL',
  BOMB = 'BOMB',
  POWERUP = 'POWERUP'
}

export interface Target {
  id: number;
  x: number;
  y: number;
  lane: number; // 0, 1, 2
  radius: number;
  health: number;
  maxHealth: number;
  type: TargetType;
  active: boolean;
  shatterProgress: number; // 0 to 1
}

export interface GameState {
  isPlaying: boolean;
  score: number;
  lives: number;
  powerLevel: number; // 0 to 100
  criticalHitVisible: boolean;
}

export enum SoundType {
  LASER = 'LASER',
  EXPLOSION = 'EXPLOSION',
  UI_HOVER = 'UI_HOVER',
  UI_CLICK = 'UI_CLICK',
  BGM_START = 'BGM_START',
  DAMAGE = 'DAMAGE',
  POWERUP = 'POWERUP'
}