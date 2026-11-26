export type GamePartition =
  | 'classic'
  | 'smw'
  | 'expedition'
  | 'frontier'
  | 'fortune'
  | 'mirage'
  | 'echo'
  | 'dimension'
  | 'tower'
  | 'flip'
  | 'star_road'
  | 'odyssey'
  | 'city_chaos'
  | 'realms';

export type BiomeId =
  | 'meadow'
  | 'cavern'
  | 'desert'
  | 'night'
  | 'glacier'
  | 'fortress'
  | 'yoshi_island'
  | 'donut_plains'
  | 'vanilla_dome'
  | 'forest_illusion'
  | 'valley_koopa'
  // Modo Expedición (original)
  | 'reef'
  | 'jungle'
  | 'clockwork'
  | 'cloudland'
  | 'crystal'
  // Modo Dimensión (3D, original)
  | 'starfield'
  | 'toybox'
  | 'aurora'
  | 'ember'
  | 'prism'
  | 'snowcap'
  | 'clockcore'
  | 'cosmos';

export type BgmTrackId =
  | 'overworld'
  | 'underground'
  | 'athletic'
  | 'fortress'
  | 'starman'
  | 'smw_overworld'
  | 'smw_athletic'
  | 'exp_overworld'
  | 'exp_cave'
  | 'dim_theme'
  | 'dim_core';

export type SfxId =
  | 'jump'
  | 'jump_big'
  | 'spin_jump'
  | 'skid'
  | 'coin'
  | 'dragon_coin'
  | 'bump'
  | 'break_block'
  | 'stomp'
  | 'kick'
  | 'powerup_spawn'
  | 'powerup_collect'
  | 'feather_get'
  | 'cape_spin'
  | 'yoshi_mount'
  | 'yoshi_tongue'
  | 'yoshi_swallow'
  | 'yoshi_spit'
  | 'one_up'
  | 'fireball'
  | 'power_down'
  | 'checkpoint'
  | 'spring'
  | 'boss_hit'
  | 'boss_roar'
  | 'bridge_collapse'
  | 'stage_clear'
  | 'die'
  | 'gameover'
  // Mecánicas, objetivos, secretos y habilidades
  | 'wind_gust'
  | 'icicle_crack'
  | 'crumble'
  | 'key_get'
  | 'vault_open'
  | 'treasure'
  | 'portal'
  | 'wrench_throw'
  | 'wrench_catch'
  | 'wall_jump'
  | 'slide'
  | 'gem'
  | 'clock'
  | 'chase_growl'
  | 'lava_rise'
  | 'goal_locked'
  // Tuberías secretas, gravedad, interruptores y arenas
  | 'pipe_warp'
  | 'gravity_flip'
  | 'switch_toggle'
  | 'arena_wave';

export type HapticKind =
  | 'tick'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'rigid'
  | 'success'
  | 'warning'
  | 'error';

export type GameEvent =
  | { type: 'sfx'; id: SfxId }
  | { type: 'bgm'; track: BgmTrackId | null }
  | { type: 'haptic'; kind: HapticKind }
  | {
      type: 'stage_cleared';
      partition: GamePartition;
      levelIndex: number;
      score: number;
      coins: number;
    }
  | { type: 'game_over'; partition: GamePartition; score: number }
  | { type: 'secret_unlocked'; partition: GamePartition };

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  fire: boolean;
  spin: boolean;
}

export type PowerState = 0 | 1 | 2 | 3; // 0 = Small, 1 = Super, 2 = Fire, 3 = Cape Feather (SMW)

export type BlockType =
  | 'ground_top'
  | 'ground_deep'
  | 'brick'
  | 'question'
  | 'rotating'
  | 'hidden'
  | 'empty'
  | 'hard'
  | 'bridge'
  | 'lock' // Puerta de bóveda: se abre con la llave (Fase 3)
  | 'on_off_switch'
  | 'on_block'
  | 'off_block';

export type BlockContent =
  | 'coin'
  | 'multi_coin'
  | 'powerup'
  | 'feather'
  | 'yoshi_egg'
  | 'star'
  | 'one_up'
  | null;

export interface Block {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  type: BlockType;
  content: BlockContent;
  coinsRemaining: number;
  bounceY: number;
  bounceVel: number;
  spinTimer: number;
  /** Puente que se derrumba (Mundo 5): se activa al pisarlo. */
  crumble?: boolean;
  crumbleTimer?: number;
}

