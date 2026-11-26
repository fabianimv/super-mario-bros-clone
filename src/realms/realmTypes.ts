// ============================================================================
// REINOS ABIERTOS - Tipos del motor de mundos abiertos (vista lateral)
// Mapas enormes que se exploran en cualquier dirección, con terreno
// destructible, capas de pintura, campos magnéticos, agua y ciclo día/noche.
// ============================================================================

export type RealmId = 'roots' | 'ink' | 'magnet';

/** Códigos de tile (Uint8). */
export const T = {
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  BEDROCK: 3,
  GRASS: 4,
  ORE: 5,
  CRYSTAL: 6,
  NIGHT_PLAT: 7, // plataforma de luciérnagas: sólida solo de noche (one-way)
  VINE: 8, // enredadera trepable (no sólida)
  CLOUD: 9, // nube one-way
  ROCK: 10, // roca de isla (pintable)
  WATER: 11,
  MAGNET_RED: 12,
  MAGNET_BLUE: 13,
  SPIKES: 14,
  METAL: 15,
  PLANK: 16, // tablón one-way
  CORAL: 17,
  INK_SEA: 18, // mar de tinta (daño + reaparición)
  ROOT: 19, // raíz gigante decorativa sólida (excavable)
} as const;
export type TileCode = (typeof T)[keyof typeof T];

/** Capa de pintura por tile. */
export const PAINT = {
  NONE: 0,
  BLUE: 1, // rebote
  ORANGE: 2, // velocidad
  GREEN: 3, // adherencia (paredes y techos)
} as const;
export type PaintColor = 1 | 2 | 3;

export type RealmEnemyKind =
  | 'mole' // caminante de Raíces
  | 'shade' // sombra nocturna voladora
  | 'gull' // gaviota de tinta
  | 'eraser' // caminante que borra pintura
  | 'jelly' // medusa acuática
  | 'crab' // cangrejo de chatarra
  | 'drone'; // dron magnético

export interface RealmEnemy {
  id: number;
  kind: RealmEnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  alive: boolean;
  dir: number;
  homeX: number;
  homeY: number;
  tick: number;
  hurtTimer: number;
  /** Sombras: se disuelven al amanecer. */
  nightOnly?: boolean;
}

export type RealmPickupKind =
  | 'orb'
  | 'heart'
  | 'seed'
  | 'up_double_jump'
  | 'up_diamond_drill'
  | 'up_paint_orange'
  | 'up_paint_green'
  | 'up_oxygen'
  | 'up_magnet_boots';

export interface RealmPickup {
  id: number;
  kind: RealmPickupKind;
  x: number;
  y: number;
  taken: boolean;
  /** Frames para reaparecer (semillas y corazones). 0 = no reaparece. */
  respawn: number;
  respawnTimer: number;
  bob: number;
}

export interface RealmFragment {
  id: number;
  x: number;
  y: number;
  taken: boolean;
  hint: string;
}

export interface RealmShrine {
  id: number;
  x: number; // centro
  y: number; // suelo (pies)
  active: boolean;
  name: string;
}

export interface RealmBeacon {
  id: number;
  x: number;
  y: number;
  color: PaintColor;
  lit: boolean;
}

export interface RealmZone {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Viento ascendente (ink) o columna de burbujas (magnet). */
  kind: 'updraft' | 'bubbles';
  force: number;
}

export interface RealmSunflower {
  id: number;
  x: number;
  y: number; // pies
}

export type RealmProjectileKind = 'paint' | 'pulse' | 'spark';

export interface RealmProjectile {
  id: number;
  kind: RealmProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: PaintColor;
  life: number;
  owner: 'player' | 'enemy';
}

export interface RealmParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

export interface RealmFloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface RealmUpgrades {
  doubleJump: boolean;
  diamondDrill: boolean;
  paintOrange: boolean;
  paintGreen: boolean;
  oxygenTank: boolean;
  magnetBoots: boolean;
}

