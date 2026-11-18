import {
  BIOMES,
  GROUND_ROW,
  MIN_CAMERA_WORLD_X,
  TILE,
  getStageBiome,
  getWorldLabel,
} from '../engine/biomes';
import type {
  ArenaWaveState,
  Block,
  Checkpoint,
  CoinEntity,
  Enemy,
  FlagpoleGoal,
  FortressBoss,
  GamePartition,
  MovingPlatform,
  Pickup,
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
  addEnemy,
  addPlatform,
  addSpring,
} from './builderToolkit';

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

const TOWER_STAGE_TITLES = [
  'Ascenso a las Nubes',
  'Paredes de Magma',
  'Torreón de Engranajes',
  'Guardián de la Cumbre I',
  'Aguja Espiral',
  'Bastión de Resonancia',
  'Chimenea del Caos',
  'Trono del Caos Vertical',
];

const FLIP_STAGE_TITLES = [
  'Nexo Gravitacional',
  'Bóveda Inversa',
  'Cámara Bipolar',
  'Guardián de Dos Mundos',
  'Templo del Espejo Y',
  'Laberinto Polar',
  'Catacumba Antipodal',
  'Trono del Rey Inverso',
];

const STAR_ROAD_STAGE_TITLES = [
  'Coliseo de las Sombras',
  'Arena Bipolar de Magma',
  'Bastión de Tres Fases',
  'Coliseo Supremo del Caos',
  'Corredor Estelar Alfa',
  'Hiperespacio de Engranajes',
  'Pabellón Prismático 3D',
  'Núcleo del Vacío Cósmico',
];

// ============================================================================
// 1. MODO TOWER — LA TORRE INFINITA (8 Niveles: T-1..T-4, A-1..A-4)
// ============================================================================

