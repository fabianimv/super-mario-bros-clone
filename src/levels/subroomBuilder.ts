import { BIOMES, GROUND_ROW, LOGICAL_HEIGHT, MIN_CAMERA_WORLD_X, STAGES_PER_WORLD, TILE } from '../engine/biomes';
import type {
  Block,
  BlockType,
  CoinEntity,
  FloatingText,
  GameEvent,
  LowGravZone,
  MainStageSnapshot,
  Pipe,
  PowerState,
  Spring,
  SubroomTheme,
  WorldState,
} from '../engine/types';

const key = (col: number, row: number): number => row * 1024 + col;

function putSubroomBlock(
  world: WorldState,
  col: number,
  row: number,
  type: BlockType,
  content: Block['content'] = null,
  coinsRemaining = 0
): Block {
  const existing = world.blockGrid.get(key(col, row));
  if (existing) {
    const idx = world.blocks.indexOf(existing);
    if (idx !== -1) world.blocks.splice(idx, 1);
  }
  const b: Block = {
    id: world.nextEntityId++,
    col,
    row,
    x: col * TILE,
    y: row * TILE,
    baseY: row * TILE,
    width: TILE,
    height: TILE,
    type,
    content,
    coinsRemaining,
    bounceY: 0,
    bounceVel: 0,
    spinTimer: 0,
  };
  world.blocks.push(b);
  world.blockGrid.set(key(col, row), b);
  return b;
}

function addSubroomCoin(world: WorldState, col: number, row: number): void {
  world.coinsList.push({
    x: col * TILE + 7,
    y: row * TILE + 5,
    baseY: row * TILE + 5,
    width: 18,
    height: 22,
    collected: false,
    phase: col * 0.45,
  });
}

function resetSubroomWorld(world: WorldState): void {
  world.totalCols = 28;
  world.worldRows = 14;
  world.cameraX = 0;
  world.cameraY = 0;
  world.blocks = [];
  world.blockGrid = new Map<number, Block>();
  world.pipes = [];
  world.platforms = [];
  world.springs = [];
  world.checkpoint = null;
  world.checkpointX = null;
  world.checkpointY = null;
  world.enemies = [];
  world.boss = null;
  world.bossFires = [];
  world.powerups = [];
  world.yoshis = [];
  world.dragonCoins = [];
  world.berries = [];
  world.fireballs = [];
  world.coinsList = [];
  world.particles = [];
  world.floatingTexts = [];
  world.sceneries = [];
  world.lavaCols = new Set<number>();
  world.flagpole = null;
  world.goalTape = null;
  world.mechanic = 'none';
  world.wind = null;
  world.icicles = [];
  world.lowGravZones = [];
  world.crumbled = [];
  world.lavaTide = false;
  world.objective = 'reach';
  world.pickups = [];
  world.gemsNeeded = undefined;
  world.gemsCollected = undefined;
  world.chase = null;
  world.wagerAltars = undefined;
  world.fortuneTarget = undefined;
  world.recoverTarget = undefined;
  world.echo = null;
  world.echoTrail = undefined;
  world.shafts = undefined;
  world.risingHazardY = undefined;
  world.risingHazardSpeed = undefined;
  world.wrapHorizontal = false;
  world.gravityDir = undefined;
  world.onOffState = undefined;
  world.cameraMode = 'side';
  world.arenaWave = undefined;
}

