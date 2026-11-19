import {
  BIOMES,
  GROUND_ROW,
  MIN_CAMERA_WORLD_X,
  SMW_TOTAL_LEVELS,
  STAGES_PER_WORLD,
  TILE,
  getStageBiome,
  getWorldLabel,
} from '../engine/biomes';
import type {
  BerryEntity,
  Block,
  BlockContent,
  BlockType,
  Checkpoint,
  CoinEntity,
  DragonCoin,
  Enemy,
  EnemyType,
  FortressBoss,
  GoalTape,
  MovingPlatform,
  Pipe,
  PowerState,
  SceneryProp,
  Spring,
  WorldState,
} from '../engine/types';
import { createInitialPlayer, gridKey } from './builderToolkit';

// ============================================================================
// STAGE TITLES & WORLD NAMES (Preserved Public Exports)
// ============================================================================
export const SMW_STAGE_TITLES: string[] = [
  // Mundo 1: Isla de Yoshi (Y-1 .. Y-4)
  'Casa de Yoshi',
  'Colinas Baya Dulce',
  'Cumbres Pluma Dorada',
  'Castillo de Iggy',
  // Mundo 2: Llanura Rosquilla (D-1 .. D-4)
  'Pradera del Vuelo',
  'Gruta Rosquilla',
  'Puentes de Mantequilla',
  'Fortaleza de Morton',
  // Mundo 3: Domo Vainilla (V-1 .. V-4)
  'Caverna Espejismo',
  'Lago Subterráneo',
  'Ascenso de Cuarzo',
  'Bastión de Lemmy',
  // Mundo 4: Bosque Ilusión (B-1 .. B-4)
  'Sendero de las Copas',
  'Laberinto Giratorio',
  'Vuelo Estelar',
  'Torreón de Ludwig',
  // Mundo 5: Valle de Koopa (K-1 .. K-4)
  'Cañón Balas Bill',
  'Catacumbas del Valle',
  'Asalto Aéreo Final',
  'Gran Castillo Koopa',
];

export const SMW_WORLD_NAMES: string[] = [
  'Y • ISLA DE YOSHI',
  'D • LLANURA ROSQUILLA',
  'V • DOMO VAINILLA',
  'B • BOSQUE ILUSIÓN',
  'K • VALLE DE KOOPA',
];

// ============================================================================
// SMW BUILDER CONTEXT & PRIMITIVES
// ============================================================================
interface SmwCtx {
  levelIndex: number;
  worldNum: number;
  stageNum: number;
  difficulty: number;
  nextId: number;
  blocks: Block[];
  blockGrid: Map<number, Block>;
  pipes: Pipe[];
  platforms: MovingPlatform[];
  springs: Spring[];
  enemies: Enemy[];
  coins: CoinEntity[];
  dragonCoins: DragonCoin[];
  berries: BerryEntity[];
  pits: Set<number>;
  lavaCols: Set<number>;
  isFortress: boolean;
  isUnderground: boolean;
  enemySeq: number;
}

function putBlock(
  ctx: SmwCtx,
  col: number,
  row: number,
  type: BlockType,
  content: BlockContent = null
): void {
  if (col < 0 || row < 0 || row >= 15) return;
  const key = gridKey(col, row);
  if (ctx.blockGrid.has(key)) {
    const prev = ctx.blockGrid.get(key)!;
    const idx = ctx.blocks.indexOf(prev);
    if (idx !== -1) ctx.blocks.splice(idx, 1);
  }
  const block: Block = {
    id: ctx.nextId++,
    col,
    row,
    x: col * TILE,
    y: row * TILE,
    baseY: row * TILE,
    width: TILE,
    height: TILE,
    type,
    content,
    coinsRemaining: content === 'multi_coin' ? 6 : content === 'coin' ? 1 : 0,
    bounceY: 0,
    bounceVel: 0,
    spinTimer: 0,
  };
  ctx.blocks.push(block);
  ctx.blockGrid.set(key, block);
}

function removeBlock(ctx: SmwCtx, col: number, row: number): void {
  const key = gridKey(col, row);
  const prev = ctx.blockGrid.get(key);
  if (prev) {
    const idx = ctx.blocks.indexOf(prev);
    if (idx !== -1) ctx.blocks.splice(idx, 1);
    ctx.blockGrid.delete(key);
  }
}

function addCoin(ctx: SmwCtx, col: number, rowFloat: number): void {
  ctx.coins.push({
    x: col * TILE + 7,
    y: rowFloat * TILE + 5,
    baseY: rowFloat * TILE + 5,
    width: 18,
    height: 22,
    collected: false,
    phase: col * 0.45,
  });
}

function addCoinArc(ctx: SmwCtx, startCol: number, count: number, peakRow: number): void {
  for (let i = 0; i < count; i++) {
    const norm = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
    const yRow = peakRow + norm * norm * 1.35;
    addCoin(ctx, startCol + i, yRow);
  }
}

function addDragonCoin(ctx: SmwCtx, col: number, rowFloat: number): void {
  ctx.dragonCoins.push({
    x: col * TILE + 4,
    y: rowFloat * TILE,
    baseY: rowFloat * TILE,
    width: 24,
    height: 36,
    collected: false,
    phase: col * 0.3,
  });
}

function addBerry(ctx: SmwCtx, col: number, rowFloat: number): void {
  ctx.berries.push({
    x: col * TILE + 6,
    y: rowFloat * TILE + 6,
    width: 20,
    height: 20,
    eaten: false,
  });
}

function addPipe(ctx: SmwCtx, col: number, heightTiles: number, hasPiranha: boolean): void {
  ctx.pits.delete(col);
  ctx.pits.delete(col + 1);
  const topRow = GROUND_ROW - heightTiles;
  ctx.pipes.push({
    x: col * TILE,
    y: topRow * TILE,
    width: 2 * TILE,
    height: heightTiles * TILE,
    hasPiranha,
  });

  if (hasPiranha) {
    const piranhaH = 38;
    const baseY = topRow * TILE - piranhaH + 2;
    ctx.enemies.push({
      id: ctx.nextId++,
      type: 'piranha',
      state: 'walk',
      x: col * TILE + 20,
      y: topRow * TILE + 8,
      baseY,
      vx: 0,
      vy: 0,
      width: 24,
      height: piranhaH,
      facing: -1,
      onGround: false,
      hp: 1,
      stateTimer: (col * 17) % 90,
      kickGraceTimer: 0,
      shellCombo: 0,
      animTimer: 0,
      active: false,
    });
  }
}

function addEnemy(ctx: SmwCtx, col: number, rowAboveBottom: number, type: EnemyType): void {
  const isTall =
    type === 'koopa_green' ||
    type === 'koopa_red' ||
    type === 'paratroopa' ||
    type === 'rex' ||
    type === 'chuck';
  const height = type === 'chuck' ? 42 : isTall ? 38 : type === 'bullet_bill' ? 24 : 28;
  const width = type === 'chuck' ? 32 : 26;
  const baseSpeed =
    type === 'bullet_bill'
      ? 3.35
      : type === 'chuck'
      ? 1.85
      : type === 'rex'
      ? 1.15
      : type === 'spiny'
      ? 1.25
      : 1.12;
  const vx = -baseSpeed * (type === 'bullet_bill' ? 1 : 1 + (ctx.difficulty - 1) * 0.28);
  const bottomY = (rowAboveBottom + 1) * TILE;
  ctx.enemies.push({
    id: ctx.nextId++,
    type,
    state: 'walk',
    x: col * TILE + 3,
    y: bottomY - height,
    baseY: bottomY - height,
    vx,
    vy: 0,
    width,
    height,
    facing: -1,
    onGround: false,
    hp: type === 'rex' || type === 'chuck' ? 2 : 1,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: false,
  });
}

function addSpring(ctx: SmwCtx, col: number, rowOnTopOf: number): void {
  ctx.springs.push({
    x: col * TILE + 3,
    y: (rowOnTopOf - 1) * TILE + 4,
    width: 26,
    height: 28,
    compressTimer: 0,
  });
}

function addPlatform(
  ctx: SmwCtx,
  col: number,
  row: number,
  tilesWide: number,
  rangeX: number,
  rangeY: number,
  speed = 0.032,
  phase = 0
): void {
  ctx.platforms.push({
    x: col * TILE,
    y: row * TILE,
    startX: col * TILE,
    startY: row * TILE,
    width: tilesWide * TILE,
    height: 16,
    rangeX: rangeX * TILE,
    rangeY: rangeY * TILE,
    speed,
    phase,
    vx: 0,
    vy: 0,
  });
}

function carvePit(ctx: SmwCtx, startCol: number, widthCols: number, asLava = false): void {
  const safeWidth = Math.max(1, Math.min(widthCols, 4));
  for (let c = startCol; c < startCol + safeWidth; c++) {
    ctx.pits.add(c);
    if (asLava || ctx.isFortress) {
      ctx.lavaCols.add(c);
    }
  }
}

function addPlateau(
  ctx: SmwCtx,
  startCol: number,
  width: number,
  topRow: number,
  blockType: BlockType = 'hard'
): void {
  for (let c = startCol; c < startCol + width; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
    for (let r = Math.max(2, topRow); r < GROUND_ROW; r++) {
      putBlock(ctx, c, r, blockType);
    }
  }
}