export function buildTowerWorldState(
  levelIndex: number,
  carryState?: CarryState
): WorldState {
  const clampedIdx = Math.max(0, Math.min(levelIndex, 7));
  const stageNum = (clampedIdx % 4) + 1;
  const worldNum = Math.floor(clampedIdx / 4) + 1;
  const totalCols = 28;
  const worldRows = 72 + (clampedIdx % 4) * 6; // 72, 78, 84, 90
  const biomeId = getStageBiome(clampedIdx, 'tower');
  const biome = BIOMES[biomeId];
  const isFortress = stageNum === 4 || biomeId === 'fortress';
  const worldLabel = getWorldLabel(clampedIdx, 'tower');
  const wrapHorizontal = clampedIdx % 2 === 0;
  const risingHazardSpeed = 0.36 + clampedIdx * 0.025;
  const risingHazardY = (worldRows + 1) * TILE;

  const ctx: BuilderCtx = {
    levelIndex: clampedIdx,
    designIndex: clampedIdx,
    worldNum,
    stageNum,
    difficulty: 1 + clampedIdx * 0.08,
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
    isFortress,
    isUnderground: biome.underground,
    enemySeq: 0,
    partition: 'tower',
    worldRows,
  };

  // 1. Base solid floor at worldRows - 2 and worldRows - 1
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, worldRows - 2, 'ground_top');
    putBlock(ctx, c, worldRows - 1, 'ground_deep');
  }

  // 2. Boundary walls if wrapHorizontal is disabled (even stages T-2, T-4, A-2, A-4)
  if (!wrapHorizontal) {
    for (let r = 0; r <= worldRows - 3; r++) {
      putBlock(ctx, 0, r, 'hard');
      putBlock(ctx, 1, r, 'hard');
      putBlock(ctx, totalCols - 2, r, 'hard');
      putBlock(ctx, totalCols - 1, r, 'hard');
    }
  }

  // 3. Ascending floors (never gap > 3.5 tiles, step by 3 rows from worldRows - 5 to 14)
  const summitRow = 14;
  let floorCount = 0;

  for (let row = worldRows - 5; row >= summitRow + 3; row -= 3) {
    floorCount++;
    const stepType = floorCount % 6;

    if (stepType === 0) {
      // Alternating ON / OFF bridges with switch in center
      for (let c = 4; c <= 10; c++) putBlock(ctx, c, row, 'on_block');
      for (let c = 17; c <= 23; c++) putBlock(ctx, c, row, 'off_block');
      putBlock(ctx, 13, row - 3, 'on_off_switch');
      addCoin(ctx, 13, row - 4.5);
    } else if (stepType === 1) {
      // Left terrace + right terrace
      for (let c = 3; c <= 11; c++) putBlock(ctx, c, row, 'brick');
      for (let c = 16; c <= 24; c++) putBlock(ctx, c, row, 'brick');
      if (wrapHorizontal) {
        putBlock(ctx, 0, row, 'question', 'coin');
        putBlock(ctx, totalCols - 1, row, 'question', 'coin');
      }
      addEnemy(ctx, 7, row - 1, 'koopa_red');
      addCoinArc(ctx, 5, 5, row - 2);
    } else if (stepType === 2) {
      // Center bridge with question block
      for (let c = 8; c <= 19; c++) putBlock(ctx, c, row, 'hard');
      putBlock(ctx, 13, row - 3, 'question', floorCount % 12 === 2 ? 'powerup' : 'coin');
      addEnemy(ctx, 10, row - 1, 'galoomba');
    } else if (stepType === 3) {
      // Trampoline launch floor
      for (let c = 5; c <= 12; c++) putBlock(ctx, c, row, 'brick');
      for (let c = 15; c <= 22; c++) putBlock(ctx, c, row, 'brick');
      addSpring(ctx, 8, row);
      addSpring(ctx, 19, row);
      addCoin(ctx, 8, row - 4);
      addCoin(ctx, 19, row - 4);
    } else if (stepType === 4) {
      // Moving platform swinging horizontally
      addPlatform(ctx, 10, row, 5, 5 * TILE, 0, 0.04, floorCount * 0.5);
      if (!wrapHorizontal) {
        // Inner footholds for wall-jumping
        putBlock(ctx, 2, row, 'hard');
        putBlock(ctx, 3, row, 'brick');
        putBlock(ctx, totalCols - 4, row, 'brick');
        putBlock(ctx, totalCols - 3, row, 'hard');
      }
      addEnemy(ctx, 13, row - 2, 'paratroopa');
    } else {
      // Triple stepping stones
      for (let c = 4; c <= 8; c++) putBlock(ctx, c, row, 'brick');
      for (let c = 11; c <= 16; c++) putBlock(ctx, c, row, 'hard');
      for (let c = 19; c <= 23; c++) putBlock(ctx, c, row, 'brick');
      putBlock(ctx, 6, row - 3, 'question', 'multi_coin');
      addEnemy(ctx, 13, row - 1, 'spiny');
    }
  }

  // 4. Midpoint Checkpoint at Math.floor(worldRows * 0.5)
  const checkpointRow = Math.floor(worldRows * 0.5);
  for (let c = 9; c <= 18; c++) {
    putBlock(ctx, c, checkpointRow, 'hard');
  }
  const alreadyAtCheckpoint = carryState?.checkpointY != null && carryState.checkpointY > 0;
  const checkpoint: Checkpoint = {
    x: 13 * TILE + 6,
    y: (checkpointRow - 1) * TILE,
    width: 20,
    height: 2 * TILE,
    activated: alreadyAtCheckpoint,
  };

  // 5. Vertical shortcut pipe at ~25% height from bottom
  const shortcutRow = Math.floor(worldRows * 0.75);
  for (let c = 4; c <= 8; c++) {
    putBlock(ctx, c, shortcutRow, 'hard');
  }
  ctx.pipes.push({
    x: 5 * TILE,
    y: (shortcutRow - 2) * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpKind: 'subroom',
    warpAccent: 'gold',
    warpLabel: '▼ BONUS',
    subroomTheme: 'coin_vault',
    exitPipeCol: 13,
  });

  // 6. Summit at row 14
  for (let c = 2; c <= totalCols - 3; c++) {
    putBlock(ctx, c, summitRow, 'ground_top');
    putBlock(ctx, c, summitRow + 1, 'ground_deep');
  }

  let flagpole: FlagpoleGoal | null = null;
  let boss: FortressBoss | null = null;

  if (stageNum !== 4) {
    flagpole = {
      x: 13 * TILE + 10,
      y: 5 * TILE,
      width: 12,
      height: 9 * TILE,
      flagY: 5 * TILE + 10,
      castleX: 20 * TILE,
      castleY: summitRow * TILE - 128,
    };
  } else {
    const maxHp = 5 + worldNum * 2;
    boss = {
      x: 14 * TILE,
      y: summitRow * TILE - 60,
      homeX: 14 * TILE,
      vx: -1.1,
      vy: 0,
      width: 56,
      height: 60,
      hp: maxHp,
      maxHp,
      facing: -1,
      onGround: false,
      jumpTimer: 75,
      fireTimer: 95,
      roarTimer: 0,
      hurtFlashTimer: 0,
      defeated: false,
      fallingInLava: false,
      axeX: 22 * TILE,
      axeY: (summitRow - 2) * TILE,
      axeGrabbed: false,
      bridgeCols: [],
      bridgeCollapseTimer: 0,
    };
  }

  // 7. Parallax Sceneries along the vertical tower
  const sceneries: SceneryProp[] = [];
  for (let r = 0; r < worldRows; r += 6) {
    sceneries.push({
      kind: isFortress ? 'banner' : 'cloud',
      x: (r % 12 === 0 ? 2 : 21) * TILE,
      y: r * TILE,
      scale: 1.2,
      parallax: 0.35,
    });
    sceneries.push({
      kind: 'pillar',
      x: (r % 12 === 0 ? 23 : 2) * TILE,
      y: (r + 3) * TILE,
      scale: 1.0,
      parallax: 0.65,
    });
  }

  // 8. Player spawn
  const player = createInitialPlayer(carryState?.powerState ?? 0, false);
  if (alreadyAtCheckpoint && carryState?.checkpointY != null) {
    player.x = carryState.checkpointX ?? 13 * TILE + 5;
    player.y = carryState.checkpointY;
  } else {
    player.x = 13 * TILE + 5;
    player.y = (worldRows - 2) * TILE - player.height;
  }

  const startCameraY = Math.max(0, Math.min(worldRows * TILE - 448, player.y - 200));

  return {
    partition: 'tower',
    totalStagesInPartition: 8,
    status: 'playing',
    levelIndex: clampedIdx,
    worldLabel,
    stageTitle: TOWER_STAGE_TITLES[clampedIdx] ?? `Torre ${worldLabel}`,
    biomeId,
    totalCols,
    worldRows,
    score: carryState?.score ?? 0,
    highScore: carryState?.highScore ?? 0,
    coins: carryState?.coins ?? 0,
    lives: carryState?.lives ?? 3,
    timeLeft: 400,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: 0,
    cameraY: startCameraY,
    wrapHorizontal,
    risingHazardY,
    risingHazardSpeed,
    screenShake: 0,
    checkpointX: carryState?.checkpointX ?? null,
    checkpointY: carryState?.checkpointY ?? null,
    player,
    blocks: ctx.blocks,
    blockGrid: ctx.blockGrid,
    pipes: ctx.pipes,
    platforms: ctx.platforms,
    springs: ctx.springs,
    checkpoint,
    enemies: ctx.enemies,
    boss,
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
    doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
    objective: 'reach',
  };
}