export type PipeWarpKind = 'subroom' | 'warp_zone' | 'secret_world' | 'return';
export type PipeAccent = 'gold' | 'violet' | 'crimson' | 'emerald';
export type SubroomTheme = 'coin_vault' | 'star_sanctuary' | 'cloud_heaven' | 'warp_chamber';

export interface Pipe {
  x: number;
  y: number;
  width: number;
  height: number;
  hasPiranha: boolean;
  /** Si está definido, apretar ▼ sobre esta tubería inicia transición 'pipe_enter'. */
  warpKind?: PipeWarpKind;
  /** Color de aro/brillo superior para distinguirla visualmente. */
  warpAccent?: PipeAccent;
  /** Etiqueta flotante ("▼ BONUS", "▼ WARP", "★ SECRETO", "MUNDO 3", "↩ SALIDA"). */
  warpLabel?: string;
  /** Tema de la sub-sala cuando warpKind === 'subroom' | 'warp_zone'. */
  subroomTheme?: SubroomTheme;
  /** Columna de la tubería de salida al volver al nivel principal. */
  exitPipeCol?: number;
  /** Nivel destino cuando warpKind === 'warp_zone' o 'secret_world'. */
  warpTargetLevel?: number;
  /** Partición destino cuando desbloquea/salta al mundo secreto ('star_road'). */
  warpTargetPartition?: GamePartition;
  /** En modo 'flip', índice en world.pipes del tubo hermano para teletransporte dentro de la sala. */
  pairPipeIndex?: number;
  /** Evita re-entrar infinitamente al mismo tubo bonus ya completado. */
  visited?: boolean;
}

export interface MovingPlatform {
  x: number;
  y: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  rangeX: number;
  rangeY: number;
  speed: number;
  phase: number;
  vx: number;
  vy: number;
  /** Plataforma de luciérnagas: visible/sólida `on` frames de cada `period`. */
  blink?: { period: number; on: number; offset: number };
}

export interface Spring {
  x: number;
  y: number;
  width: number;
  height: number;
  compressTimer: number;
  /** 'mushroom' = hongo trampolín del Mundo 1 (rebota más alto). */
  kind?: 'spring' | 'mushroom';
}

// ============================================================================
// MECÁNICAS POR MUNDO (Fase 1)
// ============================================================================
export type StageMechanic =
  | 'none'
  | 'bounce' // Hongos trampolín
  | 'wind' // Ráfagas de viento
  | 'firefly' // Plataformas de luciérnagas que se apagan
  | 'icicles' // Carámbanos que caen
  | 'crumble' // Puentes que se derrumban al pisarlos
  | 'lowgrav' // Zonas de gravedad baja
  | 'lava_tide' // Marea de lava en los castillos
  | 'wager' // Mundo 6 FORTUNA: altares de apuesta (riesgo/recompensa)
  | 'thief' // Mundo 7 ESPECTRO: urraca que roba gemas (suma cero)
  | 'echo'; // Mundo 8 ECO: un reflejo del jugador que repite su camino

export type WindPhase = 'calm' | 'warn' | 'gust';

export interface WindState {
  phase: WindPhase;
  timer: number;
  dir: 1 | -1;
  cycle: number;
}

export interface Icicle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  homeY: number;
  state: 'hang' | 'shake' | 'fall' | 'gone';
  timer: number;
  vy: number;
}

export interface LowGravZone {
  x0: number;
  x1: number;
}

// ============================================================================
// OBJETIVOS POR NIVEL (Plomero Brawl)
// ============================================================================
export type StageObjectiveKind =
  | 'brawl_captain'
  | 'bounty_hunt'
  | 'core_breaker'
  | 'shadow_combo'
  | 'time_attack'
  | 'chase'
  | 'fortune'
  | 'reach';

export type StageObjective =
  | StageObjectiveKind
  | 'collect' // @deprecated - compatibilidad temporal con nonlinearBuilder.ts hasta Ola 1C
  | 'recover'; // @deprecated

export type PickupKind =
  | 'clock'
  | 'key'
  | 'treasure'
  | 'portal'
  | 'p_switch'
  | 'gem'; // @deprecated - compatibilidad temporal hasta Ola 2 (skiaRenderer / scene3d)

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  phase: number;
}

export interface ChaseWall {
  x: number;
  speed: number;
  delay: number;
}

/** Llave inglesa lanzada como bumerán (Fase 4). */
export interface Wrench {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  phase: 'out' | 'back';
  travelled: number;
  timer: number;
  spin: number;
  carryId: number | null;
  hitBoss: boolean;
  dmg?: number;
  fury?: boolean;
  piercing?: boolean;
}

