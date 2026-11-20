import {
  BIOMES,
  LOGICAL_HEIGHT,
  TILE,
  getWorldLabel,
} from '../engine/biomes';
import type {
  Block,
  Checkpoint,
  CoinEntity,
  Enemy,
  FlagpoleGoal,
  GrappleAnchor,
  MovingPlatform,
  Pipe,
  PowerState,
  SceneryProp,
  Spring,
  WorldState,
} from '../engine/types';
import {
  type BuilderCtx,
  createInitialPlayer,
  gridKey,
  putBlock,
  addCoin,
  addCoinArc,
  addPlatform,
  addSpring,
} from './builderToolkit';
import { applyStageObjective } from '../engine/objectives';

export interface CarryState {
  score: number;
  highScore: number;
  coins: number;
  lives: number;
  powerState: PowerState;
  mountedYoshi?: boolean;
  checkpointX?: number | null;
  checkpointY?: number | null;
  doubleJumpAssist?: boolean;
}

function normalizeCarry(carry?: CarryState | PowerState): CarryState {
  if (typeof carry === 'number') {
    return {
      score: 0,
      highScore: 0,
      coins: 0,
      lives: 3,
      powerState: carry,
    };
  }
  return (
    carry ?? {
      score: 0,
      highScore: 0,
      coins: 0,
      lives: 3,
      powerState: 0,
    }
  );
}