// ============================================================================
// WORLD ENEMY ROSTERS — Dinosaur Island World-Specific Foes
// ============================================================================
const SMW_ROSTERS: EnemyType[][] = [
  ['galoomba', 'rex', 'galoomba', 'koopa_green'], // Y: Isla de Yoshi
  ['koopa_green', 'rex', 'paratroopa', 'galoomba'], // D: Llanura Rosquilla
  ['spiny', 'koopa_red', 'galoomba', 'bullet_bill'], // V: Domo Vainilla
  ['rex', 'paratroopa', 'chuck', 'koopa_red'], // B: Bosque Ilusión
  ['chuck', 'spiny', 'rex', 'bullet_bill', 'koopa_red'], // K: Valle de Koopa
];

function smwFoe(ctx: SmwCtx): EnemyType {
  const roster = SMW_ROSTERS[Math.min(SMW_ROSTERS.length - 1, ctx.worldNum - 1)];
  const type = roster[ctx.enemySeq % roster.length];
  ctx.enemySeq++;
  return type;
}

function addFoe(ctx: SmwCtx, col: number): void {
  const type = smwFoe(ctx);
  addEnemy(ctx, col, type === 'bullet_bill' ? 8 : GROUND_ROW - 1, type);
}

function smwVariant(ctx: SmwCtx, salt: number): number {
  return Math.abs((ctx.levelIndex * 5 + salt * 3 + ctx.worldNum) % 3);
}

// ============================================================================
// 6 SMW OPENING STYLES (Act I Entrance, cols 8..16/18)
// ============================================================================
export type SmwOpeningStyle =
  | 'smw_yoshi_meadow'
  | 'smw_cape_runway'
  | 'smw_rotating_gate'
  | 'smw_treetop_drop'
  | 'smw_pipe_orchard'
  | 'smw_spring_vault';