/** Tema 1: Bóveda de Monedas (cavernoso, 24+ monedas, multi_coin, powerup, salida) */
export function buildCoinVault(world: WorldState): void {
  world.biomeId = 'cavern';

  // Piso sólido
  for (let c = 0; c < 28; c++) {
    putSubroomBlock(world, c, GROUND_ROW, 'ground_top');
    putSubroomBlock(world, c, GROUND_ROW + 1, 'ground_deep');
  }

  // Techo y paredes de roca
  for (let c = 0; c < 28; c++) {
    putSubroomBlock(world, c, 0, 'hard');
    putSubroomBlock(world, c, 1, 'hard');
  }
  for (let r = 2; r < GROUND_ROW; r++) {
    putSubroomBlock(world, 0, r, 'hard');
    putSubroomBlock(world, 27, r, 'hard');
  }

  // Tubería de entrada en col 3
  world.pipes.push({
    x: 3 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
  });

  // Tubería esmeralda de retorno en col 23
  world.pipes.push({
    x: 23 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpKind: 'return',
    warpAccent: 'emerald',
    warpLabel: '↩ SALIDA',
  });

  // Bloques de tesoro
  putSubroomBlock(world, 8, 7, 'question', 'multi_coin', 10);
  putSubroomBlock(world, 10, 7, 'question', world.partition === 'smw' ? 'feather' : 'powerup');
  putSubroomBlock(world, 12, 7, 'brick', 'coin', 1);
  putSubroomBlock(world, 14, 7, 'brick', 'coin', 1);
  putSubroomBlock(world, 16, 7, 'question', 'powerup');
  putSubroomBlock(world, 18, 7, 'question', 'multi_coin', 8);

  // 28 Monedas en dos niveles (arcos bajo y sobre bloques)
  for (let c = 6; c <= 12; c++) {
    addSubroomCoin(world, c, 9);
    addSubroomCoin(world, c, 5);
  }
  for (let c = 14; c <= 20; c++) {
    addSubroomCoin(world, c, 9);
    addSubroomCoin(world, c, 5);
  }
}

/** Tema 2: Santuario Estelar (starfield, baja gravedad, star, one_up, 20+ monedas, salida) */
export function buildStarSanctuary(world: WorldState): void {
  world.biomeId = 'starfield';
  world.mechanic = 'lowgrav';
  world.lowGravZones = [{ x0: 0, x1: 28 * TILE }];

  // Piso sólido
  for (let c = 0; c < 28; c++) {
    putSubroomBlock(world, c, GROUND_ROW, 'ground_top');
    putSubroomBlock(world, c, GROUND_ROW + 1, 'ground_deep');
  }
  for (let r = 2; r < GROUND_ROW; r++) {
    putSubroomBlock(world, 0, r, 'hard');
    putSubroomBlock(world, 27, r, 'hard');
  }

  // Tubos entrada y salida
  world.pipes.push({
    x: 3 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
  });

  world.pipes.push({
    x: 23 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpKind: 'return',
    warpAccent: 'emerald',
    warpLabel: '↩ SALIDA',
  });

  // Plataformas flotantes en 3 pisos
  for (let c = 6; c <= 9; c++) putSubroomBlock(world, c, 9, 'hard');
  for (let c = 17; c <= 20; c++) putSubroomBlock(world, c, 9, 'hard');
  for (let c = 11; c <= 15; c++) putSubroomBlock(world, c, 7, 'hard');

  // Bloques especiales (con >= 2 tiles libres debajo para golpearlos desde row 7)
  putSubroomBlock(world, 12, 4, 'question', 'star');
  putSubroomBlock(world, 14, 4, 'question', 'one_up');
  putSubroomBlock(world, 13, 3, 'question', 'powerup');

  // Monedas repartidas por el santuario (22 monedas)
  for (let c = 6; c <= 9; c++) addSubroomCoin(world, c, 8);
  for (let c = 17; c <= 20; c++) addSubroomCoin(world, c, 8);
  addSubroomCoin(world, 11, 5);
  addSubroomCoin(world, 15, 5);
  for (let c = 12; c <= 14; c++) addSubroomCoin(world, c, 1);
  addSubroomCoin(world, 7, 10);
  addSubroomCoin(world, 8, 10);
  addSubroomCoin(world, 18, 10);
  addSubroomCoin(world, 19, 10);
  addSubroomCoin(world, 10, 8);
  addSubroomCoin(world, 16, 8);
}