// ============================================================================
// 1. O-1: CIUDADELA DEL GANCHO (odysseyMode: 'citadel_grapple')
// ============================================================================
export function buildOdysseyCitadel(carryInput?: CarryState | PowerState): WorldState {
  const carry = normalizeCarry(carryInput);
  const totalCols = 80;
  const worldRows = 30;
  const biomeId = 'clockwork';
  const biome = BIOMES[biomeId];
  const worldLabel = getWorldLabel(0, 'odyssey');
  const stageTitle = 'CIUDADELA DEL GANCHO';

  const ctx: BuilderCtx = {
    levelIndex: 0,
    designIndex: 0,
    worldNum: 1,
    stageNum: 1,
    difficulty: 1.0,
    nextId: 1,
    blocks: [],
    blockGrid: new Map<number, Block>(),
    pipes: [],
    platforms: [],
    springs: [],
    enemies: [],
    coins: [],
    pits: new Set<number>(),
    lavaCols: new Set<number>(),
    isFortress: false,
    isUnderground: biome.underground,
    enemySeq: 0,
    partition: 'odyssey',
    worldRows,
  };

  // 1. Suelo firme en row 28..29 para col 0..79
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, 28, 'ground_top');
    putBlock(ctx, c, 29, 'ground_deep');
  }

  // Paredes protectoras en los bordes
  for (let r = 0; r <= 27; r++) {
    putBlock(ctx, 0, r, 'hard');
    putBlock(ctx, 1, r, 'hard');
    putBlock(ctx, 78, r, 'hard');
    putBlock(ctx, 79, r, 'hard');
  }

  // 2. Spawn en la Plaza Principal (col 38, row 26)
  const player = createInitialPlayer(carry.powerState, false);
  player.x = 38 * TILE;
  player.y = 28 * TILE - player.height;

  // Decoración de la Plaza Central (cols 32..44)
  for (let c = 35; c <= 41; c++) {
    if (c === 38) continue; // entrada despejada
    putBlock(ctx, c, 25, 'brick');
  }
  putBlock(ctx, 36, 25, 'question', 'powerup');
  putBlock(ctx, 40, 25, 'question', 'coin');
  addCoinArc(ctx, 36, 5, 23);

  // --------------------------------------------------------------------------
  // DISTRITO OESTE — Torre del Reloj (cols 4..24)
  // --------------------------------------------------------------------------
  // Escalera de plataformas y terrazas
  for (let c = 16; c <= 22; c++) putBlock(ctx, c, 24, 'brick');
  for (let c = 6; c <= 16; c++) putBlock(ctx, c, 21, 'brick');
  for (let c = 8; c <= 18; c++) putBlock(ctx, c, 16, 'brick');

  // Torre del Reloj (piso superior cols 6..14, row 13)
  for (let c = 6; c <= 14; c++) putBlock(ctx, c, 13, 'hard');
  // Pilares de soporte
  for (let r = 14; r <= 27; r++) {
    putBlock(ctx, 6, r, 'hard');
    putBlock(ctx, 14, r, 'hard');
  }
  // Almenas superiores y reloj decorativo
  putBlock(ctx, 6, 12, 'hard');
  putBlock(ctx, 8, 12, 'brick');
  putBlock(ctx, 10, 12, 'question', 'powerup');
  putBlock(ctx, 12, 12, 'brick');
  putBlock(ctx, 14, 12, 'hard');

  // Baliza 1 (col 10, row 12) custodiada por 2 enemigos
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 10 * TILE + 2,
    y: 13 * TILE - 28,
    baseY: 13 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 3,
    maxHp: 3,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Guardianes de la Baliza 1
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'koopa_red',
    state: 'walk',
    x: 7 * TILE,
    y: 13 * TILE - 36,
    baseY: 13 * TILE - 36,
    vx: 1.1,
    vy: 0,
    width: 26,
    height: 36,
    facing: 1,
    onGround: true,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 13 * TILE,
    y: 13 * TILE - 28,
    baseY: 13 * TILE - 28,
    vx: -1.0,
    vy: 0,
    width: 28,
    height: 28,
    facing: -1,
    onGround: true,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // Resorte en la base oeste para impulso inicial
  addSpring(ctx, 5, 28);
  addCoinArc(ctx, 7, 7, 10);

  // --------------------------------------------------------------------------
  // DISTRITO SUR / SUBTERRÁNEO — Acueducto (cols 26..54, rows 20..27)
  // --------------------------------------------------------------------------
  // Techo / pasarela superior del acueducto
  for (let c = 26; c <= 32; c++) putBlock(ctx, c, 20, 'brick');
  for (let c = 48; c <= 54; c++) putBlock(ctx, c, 20, 'brick');

  // Pilares del acueducto
  for (let r = 21; r <= 27; r++) {
    putBlock(ctx, 28, r, 'brick');
    putBlock(ctx, 52, r, 'brick');
  }

  // Galería y terraza inferior (row 26)
  for (let c = 44; c <= 51; c++) putBlock(ctx, c, 26, 'brick');
  putBlock(ctx, 46, 26, 'question', 'multi_coin');

  // Trampolines de escape / subida
  addSpring(ctx, 33, 28);
  addSpring(ctx, 44, 26);

  // Baliza 2 (col 48, row 25 en la terraza del acueducto)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 48 * TILE + 2,
    y: 26 * TILE - 28,
    baseY: 26 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 3,
    maxHp: 3,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Guardia del Acueducto
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'galoomba',
    state: 'walk',
    x: 50 * TILE,
    y: 26 * TILE - 28,
    baseY: 26 * TILE - 28,
    vx: -0.9,
    vy: 0,
    width: 26,
    height: 28,
    facing: -1,
    onGround: true,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // --------------------------------------------------------------------------
  // DISTRITO ESTE — Azotea del Fuerte (cols 56..76)
  // --------------------------------------------------------------------------
  // Terrazas ascendentes del fuerte
  for (let c = 58; c <= 64; c++) putBlock(ctx, c, 22, 'brick');
  for (let c = 60; c <= 74; c++) putBlock(ctx, c, 17, 'brick');

  // Azotea alta del Fuerte (cols 64..74, row 12)
  for (let c = 64; c <= 74; c++) putBlock(ctx, c, 12, 'hard');
  for (let r = 13; r <= 27; r++) {
    putBlock(ctx, 64, r, 'hard');
    putBlock(ctx, 74, r, 'hard');
  }

  // Almenas del Fuerte
  putBlock(ctx, 64, 11, 'hard');
  putBlock(ctx, 66, 11, 'brick');
  putBlock(ctx, 70, 11, 'question', 'feather');
  putBlock(ctx, 72, 11, 'brick');
  putBlock(ctx, 74, 11, 'hard');

  // Baliza 3 (col 68, row 11) custodiada por un Capitán
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 68 * TILE + 2,
    y: 12 * TILE - 28,
    baseY: 12 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 3,
    maxHp: 3,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Capitán Guardián en la Azotea
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'chuck',
    state: 'walk',
    x: 65 * TILE,
    y: 12 * TILE - 36,
    baseY: 12 * TILE - 36,
    vx: -0.9,
    vy: 0,
    width: 32,
    height: 36,
    facing: -1,
    onGround: true,
    hp: 5,
    maxHp: 5,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'captain',
    shieldFront: true,
  });

  addSpring(ctx, 75, 28);
  addCoinArc(ctx, 65, 8, 9);

  // --------------------------------------------------------------------------
  // SANTUARIO DE LA CUMBRE (Meta, cols 34..46, row 8)
  // --------------------------------------------------------------------------
  // Plataforma sólida en la cima central
  for (let c = 34; c <= 46; c++) putBlock(ctx, c, 8, 'hard');
  // Peldaños laterales para subir volando o saltando
  for (let c = 30; c <= 33; c++) putBlock(ctx, c, 12, 'brick');
  for (let c = 47; c <= 50; c++) putBlock(ctx, c, 12, 'brick');

  // Flagpole bloqueado hasta destruir las 3 Balizas
  const flagCol = 40;
  const flagpole: FlagpoleGoal = {
    x: flagCol * TILE + 10,
    y: 2 * TILE,
    width: 12,
    height: 6 * TILE,
    flagY: 2 * TILE + 10,
    castleX: 43 * TILE,
    castleY: 8 * TILE - 128,
  };

  // --------------------------------------------------------------------------
  // 15+ ANCLAS MAGNÉTICAS DE GANCHO (grappleAnchors)
  // --------------------------------------------------------------------------
  const grappleAnchors: GrappleAnchor[] = [
    { id: 1, x: 8 * TILE + 16, y: 9 * TILE + 16 },    // Torre Reloj Oeste (alta)
    { id: 2, x: 14 * TILE + 16, y: 11 * TILE + 16 },  // Torre Reloj Oeste (media)
    { id: 3, x: 18 * TILE + 16, y: 14 * TILE + 16 },  // Salida Torre Oeste
    { id: 4, x: 22 * TILE + 16, y: 18 * TILE + 16 },  // Plaza Oeste intermedia
    { id: 5, x: 12 * TILE + 16, y: 20 * TILE + 16 },  // Patio Oeste bajo
    { id: 6, x: 31 * TILE + 16, y: 9 * TILE + 16 },   // Acceso Cumbre Oeste
    { id: 7, x: 49 * TILE + 16, y: 9 * TILE + 16 },   // Acceso Cumbre Este
    { id: 8, x: 40 * TILE + 16, y: 3 * TILE + 16 },   // Aguja Suprema de la Cumbre
    { id: 9, x: 28 * TILE + 16, y: 15 * TILE + 16 },  // Transición Oeste-Cumbre
    { id: 10, x: 52 * TILE + 16, y: 15 * TILE + 16 }, // Transición Este-Cumbre
    { id: 11, x: 34 * TILE + 16, y: 21 * TILE + 16 }, // Acueducto Oeste
    { id: 12, x: 46 * TILE + 16, y: 21 * TILE + 16 }, // Acueducto Este
    { id: 13, x: 58 * TILE + 16, y: 13 * TILE + 16 }, // Entrada Fuerte Este
    { id: 14, x: 64 * TILE + 16, y: 8 * TILE + 16 },  // Azotea Fuerte alta
    { id: 15, x: 72 * TILE + 16, y: 7 * TILE + 16 },  // Torreón Fuerte extremo
    { id: 16, x: 60 * TILE + 16, y: 19 * TILE + 16 }, // Galería Fuerte baja
  ];

  // Checkpoint central en la Plaza
  const checkpoint: Checkpoint = {
    x: 38 * TILE + 6,
    y: 26 * TILE,
    width: 20,
    height: 2 * TILE,
    activated: carry.checkpointX != null && carry.checkpointX > 0,
  };

  // Parallax Sceneries
  const sceneries: SceneryProp[] = [];
  for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
    sceneries.push({
      kind: 'pillar',
      x: i * 240 + 60,
      y: 2 * TILE,
      scale: (Math.abs(i) % 2) + 1,
      parallax: 0.5,
    });
    sceneries.push({
      kind: 'cloud',
      x: i * 260 + 40,
      y: 32 + (Math.abs(i) % 3) * 24,
      scale: (Math.abs(i) % 2) + 1,
      parallax: 0.3,
    });
  }

  const maxCamY = worldRows * TILE - LOGICAL_HEIGHT;
  const startCameraY = Math.max(0, Math.min(maxCamY, player.y - LOGICAL_HEIGHT / 2));
  const startCameraX = Math.max(0, Math.min(totalCols * TILE - 448, player.x - 224));

  const worldState: WorldState = {
    partition: 'odyssey',
    totalStagesInPartition: 3,
    status: 'playing',
    levelIndex: 0,
    worldLabel,
    stageTitle,
    biomeId,
    totalCols,
    worldRows,
    score: carry.score,
    highScore: carry.highScore,
    coins: carry.coins,
    lives: carry.lives,
    timeLeft: 450,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: startCameraX,
    cameraY: startCameraY,
    screenShake: 0,
    checkpointX: carry.checkpointX ?? null,
    checkpointY: carry.checkpointY ?? null,
    player,
    blocks: ctx.blocks,
    blockGrid: ctx.blockGrid,
    pipes: ctx.pipes,
    platforms: ctx.platforms,
    springs: ctx.springs,
    checkpoint,
    enemies: ctx.enemies,
    boss: null,
    bossFires: [],
    powerups: [],
    yoshis: [],
    dragonCoins: [],
    dragonCoinsCollected: 0,
    berries: [],
    fireballs: [],
    coinsList: ctx.coins,
    particles: [],
    floatingTexts: [],
    sceneries,
    lavaCols: ctx.lavaCols,
    flagpole,
    goalTape: null,
    prevJumpHeld: false,
    prevFireHeld: false,
    prevSpinHeld: false,
    doubleJumpAssist: carry.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
    // Odisea Abierta
    odysseyMode: 'citadel_grapple',
    grappleAnchors,
    timeScale: 1.0,
    objective: 'core_breaker',
    pickups: [],
    gemsNeeded: 0,
    gemsCollected: 0,
    brawlTargetsTotal: 3,
    brawlTargetsDefeated: 0,
  };

  return applyStageObjective(worldState);
}