function buildSmwOpeningStyle(ctx: SmwCtx, style: SmwOpeningStyle): number {
  for (let c = 0; c <= 18; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  const v = smwVariant(ctx, 13);
  switch (style) {
    case 'smw_yoshi_meadow': {
      putBlock(ctx, 8, 8, 'question', 'yoshi_egg');
      putBlock(ctx, 9, 8, 'rotating');
      putBlock(ctx, 11, 11, 'hard');
      putBlock(ctx, 12, 10, 'hard');
      putBlock(ctx, 12, 11, 'hard');
      putBlock(ctx, 14, 8, 'rotating', 'coin');
      addBerry(ctx, 10, 10.5);
      addCoin(ctx, 13, 8.5);
      addFoe(ctx, 15);
      return 17;
    }
    case 'smw_cape_runway': {
      putBlock(ctx, 9, 8, 'question', 'feather');
      putBlock(ctx, 10, 8, 'rotating');
      for (let k = 0; k < 6; k++) {
        addCoin(ctx, 11 + k, 3.2);
        putBlock(ctx, 12 + k, 4, 'bridge');
      }
      addBerry(ctx, 14, 2.5);
      addFoe(ctx, 16);
      return 18;
    }
    case 'smw_rotating_gate': {
      for (let r = 9; r <= 11; r++) {
        putBlock(ctx, 9, r, 'rotating');
      }
      putBlock(ctx, 12, 7, 'question', v === 1 ? 'feather' : 'yoshi_egg');
      putBlock(ctx, 13, 7, 'rotating');
      addCoinArc(ctx, 10, 4, 5.5);
      addEnemy(ctx, 15, GROUND_ROW - 1, 'galoomba');
      return 17;
    }
    case 'smw_treetop_drop': {
      for (let c = 8; c <= 12; c++) {
        putBlock(ctx, c, 7, 'bridge');
        addBerry(ctx, c, 5.5);
      }
      putBlock(ctx, 13, 9, 'hard');
      putBlock(ctx, 14, 10, 'hard');
      putBlock(ctx, 15, 8, 'question', 'feather');
      addFoe(ctx, 16);
      return 18;
    }
    case 'smw_pipe_orchard': {
      addPipe(ctx, 9, 2, false);
      addPipe(ctx, 14, 3, false);
      addBerry(ctx, 12, 8.5);
      putBlock(ctx, 12, 6, 'question', 'yoshi_egg');
      addCoin(ctx, 12, 4.5);
      addFoe(ctx, 16);
      return 18;
    }
    case 'smw_spring_vault': {
      addSpring(ctx, 9, GROUND_ROW);
      for (let c = 11; c <= 15; c++) {
        putBlock(ctx, c, 5, 'rotating');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, 13, 2, 'question', 'feather');
      addFoe(ctx, 16);
      return 18;
    }
  }
}

// ============================================================================
// 6 SMW TRANSITION KINDS (Varied 2..5 cols, Micro-Gameplay)
// ============================================================================
export type SmwTransitionKind =
  | 'smw_breather_2'
  | 'smw_berry_step_3'
  | 'smw_mini_pipe_4'
  | 'smw_rotating_arch_5'
  | 'smw_elevation_terrace_5'
  | 'smw_slide_underpass_4';

function buildSmwTransition(ctx: SmwCtx, kind: SmwTransitionKind, col: number): number {
  for (let c = col; c < col + 6; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  switch (kind) {
    case 'smw_breather_2':
      return 2;
    case 'smw_berry_step_3':
      putBlock(ctx, col + 1, 11, 'hard');
      addBerry(ctx, col + 1, 9.5);
      addCoin(ctx, col + 2, 10.0);
      return 3;
    case 'smw_mini_pipe_4':
      addPipe(ctx, col + 1, 2, false);
      addCoin(ctx, col + 3, 9.5);
      return 4;
    case 'smw_rotating_arch_5':
      for (let c = col + 1; c <= col + 3; c++) {
        putBlock(ctx, c, 7, 'rotating');
        addCoin(ctx, c, 10.5);
      }
      return 5;
    case 'smw_elevation_terrace_5':
      addPlateau(ctx, col + 1, 3, 10, 'hard');
      addBerry(ctx, col + 2, 8.5);
      return 5;
    case 'smw_slide_underpass_4':
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 2, 10, 'hard');
      putBlock(ctx, col + 1, 6, 'rotating');
      putBlock(ctx, col + 2, 6, 'question', 'coin');
      return 4;
  }
}

// ============================================================================
// 4 SMW MIDPOINT PLAZAS (Hitos de Checkpoint, Center Clean)
// ============================================================================
export type SmwMidpointStyle =
  | 'smw_checkpoint_gazebo'
  | 'smw_checkpoint_terrace'
  | 'smw_checkpoint_rotating_arch'
  | 'smw_checkpoint_berry_oasis';

function buildSmwMidpointPlaza(
  ctx: SmwCtx,
  col: number,
  style: SmwMidpointStyle = 'smw_checkpoint_gazebo'
): number {
  const width = 8;
  for (let c = col; c < col + width; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  removeBlock(ctx, col + 3, 10);
  removeBlock(ctx, col + 3, 11);
  removeBlock(ctx, col + 4, 10);
  removeBlock(ctx, col + 4, 11);

  switch (style) {
    case 'smw_checkpoint_gazebo':
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 9, 'hard');
      putBlock(ctx, col + 6, 11, 'hard');
      putBlock(ctx, col + 6, 10, 'hard');
      putBlock(ctx, col + 6, 9, 'hard');
      for (let c = col + 1; c <= col + 6; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      putBlock(ctx, col + 3, 4, 'question', 'feather');
      break;

    case 'smw_checkpoint_terrace':
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 6, 10, 'hard');
      putBlock(ctx, col + 6, 11, 'hard');
      addBerry(ctx, col + 1, 8.5);
      putBlock(ctx, col + 6, 7, 'question', 'yoshi_egg');
      break;

    case 'smw_checkpoint_rotating_arch':
      for (let c = col + 1; c <= col + 6; c++) {
        putBlock(ctx, c, 5, 'rotating');
      }
      addCoinArc(ctx, col + 1, 6, 3.2);
      putBlock(ctx, col, 11, 'hard');
      putBlock(ctx, col + 7, 11, 'hard');
      break;

    case 'smw_checkpoint_berry_oasis':
      putBlock(ctx, col, 11, 'hard');
      putBlock(ctx, col + 7, 11, 'hard');
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      addBerry(ctx, col + 2, 4.5);
      addBerry(ctx, col + 5, 4.5);
      break;
  }
  return width;
}

// ============================================================================
// SERVICE PLAZAS (100% Guaranteed Spot for Vault & Abilities)
// ============================================================================
function buildSmwServicePlaza(
  ctx: SmwCtx,
  col: number,
  kind: 'vault_plaza' | 'shaft_plaza'
): number {
  const width = kind === 'vault_plaza' ? 10 : 8;
  for (let c = col; c < col + width; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
    for (let r = 2; r < GROUND_ROW; r++) {
      removeBlock(ctx, c, r);
    }
  }
  if (kind === 'vault_plaza') {
    // Decorative hard block at row 4 with row 2-3 free above (guaranteed candidate for findKeySpot!)
    putBlock(ctx, col + 1, 4, 'hard');
    addCoin(ctx, col + 4, 7.5);
    addCoin(ctx, col + 5, 7.5);
  }
  return width;
}

// ============================================================================
// 5 SMW FINALE STYLES (Pre-GoalTape Approaches)
// ============================================================================
export type SmwFinaleStyle =
  | 'smw_classic_staircase'
  | 'smw_sky_bridge_sprint'
  | 'smw_spring_apex_launch'
  | 'smw_twin_deck_finish'
  | 'smw_stepping_pillars';

function buildSmwFinaleStyle(ctx: SmwCtx, style: SmwFinaleStyle, col: number): number {
  for (let c = col; c < col + 20; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  switch (style) {
    case 'smw_classic_staircase': {
      const steps = 5 + (smwVariant(ctx, col) % 3);
      for (let s = 0; s < steps; s++) {
        for (let h = 0; h <= s; h++) {
          putBlock(ctx, col + s, GROUND_ROW - 1 - h, 'hard');
        }
      }
      return steps + 3;
    }
    case 'smw_sky_bridge_sprint': {
      for (let c = col + 1; c <= col + 7; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, col + 8, 7, 'hard');
      putBlock(ctx, col + 9, 9, 'hard');
      return 11;
    }
    case 'smw_spring_apex_launch': {
      for (let c = col + 1; c <= col + 3; c++) {
        putBlock(ctx, c, 8, 'hard');
        putBlock(ctx, c, 9, 'hard');
      }
      addEnemy(ctx, col + 2, 7, 'koopa_red');
      addSpring(ctx, col + 5, GROUND_ROW);
      addCoinArc(ctx, col + 5, 5, 4.0);
      return 11;
    }
    case 'smw_twin_deck_finish': {
      for (let c = col + 1; c <= col + 8; c++) {
        putBlock(ctx, c, 10, 'hard');
        putBlock(ctx, c, 6, 'rotating');
        addCoin(ctx, c, 4.5);
      }
      return 11;
    }
    case 'smw_stepping_pillars': {
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 3, 8, 'hard');
      putBlock(ctx, col + 5, 6, 'hard');
      putBlock(ctx, col + 7, 4, 'hard');
      addCoin(ctx, col + 2, 9.0);
      addCoin(ctx, col + 4, 7.0);
      addCoin(ctx, col + 6, 5.0);
      return 11;
    }
  }
}

// ============================================================================
// 24 CURATED SUPER MARIO WORLD SETPIECES
// ============================================================================
export type SmwSetpiece =
  | 'yoshi_berry_orchard'
  | 'cape_runway_skyway'
  | 'rotating_block_vault'
  | 'rex_terrace_paratroopa'
  | 'chuck_stadium'
  | 'bullet_bill_canyon'
  | 'vanilla_crystal_lifts'
  | 'spiny_spinjump_bridge'
  | 'galoomba_meadow'
  | 'rotating_staircase'
  | 'pipe_valley'
  | 'rex_hill'
  | 'donut_lifts'
  | 'feather_cloud_trail'
  // 10 New Authentic SMW Setpieces:
  | 'yoshi_fire_gauntlet'
  | 'cape_hoop_slalom'
  | 'spinjump_spiny_trench'
  | 'chuck_baseball_diamond'
  | 'donut_secret_underpass'
  | 'vanilla_dome_stalactites'
  | 'forest_illusion_loop'
  | 'koopa_valley_airship_run'
  | 'berry_treetop_canopy'
  | 'switch_palace_vault';

function buildSmwSetpiece(ctx: SmwCtx, kind: SmwSetpiece, c: number): number {
  const v = smwVariant(ctx, c);
  switch (kind) {
    case 'yoshi_berry_orchard': {
      putBlock(ctx, c + 1, 8, 'rotating');
      putBlock(ctx, c + 2, 8, 'question', v === 2 ? 'feather' : 'yoshi_egg');
      putBlock(ctx, c + 3, 8, 'rotating');
      addBerry(ctx, c + 5, 10.6);
      addBerry(ctx, c + 8, 9.5 - v * 0.5);
      addBerry(ctx, c + 11, 10.6);
      addEnemy(ctx, c + 7, GROUND_ROW - 1, 'koopa_red');
      addFoe(ctx, c + 11);
      addFoe(ctx, c + 13);
      addCoinArc(ctx, c + 6, 5, 6.2);
      return 16;
    }

    case 'cape_runway_skyway': {
      putBlock(ctx, c + 1, 8, 'question', 'feather');
      putBlock(ctx, c + 2, 8, 'rotating');
      for (let k = 0; k < 8; k++) {
        addCoin(ctx, c + 5 + k, 2.2 + (k % 2) * 0.4);
      }
      const row = 4 + (v === 1 ? 1 : 0);
      for (let k = c + 7; k <= c + 12; k++) {
        putBlock(ctx, k, row, 'bridge');
      }
      addFoe(ctx, c + 9);
      addFoe(ctx, c + 13);
      return 16;
    }

    case 'rotating_block_vault': {
      for (let row = 9; row <= 11; row++) {
        putBlock(ctx, c + 2, row, 'rotating');
        putBlock(ctx, c + 8, row, 'rotating');
      }
      for (let k = c + 2; k <= c + 8; k++) {
        putBlock(
          ctx,
          k,
          8,
          k === c + 5 ? 'question' : 'rotating',
          k === c + 5 ? (v === 1 ? 'star' : 'feather') : null
        );
      }
      addCoin(ctx, c + 4, 10);
      addCoin(ctx, c + 5, 10);
      addCoin(ctx, c + 6, 10);
      addEnemy(ctx, c + 5, 7, v === 2 ? 'spiny' : 'rex');
      addFoe(ctx, c + 11);
      return 14;
    }

    case 'rex_terrace_paratroopa': {
      addPipe(ctx, c + 1, 2 + (v === 2 ? 1 : 0), false);
      addBerry(ctx, c + 4, 10.5);
      addEnemy(ctx, c + 5, GROUND_ROW - 1, 'rex');
      addPipe(ctx, c + 7, 3 - (v === 1 ? 1 : 0), true);
      carvePit(ctx, c + 10, 3);
      for (let k = c + 10; k <= c + 13; k++) {
        putBlock(ctx, k, 8, 'bridge');
      }
      addEnemy(ctx, c + 11, 7, 'paratroopa');
      addCoinArc(ctx, c + 10, 4, 5.2);
      return 16;
    }

    case 'chuck_stadium': {
      putBlock(ctx, c + 2, 8, 'rotating');
      putBlock(ctx, c + 3, 8, 'question', v === 0 ? 'coin' : 'feather');
      putBlock(ctx, c + 4, 8, 'rotating', 'multi_coin');
      putBlock(ctx, c + 5, 8, 'rotating');
      addEnemy(ctx, c + 7, GROUND_ROW - 1, 'chuck');
      if (v === 2) addFoe(ctx, c + 9);
      addSpring(ctx, c + 10, GROUND_ROW);
      for (let k = c + 12; k <= c + 15; k++) {
        putBlock(ctx, k, 6, 'bridge');
        addCoin(ctx, k, 4.3);
      }
      return 17;
    }

    case 'bullet_bill_canyon': {
      putBlock(ctx, c, 11, 'hard');
      putBlock(ctx, c + 1, 10, 'hard');
      putBlock(ctx, c + 1, 11, 'hard');
      carvePit(ctx, c + 2, 3);
      putBlock(ctx, c + 5, 9, 'hard');
      putBlock(ctx, c + 6, 9, 'hard');
      carvePit(ctx, c + 7, 3);
      addEnemy(ctx, c + 6, 6 + v, 'bullet_bill');
      addEnemy(ctx, c + 11, 8, 'bullet_bill');
      addEnemy(ctx, c + 14, 5 + v, 'bullet_bill');
      addCoinArc(ctx, c + 3, 6, 5.5);
      return 16;
    }

    case 'vanilla_crystal_lifts': {
      carvePit(ctx, c + 2, 4);
      addPlatform(ctx, c + 3, 8.8 - v * 0.4, 3, 2.0, 0, 0.036 + v * 0.004, v);
      putBlock(ctx, c + 5, 4, 'question', v === 1 ? 'feather' : 'one_up');
      addCoinArc(ctx, c + 2, 5, 5.2);
      addEnemy(ctx, c + 9, GROUND_ROW - 1, 'koopa_red');
      addFoe(ctx, c + 12);
      return 15;
    }

    case 'spiny_spinjump_bridge': {
      putBlock(ctx, c + 1, 8, 'question', 'yoshi_egg');
      for (let k = c + 4; k <= c + 11; k++) {
        putBlock(ctx, k, 8, 'rotating');
      }
      addEnemy(ctx, c + 6, 7, 'spiny');
      addEnemy(ctx, c + 9, 7, 'spiny');
      addFoe(ctx, c + 7);
      addFoe(ctx, c + 10);
      addCoinArc(ctx, c + 5, 5, 4.8);
      return 14;
    }

    case 'galoomba_meadow': {
      for (let k = c + 2; k <= c + 5; k++) {
        putBlock(ctx, k, 8, k === c + 3 ? 'question' : 'rotating', k === c + 3 ? 'coin' : null);
      }
      for (let k = c + 8; k <= c + 11; k++) {
        putBlock(ctx, k, 6 + v, k === c + 10 ? 'question' : 'rotating', k === c + 10 ? 'feather' : null);
      }
      addBerry(ctx, c + 6, 10.6);
      addBerry(ctx, c + 13, 10.6);
      addEnemy(ctx, c + 4, GROUND_ROW - 1, 'galoomba');
      addFoe(ctx, c + 7);
      addFoe(ctx, c + 10);
      addEnemy(ctx, c + 12, GROUND_ROW - 1, 'galoomba');
      addCoinArc(ctx, c + 7, 6, 5.0);
      return 16;
    }

    case 'rotating_staircase': {
      for (let i = 0; i < 4; i++) {
        putBlock(ctx, c + 1 + i * 2, 10 - i * 2 + (v === 2 ? 1 : 0), 'rotating');
        putBlock(ctx, c + 2 + i * 2, 10 - i * 2 + (v === 2 ? 1 : 0), 'rotating');
        addCoin(ctx, c + 1 + i * 2, 8.6 - i * 2 + (v === 2 ? 1 : 0));
      }
      putBlock(ctx, c + 8, 1 + (v === 2 ? 1 : 0), 'question', v === 1 ? 'star' : 'one_up');
      addFoe(ctx, c + 4);
      addFoe(ctx, c + 11);
      return 14;
    }

    case 'pipe_valley': {
      const hs = [
        [2, 3, 2],
        [3, 2, 3],
        [2, 4, 2],
      ][v];
      addPipe(ctx, c + 1, hs[0], false);
      addFoe(ctx, c + 5);
      addPipe(ctx, c + 7, hs[1], true);
      putBlock(ctx, c + 10, 7, 'rotating');
      putBlock(ctx, c + 11, 7, 'question', 'feather');
      addBerry(ctx, c + 11, 10.5);
      addFoe(ctx, c + 12);
      addPipe(ctx, c + 14, hs[2], true);
      return 18;
    }

    case 'rex_hill': {
      const peak = 3 + (v === 1 ? 1 : 0);
      for (let s = 0; s < peak; s++) {
        for (let h = 0; h <= s; h++) putBlock(ctx, c + s * 2, GROUND_ROW - 1 - h, 'hard');
        for (let h = 0; h <= s; h++) putBlock(ctx, c + s * 2 + 1, GROUND_ROW - 1 - h, 'hard');
      }
      for (let k = 0; k < 3; k++) {
        for (let h = 0; h < peak; h++) putBlock(ctx, c + peak * 2 + k, GROUND_ROW - 1 - h, 'hard');
        addCoin(ctx, c + peak * 2 + k, GROUND_ROW - 2.6 - peak);
      }
      addEnemy(ctx, c + peak * 2 + 1, GROUND_ROW - 1 - peak, 'rex');
      addFoe(ctx, c + peak * 2 + 5);
      return peak * 2 + 8;
    }

    case 'donut_lifts': {
      putBlock(ctx, c, 11, 'hard');
      carvePit(ctx, c + 1, 3);
      addPlatform(ctx, c + 2, 9, 2, 1.2, 0, 0.034, 0);
      putBlock(ctx, c + 5, 11, 'hard');
      carvePit(ctx, c + 6, 3);
      addPlatform(ctx, c + 7, 8 - v * 0.5, 2, 0, 1.6, 0.038, 1.4);
      putBlock(ctx, c + 4, 4, 'question', v === 0 ? 'one_up' : 'coin');
      addCoinArc(ctx, c + 2, 6, 5.4);
      addEnemy(ctx, c + 10, 7, 'paratroopa');
      addFoe(ctx, c + 12);
      return 15;
    }

    case 'feather_cloud_trail': {
      putBlock(ctx, c + 1, 8, 'question', 'feather');
      addSpring(ctx, c + 3, GROUND_ROW);
      for (let k = c + 5; k <= c + 14; k++) {
        putBlock(ctx, k, 5 - (v === 2 ? 1 : 0), 'bridge');
        addCoin(ctx, k, 3.6 - (v === 2 ? 1 : 0));
      }
      addFoe(ctx, c + 8);
      addFoe(ctx, c + 12);
      if (v === 1) addEnemy(ctx, c + 10, 4, 'paratroopa');
      return 17;
    }

    // --- 10 NEW AUTHENTIC SMW SETPIECES ---
    case 'yoshi_fire_gauntlet': {
      // Eat Red Koopa with Yoshi to blast triple fireballs through Spinies & rotating blocks!
      putBlock(ctx, c + 1, 8, 'question', 'yoshi_egg');
      addEnemy(ctx, c + 3, GROUND_ROW - 1, 'koopa_red');
      for (let r = 9; r <= 11; r++) {
        putBlock(ctx, c + 7, r, 'rotating');
        putBlock(ctx, c + 11, r, 'rotating');
      }
      addEnemy(ctx, c + 8, GROUND_ROW - 1, 'spiny');
      addEnemy(ctx, c + 10, GROUND_ROW - 1, 'spiny');
      for (let k = c + 6; k <= c + 12; k++) {
        putBlock(ctx, k, 6, 'bridge');
        addBerry(ctx, k, 4.5);
      }
      addFoe(ctx, c + 14);
      return 17;
    }

    case 'cape_hoop_slalom': {
      // P-Meter sprint into high rotating block hoops and cloud runway
      putBlock(ctx, c + 1, 8, 'question', 'feather');
      for (let k = 0; k < 4; k++) {
        const hoopCol = c + 4 + k * 3;
        putBlock(ctx, hoopCol, 3, 'rotating');
        putBlock(ctx, hoopCol, 6, 'rotating');
        addCoin(ctx, hoopCol, 4.5);
      }
      for (let k = c + 13; k <= c + 16; k++) {
        putBlock(ctx, k, 4, 'bridge');
        addCoin(ctx, k, 2.5);
      }
      putBlock(ctx, c + 15, 1, 'question', 'one_up');
      addFoe(ctx, c + 15);
      return 18;
    }

    case 'spinjump_spiny_trench': {
      // Trench of rotating blocks covered with Spinies. Spin Jump ('Y') bounces safely!
      carvePit(ctx, c + 3, 4);
      for (let k = c + 2; k <= c + 8; k++) {
        putBlock(ctx, k, 8, 'rotating');
      }
      addEnemy(ctx, c + 4, 7, 'spiny');
      addEnemy(ctx, c + 6, 7, 'spiny');
      addBerry(ctx, c + 5, 10.6);
      putBlock(ctx, c + 5, 10, 'question', 'multi_coin');
      addFoe(ctx, c + 11);
      return 15;
    }

    case 'chuck_baseball_diamond': {
      // Multi-tier arena defended by 2 Chargin' Chucks
      addPlateau(ctx, c + 2, 5, 9, 'hard');
      addEnemy(ctx, c + 4, 8, 'chuck');
      addEnemy(ctx, c + 9, GROUND_ROW - 1, 'chuck');
      addSpring(ctx, c + 11, GROUND_ROW);
      for (let k = c + 12; k <= c + 15; k++) {
        putBlock(ctx, k, 5, 'rotating');
      }
      putBlock(ctx, c + 13, 2, 'question', 'feather');
      addCoinArc(ctx, c + 12, 4, 3.5);
      return 17;
    }

    case 'donut_secret_underpass': {
      // Dual route: upper bridge at row 7 vs low underpass at row 11-12
      for (let k = c + 2; k <= c + 11; k++) {
        putBlock(ctx, k, 10, 'hard'); // lintel ceiling
        putBlock(ctx, k, 6, 'bridge'); // upper walkway
        addCoin(ctx, k, 4.5);
      }
      addBerry(ctx, c + 4, 10.6);
      addBerry(ctx, c + 8, 10.6);
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'rex');
      addEnemy(ctx, c + 7, 5, 'paratroopa');
      addFoe(ctx, c + 13);
      return 16;
    }

    case 'vanilla_dome_stalactites': {
      // Stalactites hanging from ceiling over chasm with moving lift
      for (let k = c + 1; k <= c + 4; k++) {
        putBlock(ctx, k, 3, 'hard');
        putBlock(ctx, k, 4, 'hard');
      }
      carvePit(ctx, c + 3, 4);
      addPlatform(ctx, c + 4, 9, 3, 2.2, 0, 0.038, 0);
      putBlock(ctx, c + 9, 7, 'rotating');
      putBlock(ctx, c + 10, 7, 'question', 'feather');
      putBlock(ctx, c + 11, 7, 'rotating');
      addCoinArc(ctx, c + 8, 5, 5.0);
      addFoe(ctx, c + 13);
      return 16;
    }

    case 'forest_illusion_loop': {
      // Maze of rotating blocks and twin pipes
      addPipe(ctx, c + 1, 2, false);
      for (let k = c + 4; k <= c + 9; k++) {
        putBlock(ctx, k, 8, 'rotating');
        if (k % 2 === 0) putBlock(ctx, k, 5, 'rotating');
      }
      addPipe(ctx, c + 11, 3, true);
      putBlock(ctx, c + 6, 2, 'question', 'yoshi_egg');
      addBerry(ctx, c + 8, 10.6);
      addEnemy(ctx, c + 7, GROUND_ROW - 1, 'galoomba');
      addFoe(ctx, c + 14);
      return 17;
    }

    case 'koopa_valley_airship_run': {
      // Battery of Bullet Bills at staggered heights + stepping platforms
      putBlock(ctx, c + 1, 10, 'hard');
      addEnemy(ctx, c + 3, 5, 'bullet_bill');
      carvePit(ctx, c + 4, 3);
      putBlock(ctx, c + 5, 8, 'hard');
      addEnemy(ctx, c + 8, 7, 'bullet_bill');
      carvePit(ctx, c + 9, 3);
      putBlock(ctx, c + 10, 9, 'hard');
      addEnemy(ctx, c + 13, 4, 'bullet_bill');
      addCoinArc(ctx, c + 4, 6, 4.0);
      addFoe(ctx, c + 15);
      return 17;
    }

    case 'berry_treetop_canopy': {
      // Triple-deck treetop branches packed with red berries
      for (let k = c + 1; k <= c + 5; k++) putBlock(ctx, k, 8, 'bridge');
      for (let k = c + 5; k <= c + 10; k++) putBlock(ctx, k, 6, 'bridge');
      for (let k = c + 9; k <= c + 14; k++) putBlock(ctx, k, 4, 'bridge');
      addBerry(ctx, c + 3, 6.5);
      addBerry(ctx, c + 7, 4.5);
      addBerry(ctx, c + 11, 2.5);
      addBerry(ctx, c + 8, 10.6);
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'galoomba');
      addEnemy(ctx, c + 8, 5, 'koopa_red');
      addFoe(ctx, c + 13);
      return 17;
    }

    case 'switch_palace_vault': {
      // 3x3 vault of rotating blocks with center prize
      for (let r = 6; r <= 8; r++) {
        for (let col = c + 2; col <= c + 4; col++) {
          if (r === 7 && col === c + 3) {
            putBlock(ctx, col, r, 'question', v === 1 ? 'star' : 'feather');
          } else {
            putBlock(ctx, col, r, 'rotating');
          }
        }
      }
      addCoinArc(ctx, c + 1, 5, 4.2);
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'koopa_green');
      addFoe(ctx, c + 10);
      return 14;
    }
  }
}