export interface GrappleAnchor {
  id: number;
  x: number;
  y: number;
}

export interface CrumbledBlock {
  block: Block;
  respawnTimer: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  width: number;
  height: number;
  activated: boolean;
}

export type EnemyType =
  | 'goomba'
  | 'galoomba'
  | 'koopa_green'
  | 'koopa_red'
  | 'paratroopa'
  | 'piranha'
  | 'spiny'
  | 'rex'
  | 'chuck'
  | 'bullet_bill'
  | 'thief'; // Urraca del Mundo 7: persigue gemas y las roba

export type EnemyState =
  | 'walk'
  | 'rex_squished'
  | 'shell_idle'
  | 'shell_wake'
  | 'shell_slide'
  | 'squashed'
  | 'knocked';

export interface Enemy {
  id: number;
  type: EnemyType;
  state: EnemyState;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  onGround: boolean;
  hp: number;
  stateTimer: number;
  kickGraceTimer: number;
  shellCombo: number;
  animTimer: number;
  active: boolean;
  // Super Plomero Brawl (Vida, Aturdimiento, Rol de Combate, Físicas de Proyectil)
  maxHp?: number;
  stunTimer?: number;
  brawlRole?: 'grunt' | 'captain' | 'bounty_commander' | 'shadow_rival' | 'core_crystal' | 'dojo_master' | 'titan_boss';
  knockbackVx?: number;
  launchedByPlayer?: boolean;
  shieldFront?: boolean;
}

export interface BossFireWave {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  width: number;
  height: number;
  animTimer: number;
}

export type BossPuzzleKind = 'on_off_trap' | 'shell_ricochet' | 'pillar_stomp' | 'crown_mirror';

export interface FortressBoss {
  x: number;
  y: number;
  homeX: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  onGround: boolean;
  jumpTimer: number;
  fireTimer: number;
  roarTimer: number;
  hurtFlashTimer: number;
  defeated: boolean;
  fallingInLava: boolean;
  axeX: number;
  axeY: number;
  axeGrabbed: boolean;
  bridgeCols: number[];
  bridgeCollapseTimer: number;
  puzzleKind?: BossPuzzleKind;
  phase?: 'idle' | 'shell_spin' | 'stunned';
  phaseTimer?: number;
  sealedMessageTimer?: number;
  shellSpawnTimer?: number;
}

export type PowerupKind = 'mushroom' | 'flower' | 'feather' | 'yoshi_egg' | 'star' | 'one_up';

export interface PowerupItem {
  id: number;
  kind: PowerupKind;
  x: number;
  y: number;
  spawnStartY: number;
  spawning: boolean;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  swayPhase: number;
}

export interface YoshiEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1;
  onGround: boolean;
  state: 'hatching' | 'idle' | 'panic';
  stateTimer: number;
  animTimer: number;
}

export interface DragonCoin {
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  collected: boolean;
  phase: number;
}

export interface BerryEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  eaten: boolean;
}

export interface Fireball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  bounces: number;
  animFrame: number;
  fromYoshi?: boolean;
}