// ============================================================================
// 2. MODO FLIP — TEMPLO INVERSO (8 Niveles: G-1..G-4, I-1..I-4)
// ============================================================================

export function buildFlipWorldState(
  levelIndex: number,
  carryState?: CarryState
): WorldState {
  const clampedIdx = Math.max(0, Math.min(levelIndex, 7));
  const stageNum = (clampedIdx % 4) + 1;
  const worldNum = Math.floor(clampedIdx / 4) + 1;
  const totalCols = 52;
  const worldRows = 26;
  const biomeId = getStageBiome(clampedIdx, 'flip');
  const biome = BIOMES[biomeId];
  const isFortress = stageNum === 4 || biomeId === 'fortress';
  const worldLabel = getWorldLabel(clampedIdx, 'flip');

  const ctx: BuilderCtx = {
    levelIndex: clampedIdx,
    designIndex: clampedIdx,
    worldNum,
    stageNum,
    difficulty: 1 + clampedIdx * 0.08,
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
    isFortress,
    isUnderground: true,
    enemySeq: 0,
    partition: 'flip',
    worldRows,
  };

  // 1. Solid Outer Boundaries
  // Ceiling at row 0 (hard) and row 1 (ground_top for walking inverted!)
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, 0, 'hard');
    putBlock(ctx, c, 1, 'ground_top');
  }
  // Floor at row 24 (ground_top) and row 25 (ground_deep)
  for (let c = 0; c < totalCols; c++) {
    putBlock(ctx, c, 24, 'ground_top');
    putBlock(ctx, c, 25, 'ground_deep');
  }
  // Left and Right walls
  for (let r = 0; r < worldRows; r++) {
    putBlock(ctx, 0, r, 'hard');
    putBlock(ctx, 1, r, 'brick');
    putBlock(ctx, totalCols - 2, r, 'brick');
    putBlock(ctx, totalCols - 1, r, 'hard');
  }

  // 2. Interior Walls dividing Left Wing (cols 2..19), Nexo Central (cols 20..31), Right Wing (cols 32..49)
  // Left dividing wall at col 19 with doorways at rows 4..6, 12..14, 20..22
  for (let r = 2; r <= 23; r++) {
    if ((r >= 4 && r <= 6) || (r >= 12 && r <= 14) || (r >= 20 && r <= 22)) {
      continue;
    }
    putBlock(ctx, 19, r, 'hard');
  }
  // Right dividing wall at col 32 with doorways at rows 4..6, 12..14, 20..22
  for (let r = 2; r <= 23; r++) {
    if ((r >= 4 && r <= 6) || (r >= 12 && r <= 14) || (r >= 20 && r <= 22)) {
      continue;
    }
    putBlock(ctx, 32, r, 'hard');
  }

  // 3. Mid-floor partitions creating multi-level chambers
  // Left chamber mid-floor at row 15 (cols 3..17, open at cols 10..12)
  for (let c = 3; c <= 17; c++) {
    if (c >= 10 && c <= 12) continue;
    putBlock(ctx, c, 15, 'brick');
  }
  // Right chamber mid-floor at row 15 (cols 34..48, open at cols 39..41)
  for (let c = 34; c <= 48; c++) {
    if (c >= 39 && c <= 41) continue;
    putBlock(ctx, c, 15, 'brick');
  }

  // 4. Inverted Ceiling Platforms for gravityDir = -1
  for (let c = 5; c <= 11; c++) putBlock(ctx, c, 3, 'hard');
  for (let c = 13; c <= 17; c++) putBlock(ctx, c, 4, 'brick');
  for (let c = 23; c <= 28; c++) putBlock(ctx, c, 4, 'hard');
  for (let c = 34; c <= 39; c++) putBlock(ctx, c, 3, 'brick');
  for (let c = 41; c <= 47; c++) putBlock(ctx, c, 4, 'hard');

  // Question blocks on ceiling (hit upside down!)
  putBlock(ctx, 8, 3, 'question', 'powerup');
  putBlock(ctx, 25, 4, 'question', 'star');
  putBlock(ctx, 44, 4, 'question', 'multi_coin');

  // 5. ON / OFF Switches & Blocks (Puzzles 100% Solvable with alternate paths)
  // Switch in Central Nexo reachable from ground
  putBlock(ctx, 25, 18, 'on_off_switch');
  // Switch in Left Lower Wing
  putBlock(ctx, 6, 20, 'on_off_switch');
  // Switch in Right Upper Wing
  putBlock(ctx, 44, 8, 'on_off_switch');
  // Inverted switch on the ceiling of Central Nexo
  putBlock(ctx, 26, 3, 'on_off_switch');

  // Alternating ON / OFF gates in doorways
  putBlock(ctx, 19, 13, 'on_block');
  putBlock(ctx, 19, 14, 'on_block');
  putBlock(ctx, 19, 21, 'off_block');

  putBlock(ctx, 32, 13, 'off_block');
  putBlock(ctx, 32, 14, 'off_block');
  putBlock(ctx, 32, 21, 'on_block');

  // Puzzle bridges over pits in wings
  for (let c = 7; c <= 9; c++) putBlock(ctx, c, 15, 'on_block');
  for (let c = 42; c <= 44; c++) putBlock(ctx, c, 15, 'off_block');

  // 6. Internal Paired Warp Pipes (pairPipeIndex: Pipe A <-> Pipe B)
  // Pipe 0 (Left Lower) <-> Pipe 1 (Nexo Upper Balcony)
  ctx.pipes.push({
    x: 4 * TILE,
    y: 22 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpAccent: 'emerald',
    warpLabel: '↩ TUBO B',
    pairPipeIndex: 1,
  });
  // Foothold for Pipe 1 in Nexo Upper Balcony
  for (let c = 21; c <= 24; c++) putBlock(ctx, c, 11, 'hard');
  ctx.pipes.push({
    x: 22 * TILE,
    y: 9 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpAccent: 'emerald',
    warpLabel: '↩ TUBO A',
    pairPipeIndex: 0,
  });

  // Pipe 2 (Right Lower) <-> Pipe 3 (Right Upper Sanctum)
  ctx.pipes.push({
    x: 47 * TILE,
    y: 22 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpAccent: 'violet',
    warpLabel: '↩ TUBO D',
    pairPipeIndex: 3,
  });
  // Foothold for Pipe 3
  for (let c = 35; c <= 38; c++) putBlock(ctx, c, 7, 'hard');
  ctx.pipes.push({
    x: 36 * TILE,
    y: 5 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpAccent: 'violet',
    warpLabel: '↩ TUBO C',
    pairPipeIndex: 2,
  });

  // 7. Central Nexo: Spawn, Checkpoint & Goal
  // Central altar dais at row 23 (cols 21..30)
  for (let c = 21; c <= 30; c++) {
    putBlock(ctx, c, 23, 'hard');
  }

  const alreadyAtCheckpoint = carryState?.checkpointX != null && carryState.checkpointX > 0;
  const checkpoint: Checkpoint = {
    x: 24 * TILE + 6,
    y: 21 * TILE,
    width: 20,
    height: 2 * TILE,
    activated: alreadyAtCheckpoint,
  };

  const flagpole: FlagpoleGoal = {
    x: 28 * TILE + 10,
    y: 14 * TILE,
    width: 12,
    height: 9 * TILE,
    flagY: 14 * TILE + 10,
    castleX: 29 * TILE,
    castleY: 23 * TILE - 128,
  };

  let boss: FortressBoss | null = null;
  if (stageNum === 4) {
    // Upper Sanctum Boss
    const maxHp = 5 + worldNum * 2;
    boss = {
      x: 26 * TILE,
      y: 6 * TILE - 60,
      homeX: 26 * TILE,
      vx: -1.1,
      vy: 0,
      width: 56,
      height: 60,
      hp: maxHp,
      maxHp,
      facing: -1,
      onGround: false,
      jumpTimer: 75,
      fireTimer: 95,
      roarTimer: 0,
      hurtFlashTimer: 0,
      defeated: false,
      fallingInLava: false,
      axeX: 30 * TILE,
      axeY: 5 * TILE,
      axeGrabbed: false,
      bridgeCols: [],
      bridgeCollapseTimer: 0,
    };
  }

  // 8. Gems (Objective: 'collect', 3..5 gems distributed in chambers and ceiling)
  const gemsNeeded = 3 + (clampedIdx % 3); // 3, 4, 5
  const gemPositions: Array<{ col: number; row: number }> = [
    { col: 10, row: 6 }, // Left Upper Chamber
    { col: 42, row: 20 }, // Right Lower Chamber
    { col: 25, row: 3 }, // Nexo Inverted Ceiling
    { col: 45, row: 6 }, // Right Upper Chamber
    { col: 8, row: 20 }, // Left Lower Chamber
  ];

  const pickups: Pickup[] = [];
  for (let i = 0; i < gemsNeeded; i++) {
    const pos = gemPositions[i];
    pickups.push({
      id: ctx.nextId++,
      kind: 'gem',
      x: pos.col * TILE + 6,
      y: pos.row * TILE + 4,
      width: 20,
      height: 24,
      collected: false,
      phase: pos.col * 0.37,
    });
  }

  // 9. Enemies & Springs
  addEnemy(ctx, 8, 14, 'koopa_red');
  addEnemy(ctx, 14, 23, 'galoomba');
  addEnemy(ctx, 38, 14, 'spiny');
  addEnemy(ctx, 44, 23, 'koopa_green');
  addSpring(ctx, 16, 24);
  addSpring(ctx, 35, 24);

  // 10. Sceneries
  const sceneries: SceneryProp[] = [];
  for (let c = 2; c < totalCols - 4; c += 8) {
    sceneries.push({
      kind: 'pillar',
      x: c * TILE + 10,
      y: 8 * TILE,
      scale: 1.4,
      parallax: 0.5,
    });
    sceneries.push({
      kind: 'banner',
      x: (c + 4) * TILE,
      y: 16 * TILE,
      scale: 1.0,
      parallax: 0.7,
    });
  }

  // 11. Player spawn
  const player = createInitialPlayer(carryState?.powerState ?? 0, false);
  if (alreadyAtCheckpoint && carryState?.checkpointX != null) {
    player.x = carryState.checkpointX;
    player.y = carryState.checkpointY ?? 23 * TILE - player.height;
  } else {
    player.x = 25 * TILE + 5;
    player.y = 23 * TILE - player.height;
  }

  const startCameraX = Math.max(0, Math.min(totalCols * TILE - 448, player.x - 224));
  const startCameraY = Math.max(0, Math.min(worldRows * TILE - 448, player.y - 224));

  return {
    partition: 'flip',
    totalStagesInPartition: 8,
    status: 'playing',
    levelIndex: clampedIdx,
    worldLabel,
    stageTitle: FLIP_STAGE_TITLES[clampedIdx] ?? `Templo ${worldLabel}`,
    biomeId,
    totalCols,
    worldRows,
    score: carryState?.score ?? 0,
    highScore: carryState?.highScore ?? 0,
    coins: carryState?.coins ?? 0,
    lives: carryState?.lives ?? 3,
    timeLeft: 400,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: startCameraX,
    cameraY: startCameraY,
    gravityDir: 1,
    onOffState: 'on',
    screenShake: 0,
    checkpointX: carryState?.checkpointX ?? null,
    checkpointY: carryState?.checkpointY ?? null,
    player,
    blocks: ctx.blocks,
    blockGrid: ctx.blockGrid,
    pipes: ctx.pipes,
    platforms: ctx.platforms,
    springs: ctx.springs,
    checkpoint,
    enemies: ctx.enemies,
    boss,
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
    doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
    objective: 'collect',
    pickups,
    gemsNeeded,
    gemsCollected: 0,
  };
}