/** Tema 3: Cielo de Nubes (cloudland, plataformas elevadas, hongos saltarines, arcoíris monedas, yoshi_egg/one_up, caída no letal) */
export function buildCloudHeaven(world: WorldState): void {
  world.biomeId = 'cloudland';

  // NO hay piso sólido en row 12/13: caer abajo dispara retorno vivo vía physics!
  // Plataforma 1 (entrada): cols 2..5 en row 9
  for (let c = 2; c <= 5; c++) putSubroomBlock(world, c, 9, 'hard');
  world.pipes.push({
    x: 3 * TILE,
    y: 7 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
  });

  // Hongo trampolín 1
  putSubroomBlock(world, 7, 9, 'hard');
  world.springs.push({
    x: 7 * TILE,
    y: 8 * TILE,
    width: TILE,
    height: TILE,
    compressTimer: 0,
    kind: 'mushroom',
  });

  // Plataforma media: cols 10..15 en row 7
  for (let c = 10; c <= 15; c++) putSubroomBlock(world, c, 7, 'hard');
  putSubroomBlock(world, 12, 4, 'question', world.partition === 'smw' ? 'yoshi_egg' : 'one_up');
  putSubroomBlock(world, 13, 4, 'question', world.partition === 'smw' ? 'feather' : 'powerup');

  // Hongo trampolín 2
  putSubroomBlock(world, 17, 8, 'hard');
  world.springs.push({
    x: 17 * TILE,
    y: 7 * TILE,
    width: TILE,
    height: TILE,
    compressTimer: 0,
    kind: 'mushroom',
  });

  // Plataforma final (salida): cols 21..25 en row 8
  for (let c = 21; c <= 25; c++) putSubroomBlock(world, c, 8, 'hard');
  world.pipes.push({
    x: 23 * TILE,
    y: 6 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpKind: 'return',
    warpAccent: 'emerald',
    warpLabel: '↩ SALIDA',
  });

  // Arcoíris de monedas (24 monedas)
  const arc1 = [
    { c: 6, r: 7 },
    { c: 7, r: 5 },
    { c: 8, r: 4 },
    { c: 9, r: 5 },
    { c: 10, r: 6 },
  ];
  for (const pt of arc1) addSubroomCoin(world, pt.c, pt.r);

  for (let c = 11; c <= 14; c++) {
    addSubroomCoin(world, c, 3);
    addSubroomCoin(world, c, 6);
  }

  const arc2 = [
    { c: 16, r: 6 },
    { c: 17, r: 4 },
    { c: 18, r: 3 },
    { c: 19, r: 4 },
    { c: 20, r: 5 },
  ];
  for (const pt of arc2) addSubroomCoin(world, pt.c, pt.r);

  for (let c = 21; c <= 25; c++) {
    addSubroomCoin(world, c, 7);
  }
}