// ============================================================================
// HANDCRAFTED STAGE Y-1: CASA DE YOSHI (Kept 100% Intact!)
// ============================================================================
function buildSmwStageY1(ctx: SmwCtx): number {
  const totalCols = 140;
  carvePit(ctx, 56, 3);
  carvePit(ctx, 94, 3);

  // Welcome right outside Yoshi's House:
  // Col 8: Spotted Yoshi Egg Block! Col 12: Pluma Capa (Cape Feather)!
  putBlock(ctx, 8, 8, 'question', 'yoshi_egg');
  putBlock(ctx, 11, 8, 'rotating');
  putBlock(ctx, 12, 8, 'question', 'feather');
  putBlock(ctx, 13, 8, 'rotating');

  addBerry(ctx, 15, 10.6);
  addBerry(ctx, 19, 10.6);
  addEnemy(ctx, 17, GROUND_ROW - 1, 'galoomba');
  addEnemy(ctx, 22, GROUND_ROW - 1, 'rex');

  // Long P-Meter Takeoff Runway (cols 16..36) + Sky Cloud Bridge with Dragon Coin #1!
  for (let c = 24; c <= 35; c++) {
    if (c >= 27 && c <= 33) {
      putBlock(ctx, c, 4, 'bridge');
    }
    addCoin(ctx, c, 2.3);
  }
  addDragonCoin(ctx, 30, 1.5); // Dragon Coin #1 high in sky!

  // Rotating Block Cape-Spin Gate + Red Koopa (eat with Yoshi to breathe 3 fireballs!)
  for (let r = 9; r <= 11; r++) {
    putBlock(ctx, 39, r, 'rotating');
  }
  putBlock(ctx, 39, 8, 'rotating');
  putBlock(ctx, 40, 8, 'question', 'multi_coin');
  putBlock(ctx, 41, 8, 'rotating');
  addDragonCoin(ctx, 43, 9.5); // Dragon Coin #2 behind rotating wall!

  addEnemy(ctx, 46, GROUND_ROW - 1, 'koopa_red');
  addEnemy(ctx, 50, GROUND_ROW - 1, 'galoomba');
  addEnemy(ctx, 52, GROUND_ROW - 1, 'galoomba');
  addBerry(ctx, 48, 10.5);

  // Bridge over Pit 1 + Dragon Coin #3
  for (let c = 56; c <= 58; c++) {
    putBlock(ctx, c, 8, 'bridge');
  }
  addDragonCoin(ctx, 57, 5.2);
  addEnemy(ctx, 58, 7, 'paratroopa');

  // Midpoint Checkpoint around col 68!
  putBlock(ctx, 64, 8, 'question', 'feather');
  addBerry(ctx, 66, 10.6);

  // Chargin' Chuck & Bullet Bill Valley!
  addPipe(ctx, 73, 2, false);
  addEnemy(ctx, 78, GROUND_ROW - 1, 'chuck');
  addSpring(ctx, 82, GROUND_ROW);
  for (let c = 84; c <= 90; c++) {
    putBlock(ctx, c, 6, c === 87 ? 'question' : 'rotating', c === 87 ? 'star' : null);
    addCoin(ctx, c, 4.2);
  }
  addDragonCoin(ctx, 87, 2.2); // Dragon Coin #4!

  // Chasm 2 with Moving Lift & Bullet Bills
  addPlatform(ctx, 94, 9, 3, 2.2, 0, 0.036, 0);
  addEnemy(ctx, 100, 7, 'bullet_bill');
  addEnemy(ctx, 105, GROUND_ROW - 1, 'rex');
  addEnemy(ctx, 109, GROUND_ROW - 1, 'koopa_green');
  addBerry(ctx, 112, 10.6);

  // Final Runway to Giant Striped Goalpost + Dragon Coin #5 at high tape level!
  for (let s = 0; s < 5; s++) {
    for (let h = 0; h <= s; h++) {
      putBlock(ctx, 116 + s, GROUND_ROW - 1 - h, 'hard');
    }
  }
  addDragonCoin(ctx, 123, 4.0); // Dragon Coin #5 right on high jump to Goal Tape!

  return totalCols;
}