// ============================================================================
// 3. MODO STAR ROAD — SENDA ESTELAR (8 Niveles: ★-1..★-4 Coliseo, Ω-1..Ω-4 3D)
// ============================================================================

export function buildStarRoadWorldState(
  levelIndex: number,
  carryState?: CarryState
): WorldState {
  const clampedIdx = Math.max(0, Math.min(levelIndex, 7));
  const stageNum = (clampedIdx % 4) + 1;
  const worldNum = Math.floor(clampedIdx / 4) + 1;
  const worldLabel = getWorldLabel(clampedIdx, 'star_road');
  const biomeId = getStageBiome(clampedIdx, 'star_road');
  const biome = BIOMES[biomeId];
  const isFortress = stageNum === 4 || biomeId === 'fortress';

  if (clampedIdx < 4) {
    // ------------------------------------------------------------------------
    // REGION 1: ★-1..★-4 — COLISEO ABISAL POR OLEADAS
    // ------------------------------------------------------------------------
    const totalCols = 26;
    const worldRows = 14;

    const ctx: BuilderCtx = {
      levelIndex: clampedIdx,
      designIndex: clampedIdx,
      worldNum: 1,
      stageNum,
      difficulty: 1.2 + clampedIdx * 0.1,
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
      isFortress,
      isUnderground: true,
      enemySeq: 0,
      partition: 'star_road',
      worldRows,
    };

    // Lateral boundary walls
    for (let r = 0; r < worldRows; r++) {
      putBlock(ctx, 0, r, 'hard');
      putBlock(ctx, totalCols - 1, r, 'hard');
    }

    // Floor at row 12 and 13 with central magma pit (cols 10..15)
    for (let c = 1; c <= 9; c++) {
      putBlock(ctx, c, 12, 'ground_top');
      putBlock(ctx, c, 13, 'ground_deep');
    }
    for (let c = 16; c <= 24; c++) {
      putBlock(ctx, c, 12, 'ground_top');
      putBlock(ctx, c, 13, 'ground_deep');
    }
    for (let c = 10; c <= 15; c++) {
      ctx.lavaCols.add(c);
    }
    // Dynamic ON/OFF bridge covering central magma
    for (let c = 10; c <= 12; c++) putBlock(ctx, c, 12, 'on_block');
    for (let c = 13; c <= 15; c++) putBlock(ctx, c, 12, 'off_block');

    // Terraces
    for (let c = 4; c <= 8; c++) putBlock(ctx, c, 8, 'brick');
    putBlock(ctx, 6, 8, 'question', 'powerup');

    for (let c = 17; c <= 21; c++) putBlock(ctx, c, 8, 'brick');
    putBlock(ctx, 19, 8, 'question', 'star');

    // Central high dais with switch
    for (let c = 11; c <= 14; c++) putBlock(ctx, c, 5, 'hard');
    putBlock(ctx, 12, 4, 'on_off_switch');
    putBlock(ctx, 13, 4, 'on_off_switch');

    // Trampolines
    addSpring(ctx, 5, 12);
    addSpring(ctx, 20, 12);

    // Lateral wave pipes at cols 2 and 22
    ctx.pipes.push({
      x: 2 * TILE,
      y: 10 * TILE,
      width: 2 * TILE,
      height: 2 * TILE,
      hasPiranha: false,
      warpAccent: 'crimson',
      warpLabel: '⚔ OLEADA',
    });
    ctx.pipes.push({
      x: 22 * TILE,
      y: 10 * TILE,
      width: 2 * TILE,
      height: 2 * TILE,
      hasPiranha: false,
      warpAccent: 'crimson',
      warpLabel: '⚔ OLEADA',
    });

    // Wave 1 Enemies
    addEnemy(ctx, 6, 7, 'koopa_red');
    addEnemy(ctx, 19, 7, 'koopa_red');
    addEnemy(ctx, 8, 11, 'galoomba');
    addEnemy(ctx, 17, 11, 'galoomba');
    if (clampedIdx >= 1) addEnemy(ctx, 12, 4, 'paratroopa');
    if (clampedIdx >= 2) addEnemy(ctx, 4, 11, 'spiny');
    if (clampedIdx >= 3) addEnemy(ctx, 21, 11, 'chuck');

    const arenaWave: ArenaWaveState = {
      current: 1,
      total: 3,
      remaining: 4 + clampedIdx,
      cooldown: 30,
    };

    // Central Flagpole Goal (unlocked after waves)
    const flagpole: FlagpoleGoal = {
      x: 13 * TILE + 10,
      y: 3 * TILE,
      width: 12,
      height: 9 * TILE,
      flagY: 3 * TILE + 10,
      castleX: 23 * TILE,
      castleY: 12 * TILE - 128,
    };

    let boss: FortressBoss | null = null;
    if (stageNum === 4) {
      const maxHp = 6;
      boss = {
        x: 13 * TILE,
        y: 12 * TILE - 60,
        homeX: 13 * TILE,
        vx: -1.1,
        vy: 0,
        width: 56,
        height: 60,
        hp: maxHp,
        maxHp,
        facing: -1,
        onGround: false,
        jumpTimer: 60,
        fireTimer: 80,
        roarTimer: 0,
        hurtFlashTimer: 0,
        defeated: false,
        fallingInLava: false,
        axeX: 23 * TILE,
        axeY: 10 * TILE,
        axeGrabbed: false,
        bridgeCols: [],
        bridgeCollapseTimer: 0,
      };
    }

    const sceneries: SceneryProp[] = [];
    for (let c = 2; c < totalCols; c += 6) {
      sceneries.push({
        kind: 'cloud',
        x: c * TILE,
        y: 2 * TILE,
        scale: 1.1,
        parallax: 0.3,
      });
    }

    const player = createInitialPlayer(carryState?.powerState ?? 0, false);
    player.x = 4 * TILE;
    player.y = 12 * TILE - player.height;

    return {
      partition: 'star_road',
      totalStagesInPartition: 8,
      status: 'playing',
      levelIndex: clampedIdx,
      worldLabel,
      stageTitle: STAR_ROAD_STAGE_TITLES[clampedIdx] ?? `Coliseo ${worldLabel}`,
      biomeId,
      totalCols,
      worldRows,
      score: carryState?.score ?? 0,
      highScore: carryState?.highScore ?? 0,
      coins: carryState?.coins ?? 0,
      lives: carryState?.lives ?? 3,
      timeLeft: 400,
      timeTick: 0,
      frameCount: 0,
      statusTimer: 0,
      cameraX: 0,
      cameraY: 0,
      cameraMode: 'side',
      onOffState: 'on',
      arenaWave,
      goalBlockedTimer: 60,
      screenShake: 0,
      checkpointX: null,
      checkpointY: null,
      player,
      blocks: ctx.blocks,
      blockGrid: ctx.blockGrid,
      pipes: ctx.pipes,
      platforms: ctx.platforms,
      springs: ctx.springs,
      checkpoint: null,
      enemies: ctx.enemies,
      boss,
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
      doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
      nextEntityId: ctx.nextId,
      objective: 'reach',
    };
  } else {
    // ------------------------------------------------------------------------
    // REGION 2: Ω-1..Ω-4 — CORREDOR CÓSMICO 3D (cameraMode: 'corridor3d')
    // ------------------------------------------------------------------------
    const totalCols = 110 + (clampedIdx - 4) * 8; // 110, 118, 126, 134
    const worldRows = 14;

    const ctx: BuilderCtx = {
      levelIndex: clampedIdx,
      designIndex: clampedIdx,
      worldNum: 2,
      stageNum,
      difficulty: 1.35 + clampedIdx * 0.08,
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
      isFortress,
      isUnderground: false,
      enemySeq: 0,
      partition: 'star_road',
      worldRows,
    };

    // Build segments of cosmic runway with chasms and ON/OFF bridges
    // Segment 1: spawn runway (cols 0..14)
    for (let c = 0; c <= 14; c++) {
      putBlock(ctx, c, GROUND_ROW, 'ground_top');
      putBlock(ctx, c, GROUND_ROW + 1, 'ground_deep');
    }
    putBlock(ctx, 8, 9, 'question', 'powerup');
    putBlock(ctx, 11, 9, 'on_off_switch');

    // Chasm 1 (cols 15..20): ON/OFF Bridge
    for (let c = 15; c <= 17; c++) putBlock(ctx, c, GROUND_ROW, 'on_block');
    for (let c = 18; c <= 20; c++) putBlock(ctx, c, GROUND_ROW, 'off_block');

    // Segment 2: runway (cols 21..38)
    for (let c = 21; c <= 38; c++) {
      putBlock(ctx, c, GROUND_ROW, 'ground_top');
      putBlock(ctx, c, GROUND_ROW + 1, 'ground_deep');
    }
    addEnemy(ctx, 24, 11, 'bullet_bill');
    addEnemy(ctx, 29, 11, 'koopa_red');
    addEnemy(ctx, 34, 11, 'paratroopa');
    addCoinArc(ctx, 25, 5, 8);

    // Chasm 2 (cols 39..45): Floating moving platform
    addPlatform(ctx, 40, GROUND_ROW, 4, 3 * TILE, 0, 0.04);
    for (let c = 39; c <= 45; c++) ctx.pits.add(c);

    // Segment 3: runway (cols 46..68)
    for (let c = 46; c <= 68; c++) {
      putBlock(ctx, c, GROUND_ROW, 'ground_top');
      putBlock(ctx, c, GROUND_ROW + 1, 'ground_deep');
    }
    putBlock(ctx, 52, 9, 'question', 'star');
    putBlock(ctx, 58, 9, 'on_off_switch');
    addEnemy(ctx, 55, 11, 'bullet_bill');
    addEnemy(ctx, 62, 11, 'chuck');

    // Chasm 3 (cols 69..75): High brick archway + spring
    addSpring(ctx, 67, GROUND_ROW);
    for (let c = 70; c <= 74; c++) putBlock(ctx, c, 7, 'brick');
    putBlock(ctx, 72, 4, 'question', 'feather');
    for (let c = 69; c <= 75; c++) ctx.pits.add(c);

    // Segment 4: runway (cols 76..95)
    for (let c = 76; c <= 95; c++) {
      putBlock(ctx, c, GROUND_ROW, 'ground_top');
      putBlock(ctx, c, GROUND_ROW + 1, 'ground_deep');
    }
    addEnemy(ctx, 80, 11, 'paratroopa');
    addEnemy(ctx, 86, 11, 'bullet_bill');
    addEnemy(ctx, 91, 11, 'spiny');
    addCoinArc(ctx, 82, 6, 7);

    // Chasm 4 (cols 96..101): Alternating ON / OFF bridges
    for (let c = 96; c <= 98; c++) putBlock(ctx, c, GROUND_ROW, 'off_block');
    for (let c = 99; c <= 101; c++) putBlock(ctx, c, GROUND_ROW, 'on_block');

    // Segment 5: goal runway (cols 102..totalCols)
    for (let c = 102; c < totalCols; c++) {
      putBlock(ctx, c, GROUND_ROW, 'ground_top');
      putBlock(ctx, c, GROUND_ROW + 1, 'ground_deep');
    }

    // Midpoint Checkpoint at ~50%
    const checkpointCol = Math.floor(totalCols * 0.5);
    const alreadyAtCheckpoint = carryState?.checkpointX != null && carryState.checkpointX > 0;
    const checkpoint: Checkpoint = {
      x: checkpointCol * TILE + 6,
      y: (GROUND_ROW - 2) * TILE,
      width: 20,
      height: 2 * TILE,
      activated: alreadyAtCheckpoint,
    };

    let flagpole: FlagpoleGoal | null = null;
    let boss: FortressBoss | null = null;

    if (stageNum !== 4) {
      const flagCol = totalCols - 9;
      flagpole = {
        x: flagCol * TILE + 10,
        y: 3 * TILE,
        width: 12,
        height: 9 * TILE,
        flagY: 3 * TILE + 10,
        castleX: (flagCol + 3.5) * TILE,
        castleY: GROUND_ROW * TILE - 128,
      };
    } else {
      const maxHp = 7;
      boss = {
        x: (totalCols - 14) * TILE,
        y: GROUND_ROW * TILE - 60,
        homeX: (totalCols - 14) * TILE,
        vx: -1.1,
        vy: 0,
        width: 56,
        height: 60,
        hp: maxHp,
        maxHp,
        facing: -1,
        onGround: false,
        jumpTimer: 75,
        fireTimer: 95,
        roarTimer: 0,
        hurtFlashTimer: 0,
        defeated: false,
        fallingInLava: false,
        axeX: (totalCols - 7) * TILE,
        axeY: (GROUND_ROW - 2) * TILE,
        axeGrabbed: false,
        bridgeCols: [],
        bridgeCollapseTimer: 0,
      };
    }

    const sceneries: SceneryProp[] = [];
    for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
      sceneries.push({
        kind: 'cloud',
        x: i * 220 + 40,
        y: 20 + (Math.abs(i) % 3) * 20,
        scale: 1.2,
        parallax: 0.3,
      });
      sceneries.push({
        kind: 'hill',
        x: i * 260 + 20,
        y: GROUND_ROW * TILE,
        scale: 1.0,
        parallax: 0.6,
      });
    }

    const player = createInitialPlayer(carryState?.powerState ?? 0, false);
    if (alreadyAtCheckpoint && carryState?.checkpointX != null) {
      player.x = carryState.checkpointX;
      player.y = GROUND_ROW * TILE - player.height;
    } else {
      player.x = 3 * TILE;
      player.y = GROUND_ROW * TILE - player.height;
    }

    const startCameraX = Math.max(MIN_CAMERA_WORLD_X, player.x - 304);

    return {
      partition: 'star_road',
      totalStagesInPartition: 8,
      status: 'playing',
      levelIndex: clampedIdx,
      worldLabel,
      stageTitle: STAR_ROAD_STAGE_TITLES[clampedIdx] ?? `Corredor ${worldLabel}`,
      biomeId,
      totalCols,
      worldRows,
      score: carryState?.score ?? 0,
      highScore: carryState?.highScore ?? 0,
      coins: carryState?.coins ?? 0,
      lives: carryState?.lives ?? 3,
      timeLeft: 400,
      timeTick: 0,
      frameCount: 0,
      statusTimer: 0,
      cameraX: startCameraX,
      cameraY: 0,
      cameraMode: 'corridor3d',
      onOffState: 'on',
      screenShake: 0,
      checkpointX: carryState?.checkpointX ?? null,
      checkpointY: carryState?.checkpointY ?? null,
      player,
      blocks: ctx.blocks,
      blockGrid: ctx.blockGrid,
      pipes: ctx.pipes,
      platforms: ctx.platforms,
      springs: ctx.springs,
      checkpoint,
      enemies: ctx.enemies,
      boss,
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
      doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
      nextEntityId: ctx.nextId,
      objective: 'reach',
    };
  }
}