/** Tema 4: Sala Warp Zone estilo SMB 1-2 con letreros y 4 tubos */
export function buildWarpChamber(world: WorldState): void {
  world.biomeId = 'cavern';

  // Techo bajo y paredes
  for (let c = 0; c < 28; c++) {
    putSubroomBlock(world, c, 0, 'hard');
    putSubroomBlock(world, c, 1, 'hard');
    putSubroomBlock(world, c, 2, 'hard');
  }
  for (let r = 3; r < GROUND_ROW; r++) {
    putSubroomBlock(world, 0, r, 'hard');
    putSubroomBlock(world, 27, r, 'hard');
  }

  // Piso firme
  for (let c = 0; c < 28; c++) {
    putSubroomBlock(world, c, GROUND_ROW, 'ground_top');
    putSubroomBlock(world, c, GROUND_ROW + 1, 'ground_deep');
  }

  // Cartel estilo SMB 1-2
  world.floatingTexts.push({
    x: 7 * TILE,
    y: 5 * TILE,
    text: '¡ZONA WARP SECRETA!',
    color: '#fde047',
    life: 999999,
    maxLife: 999999,
  });

  // Cálculo de saltos de mundo
  const currentLvl = world.returnSnapshot ? world.levelIndex : 1;
  const currentWorldNum = Math.floor(currentLvl / STAGES_PER_WORLD) + 1;
  const nextW = currentWorldNum + 1;
  const nextW2 = currentWorldNum + 2;
  const targetLvl1 = Math.min((nextW - 1) * STAGES_PER_WORLD, world.totalStagesInPartition - 1);
  const targetLvl2 = Math.min((nextW2 - 1) * STAGES_PER_WORLD, world.totalStagesInPartition - 1);

  // Tubo entrada en col 3
  world.pipes.push({
    x: 3 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
  });

  // Tubo 1 (col 7): dorado 'warp_zone' -> mundo +1
  world.pipes.push({
    x: 7 * TILE,
    y: 9 * TILE,
    width: 2 * TILE,
    height: 3 * TILE,
    hasPiranha: false,
    warpKind: 'warp_zone',
    warpAccent: 'gold',
    warpLabel: `MUNDO ${nextW}`,
    warpTargetLevel: targetLvl1,
  });

  // Tubo 2 (col 12): morado 'warp_zone' -> mundo +2
  world.pipes.push({
    x: 12 * TILE,
    y: 9 * TILE,
    width: 2 * TILE,
    height: 3 * TILE,
    hasPiranha: false,
    warpKind: 'warp_zone',
    warpAccent: 'violet',
    warpLabel: `MUNDO ${nextW2}`,
    warpTargetLevel: targetLvl2,
  });

  // Tubo 3 (col 17): carmesí 'secret_world' -> star_road
  world.pipes.push({
    x: 17 * TILE,
    y: 9 * TILE,
    width: 2 * TILE,
    height: 3 * TILE,
    hasPiranha: false,
    warpKind: 'secret_world',
    warpAccent: 'crimson',
    warpLabel: '★ SENDA',
    warpTargetPartition: 'star_road',
    warpTargetLevel: 0,
  });

  // Tubo 4 (col 23): esmeralda 'return' -> vuelve a la etapa
  world.pipes.push({
    x: 23 * TILE,
    y: 10 * TILE,
    width: 2 * TILE,
    height: 2 * TILE,
    hasPiranha: false,
    warpKind: 'return',
    warpAccent: 'emerald',
    warpLabel: '↩ SALIDA',
  });
}