// ============================================================================
// 15 SMW CASTLE SECTIONS (Parametric with smwVariant)
// ============================================================================
export type SmwCastleSection =
  | 'lava_trench'
  | 'chuck_hallway'
  | 'synced_lift'
  | 'rotating_bridge'
  | 'vertical_lift'
  | 'thwomp_hall'
  | 'magma_steps'
  | 'bill_gallery'
  | 'castle_supply'
  // 6 New Castle Sections:
  | 'magma_catwalk'
  | 'chuck_bastion'
  | 'pendulum_lifts'
  | 'rotating_maze_hall'
  | 'sunken_lava_dais'
  | 'twin_tier_gauntlet';

function buildSmwCastleSection(
  ctx: SmwCtx,
  kind: SmwCastleSection,
  c: number
): { width: number; coinCol: number; coinRow: number } {
  const w = ctx.worldNum;
  const v = smwVariant(ctx, c);
  switch (kind) {
    case 'lava_trench': {
      carvePit(ctx, c + 1, 3, true);
      putBlock(ctx, c + 2, 9 - (v % 2), 'hard');
      addFoe(ctx, c + 6);
      return { width: 8, coinCol: c + 2, coinRow: 6.2 - (v % 2) };
    }
    case 'chuck_hallway': {
      addEnemy(ctx, c + 1, GROUND_ROW - 1, 'chuck');
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'spiny');
      putBlock(ctx, c + 3, 7, 'rotating');
      putBlock(ctx, c + 4, 7, 'question', v === 1 ? 'feather' : 'coin');
      putBlock(ctx, c + 5, 7, 'rotating');
      return { width: 9, coinCol: c + 4, coinRow: 5.4 };
    }
    case 'synced_lift': {
      carvePit(ctx, c + 1, 4, true);
      addPlatform(ctx, c + 2, 9 - (v % 2), 3, 2.0, 0, 0.038 + w * 0.003, 0.4);
      return { width: 9, coinCol: c + 3, coinRow: 5.2 };
    }
    case 'rotating_bridge': {
      carvePit(ctx, c + 2, 4, true);
      for (let k = c + 1; k <= c + 7; k++) {
        putBlock(ctx, k, 8, 'bridge');
        if (k >= c + 3 && k <= c + 5) putBlock(ctx, k, 4, 'rotating');
      }
      addEnemy(ctx, c + 5, 7, 'paratroopa');
      return { width: 10, coinCol: c + 4, coinRow: 5.6 };
    }
    case 'vertical_lift': {
      carvePit(ctx, c + 1, 4, true);
      addPlatform(ctx, c + 2, 8.5, 2, 0, 2.2, 0.042, 1.1);
      putBlock(ctx, c + 7, 8 - (v % 2), 'question', 'feather');
      addFoe(ctx, c + 9);
      return { width: 11, coinCol: c + 2, coinRow: 4.2 };
    }
    case 'thwomp_hall': {
      for (let k = c; k <= c + 10; k++) {
        const isQ = k === c + 4;
        putBlock(ctx, k, 7, isQ ? 'question' : 'hard', isQ ? 'feather' : null);
      }
      addFoe(ctx, c + 3);
      addEnemy(ctx, c + 7, GROUND_ROW - 1, w >= 3 ? 'spiny' : 'galoomba');
      addFoe(ctx, c + 10);
      return { width: 12, coinCol: c + 8, coinRow: 10.2 };
    }
    case 'magma_steps': {
      for (let s = 0; s < 3; s++) {
        for (let h = 0; h <= s; h++) putBlock(ctx, c + s, GROUND_ROW - 1 - h, 'hard');
      }
      carvePit(ctx, c + 3, 3, true);
      for (let s = 0; s < 3; s++) {
        for (let h = 0; h <= 2 - s; h++) putBlock(ctx, c + 6 + s, GROUND_ROW - 1 - h, 'hard');
      }
      addFoe(ctx, c + 10);
      return { width: 12, coinCol: c + 4, coinRow: 6.0 };
    }
    case 'bill_gallery': {
      for (let i = 0; i < 3; i++) {
        const col = c + 1 + i * 3;
        putBlock(ctx, col, 11, 'hard');
        putBlock(ctx, col, 10, 'hard');
        carvePit(ctx, col + 1, 2, true);
      }
      putBlock(ctx, c + 10, 11, 'hard');
      addEnemy(ctx, c + 8, 6, 'bullet_bill');
      addEnemy(ctx, c + 12, 8, 'bullet_bill');
      return { width: 13, coinCol: c + 4, coinRow: 7.2 };
    }
    case 'castle_supply': {
      putBlock(ctx, c + 1, 8, 'question', 'feather');
      putBlock(ctx, c + 2, 8, 'question', w >= 3 ? 'one_up' : 'coin');
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'chuck');
      return { width: 9, coinCol: c + 6, coinRow: 5.5 };
    }

    // --- 6 New Castle Sections ---
    case 'magma_catwalk': {
      carvePit(ctx, c + 2, 4, true);
      for (let k = c + 1; k <= c + 7; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      addEnemy(ctx, c + 4, 8, 'paratroopa');
      addCoinArc(ctx, c + 2, 5, 6.0);
      return { width: 10, coinCol: c + 4, coinRow: 4.8 };
    }
    case 'chuck_bastion': {
      for (let k = c + 2; k <= c + 6; k++) {
        putBlock(ctx, k, 8, 'hard');
      }
      addEnemy(ctx, c + 4, 7, w >= 3 ? 'chuck' : 'koopa_red');
      putBlock(ctx, c + 4, 5, 'question', 'feather');
      return { width: 10, coinCol: c + 4, coinRow: 3.2 };
    }
    case 'pendulum_lifts': {
      carvePit(ctx, c + 1, 4, true);
      addPlatform(ctx, c + 2, 9, 2, 1.8, 0, 0.04, 0);
      putBlock(ctx, c + 6, 11, 'hard');
      carvePit(ctx, c + 7, 3, true);
      addPlatform(ctx, c + 7, 8, 2, 1.8, 0, 0.04, Math.PI);
      addCoinArc(ctx, c + 2, 6, 5.5);
      return { width: 11, coinCol: c + 5, coinRow: 4.2 };
    }
    case 'rotating_maze_hall': {
      for (let k = c + 1; k <= c + 8; k++) {
        if (k % 2 === 0) {
          putBlock(ctx, k, 8, 'rotating');
        } else {
          putBlock(ctx, k, 6, 'rotating', 'coin');
        }
      }
      addEnemy(ctx, c + 4, GROUND_ROW - 1, smwFoe(ctx));
      return { width: 11, coinCol: c + 5, coinRow: 4.0 };
    }
    case 'sunken_lava_dais': {
      carvePit(ctx, c + 1, 2, true);
      for (let k = c + 3; k <= c + 6; k++) {
        putBlock(ctx, k, 10, 'hard');
        putBlock(ctx, k, 11, 'hard');
      }
      carvePit(ctx, c + 7, 2, true);
      addCoinArc(ctx, c + 3, 4, 7.5);
      return { width: 11, coinCol: c + 4, coinRow: 5.5 };
    }
    case 'twin_tier_gauntlet': {
      for (let k = c + 1; k <= c + 8; k++) {
        putBlock(ctx, k, 7, 'bridge');
      }
      addEnemy(ctx, c + 3, GROUND_ROW - 1, smwFoe(ctx));
      addEnemy(ctx, c + 6, 6, 'koopa_red');
      putBlock(ctx, c + 4, 4, 'question', 'feather');
      return { width: 11, coinCol: c + 5, coinRow: 2.8 };
    }
  }
}