export interface CoinEntity {
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  collected: boolean;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'debris' | 'dust' | 'spark' | 'coin_pop' | 'lava' | 'wind';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface SceneryProp {
  kind:
    | 'cloud'
    | 'hill'
    | 'smw_hill'
    | 'bush'
    | 'yoshi_house'
    | 'pillar'
    | 'dune'
    | 'pine'
    | 'banner'
    | 'chain';
  x: number;
  y: number;
  scale: number;
  parallax: number;
}

export interface FlagpoleGoal {
  x: number;
  y: number;
  width: number;
  height: number;
  flagY: number;
  castleX: number;
  castleY: number;
}

export interface GoalTape {
  x: number;
  y: number;
  width: number;
  height: number;
  barY: number;
  barVy: number;
  triggered: boolean;
  castleX: number;
  castleY: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  powerState: PowerState;
  onGround: boolean;
  crouching: boolean;
  skidding: boolean;
  facing: 1 | -1;
  coyoteTimer: number;
  jumpBufferTimer: number;
  airJumpsLeft: number;
  invulnTimer: number;
  starTimer: number;
  fireCooldown: number;
  throwPoseTimer: number;
  stompCombo: number;
  animTimer: number;
  dead: boolean;
  enteringCastle: boolean;
  // Super Plomero World (SMW) Cape & Yoshi mechanics:
  pMeter: number; // 0..112 -> at 112 enables SMW Cape takeoff!
  capeFlying: boolean;
  capeFlightTimer: number;
  capeDiveSpeed: number;
  capeSpinTimer: number;
  spinJumping: boolean;
  mountedYoshi: boolean;
  yoshiTongueTimer: number;
  yoshiTonguePhase: number; // 0..18
  yoshiMouthItem: 'none' | 'fire';
  berriesEaten: number;
  // Habilidades (Fase 4)
  /** -1/1 = pegado a una pared a la izquierda/derecha en el aire; 0 = no. */
  wallDir?: -1 | 0 | 1;
  /** Frames en que se ignora volver hacia la pared tras un salto en pared. */
  wallJumpLock?: number;
  wallJumpLockDir?: -1 | 0 | 1;
  /** Margen de frames para saltar en pared justo después de soltarla. */
  wallCoyote?: number;
  lastWallDir?: -1 | 0 | 1;
  /** Frames restantes de deslizamiento por el suelo. */
  slideTimer?: number;
  springJumping?: boolean;
  // Super Plomero Brawl (Combate Melee, Ground Pound, Parry, Furia)
  comboStep?: 0 | 1 | 2 | 3;
  comboTimer?: number;
  meleeTimer?: number;
  meleeHitIds?: number[];
  groundPounding?: boolean;
  groundPoundDelay?: number;
  shockwaveTimer?: number;
  shockwaveX?: number;
  shockwaveY?: number;
  parryTimer?: number;
  parryCooldown?: number;
  parryFlashTimer?: number;
  furyMeter?: number; // 0..100
  furyTimer?: number; // 0..480 frames
  // Odisea Abierta (Gancho, Crono-Jetpack y Mecha)
  grappleAnchorId?: number | null;
  grappleX?: number;
  grappleY?: number;
  grappleLen?: number;
  grappleAngle?: number;
  grappleAngVel?: number;
  jetpackFuel?: number;      // 0..100
  jetpackMaxFuel?: number;   // 100
  jetpackActive?: boolean;
  chronoTimer?: number;      // 0..240 frames de Cámara Lenta (Tiempo Bala)
  chronoCooldown?: number;   // enfriamiento entre usos
  mechaSuit?: boolean;       // Armadura Mecha-Plomero en O-3
}

export type WorldStatus =
  | 'title'
  | 'stage_intro'
  | 'playing'
  | 'pipe_enter'
  | 'pipe_exit'
  | 'flagpole'
  | 'goal_tape'
  | 'boss_collapse'
  | 'dying'
  | 'gameover'
  | 'victory';

export interface EchoFrame {
  x: number;
  y: number;
  melee?: boolean;
  groundPound?: boolean;
  facing?: 1 | -1;
}

export interface MainStageSnapshot {
  worldLabel: string;
  stageTitle: string;
  biomeId: BiomeId;
  totalCols: number;
  worldRows?: number;
  cameraX: number;
  cameraY?: number;
  blocks: Block[];
  blockGrid: Map<number, Block>;
  pipes: Pipe[];
  platforms: MovingPlatform[];
  springs: Spring[];
  checkpoint: Checkpoint | null;
  enemies: Enemy[];
  boss: FortressBoss | null;
  powerups: PowerupItem[];
  yoshis: YoshiEntity[];
  dragonCoins: DragonCoin[];
  berries: BerryEntity[];
  coinsList: CoinEntity[];
  sceneries: SceneryProp[];
  lavaCols: Set<number>;
  flagpole: FlagpoleGoal | null;
  goalTape: GoalTape | null;
  mechanic?: StageMechanic;
  wind?: WindState | null;
  icicles?: Icicle[];
  lowGravZones?: LowGravZone[];
  crumbled?: CrumbledBlock[];
  lavaTide?: boolean;
  objective?: StageObjective;
  pickups?: Pickup[];
  gemsNeeded?: number;
  gemsCollected?: number;
  pSwitchTimer?: number;
  goalSealBroken?: boolean;
  chase?: ChaseWall | null;
  hasKey?: boolean;
  vaultOpened?: boolean;
  wagerAltars?: Array<{ id: number; x: number; y: number; stake: number; resolved: boolean; won: boolean }>;
  fortuneTarget?: number;
  recoverTarget?: number;
  echo?: EchoFrame | null;
  echoTrail?: EchoFrame[];
  shafts?: Array<{ x: number; y: number; hinted: boolean }>;
  risingHazardY?: number | null;
  risingHazardSpeed?: number;
  wrapHorizontal?: boolean;
  gravityDir?: 1 | -1;
  onOffState?: 'on' | 'off';
  cameraMode?: 'side' | 'corridor3d';
  arenaWave?: ArenaWaveState | null;
  brawlTargetsTotal?: number;
  brawlTargetsDefeated?: number;
  arenaLockX?: number;
  arenaLockActive?: boolean;
  arenaGoTimer?: number;
  // Odisea Abierta
  odysseyMode?: 'citadel_grapple' | 'chrono_canyon' | 'titan_crater';
  grappleAnchors?: GrappleAnchor[];
  timeScale?: number;        // 1.0 normal, 0.30 en Chrono-Time para enemigos/proyectiles
  titanPhase?: 1 | 2 | 3;    // fase actual del jefe colosal en O-3
  exitX: number;
  exitY: number;
}

export interface ArenaWaveState {
  current: number;
  total: number;
  remaining: number;
  cooldown: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  crtScanlines: boolean;
  doubleJumpAssist: boolean;
  controlScale: number;
}

export interface SaveProgress {
  highScore: number;
  unlockedLevel: number;
  clearedLevels: number[];
  bestStageScores: Record<number, number>;
  totalCoins: number;
  // Partition 2: Super Plomero World (20 levels)
  smwHighScore: number;
  smwUnlockedLevel: number;
  smwClearedLevels: number[];
  smwBestStageScores: Record<number, number>;
  // Modo 3: Plomero Expedición (20 niveles)
  expHighScore?: number;
  expUnlockedLevel?: number;
  expClearedLevels?: number[];
  expBestStageScores?: Record<number, number>;
  // Mundo 5 2D: Marea Espejo y Valle Vítreo (8 niveles)
  frontierHighScore?: number;
  frontierUnlockedLevel?: number;
  frontierClearedLevels?: number[];
  frontierBestStageScores?: Record<number, number>;
  // Modo 5: Plomero Dimensión 3D (32 niveles)
  dimHighScore?: number;
  dimUnlockedLevel?: number;
  dimClearedLevels?: number[];
  dimBestStageScores?: Record<number, number>;
  // Mundo 6 FORTUNA (16 niveles)
  fortuneHighScore?: number;
  fortuneUnlockedLevel?: number;
  fortuneClearedLevels?: number[];
  fortuneBestStageScores?: Record<number, number>;
  // Mundo 7 ESPECTRO (16 niveles)
  mirageHighScore?: number;
  mirageUnlockedLevel?: number;
  mirageClearedLevels?: number[];
  mirageBestStageScores?: Record<number, number>;
  // Mundo 8 ECO (16 niveles)
  echoHighScore?: number;
  echoUnlockedLevel?: number;
  echoClearedLevels?: number[];
  echoBestStageScores?: Record<number, number>;
  // Modo Torre (8 niveles verticales)
  towerHighScore?: number;
  towerUnlockedLevel?: number;
  towerClearedLevels?: number[];
  towerBestStageScores?: Record<number, number>;
  // Modo Inverso / Flip (8 niveles)
  flipHighScore?: number;
  flipUnlockedLevel?: number;
  flipClearedLevels?: number[];
  flipBestStageScores?: Record<number, number>;
  // Modo Senda Estelar (8 niveles)
  starRoadHighScore?: number;
  starRoadUnlockedLevel?: number;
  starRoadClearedLevels?: number[];
  starRoadBestStageScores?: Record<number, number>;
  // Odisea Abierta (3 mundos abiertos)
  odysseyHighScore?: number;
  odysseyUnlockedLevel?: number;
  odysseyClearedLevels?: number[];
  odysseyBestStageScores?: Record<number, number>;
  odysseyUnlocked?: number;
  // Ciudad Caos (Mundo Abierto GTA Top-Down)
  cityChaosHighScore?: number;
  cityChaosUnlockedLevel?: number;
  cityChaosClearedLevels?: number[];
  cityChaosBestStageScores?: Record<number, number>;
  // Reinos Abiertos (3 mundos abiertos con motor propio)
  realmsHighScore?: number;
  realmsUnlockedLevel?: number;
  realmsClearedLevels?: number[];
  realmsBestStageScores?: Record<number, number>;
  allUnlocked?: boolean;
  // Desbloqueo permanente de mundo secreto
  secretUnlocked?: boolean;
  lastPartition: GamePartition;
}

export interface WorldState {
  partition: GamePartition;
  totalStagesInPartition: number;
  status: WorldStatus;
  levelIndex: number;
  worldLabel: string;
  stageTitle: string;
  biomeId: BiomeId;
  totalCols: number;
  score: number;
  highScore: number;
  coins: number;
  lives: number;
  timeLeft: number;
  timeTick: number;
  frameCount: number;
  statusTimer: number;
  cameraX: number;
  screenShake: number;
  checkpointX: number | null;
  checkpointY: number | null;
  player: Player;
  blocks: Block[];
  blockGrid: Map<number, Block>;
  pipes: Pipe[];
  platforms: MovingPlatform[];
  springs: Spring[];
  checkpoint: Checkpoint | null;
  enemies: Enemy[];
  boss: FortressBoss | null;
  bossFires: BossFireWave[];
  powerups: PowerupItem[];
  yoshis: YoshiEntity[];
  dragonCoins: DragonCoin[];
  dragonCoinsCollected: number;
  berries: BerryEntity[];
  fireballs: Fireball[];
  coinsList: CoinEntity[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  sceneries: SceneryProp[];
  lavaCols: Set<number>;
  flagpole: FlagpoleGoal | null;
  goalTape: GoalTape | null;
  prevJumpHeld: boolean;
  prevFireHeld: boolean;
  prevSpinHeld: boolean;
  doubleJumpAssist: boolean;
  nextEntityId: number;
  // Mecánica del mundo (opcionales: los mundos sin mecánica no las usan)
  mechanic?: StageMechanic;
  wind?: WindState | null;
  icicles?: Icicle[];
  lowGravZones?: LowGravZone[];
  crumbled?: CrumbledBlock[];
  lavaTide?: boolean;
  // Objetivo del nivel (opcionales: 'reach' no los usa)
  objective?: StageObjective;
  pickups?: Pickup[];
  gemsNeeded?: number;
  gemsCollected?: number;
  pSwitchTimer?: number;
  goalSealBroken?: boolean;
  chase?: ChaseWall | null;
  goalBlockedTimer?: number;
  // Secretos (Fase 3)
  hasKey?: boolean;
  vaultOpened?: boolean;
  /** Si existe, la salida lleva a este nivel en vez del siguiente (portal secreto). */
  warpTo?: number | null;
  // Mundo 6 FORTUNA: altares de apuesta y capital objetivo
  wagerAltars?: Array<{ id: number; x: number; y: number; stake: number; resolved: boolean; won: boolean }>;
  fortuneTarget?: number;
  // Mundo 7 ESPECTRO: gemas objetivo (el ladrón las roba)
  recoverTarget?: number;
  // Mundo 8 ECO: reflejo del jugador y su rastro
  echo?: EchoFrame | null;
  echoTrail?: EchoFrame[];
  // Habilidades (Fase 4)
  wrench?: Wrench | null;
  shafts?: Array<{ x: number; y: number; hinted: boolean }>;
  // Modos no-horizontales, sub-salas y tuberías secretas
  worldRows?: number;
  cameraY?: number;
  gravityDir?: 1 | -1;
  onOffState?: 'on' | 'off';
  wrapHorizontal?: boolean;
  risingHazardY?: number | null;
  risingHazardSpeed?: number;
  subArea?: 'subroom' | 'warp_zone' | null;
  returnSnapshot?: MainStageSnapshot | null;
  activeWarpPipe?: Pipe | null;
  cameraMode?: 'side' | 'corridor3d';
  arenaWave?: ArenaWaveState | null;
  // Super Plomero Brawl (Arenas, Asedios, Objetivos y Eco de Combate)
  brawlTargetsTotal?: number;
  brawlTargetsDefeated?: number;
  echoAttackPulse?: number;
  echoAttackX?: number;
  echoAttackY?: number;
  echoAttackFacing?: 1 | -1;
  arenaLockX?: number;
  arenaLockActive?: boolean;
  arenaGoTimer?: number;
  // Odisea Abierta (Gancho, Crono-Jetpack, Tiempo Bala, Titán)
  odysseyMode?: 'citadel_grapple' | 'chrono_canyon' | 'titan_crater';
  grappleAnchors?: GrappleAnchor[];
  timeScale?: number;        // 1.0 normal, 0.30 en Chrono-Time para enemigos/proyectiles
  titanPhase?: 1 | 2 | 3;    // fase actual del jefe colosal en O-3
}