export interface RealmPlayer {
  x: number; // esquina sup-izq
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: number;
  onGround: boolean;
  coyote: number;
  jumpBuffer: number;
  airJumps: number;
  /** Subida iniciada por un salto propio (permite cortarlo soltando A). */
  jumpRising: boolean;
  hp: number;
  maxHp: number;
  invuln: number;
  climbing: boolean;
  swimming: boolean;
  gliding: boolean;
  /** Adherido a pintura verde: 'wall' (pared) o 'ceiling' (techo). */
  stuck: 'none' | 'wall_left' | 'wall_right' | 'ceiling';
  /** Adherido a un imán (polaridad opuesta). */
  magnetCling: boolean;
  oxygen: number;
  maxOxygen: number;
  polarity: 1 | -1; // 1 = rojo, -1 = azul
  polarityCooldown: number;
  paintColor: PaintColor;
  seeds: number;
  toolCooldown: number;
  drilling: number;
  anim: number;
  lastSafeX: number;
  lastSafeY: number;
  deathTimer: number;
}

export interface RealmWorld {
  realm: RealmId;
  levelIndex: number;
  name: string;
  code: string;
  tileSize: number;
  cols: number;
  rows: number;
  tiles: Uint8Array;
  paint: Uint8Array;
  /** Daño acumulado de excavación por tile. */
  damage: Map<number, number>;
  /** Niebla de guerra del minimapa (celdas de 4×4 tiles). */
  explored: Uint8Array;
  exploredCols: number;
  exploredRows: number;
  exploredVersion: number;
  player: RealmPlayer;
  upgrades: RealmUpgrades;
  enemies: RealmEnemy[];
  pickups: RealmPickup[];
  fragments: RealmFragment[];
  fragmentsNeeded: number;
  shrines: RealmShrine[];
  beacons: RealmBeacon[];
  zones: RealmZone[];
  sunflowers: RealmSunflower[];
  projectiles: RealmProjectile[];
  particles: RealmParticle[];
  floatTexts: RealmFloatText[];
  portal: { x: number; y: number; open: boolean };
  respawnShrine: number;
  orbs: number;
  score: number;
  /** Reloj del ciclo día/noche (frames). */
  clock: number;
  dayLength: number;
  hasDayNight: boolean;
  isNight: boolean;
  cameraX: number;
  cameraY: number;
  shake: number;
  frame: number;
  hint: string;
  hintTimer: number;
  cleared: boolean;
  clearTimer: number;
  /** Pide a la vista pasar al siguiente reino tras la victoria. */
  requestNext: boolean;
  prevJump: boolean;
  prevFire: boolean;
  prevSpin: boolean;
  prevUp: boolean;
  nextId: number;
  /** Versión de los tiles (para cachear el minimapa). */
  tileVersion: number;
  deaths: number;
  /** Fila de la superficie original por columna (fondo de caverna debajo). */
  backdropRow: Int16Array | null;
  /** Frames que lleva mantenido Y (al llegar al umbral, vuelves al santuario). */
  returnHold: number;
}

export const REALM_ORDER: RealmId[] = ['roots', 'ink', 'magnet'];

export interface RealmMeta {
  id: RealmId;
  code: string;
  name: string;
  tagline: string;
  toolX: string;
  toolY: string;
  accent: string;
}

export const REALM_METAS: RealmMeta[] = [
  {
    id: 'roots',
    code: 'R-1',
    name: 'RAÍCES HONDAS',
    tagline: 'Excava el mundo entero, planta enredaderas y aprovecha la noche',
    toolX: 'TALADRO',
    toolY: 'SEMILLA',
    accent: '#65a30d',
  },
  {
    id: 'ink',
    code: 'R-2',
    name: 'ARCHIPIÉLAGO TINTA',
    tagline: 'Pinta superficies: azul rebota, naranja acelera, verde se pega',
    toolX: 'PINTAR',
    toolY: 'COLOR',
    accent: '#db2777',
  },
  {
    id: 'magnet',
    code: 'R-3',
    name: 'FOSA MAGNÉTICA',
    tagline: 'Invierte tu polaridad para volar entre imanes y bucea con oxígeno',
    toolX: 'PULSO',
    toolY: 'POLO',
    accent: '#2563eb',
  },
];

export const REALMS_TOTAL_LEVELS = REALM_METAS.length;