// 5 Unique Castle Plans (Y-4, D-4, V-4, B-4, K-4) — 0% duplicated plans
const SMW_CASTLE_PLANS: SmwCastleSection[][] = [
  // Y-4 (Mundo 1: Castillo de Iggy)
  ['lava_trench', 'chuck_bastion', 'synced_lift', 'rotating_maze_hall', 'vertical_lift', 'castle_supply'],
  // D-4 (Mundo 2: Fortaleza de Morton)
  ['magma_steps', 'thwomp_hall', 'pendulum_lifts', 'twin_tier_gauntlet', 'rotating_bridge', 'sunken_lava_dais', 'castle_supply'],
  // V-4 (Mundo 3: Bastión de Lemmy)
  ['bill_gallery', 'magma_catwalk', 'synced_lift', 'chuck_hallway', 'thwomp_hall', 'vertical_lift', 'castle_supply'],
  // B-4 (Mundo 4: Torreón de Ludwig)
  ['thwomp_hall', 'pendulum_lifts', 'bill_gallery', 'rotating_maze_hall', 'magma_steps', 'chuck_bastion', 'twin_tier_gauntlet', 'castle_supply'],
  // K-4 (Mundo 5: Gran Castillo Koopa)
  ['magma_catwalk', 'chuck_bastion', 'sunken_lava_dais', 'synced_lift', 'thwomp_hall', 'rotating_bridge', 'bill_gallery', 'pendulum_lifts', 'castle_supply'],
];

function dragonCoinSlots(n: number): Set<number> {
  const slots = new Set<number>();
  for (let i = 0; i < 5; i++) slots.add(Math.round((i * (n - 1)) / 4));
  return slots;
}

// ============================================================================
// SMW FORTRESS STAGE BUILDER (Y-4, D-4, V-4, B-4, K-4)
// ============================================================================
function buildSmwFortressStage(ctx: SmwCtx): { totalCols: number; boss: FortressBoss } {
  const w = ctx.worldNum;
  // Entrance opening (cols 8..15)
  putBlock(ctx, 8, 8, 'rotating');
  putBlock(ctx, 9, 8, 'question', 'feather');
  putBlock(ctx, 10, 8, 'rotating');
  if (w >= 3) putBlock(ctx, 11, 8, 'rotating');
  addFoe(ctx, 14);

  const plan = SMW_CASTLE_PLANS[Math.min(SMW_CASTLE_PLANS.length - 1, w - 1)];
  const slots = dragonCoinSlots(plan.length);
  let cursor = 18;
  plan.forEach((section, i) => {
    const res = buildSmwCastleSection(ctx, section, cursor);
    if (slots.has(i)) {
      addDragonCoin(ctx, res.coinCol, res.coinRow);
    }
    cursor += res.width + 2;
  });

  const totalCols = cursor + 36;
  for (let col = 0; col < totalCols; col++) {
    if (!ctx.blockGrid.has(gridKey(col, 0))) putBlock(ctx, col, 0, 'hard');
  }

  // Rey Koopa Castle Arena (4 authentic styles with varied lengths & battlements)
  const arenaStyle = (w - 1) % 4;
  const bridgeLen = 12 + arenaStyle; // 12, 13, 14, 15
  const arenaStart = totalCols - (bridgeLen + 18);
  const bridgeStart = arenaStart + 4;
  const bridgeCols: number[] = [];

  // Approach steps
  putBlock(ctx, arenaStart + 2, 11, 'hard');
  putBlock(ctx, arenaStart + 3, 10, 'hard');
  putBlock(ctx, arenaStart + 3, 11, 'hard');

  // Suspension bridge over magma
  for (let b = 0; b < bridgeLen; b++) {
    const col = bridgeStart + b;
    ctx.pits.add(col);
    ctx.lavaCols.add(col);
    putBlock(ctx, col, 10, 'bridge');
    bridgeCols.push(col);
  }

  const axeCol = bridgeStart + bridgeLen;
  putBlock(ctx, axeCol, 10, 'hard');
  putBlock(ctx, axeCol, 11, 'hard');

  // Varied battlements based on arenaStyle & SMW Koopaling puzzle mechanics
  switch (arenaStyle) {
    case 0: // Y-4 (Iggy): on_off_trap — central on_block bridge + on_off_switch + question feather
      for (let c = bridgeStart + 4; c <= bridgeStart + 8; c++) {
        putBlock(ctx, c, 10, 'on_block');
      }
      for (let k = 0; k < 5; k++) {
        putBlock(ctx, bridgeStart + 3 + k, 5, 'rotating');
      }
      putBlock(ctx, bridgeStart + 5, 6, 'on_off_switch');
      putBlock(ctx, bridgeStart + 6, 6, 'question', 'feather');
      break;

    case 1: // D-4 (Morton): shell_ricochet — high dual catwalk + koopa_green at entrance + question feather
      for (let k = 0; k < 7; k++) {
        if (k !== 3) putBlock(ctx, bridgeStart + 2 + k, 6, 'hard');
      }
      putBlock(ctx, bridgeStart + 3, 3, 'question', 'feather');
      addEnemy(ctx, arenaStart + 2, 9, 'koopa_green');
      break;

    case 2: // V-4 (Lemmy): pillar_stomp — stepping pillars + on_off_switch + question feather
      putBlock(ctx, bridgeStart + 3, 9, 'hard');
      putBlock(ctx, bridgeStart + 3, 8, 'hard');
      putBlock(ctx, bridgeStart + 6, 8, 'hard');
      putBlock(ctx, bridgeStart + 6, 6, 'on_off_switch');
      putBlock(ctx, bridgeStart + 9, 8, 'hard');
      putBlock(ctx, bridgeStart + 9, 9, 'hard');
      putBlock(ctx, bridgeStart + 5, 4, 'rotating');
      putBlock(ctx, bridgeStart + 6, 4, 'hard');
      putBlock(ctx, bridgeStart + 7, 4, 'question', 'feather');
      break;

    case 3: // B-4 / K-4 (Ludwig / Bowser): crown_mirror — on_block bridge + switch + koopa_green + feather
      for (let c = bridgeStart + 4; c <= bridgeStart + 7; c++) {
        putBlock(ctx, c, 10, 'on_block');
      }
      for (let k = bridgeStart + bridgeLen - 3; k <= bridgeStart + bridgeLen; k++) {
        putBlock(ctx, k, 9, 'hard');
      }
      putBlock(ctx, bridgeStart + 4, 4, 'question', 'feather');
      putBlock(ctx, bridgeStart + 5, 4, 'rotating');
      putBlock(ctx, bridgeStart + 6, 5, 'on_off_switch');
      putBlock(ctx, bridgeStart + 8, 4, 'rotating');
      addEnemy(ctx, arenaStart + 2, 9, 'koopa_green');
      break;
  }

  const puzzleKind = (['on_off_trap', 'shell_ricochet', 'pillar_stomp', 'crown_mirror'] as const)[arenaStyle];
  const maxHp = 6 + w * 2;
  const boss: FortressBoss = {
    x: (bridgeStart + Math.floor(bridgeLen * 0.6)) * TILE,
    y: 10 * TILE - 60,
    homeX: (bridgeStart + Math.floor(bridgeLen * 0.6)) * TILE,
    vx: -1.2,
    vy: 0,
    width: 56,
    height: 60,
    hp: maxHp,
    maxHp,
    facing: -1,
    onGround: false,
    jumpTimer: 72,
    fireTimer: 90,
    roarTimer: 0,
    hurtFlashTimer: 0,
    defeated: false,
    fallingInLava: false,
    axeX: axeCol * TILE,
    axeY: 9 * TILE,
    axeGrabbed: false,
    bridgeCols,
    bridgeCollapseTimer: 0,
    puzzleKind,
    phase: 'idle',
    phaseTimer: 120,
    shellSpawnTimer: 150,
  };

  return { totalCols, boss };
}