// ============================================================================
// 2. O-2: CAÑÓN DEL TIEMPO (odysseyMode: 'chrono_canyon')
// ============================================================================
export function buildOdysseyChronoCanyon(carryInput?: CarryState | PowerState): WorldState {
  const carry = normalizeCarry(carryInput);
  const totalCols = 76;
  const worldRows = 28;
  const biomeId = 'aurora';
  const biome = BIOMES[biomeId];
  const worldLabel = getWorldLabel(1, 'odyssey');
  const stageTitle = 'CAÑÓN DEL TIEMPO';

  const ctx: BuilderCtx = {
    levelIndex: 1,
    designIndex: 1,
    worldNum: 1,
    stageNum: 2,
    difficulty: 1.2,
    nextId: 1,
    blocks: [],
    blockGrid: new Map<number, Block>(),
    pipes: [],
    platforms: [],
    springs: [],
    enemies: [],
    coins: [],
    pits: new Set<number>(),
    lavaCols: new Set<number>(),
    isFortress: false,
    isUnderground: biome.underground,
    enemySeq: 0,
    partition: 'odyssey',
    worldRows,
  };

  // 1. Puentes y suelo de seguridad inferior (row 26..27) con resortes de rescate
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, 26, 'ground_top');
    putBlock(ctx, c, 27, 'ground_deep');
  }

  // Paredes protectoras en los bordes
  for (let r = 0; r <= 25; r++) {
    putBlock(ctx, 0, r, 'hard');
    putBlock(ctx, 1, r, 'hard');
    putBlock(ctx, 74, r, 'hard');
    putBlock(ctx, 75, r, 'hard');
  }

  // Súper-resortes de rescate en el suelo inferior
  addSpring(ctx, 16, 26);
  addSpring(ctx, 28, 26);
  addSpring(ctx, 42, 26);
  addSpring(ctx, 56, 26);
  addSpring(ctx, 68, 26);

  // 2. Isla de Salida Oeste (cols 2..12, row 22) - Spawn seguro
  for (let c = 2; c <= 12; c++) {
    putBlock(ctx, c, 22, 'ground_top');
    putBlock(ctx, c, 23, 'ground_deep');
  }
  putBlock(ctx, 8, 19, 'question', 'feather');
  addCoinArc(ctx, 4, 5, 18);

  const player = createInitialPlayer(carry.powerState, false);
  player.x = 6 * TILE;
  player.y = 22 * TILE - player.height;
  player.jetpackFuel = 100;
  player.jetpackMaxFuel = 100;

  // --------------------------------------------------------------------------
  // ISLA DE VIENTO BAJA (cols 18..34, row 21)
  // --------------------------------------------------------------------------
  for (let c = 18; c <= 34; c++) {
    putBlock(ctx, c, 21, 'ground_top');
    putBlock(ctx, c, 22, 'ground_deep');
  }
  putBlock(ctx, 22, 18, 'question', 'powerup');
  putBlock(ctx, 30, 18, 'question', 'coin');

  // Reactor Crono 1 (col 26, row 19)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 26 * TILE + 2,
    y: 21 * TILE - 28,
    baseY: 21 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 4,
    maxHp: 4,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Guardia de la Isla Baja
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'koopa_red',
    state: 'walk',
    x: 31 * TILE,
    y: 21 * TILE - 36,
    baseY: 21 * TILE - 36,
    vx: -1.0,
    vy: 0,
    width: 26,
    height: 36,
    facing: -1,
    onGround: true,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // --------------------------------------------------------------------------
  // ISLA DEL RELOJ ALTA (cols 28..46, row 11)
  // --------------------------------------------------------------------------
  for (let c = 28; c <= 46; c++) {
    putBlock(ctx, c, 11, 'hard');
  }
  for (let c = 34; c <= 40; c++) {
    putBlock(ctx, c, 8, 'brick');
  }
  putBlock(ctx, 35, 7, 'question', 'powerup');
  addCoinArc(ctx, 35, 6, 6);

  // Reactor Crono 2 (col 37, row 9)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 37 * TILE + 2,
    y: 8 * TILE - 28,
    baseY: 8 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 4,
    maxHp: 4,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Guardia aéreo de la Isla Alta
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'paratroopa',
    state: 'walk',
    x: 32 * TILE,
    y: 11 * TILE - 36,
    baseY: 11 * TILE - 36,
    vx: -1.1,
    vy: 0,
    width: 26,
    height: 36,
    facing: -1,
    onGround: false,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // --------------------------------------------------------------------------
  // BASTIÓN ORBITAL ESTE (cols 50..66, row 16)
  // --------------------------------------------------------------------------
  for (let c = 50; c <= 66; c++) {
    putBlock(ctx, c, 16, 'hard');
  }
  putBlock(ctx, 54, 13, 'question', 'multi_coin');

  // Reactor Crono 3 (col 58, row 14)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 58 * TILE + 2,
    y: 16 * TILE - 28,
    baseY: 16 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 4,
    maxHp: 4,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // Guardia acorazado del Bastión
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'chuck',
    state: 'walk',
    x: 53 * TILE,
    y: 16 * TILE - 36,
    baseY: 16 * TILE - 36,
    vx: -0.9,
    vy: 0,
    width: 32,
    height: 36,
    facing: -1,
    onGround: true,
    hp: 3,
    maxHp: 3,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // --------------------------------------------------------------------------
  // PORTAL ESTELAR (META) — Isla Suprema Este (cols 64..74, row 8)
  // --------------------------------------------------------------------------
  for (let c = 64; c <= 74; c++) {
    putBlock(ctx, c, 8, 'hard');
  }

  const flagCol = 70;
  const flagpole: FlagpoleGoal = {
    x: flagCol * TILE + 10,
    y: 2 * TILE,
    width: 12,
    height: 6 * TILE,
    flagY: 2 * TILE + 10,
    castleX: 73 * TILE,
    castleY: 8 * TILE - 128,
  };

  // --------------------------------------------------------------------------
  // PLATAFORMAS MÓVILES ENTRE ISLAS
  // --------------------------------------------------------------------------
  // Plataforma 1: entre Isla de Salida y Baja
  addPlatform(ctx, 13, 21, 3, 3, 0, 0.035, 0);
  // Plataforma 2: entre Isla Baja e Isla Alta
  addPlatform(ctx, 26, 16, 3, 0, 4, 0.03, 0);
  // Plataforma 3: entre Isla Alta y Bastión Orbital
  addPlatform(ctx, 47, 13, 3, 3, 2, 0.028, 0);
  // Plataforma 4: entre Bastión y la Isla Suprema
  addPlatform(ctx, 60, 11, 3, 2, 3, 0.03, 1);

  // --------------------------------------------------------------------------
  // 3 CAÑONES / BULLET BILL PARA PARRIAR O CONGELAR EN BULLET TIME
  // --------------------------------------------------------------------------
  // Cañón 1 en col 20 (cruza el abismo bajo)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'bullet_bill',
    state: 'walk',
    x: 20 * TILE,
    y: 17 * TILE,
    baseY: 17 * TILE,
    vx: -3.3,
    vy: 0,
    width: 26,
    height: 24,
    facing: -1,
    onGround: false,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // Cañón 2 en col 44 (cruza el abismo medio)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'bullet_bill',
    state: 'walk',
    x: 44 * TILE,
    y: 8 * TILE,
    baseY: 8 * TILE,
    vx: -3.3,
    vy: 0,
    width: 26,
    height: 24,
    facing: -1,
    onGround: false,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  // Cañón 3 en col 55 (cruza el bastión hacia la meta)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'bullet_bill',
    state: 'walk',
    x: 55 * TILE,
    y: 13 * TILE,
    baseY: 13 * TILE,
    vx: 3.3,
    vy: 0,
    width: 26,
    height: 24,
    facing: 1,
    onGround: false,
    hp: 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
  });

  const checkpoint: Checkpoint = {
    x: 37 * TILE + 6,
    y: 9 * TILE,
    width: 20,
    height: 2 * TILE,
    activated: carry.checkpointX != null && carry.checkpointX > 0,
  };

  const sceneries: SceneryProp[] = [];
  for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
    sceneries.push({
      kind: 'cloud',
      x: i * 220 + 30,
      y: 28 + (Math.abs(i) % 3) * 20,
      scale: (Math.abs(i) % 2) + 1,
      parallax: 0.35,
    });
  }

  const maxCamY = worldRows * TILE - LOGICAL_HEIGHT;
  const startCameraY = Math.max(0, Math.min(maxCamY, player.y - LOGICAL_HEIGHT / 2));
  const startCameraX = Math.max(0, Math.min(totalCols * TILE - 448, player.x - 224));

  const worldState: WorldState = {
    partition: 'odyssey',
    totalStagesInPartition: 3,
    status: 'playing',
    levelIndex: 1,
    worldLabel,
    stageTitle,
    biomeId,
    totalCols,
    worldRows,
    score: carry.score,
    highScore: carry.highScore,
    coins: carry.coins,
    lives: carry.lives,
    timeLeft: 400,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: startCameraX,
    cameraY: startCameraY,
    screenShake: 0,
    checkpointX: carry.checkpointX ?? null,
    checkpointY: carry.checkpointY ?? null,
    player,
    blocks: ctx.blocks,
    blockGrid: ctx.blockGrid,
    pipes: ctx.pipes,
    platforms: ctx.platforms,
    springs: ctx.springs,
    checkpoint,
    enemies: ctx.enemies,
    boss: null,
    bossFires: [],
    powerups: [],
    yoshis: [],
    dragonCoins: [],
    dragonCoinsCollected: 0,
    berries: [],
    fireballs: [],
    coinsList: ctx.coins,
    particles: [],
    floatingTexts: [],
    sceneries,
    lavaCols: ctx.lavaCols,
    flagpole,
    goalTape: null,
    prevJumpHeld: false,
    prevFireHeld: false,
    prevSpinHeld: false,
    doubleJumpAssist: carry.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
    // Odisea Abierta
    odysseyMode: 'chrono_canyon',
    timeScale: 1.0,
    objective: 'core_breaker',
    pickups: [],
    gemsNeeded: 0,
    gemsCollected: 0,
    brawlTargetsTotal: 3,
    brawlTargetsDefeated: 0,
  };

  return applyStageObjective(worldState);
}