/** Entra a la sub-sala conectada al tubo, guardando el snapshot de la etapa principal */
export function enterPipeSubroom(world: WorldState, pipe: Pipe, events: GameEvent[]): void {
  const exitCol = pipe.exitPipeCol ?? (Math.floor(pipe.x / TILE) + 12);
  const exitPipe = world.pipes.find((p) => Math.abs(Math.floor(p.x / TILE) - exitCol) <= 2)
    ?? world.pipes.find((p) => p.x > pipe.x);

  const exitX = exitPipe
    ? exitPipe.x + (exitPipe.width - world.player.width) / 2
    : exitCol * TILE;
  const exitY = exitPipe
    ? exitPipe.y - world.player.height
    : GROUND_ROW * TILE - world.player.height;

  world.returnSnapshot = {
    worldLabel: world.worldLabel,
    stageTitle: world.stageTitle,
    biomeId: world.biomeId,
    totalCols: world.totalCols,
    worldRows: world.worldRows,
    cameraX: world.cameraX,
    cameraY: world.cameraY,
    blocks: [...world.blocks],
    blockGrid: new Map(world.blockGrid),
    pipes: [...world.pipes],
    platforms: [...world.platforms],
    springs: [...world.springs],
    checkpoint: world.checkpoint,
    enemies: [...world.enemies],
    boss: world.boss,
    powerups: [...world.powerups],
    yoshis: [...world.yoshis],
    dragonCoins: [...world.dragonCoins],
    berries: [...world.berries],
    coinsList: [...world.coinsList],
    sceneries: [...world.sceneries],
    lavaCols: new Set(world.lavaCols),
    flagpole: world.flagpole,
    goalTape: world.goalTape,
    mechanic: world.mechanic,
    wind: world.wind,
    icicles: world.icicles ? [...world.icicles] : undefined,
    lowGravZones: world.lowGravZones ? [...world.lowGravZones] : undefined,
    crumbled: world.crumbled ? [...world.crumbled] : undefined,
    lavaTide: world.lavaTide,
    objective: world.objective,
    pickups: world.pickups ? [...world.pickups] : undefined,
    gemsNeeded: world.gemsNeeded,
    gemsCollected: world.gemsCollected,
    chase: world.chase,
    hasKey: world.hasKey,
    vaultOpened: world.vaultOpened,
    wagerAltars: world.wagerAltars,
    fortuneTarget: world.fortuneTarget,
    recoverTarget: world.recoverTarget,
    echo: world.echo,
    echoTrail: world.echoTrail,
    shafts: world.shafts,
    risingHazardY: world.risingHazardY,
    risingHazardSpeed: world.risingHazardSpeed,
    wrapHorizontal: world.wrapHorizontal,
    gravityDir: world.gravityDir,
    onOffState: world.onOffState,
    cameraMode: world.cameraMode,
    arenaWave: world.arenaWave,
    exitX,
    exitY,
  };

  const theme: SubroomTheme = pipe.warpKind === 'warp_zone'
    ? 'warp_chamber'
    : (pipe.subroomTheme ?? 'coin_vault');

  world.subArea = pipe.warpKind === 'warp_zone' ? 'warp_zone' : 'subroom';
  resetSubroomWorld(world);

  if (theme === 'warp_chamber') {
    buildWarpChamber(world);
  } else if (theme === 'star_sanctuary') {
    buildStarSanctuary(world);
  } else if (theme === 'cloud_heaven') {
    buildCloudHeaven(world);
  } else {
    buildCoinVault(world);
  }

  // Tubo de entrada en col 3
  const entryPipe = world.pipes.find((p) => Math.abs(p.x - 3 * TILE) <= 16) ?? world.pipes[0];
  if (entryPipe) {
    world.player.x = entryPipe.x + (entryPipe.width - world.player.width) / 2;
    world.player.y = entryPipe.y - world.player.height + 28;
    world.activeWarpPipe = entryPipe;
  } else {
    world.player.x = 3 * TILE;
    world.player.y = (GROUND_ROW - 2) * TILE;
    world.activeWarpPipe = null;
  }

  world.player.vx = 0;
  world.player.vy = 0;
  world.player.onGround = true;
  world.player.crouching = false;
  world.status = 'pipe_exit';
  world.statusTimer = 24;

  const bgm = BIOMES[world.biomeId]?.bgm ?? 'underground';
  events.push({ type: 'bgm', track: bgm });
  events.push({ type: 'sfx', id: 'pipe_warp' });
}