// ============================================================================
// CURATED SMW STAGE BLUEPRINTS (5 Acts, 0 Repeated Setpieces, Varied Openings & Finales)
// ============================================================================
interface SmwStageBlueprint {
  opening: SmwOpeningStyle;
  act1: SmwSetpiece;
  trans1: SmwTransitionKind;
  act2: SmwSetpiece;
  midpoint: SmwMidpointStyle;
  act3: SmwSetpiece;
  trans2: SmwTransitionKind;
  act4: SmwSetpiece;
  act5?: SmwSetpiece;
  finale: SmwFinaleStyle;
}

const SMW_STAGE_BLUEPRINTS: Record<number, SmwStageBlueprint> = {
  // Y-2: Colinas Baya Dulce (idx 1)
  1: {
    opening: 'smw_yoshi_meadow',
    act1: 'yoshi_berry_orchard',
    trans1: 'smw_berry_step_3',
    act2: 'cape_runway_skyway',
    midpoint: 'smw_checkpoint_berry_oasis',
    act3: 'galoomba_meadow',
    trans2: 'smw_rotating_arch_5',
    act4: 'rex_hill',
    finale: 'smw_classic_staircase',
  },
  // Y-3: Cumbres Pluma Dorada (idx 2)
  2: {
    opening: 'smw_cape_runway',
    act1: 'cape_hoop_slalom',
    trans1: 'smw_elevation_terrace_5',
    act2: 'donut_lifts',
    midpoint: 'smw_checkpoint_gazebo',
    act3: 'pipe_valley',
    trans2: 'smw_slide_underpass_4',
    act4: 'rotating_staircase',
    finale: 'smw_sky_bridge_sprint',
  },
  // D-1: Pradera del Vuelo (idx 4)
  4: {
    opening: 'smw_treetop_drop',
    act1: 'berry_treetop_canopy',
    trans1: 'smw_berry_step_3',
    act2: 'rex_terrace_paratroopa',
    midpoint: 'smw_checkpoint_terrace',
    act3: 'feather_cloud_trail',
    trans2: 'smw_slide_underpass_4',
    act4: 'donut_secret_underpass',
    finale: 'smw_twin_deck_finish',
  },
  // D-2: Gruta Rosquilla (idx 5)
  5: {
    opening: 'smw_rotating_gate',
    act1: 'rotating_block_vault',
    trans1: 'smw_mini_pipe_4',
    act2: 'spinjump_spiny_trench',
    midpoint: 'smw_checkpoint_rotating_arch',
    act3: 'vanilla_crystal_lifts',
    trans2: 'smw_elevation_terrace_5',
    act4: 'switch_palace_vault',
    finale: 'smw_stepping_pillars',
  },
  // D-3: Puentes de Mantequilla (idx 6)
  6: {
    opening: 'smw_spring_vault',
    act1: 'yoshi_fire_gauntlet',
    trans1: 'smw_mini_pipe_4',
    act2: 'chuck_baseball_diamond',
    midpoint: 'smw_checkpoint_terrace',
    act3: 'bullet_bill_canyon',
    trans2: 'smw_slide_underpass_4',
    act4: 'chuck_stadium',
    finale: 'smw_spring_apex_launch',
  },
  // V-1: Caverna Espejismo (idx 8)
  8: {
    opening: 'smw_pipe_orchard',
    act1: 'vanilla_dome_stalactites',
    trans1: 'smw_slide_underpass_4',
    act2: 'spiny_spinjump_bridge',
    midpoint: 'smw_checkpoint_terrace',
    act3: 'donut_lifts',
    trans2: 'smw_mini_pipe_4',
    act4: 'bullet_bill_canyon',
    finale: 'smw_classic_staircase',
  },
  // V-2: Lago Subterráneo (idx 9)
  9: {
    opening: 'smw_rotating_gate',
    act1: 'rotating_block_vault',
    trans1: 'smw_elevation_terrace_5',
    act2: 'forest_illusion_loop',
    midpoint: 'smw_checkpoint_rotating_arch',
    act3: 'pipe_valley',
    trans2: 'smw_breather_2',
    act4: 'vanilla_crystal_lifts',
    finale: 'smw_twin_deck_finish',
  },
  // V-3: Ascenso de Cuarzo (idx 10)
  10: {
    opening: 'smw_spring_vault',
    act1: 'rotating_staircase',
    trans1: 'smw_berry_step_3',
    act2: 'vanilla_dome_stalactites',
    midpoint: 'smw_checkpoint_gazebo',
    act3: 'rex_hill',
    trans2: 'smw_rotating_arch_5',
    act4: 'feather_cloud_trail',
    finale: 'smw_stepping_pillars',
  },
  // B-1: Sendero de las Copas (idx 12)
  12: {
    opening: 'smw_yoshi_meadow',
    act1: 'yoshi_fire_gauntlet',
    trans1: 'smw_elevation_terrace_5',
    act2: 'berry_treetop_canopy',
    midpoint: 'smw_checkpoint_berry_oasis',
    act3: 'chuck_stadium',
    trans2: 'smw_breather_2',
    act4: 'rex_terrace_paratroopa',
    finale: 'smw_sky_bridge_sprint',
  },
  // B-2: Laberinto Giratorio (idx 13)
  13: {
    opening: 'smw_yoshi_meadow',
    act1: 'forest_illusion_loop',
    trans1: 'smw_mini_pipe_4',
    act2: 'switch_palace_vault',
    midpoint: 'smw_checkpoint_rotating_arch',
    act3: 'pipe_valley',
    trans2: 'smw_slide_underpass_4',
    act4: 'cape_runway_skyway',
    finale: 'smw_classic_staircase',
  },
  // B-3: Vuelo Estelar (idx 14)
  14: {
    opening: 'smw_cape_runway',
    act1: 'cape_hoop_slalom',
    trans1: 'smw_breather_2',
    act2: 'donut_secret_underpass',
    midpoint: 'smw_checkpoint_gazebo',
    act3: 'chuck_baseball_diamond',
    trans2: 'smw_rotating_arch_5',
    act4: 'galoomba_meadow',
    finale: 'smw_spring_apex_launch',
  },
  // K-1: Cañón Balas Bill (idx 16)
  16: {
    opening: 'smw_pipe_orchard',
    act1: 'bullet_bill_canyon',
    trans1: 'smw_elevation_terrace_5',
    act2: 'koopa_valley_airship_run',
    midpoint: 'smw_checkpoint_terrace',
    act3: 'chuck_baseball_diamond',
    trans2: 'smw_slide_underpass_4',
    act4: 'spiny_spinjump_bridge',
    act5: 'rex_hill',
    finale: 'smw_stepping_pillars',
  },
  // K-2: Catacumbas del Valle (idx 17)
  17: {
    opening: 'smw_pipe_orchard',
    act1: 'rotating_staircase',
    trans1: 'smw_breather_2',
    act2: 'vanilla_dome_stalactites',
    midpoint: 'smw_checkpoint_terrace',
    act3: 'yoshi_fire_gauntlet',
    trans2: 'smw_elevation_terrace_5',
    act4: 'bullet_bill_canyon',
    act5: 'chuck_stadium',
    finale: 'smw_twin_deck_finish',
  },
  // K-3: Asalto Aéreo Final (idx 18)
  18: {
    opening: 'smw_spring_vault',
    act1: 'koopa_valley_airship_run',
    trans1: 'smw_breather_2',
    act2: 'yoshi_fire_gauntlet',
    midpoint: 'smw_checkpoint_gazebo',
    act3: 'cape_hoop_slalom',
    trans2: 'smw_elevation_terrace_5',
    act4: 'donut_secret_underpass',
    act5: 'feather_cloud_trail',
    finale: 'smw_sky_bridge_sprint',
  },
};