// ============================================================================
// 3. O-3: CRÁTER DEL TITÁN (odysseyMode: 'titan_crater')
// ============================================================================
export function buildOdysseyTitanCrater(carryInput?: CarryState | PowerState): WorldState {
  const carry = normalizeCarry(carryInput);
  const totalCols = 64;
  const worldRows = 26;
  const biomeId = 'ember';
  const biome = BIOMES[biomeId];
  const worldLabel = getWorldLabel(2, 'odyssey');
  const stageTitle = 'CRÁTER DEL TITÁN';

  const ctx: BuilderCtx = {
    levelIndex: 2,
    designIndex: 2,
    worldNum: 1,
    stageNum: 3,
    difficulty: 1.5,
    nextId: 1,
    blocks: [],
    blockGrid: new Map<number, Block>(),
    pipes: [],
    platforms: [],
    springs: [],
    enemies: [],
    coins: [],
    pits: new Set<number>(),
    lavaCols: new Set<number>(),
    isFortress: true,
    isUnderground: biome.underground,
    enemySeq: 0,
    partition: 'odyssey',
    worldRows,
  };

  // 1. Suelo volcánico sólido en row 23..25 para cols 0..63
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, 23, 'ground_top');
    putBlock(ctx, c, 24, 'ground_deep');
    putBlock(ctx, c, 25, 'ground_deep');
  }

  // Paredes protectoras en los bordes
  for (let r = 0; r <= 22; r++) {
    putBlock(ctx, 0, r, 'hard');
    putBlock(ctx, 1, r, 'hard');
    putBlock(ctx, 62, r, 'hard');
    putBlock(ctx, 63, r, 'hard');
  }

  // 2. Spawn en el Flanco Oeste seguro (col 6, row 21)
  const player = createInitialPlayer(carry.powerState, false);
  player.x = 6 * TILE;
  player.y = 23 * TILE - player.height;
  player.mechaSuit = true;
  player.jetpackFuel = 100;
  player.jetpackMaxFuel = 100;

  // Bloques de apoyo e incentivo en el flanco oeste
  putBlock(ctx, 4, 19, 'question', 'powerup');
  addCoinArc(ctx, 3, 5, 17);

  // --------------------------------------------------------------------------
  // TORRE DE FLANQUEO IZQUIERDA (cols 8..18, row 15)
  // --------------------------------------------------------------------------
  for (let c = 8; c <= 18; c++) {
    putBlock(ctx, c, 15, 'hard');
  }
  for (let r = 16; r <= 22; r++) {
    putBlock(ctx, 10, r, 'hard');
    putBlock(ctx, 16, r, 'hard');
  }
  putBlock(ctx, 11, 14, 'brick');
  putBlock(ctx, 15, 14, 'brick');

  // Generador de Escudo 1 (col 13, row 13)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 13 * TILE + 2,
    y: 15 * TILE - 28,
    baseY: 15 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 4,
    maxHp: 4,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // --------------------------------------------------------------------------
  // TORRE DE FLANQUEO DERECHA (cols 46..56, row 15)
  // --------------------------------------------------------------------------
  for (let c = 46; c <= 56; c++) {
    putBlock(ctx, c, 15, 'hard');
  }
  for (let r = 16; r <= 22; r++) {
    putBlock(ctx, 48, r, 'hard');
    putBlock(ctx, 54, r, 'hard');
  }
  putBlock(ctx, 49, 14, 'brick');
  putBlock(ctx, 53, 14, 'brick');

  // Generador de Escudo 2 (col 51, row 13)
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'spiny',
    state: 'walk',
    x: 51 * TILE + 2,
    y: 15 * TILE - 28,
    baseY: 15 * TILE - 28,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    hp: 4,
    maxHp: 4,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'core_crystal',
    shieldFront: false,
  });

  // --------------------------------------------------------------------------
  // PLATAFORMA AÉREA CENTRAL (cols 24..40, row 11)
  // --------------------------------------------------------------------------
  for (let c = 24; c <= 40; c++) {
    putBlock(ctx, c, 11, 'hard');
  }
  putBlock(ctx, 30, 8, 'question', 'star');
  putBlock(ctx, 34, 8, 'question', 'powerup');
  addCoinArc(ctx, 27, 10, 6);

  // --------------------------------------------------------------------------
  // 2 SÚPER-RESORTES PARA SALTAR POR ENCIMA DEL TITÁN
  // --------------------------------------------------------------------------
  ctx.springs.push({
    x: 18 * TILE + 3,
    y: 22 * TILE + 4,
    width: 26,
    height: 28,
    compressTimer: 0,
    kind: 'mushroom',
  });

  ctx.springs.push({
    x: 45 * TILE + 3,
    y: 22 * TILE + 4,
    width: 26,
    height: 28,
    compressTimer: 0,
    kind: 'mushroom',
  });

  // --------------------------------------------------------------------------
  // JEFE COLOSAL "MECHA-TITÁN REX" (col 36, row 20)
  // Distancia > 25 tiles del spawn (spawn en col 6 -> distancia 30 tiles!)
  // --------------------------------------------------------------------------
  ctx.enemies.push({
    id: ctx.nextId++,
    type: 'chuck',
    state: 'walk',
    x: 36 * TILE,
    y: 23 * TILE - 56,
    baseY: 23 * TILE - 56,
    vx: -0.6,
    vy: 0,
    width: 56,
    height: 56,
    facing: -1,
    onGround: true,
    hp: 18,
    maxHp: 18,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    brawlRole: 'titan_boss',
    shieldFront: true,
  });

  // --------------------------------------------------------------------------
  // PORTAL DE VICTORIA (META) — Extremo derecho (col 58, row 21)
  // --------------------------------------------------------------------------
  const flagCol = 58;
  const flagpole: FlagpoleGoal = {
    x: flagCol * TILE + 10,
    y: 17 * TILE,
    width: 12,
    height: 6 * TILE,
    flagY: 17 * TILE + 10,
    castleX: 61 * TILE,
    castleY: 23 * TILE - 128,
  };

  const checkpoint: Checkpoint = {
    x: 10 * TILE + 6,
    y: 21 * TILE,
    width: 20,
    height: 2 * TILE,
    activated: carry.checkpointX != null && carry.checkpointX > 0,
  };

  const sceneries: SceneryProp[] = [];
  for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
    sceneries.push({
      kind: 'banner',
      x: i * 240 + 60,
      y: 2 * TILE,
      scale: (Math.abs(i) % 2) + 1,
      parallax: 0.5,
    });
  }

  const maxCamY = worldRows * TILE - LOGICAL_HEIGHT;
  const startCameraY = Math.max(0, Math.min(maxCamY, player.y - LOGICAL_HEIGHT / 2));
  const startCameraX = Math.max(0, Math.min(totalCols * TILE - 448, player.x - 224));

  const worldState: WorldState = {
    partition: 'odyssey',
    totalStagesInPartition: 3,
    status: 'playing',
    levelIndex: 2,
    worldLabel,
    stageTitle,
    biomeId,
    totalCols,
    worldRows,
    score: carry.score,
    highScore: carry.highScore,
    coins: carry.coins,
    lives: carry.lives,
    timeLeft: 500,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: startCameraX,
    cameraY: startCameraY,
    screenShake: 0,
    checkpointX: carry.checkpointX ?? null,
    checkpointY: carry.checkpointY ?? null,
    player,
    blocks: ctx.blocks,
    blockGrid: ctx.blockGrid,
    pipes: ctx.pipes,
    platforms: ctx.platforms,
    springs: ctx.springs,
    checkpoint,
    enemies: ctx.enemies,
    boss: null,
    bossFires: [],
    powerups: [],
    yoshis: [],
    dragonCoins: [],
    dragonCoinsCollected: 0,
    berries: [],
    fireballs: [],
    coinsList: ctx.coins,
    particles: [],
    floatingTexts: [],
    sceneries,
    lavaCols: ctx.lavaCols,
    flagpole,
    goalTape: null,
    prevJumpHeld: false,
    prevFireHeld: false,
    prevSpinHeld: false,
    doubleJumpAssist: carry.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
    // Odisea Abierta
    odysseyMode: 'titan_crater',
    titanPhase: 1,
    timeScale: 1.0,
    objective: 'core_breaker',
    pickups: [],
    gemsNeeded: 0,
    gemsCollected: 0,
    brawlTargetsTotal: 3,
    brawlTargetsDefeated: 0,
  };

  return applyStageObjective(worldState);
}

// ============================================================================
// CONEXIÓN PRINCIPAL: buildOdysseyStage
// ============================================================================
export function buildOdysseyStage(
  stageIdx: number,
  carryInput?: CarryState | PowerState
): WorldState {
  const clampedIdx = Math.max(0, Math.min(stageIdx, 2));
  switch (clampedIdx) {
    case 0:
      return buildOdysseyCitadel(carryInput);
    case 1:
      return buildOdysseyChronoCanyon(carryInput);
    case 2:
    default:
      return buildOdysseyTitanCrater(carryInput);
  }
}