/** Sale de la sub-sala y regresa al nivel principal restaurando snapshot y conservando ganancias */
export function exitPipeSubroom(world: WorldState, events: GameEvent[]): void {
  const snap = world.returnSnapshot;
  if (!snap) {
    world.status = 'playing';
    world.subArea = null;
    return;
  }

  // Conservar estadísticas y ganancias obtenidas en la sub-sala
  const carryScore = world.score;
  const carryHighScore = world.highScore;
  const carryCoins = world.coins;
  const carryLives = world.lives;
  const carryTimeLeft = world.timeLeft;
  const carryPowerState = world.player.powerState;
  const carryMountedYoshi = world.player.mountedYoshi;
  const carryDragonCoins = world.dragonCoinsCollected;
  const carryHasKey = world.hasKey;
  const carryGems = world.gemsCollected;
  const carryWarpTo = world.warpTo;

  // Restaurar geometría y entidades del snapshot
  world.worldLabel = snap.worldLabel;
  world.stageTitle = snap.stageTitle;
  world.biomeId = snap.biomeId;
  world.totalCols = snap.totalCols;
  world.worldRows = snap.worldRows;
  world.cameraX = snap.cameraX;
  world.cameraY = snap.cameraY;
  world.blocks = snap.blocks;
  world.blockGrid = snap.blockGrid;
  world.pipes = snap.pipes;
  world.platforms = snap.platforms;
  world.springs = snap.springs;
  world.checkpoint = snap.checkpoint;
  world.enemies = snap.enemies;
  world.boss = snap.boss;
  world.powerups = snap.powerups;
  world.yoshis = snap.yoshis;
  world.dragonCoins = snap.dragonCoins;
  world.berries = snap.berries;
  world.coinsList = snap.coinsList;
  world.sceneries = snap.sceneries;
  world.lavaCols = snap.lavaCols;
  world.flagpole = snap.flagpole;
  world.goalTape = snap.goalTape;
  world.mechanic = snap.mechanic;
  world.wind = snap.wind;
  world.icicles = snap.icicles;
  world.lowGravZones = snap.lowGravZones;
  world.crumbled = snap.crumbled;
  world.lavaTide = snap.lavaTide;
  world.objective = snap.objective;
  world.pickups = snap.pickups;
  world.gemsNeeded = snap.gemsNeeded;
  world.chase = snap.chase;
  world.vaultOpened = snap.vaultOpened;
  world.wagerAltars = snap.wagerAltars;
  world.fortuneTarget = snap.fortuneTarget;
  world.recoverTarget = snap.recoverTarget;
  world.echo = snap.echo;
  world.echoTrail = snap.echoTrail;
  world.shafts = snap.shafts;
  world.risingHazardY = snap.risingHazardY;
  world.risingHazardSpeed = snap.risingHazardSpeed;
  world.wrapHorizontal = snap.wrapHorizontal;
  world.gravityDir = snap.gravityDir;
  world.onOffState = snap.onOffState;
  world.cameraMode = snap.cameraMode;
  world.arenaWave = snap.arenaWave;

  // Aplicar ganancias
  world.score = carryScore;
  world.highScore = carryHighScore;
  world.coins = carryCoins;
  world.lives = carryLives;
  world.timeLeft = carryTimeLeft;
  world.player.powerState = carryPowerState;
  world.player.mountedYoshi = carryMountedYoshi;
  world.dragonCoinsCollected = carryDragonCoins;
  world.hasKey = carryHasKey;
  world.gemsCollected = carryGems;
  world.warpTo = carryWarpTo;

  // Posicionar al jugador en el tubo de salida
  const exitPipe = world.pipes.find(
    (p) => Math.abs(p.x + (p.width - world.player.width) / 2 - snap.exitX) <= 16
  ) ?? world.pipes.find((p) => p.x <= snap.exitX && p.x + p.width >= snap.exitX);

  world.player.x = snap.exitX;
  if (exitPipe) {
    world.player.y = exitPipe.y - world.player.height + 28;
    world.activeWarpPipe = exitPipe;
  } else {
    world.player.y = snap.exitY;
    world.activeWarpPipe = null;
  }

  world.player.vx = 0;
  world.player.vy = 0;
  world.player.onGround = true;
  world.player.crouching = false;
  world.cameraX = Math.max(MIN_CAMERA_WORLD_X, world.player.x - 304);
  const worldRows = world.worldRows ?? 14;
  if (worldRows > 14) {
    const maxCamY = worldRows * TILE - LOGICAL_HEIGHT;
    world.cameraY = Math.max(
      0,
      Math.min(maxCamY, world.player.y + world.player.height / 2 - LOGICAL_HEIGHT / 2)
    );
  } else {
    world.cameraY = snap.cameraY ?? 0;
  }
  if (world.risingHazardY != null) {
    world.risingHazardY = Math.max(world.risingHazardY, world.player.y + 8 * TILE);
  }
  world.status = 'pipe_exit';
  world.statusTimer = 24;
  world.subArea = null;
  world.returnSnapshot = null;

  const mainBgm = BIOMES[snap.biomeId]?.bgm ?? 'overworld';
  events.push({ type: 'bgm', track: mainBgm });
  events.push({ type: 'sfx', id: 'pipe_warp' });
}