// ============================================================================
// CURATED SMW STAGE ASSEMBLY
// ============================================================================
function buildCuratedSmwStage(ctx: SmwCtx): number {
  const bp = SMW_STAGE_BLUEPRINTS[ctx.levelIndex] ?? SMW_STAGE_BLUEPRINTS[1];

  // Act I: Opening
  let cursor = buildSmwOpeningStyle(ctx, bp.opening);

  // Dragon Coin #1: Placed near the opening / first setpiece transition
  addDragonCoin(ctx, cursor - 3, ctx.isUnderground ? 4.5 : 3.0);

  // Act I: Setpiece 1
  cursor += buildSmwSetpiece(ctx, bp.act1, cursor);

  // Transition 1
  cursor += buildSmwTransition(ctx, bp.trans1, cursor);

  // Service Plaza for Vault (100% Guaranteed Success for Secrets)
  cursor += buildSmwServicePlaza(ctx, cursor, 'vault_plaza');

  // Act II: Setpiece 2
  const act2Start = cursor;
  cursor += buildSmwSetpiece(ctx, bp.act2, cursor);

  // Dragon Coin #2: Placed on the high branch of Act II
  addDragonCoin(ctx, act2Start + 5, ctx.isUnderground ? 5.0 : 3.5);

  // Midpoint Checkpoint Plaza
  cursor += buildSmwMidpointPlaza(ctx, cursor, bp.midpoint);

  // Dragon Coin #3: Right after checkpoint plaza
  addDragonCoin(ctx, cursor + 2, 5.0);

  // Act III: Setpiece 3
  cursor += buildSmwSetpiece(ctx, bp.act3, cursor);

  // Service Plaza for Abilities (100% Guaranteed Spot for Wall Jump Chimney)
  cursor += buildSmwServicePlaza(ctx, cursor, 'shaft_plaza');

  // Transition 2
  cursor += buildSmwTransition(ctx, bp.trans2, cursor);

  // Act IV: Setpiece 4
  const act4Start = cursor;
  cursor += buildSmwSetpiece(ctx, bp.act4, cursor);

  // Dragon Coin #4: In Act IV challenge zone
  addDragonCoin(ctx, act4Start + 6, ctx.isUnderground ? 6.0 : 4.5);

  // Optional Act V for deep world stages (K-1, K-2, K-3)
  if (bp.act5) {
    cursor += buildSmwTransition(ctx, 'smw_breather_2', cursor);
    cursor += buildSmwSetpiece(ctx, bp.act5, cursor);
  }

  // Pre-GoalTape Finale
  const finaleWidth = buildSmwFinaleStyle(ctx, bp.finale, cursor);

  // Dragon Coin #5: High apex jump right before the Goal Tape!
  addDragonCoin(ctx, cursor + Math.floor(finaleWidth * 0.5), 3.8);

  cursor += finaleWidth;

  if (ctx.isUnderground) {
    for (let col = 4; col < cursor; col++) {
      if (col % 19 !== 0 && col % 19 !== 1 && !ctx.blockGrid.has(gridKey(col, 0))) {
        putBlock(ctx, col, 0, 'brick');
      }
    }
  }

  return cursor + 16;
}

// ============================================================================
// MAIN EXPORT: buildSmwWorldState
// ============================================================================
export function buildSmwWorldState(
  levelIndex: number,
  carryState?: {
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
): WorldState {
  const clampedIdx = Math.max(0, Math.min(levelIndex, SMW_TOTAL_LEVELS - 1));
  const worldNum = Math.floor(clampedIdx / STAGES_PER_WORLD) + 1;
  const stageNum = (clampedIdx % STAGES_PER_WORLD) + 1;
  const biomeId = getStageBiome(clampedIdx, 'smw');
  const biome = BIOMES[biomeId];

  const ctx: SmwCtx = {
    levelIndex: clampedIdx,
    worldNum,
    stageNum,
    difficulty: 1 + clampedIdx * 0.055,
    nextId: 1,
    blocks: [],
    blockGrid: new Map<number, Block>(),
    pipes: [],
    platforms: [],
    springs: [],
    enemies: [],
    coins: [],
    dragonCoins: [],
    berries: [],
    pits: new Set<number>(),
    lavaCols: new Set<number>(),
    isFortress: stageNum === 4,
    isUnderground: biome.underground,
    enemySeq: 0,
  };

  let totalCols = 140;
  let boss: FortressBoss | null = null;

  if (stageNum === 4) {
    const built = buildSmwFortressStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (clampedIdx === 0) {
    totalCols = buildSmwStageY1(ctx);
  } else {
    totalCols = buildCuratedSmwStage(ctx);
  }

  // Ensure solid ground at spawn (cols 0..9) and goal/tape area
  for (let c = 0; c <= 9; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  for (let c = totalCols - 12; c < totalCols; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  // Populate solid ground
  for (let col = 0; col < totalCols; col++) {
    if (!ctx.pits.has(col)) {
      putBlock(ctx, col, GROUND_ROW, 'ground_top');
      putBlock(ctx, col, GROUND_ROW + 1, 'ground_deep');
    }
  }

  // Sanitize enemy spawns: avoid placing ground enemies inside solid blocks or over pits
  ctx.enemies = ctx.enemies.filter((en) => {
    if (en.type === 'piranha' || en.type === 'bullet_bill') return true;
    const col = Math.floor(en.x / TILE);
    const row = Math.floor((en.y + en.height - 2) / TILE);
    if (ctx.blockGrid.has(gridKey(col, row))) return false;
    if (row === GROUND_ROW - 1 && ctx.pits.has(col)) return false;
    return true;
  });

  // Mid-stage Checkpoint Gate
  let checkpointCol = Math.floor(totalCols * 0.5);
  for (let offset = 0; offset < 24; offset++) {
    const tryCol = checkpointCol + (offset % 2 === 0 ? offset >> 1 : -(offset >> 1));
    const pipeBlocked = ctx.pipes.some((p) => Math.abs(p.x - tryCol * TILE) < TILE * 2);
    if (
      !ctx.pits.has(tryCol) &&
      !ctx.blockGrid.has(gridKey(tryCol, GROUND_ROW - 1)) &&
      !ctx.blockGrid.has(gridKey(tryCol, GROUND_ROW - 2)) &&
      !pipeBlocked
    ) {
      checkpointCol = tryCol;
      break;
    }
  }

  const alreadyAtCheckpoint =
    carryState?.checkpointX != null && carryState.checkpointX > 0;
  const checkpoint: Checkpoint = {
    x: checkpointCol * TILE + 6,
    y: (GROUND_ROW - 2) * TILE,
    width: 20,
    height: 2 * TILE,
    activated: alreadyAtCheckpoint,
  };

  // Parallax Scenery
  const sceneries: SceneryProp[] = [];
  if (clampedIdx === 0) {
    sceneries.push({
      kind: 'yoshi_house',
      x: -116,
      y: GROUND_ROW * TILE,
      scale: 1,
      parallax: 1.0,
    });
  }

  for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
    if (biome.underground) {
      sceneries.push({
        kind: ctx.isFortress ? 'banner' : 'pillar',
        x: i * 240 + 60,
        y: TILE,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.55,
      });
    } else {
      sceneries.push({
        kind: 'cloud',
        x: i * 210 + 30,
        y: 34 + (Math.abs(i) % 3) * 24,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.35,
      });
      sceneries.push({
        kind: 'smw_hill',
        x: i * 250 + 20,
        y: GROUND_ROW * TILE,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.62,
      });
      sceneries.push({
        kind: 'bush',
        x: i * 250 + 160,
        y: GROUND_ROW * TILE,
        scale: (Math.abs(i) % 3) + 1,
        parallax: 1.0,
      });
    }
  }

  // SMW Goal Tape Gate
  let goalTape: GoalTape | null = null;
  if (stageNum !== 4) {
    const gateCol = totalCols - 10;
    const topY = 3 * TILE;
    const gateH = 9 * TILE;
    goalTape = {
      x: gateCol * TILE + 8,
      y: topY,
      width: 28,
      height: gateH,
      barY: topY + gateH - 28,
      barVy: -2.4,
      triggered: false,
      castleX: (gateCol + 3.5) * TILE,
      castleY: GROUND_ROW * TILE - 128,
    };
  }

  const carryYoshi = stageNum !== 4 && Boolean(carryState?.mountedYoshi);
  const player = createInitialPlayer(carryState?.powerState ?? 0, carryYoshi);
  if (alreadyAtCheckpoint && carryState?.checkpointX != null) {
    player.x = carryState.checkpointX;
    player.y = GROUND_ROW * TILE - player.height;
  }

  const startCameraX = Math.max(MIN_CAMERA_WORLD_X, player.x - 304);

  return {
    partition: 'smw',
    totalStagesInPartition: SMW_TOTAL_LEVELS,
    status: 'playing',
    levelIndex: clampedIdx,
    worldLabel: getWorldLabel(clampedIdx, 'smw'),
    stageTitle: SMW_STAGE_TITLES[clampedIdx] ?? `Isla ${getWorldLabel(clampedIdx, 'smw')}`,
    biomeId,
    totalCols,
    score: carryState?.score ?? 0,
    highScore: carryState?.highScore ?? 0,
    coins: carryState?.coins ?? 0,
    lives: carryState?.lives ?? 5,
    timeLeft: 400,
    timeTick: 0,
    frameCount: 0,
    statusTimer: 0,
    cameraX: startCameraX,
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
    dragonCoins: ctx.dragonCoins,
    dragonCoinsCollected: 0,
    berries: ctx.berries,
    fireballs: [],
    coinsList: ctx.coins,
    particles: [],
    floatingTexts: [],
    sceneries,
    lavaCols: ctx.lavaCols,
    flagpole: null,
    goalTape,
    prevJumpHeld: false,
    prevFireHeld: false,
    prevSpinHeld: false,
    doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
    nextEntityId: ctx.nextId,
  };
}
