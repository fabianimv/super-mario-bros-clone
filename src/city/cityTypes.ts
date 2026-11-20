// ============================================================================
// CIUDAD CAOS - Tipos y estructuras del Sandbox Top-Down 360° GTA 2D
// ============================================================================

export type CityTileKind =
  | 'road_h'
  | 'road_v'
  | 'road_cross'
  | 'sidewalk'
  | 'grass'
  | 'sand'
  | 'water'
  | 'building'
  | 'neon_track'
  | 'dock'
  | 'base_floor';

export type VehicleKind =
  | 'kart_turbo'
  | 'moto_plasma'
  | 'tanque_plomero'
  | 'patrulla'
  | 'civil';

export type VehicleDriver = 'player' | 'npc' | 'police' | 'none';

export interface CityVehicle {
  id: number;
  kind: VehicleKind;
  x: number;
  y: number;
  z: number;
  vz: number;
  vx: number;
  vy: number;
  angle: number; // radianes (0 = derecha, PI/2 = abajo)
  speed: number;
  hp: number;
  maxHp: number;
  color: string;
  accent: string;
  driver: VehicleDriver;
  nitro: number; // 0..100
  drifting: boolean;
  sirenTick: number;
  respawnX: number;
  respawnY: number;
}

export type NpcKind = 'civil' | 'koopa_gang' | 'policia' | 'boss_mob';

export interface CityNpc {
  id: number;
  kind: NpcKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  shootTimer: number;
  animTick: number;
}

export interface CityTurret {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  shootTimer: number;
  district: string;
}

export interface CityProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'enemy';
  dmg: number;
  radius: number;
  color: string;
  life: number;
}

export interface CityGarage {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  cooldown: number;
}

export interface CityRamp {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dirX: number;
  dirY: number;
}

export interface CityCheckpoint {
  id: number;
  x: number;
  y: number;
  radius: number;
  order: number;
  reached: boolean;
}

export interface CityMissionState {
  raceDone: boolean;
  raceIndex: number; // 0..5 (próximo checkpoint)
  demolitionDone: boolean;
  turretsLeft: number;
  deliveryState: 'ready' | 'carrying' | 'done';
  deliveryPickup: { x: number; y: number };
  deliveryDropoff: { x: number; y: number };
  bossDone: boolean;
}

export interface CityParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  kind?: 'spark' | 'smoke' | 'fire' | 'blood' | 'glass' | 'splash';
}

export interface CityFloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface CitySkidMark {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

export interface CityBuilding {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  roofColor: string;
  label?: string;
}

export interface CityPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  vehicleId: number | null;
  fireCooldown: number;
  dashTimer: number;
  dashCooldown: number;
  invulnTimer: number;
  animTick: number;
}

export interface CityWorld {
  tileSize: number; // 32
  cols: number; // 100
  rows: number; // 76
  tiles: CityTileKind[][];
  buildings: CityBuilding[];
  player: CityPlayer;
  vehicles: CityVehicle[];
  npcs: CityNpc[];
  turrets: CityTurret[];
  projectiles: CityProjectile[];
  garages: CityGarage[];
  ramps: CityRamp[];
  raceCheckpoints: CityCheckpoint[];
  missions: CityMissionState;
  cash: number;
  score: number;
  wantedLevel: number; // 0..5
  wantedDecayTimer: number;
  chaosMeter: number;
  cameraX: number;
  cameraY: number;
  screenShake: number;
  frameCount: number;
  particles: CityParticle[];
  floatTexts: CityFloatText[];
  skidMarks: CitySkidMark[];
  prevFire: boolean;
  prevSpin: boolean;
  prevJump: boolean;
  activeHint: string;
  hintTimer: number;
  nextEntityId: number;
}
