import { GROUND_ROW, STAGES_PER_WORLD, TILE } from '../engine/biomes';
import type {
  Block,
  BlockContent,
  BlockType,
  CoinEntity,
  Enemy,
  EnemyType,
  FortressBoss,
  GamePartition,
  MovingPlatform,
  Pipe,
  Player,
  PowerState,
  Spring,
} from '../engine/types';

// ============================================================================
// GRAMMAR & BLUEPRINT TYPES (Argon Redesign)
// ============================================================================

export type OpeningStyle =
  | 'meadow_plaza'
  | 'sunken_courtyard'
  | 'pipe_terrace'
  | 'canopy_drop'
  | 'spring_launch_pad'
  | 'split_tunnel'
  | 'bridge_arch'
  | 'windmill_runway';

export type FinaleStyle =
  | 'classic_staircase'
  | 'sky_platform_leap'
  | 'spring_citadel_launch'
  | 'twin_deck_sprint'
  | 'stepping_archway'
  | 'cloud_highway_drop'
  | 'moving_lift_tower'
  | 'gauntlet_ramp';

export type TransitionKind =
  | 'breather_2'
  | 'coin_step_3'
  | 'mini_pipe_4'
  | 'arch_split_5'
  | 'slide_gate_4'
  | 'elevation_terrace_5';

export type MidpointStyle =
  | 'gazebo_lookout'
  | 'arch_sanctuary'
  | 'high_terrace'
  | 'sunken_oasis';

export type FortressSection =
  | 'lava_pillar'
  | 'guard_corridor'
  | 'lift_chasm'
  | 'dual_route'
  | 'vertical_lift'
  | 'lava_staircase'
  | 'cramped_hall'
  | 'pillar_hops'
  | 'supply_room'
  | 'magma_catwalk'
  | 'chuck_bastion'
  | 'pendulum_lifts'
  | 'rotating_maze_hall'
  | 'sunken_lava_dais'
  | 'twin_tier_gauntlet'
  | 'fire_bar_alley'
  | 'crusher_drop'
  | 'spiny_gauntlet';

export type ArenaStyle = 0 | 1 | 2 | 3;

export interface StageBlueprint<TSetpiece = string> {
  opening: OpeningStyle;
  act1: TSetpiece | TSetpiece[];
  trans1?: TransitionKind;
  act2: TSetpiece | TSetpiece[];
  midpoint?: MidpointStyle;
  act3: TSetpiece | TSetpiece[];
  trans2?: TransitionKind;
  act4: TSetpiece | TSetpiece[];
  finale: FinaleStyle;
}

export interface BuilderCtx {
  levelIndex: number;
  designIndex: number;
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
  pits: Set<number>;
  lavaCols: Set<number>;
  isFortress: boolean;
  isUnderground: boolean;
  enemySeq: number;
  partition: GamePartition;
  worldRows?: number;
}

// ============================================================================
// CORE BUILDER PRIMITIVES
// ============================================================================

export function gridKey(col: number, row: number): number {
  return row * 1024 + col;
}

export function createInitialPlayer(
  powerState: PowerState = 0,
  mountedYoshi = false
): Player {
  const height = mountedYoshi ? 52 : powerState > 0 ? 46 : 30;
  return {
    x: 2.5 * TILE,
    y: GROUND_ROW * TILE - height,
    vx: 0,
    vy: 0,
    width: 22,
    height,
    powerState,
    onGround: true,
    crouching: false,
    skidding: false,
    facing: 1,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    airJumpsLeft: 0,
    invulnTimer: 0,
    starTimer: 0,
    fireCooldown: 0,
    throwPoseTimer: 0,
    stompCombo: 0,
    animTimer: 0,
    dead: false,
    enteringCastle: false,
    pMeter: 0,
    capeFlying: false,
    capeFlightTimer: 0,
    capeDiveSpeed: 0,
    capeSpinTimer: 0,
    spinJumping: false,
    mountedYoshi,
    yoshiTongueTimer: 0,
    yoshiTonguePhase: 0,
    yoshiMouthItem: 'none',
    berriesEaten: 0,
  };
}

export function putBlock(
  ctx: BuilderCtx,
  col: number,
  row: number,
  type: BlockType,
  content: BlockContent = null
): void {
  const maxRows = (ctx.worldRows ?? 14) + 1;
  if (col < 0 || col > 1000 || row < 0 || row >= maxRows) return;
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

export function removeBlock(ctx: BuilderCtx, col: number, row: number): void {
  const key = gridKey(col, row);
  const prev = ctx.blockGrid.get(key);
  if (prev) {
    const idx = ctx.blocks.indexOf(prev);
    if (idx !== -1) ctx.blocks.splice(idx, 1);
    ctx.blockGrid.delete(key);
  }
}

export function addCoin(ctx: BuilderCtx, col: number, rowFloat: number): void {
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

export function addCoinArc(
  ctx: BuilderCtx,
  startCol: number,
  count: number,
  peakRow: number
): void {
  for (let i = 0; i < count; i++) {
    const norm = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
    const yRow = peakRow + norm * norm * 1.4;
    addCoin(ctx, startCol + i, yRow);
  }
}

export function addPipe(
  ctx: BuilderCtx,
  col: number,
  heightTiles: number,
  hasPiranha: boolean
): void {
  // Ensure ground beneath pipe is never a pit
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
      y: topRow * TILE + 8, // starts hidden inside pipe
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

export function addEnemy(
  ctx: BuilderCtx,
  col: number,
  rowAboveBottom: number,
  type: EnemyType
): void {
  if (type === 'bullet_bill' && rowAboveBottom >= GROUND_ROW - 1) rowAboveBottom = 8;
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
      : type === 'spiny'
      ? 1.25
      : type === 'paratroopa'
      ? 1.15
      : type === 'koopa_red'
      ? 1.2
      : 1.1;
  const vx = -baseSpeed * (type === 'bullet_bill' ? 1 : 1 + (ctx.difficulty - 1) * 0.35);
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

export function addSpring(ctx: BuilderCtx, col: number, rowOnTopOf: number): void {
  ctx.springs.push({
    x: col * TILE + 3,
    y: (rowOnTopOf - 1) * TILE + 4,
    width: 26,
    height: 28,
    compressTimer: 0,
  });
}

export function addPlatform(
  ctx: BuilderCtx,
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

export function carvePit(
  ctx: BuilderCtx,
  startCol: number,
  widthCols: number,
  asLava = false
): void {
  const safeWidth = Math.max(1, Math.min(widthCols, 4));
  for (let c = startCol; c < startCol + safeWidth; c++) {
    ctx.pits.add(c);
    if (asLava || ctx.isFortress) {
      ctx.lavaCols.add(c);
    }
  }
}

// ============================================================================
// ENEMY ROSTERS & RANDOMNESS SEEDING
// ============================================================================

const CLASSIC_ROSTERS: EnemyType[][] = [
  ['goomba', 'goomba', 'koopa_green'],
  ['goomba', 'koopa_red', 'goomba', 'koopa_green'],
  ['koopa_green', 'paratroopa', 'goomba', 'koopa_red'],
  ['spiny', 'goomba', 'koopa_red', 'paratroopa'],
  ['koopa_red', 'spiny', 'paratroopa', 'goomba', 'spiny'],
  ['spiny', 'koopa_red', 'paratroopa', 'spiny', 'koopa_green'],
];

const SMW_ROSTERS: EnemyType[][] = [
  ['galoomba', 'koopa_green', 'rex'],
  ['galoomba', 'koopa_red', 'rex', 'paratroopa'],
  ['chuck', 'koopa_green', 'spiny', 'galoomba'],
  ['rex', 'spiny', 'chuck', 'koopa_red'],
  ['chuck', 'bullet_bill', 'spiny', 'rex'],
];

const DIM_ROSTERS: EnemyType[][] = [
  ['galoomba', 'paratroopa', 'koopa_green', 'rex'],
  ['goomba', 'rex', 'koopa_red', 'chuck'],
  ['spiny', 'koopa_green', 'paratroopa', 'galoomba'],
  ['chuck', 'bullet_bill', 'spiny', 'rex', 'koopa_red'],
  ['paratroopa', 'galoomba', 'koopa_red', 'bullet_bill'],
  ['goomba', 'spiny', 'rex', 'koopa_green'],
  ['bullet_bill', 'chuck', 'koopa_red', 'paratroopa', 'galoomba'],
  ['chuck', 'spiny', 'bullet_bill', 'rex', 'paratroopa', 'koopa_red'],
];

const EXP_ROSTERS: EnemyType[][] = [
  ['galoomba', 'koopa_green', 'goomba', 'paratroopa'],
  ['rex', 'koopa_red', 'galoomba', 'spiny'],
  ['koopa_red', 'bullet_bill', 'chuck', 'galoomba'],
  ['paratroopa', 'rex', 'koopa_green', 'spiny'],
  ['chuck', 'spiny', 'rex', 'bullet_bill', 'koopa_red'],
  ['paratroopa', 'galoomba', 'bullet_bill', 'koopa_green'],
  ['spiny', 'chuck', 'koopa_red', 'rex', 'bullet_bill'],
];

const FORTUNE_ROSTERS: EnemyType[][] = [
  ['goomba', 'koopa_red', 'chuck', 'galoomba'],
  ['koopa_red', 'rex', 'goomba', 'paratroopa'],
  ['chuck', 'bullet_bill', 'koopa_green', 'spiny'],
  ['spiny', 'chuck', 'koopa_red', 'rex', 'bullet_bill'],
];

const MIRAGE_ROSTERS: EnemyType[][] = [
  ['thief', 'koopa_green', 'galoomba', 'paratroopa'],
  ['thief', 'spiny', 'koopa_red', 'rex'],
  ['thief', 'bullet_bill', 'koopa_red', 'galoomba'],
  ['thief', 'chuck', 'spiny', 'rex', 'koopa_red'],
];

const ECHO_ROSTERS: EnemyType[][] = [
  ['goomba', 'koopa_red', 'galoomba', 'paratroopa'],
  ['rex', 'koopa_green', 'chuck', 'spiny'],
  ['chuck', 'bullet_bill', 'koopa_red', 'galoomba'],
  ['spiny', 'rex', 'chuck', 'koopa_red', 'bullet_bill'],
];

export function foe(ctx: BuilderCtx): EnemyType {
  const rosters =
    ctx.partition === 'smw'
      ? SMW_ROSTERS
      : ctx.partition === 'expedition' || ctx.partition === 'frontier'
      ? EXP_ROSTERS
      : ctx.partition === 'fortune'
      ? FORTUNE_ROSTERS
      : ctx.partition === 'mirage'
      ? MIRAGE_ROSTERS
      : ctx.partition === 'echo'
      ? ECHO_ROSTERS
      : ctx.partition === 'dimension'
      ? DIM_ROSTERS
      : CLASSIC_ROSTERS;
  const rosterWorld =
    ctx.partition === 'frontier'
      ? Math.floor(ctx.designIndex / STAGES_PER_WORLD)
      : ctx.worldNum - 1;
  const roster = rosters[Math.max(0, Math.min(rosters.length - 1, rosterWorld))];
  const type = roster[ctx.enemySeq % roster.length];
  ctx.enemySeq++;
  return type;
}

export function variantOf(ctx: BuilderCtx, salt: number): number {
  return Math.abs((ctx.levelIndex * 7 + salt * 3 + ctx.worldNum) % 3);
}

// ============================================================================
// ELEVATION CONTOURS (Guaranteed consecutiveGap <= 4)
// ============================================================================

/**
 * Creates an elevated plateau with solid ground underneath at GROUND_ROW (12).
 * Fills from topRow down to GROUND_ROW - 1 (11).
 */
export function addPlateau(
  ctx: BuilderCtx,
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

/**
 * Carves a chasm of widthCols while placing stepping stone islands or bridges
 * at elevationRow (clamped 7..10) every 2-3 columns, guaranteeing unbridged gap <= 3.
 */
export function addSkyIslands(
  ctx: BuilderCtx,
  startCol: number,
  widthCols: number,
  elevationRow = 8
): void {
  const row = Math.max(7, Math.min(10, elevationRow));
  for (let c = startCol; c < startCol + widthCols; c++) {
    ctx.pits.add(c);
    if (ctx.isFortress) ctx.lavaCols.add(c);
  }
  // Step every 3 columns so consecutive gap never exceeds 2-3
  for (let c = startCol + 2; c < startCol + widthCols; c += 3) {
    putBlock(ctx, c, row, 'hard');
    if (c + 1 < startCol + widthCols && widthCols > 5) {
      putBlock(ctx, c + 1, row, 'hard');
    }
    addCoin(ctx, c, row - 1.5);
  }
}

// ============================================================================
// THE 8 OPENING STYLES (Act I Entrance, cols 8..16, returns next cursor ~17)
// ============================================================================

export function buildOpeningStyle(ctx: BuilderCtx, style: OpeningStyle): number {
  // Ensure spawn ground is solid
  for (let c = 0; c <= 17; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  const v = variantOf(ctx, 11);
  switch (style) {
    case 'meadow_plaza': {
      // Classic welcoming arch with look-out step
      putBlock(ctx, 9, 8, 'question', v === 0 ? 'powerup' : 'coin');
      putBlock(ctx, 11, 11, 'hard');
      putBlock(ctx, 12, 10, 'hard');
      putBlock(ctx, 12, 11, 'hard');
      putBlock(ctx, 14, 8, 'brick', 'coin');
      addCoin(ctx, 12, 8.5);
      addCoin(ctx, 15, 10);
      return 17;
    }

    case 'sunken_courtyard': {
      // Low courtyard flanked by stone boundary pillars and coin arc
      putBlock(ctx, 9, 10, 'hard');
      putBlock(ctx, 9, 11, 'hard');
      putBlock(ctx, 12, 6, 'question', 'powerup');
      addCoinArc(ctx, 10, 5, 8.0);
      putBlock(ctx, 15, 10, 'hard');
      putBlock(ctx, 15, 11, 'hard');
      return 17;
    }

    case 'pipe_terrace': {
      // Short pipe terrace + high powerup
      addPipe(ctx, 10, 2, false);
      putBlock(ctx, 13, 6, 'question', 'powerup');
      putBlock(ctx, 15, 10, 'hard');
      addCoin(ctx, 13, 8.5);
      return 17;
    }

    case 'canopy_drop': {
      // High ledge at row 8 with gentle step-down
      for (let c = 8; c <= 11; c++) {
        putBlock(ctx, c, 8, 'bridge');
        addCoin(ctx, c, 6.5);
      }
      putBlock(ctx, 12, 9, 'hard');
      putBlock(ctx, 13, 10, 'hard');
      putBlock(ctx, 14, 11, 'hard');
      putBlock(ctx, 15, 8, 'question', 'coin');
      return 17;
    }

    case 'spring_launch_pad': {
      // Trampoline into airborne coin walkway
      addSpring(ctx, 9, GROUND_ROW);
      for (let c = 11; c <= 15; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, 13, 2, 'question', 'powerup');
      return 17;
    }

    case 'split_tunnel': {
      // Brick ceiling for slide below or hop above
      for (let c = 9; c <= 14; c++) {
        putBlock(ctx, c, 8, 'brick');
        addCoin(ctx, c, 10.5);
      }
      putBlock(ctx, 12, 5, 'question', 'powerup');
      return 17;
    }

    case 'bridge_arch': {
      // Small bridged pit of 2 cols (consecutiveGap = 0) with brick arch
      ctx.pits.add(11);
      ctx.pits.add(12);
      putBlock(ctx, 11, 10, 'bridge');
      putBlock(ctx, 12, 10, 'bridge');
      for (let c = 10; c <= 13; c++) {
        putBlock(ctx, c, 7, 'brick');
      }
      putBlock(ctx, 11, 4, 'question', 'powerup');
      addCoin(ctx, 11, 8.5);
      addCoin(ctx, 12, 8.5);
      return 17;
    }

    case 'windmill_runway': {
      // Clean high-speed runway with coin row and lookout platform
      for (let c = 9; c <= 14; c++) {
        addCoin(ctx, c, 10.0);
      }
      putBlock(ctx, 12, 6, 'hard');
      putBlock(ctx, 13, 6, 'hard');
      putBlock(ctx, 14, 6, 'question', 'powerup');
      return 17;
    }
  }
}

// ============================================================================
// THE 6 TRANSITION KINDS (Varied widths 2..5 cols, break linear grids)
// ============================================================================

export function buildTransitionZone(
  ctx: BuilderCtx,
  kind: TransitionKind,
  col: number
): number {
  // Never create unbridged pits in transition zones
  for (let c = col; c < col + 6; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  switch (kind) {
    case 'breather_2': {
      // 2 clean cols of breathing room
      return 2;
    }

    case 'coin_step_3': {
      // 3 cols with stone step at row 11 and 2 coins
      putBlock(ctx, col + 1, 11, 'hard');
      addCoin(ctx, col, 10.0);
      addCoin(ctx, col + 2, 10.0);
      return 3;
    }

    case 'mini_pipe_4': {
      // 4 cols with short pipe (height 2) without piranha
      addPipe(ctx, col + 1, 2, false);
      addCoin(ctx, col + 3, 9.5);
      return 4;
    }

    case 'arch_split_5': {
      // 5 cols with arch of 3 bricks at row 7, coins underneath
      for (let c = col + 1; c <= col + 3; c++) {
        putBlock(ctx, c, 7, 'brick');
        addCoin(ctx, c, 10.5);
      }
      return 5;
    }

    case 'slide_gate_4': {
      // 4 cols with stone lintel at row 10 (slide ▼ below or leap above at row 6)
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 2, 10, 'hard');
      putBlock(ctx, col + 1, 6, 'brick');
      putBlock(ctx, col + 2, 6, 'question', 'coin');
      return 4;
    }

    case 'elevation_terrace_5': {
      // 5 cols with raised terrace at row 10 (ground row 12 solid underneath)
      addPlateau(ctx, col + 1, 3, 10, 'hard');
      addCoin(ctx, col + 2, 8.5);
      return 5;
    }
  }
}

// ============================================================================
// THE 4 MIDPOINT PLAZAS (Checkpoints hitos reconocibles, clean center)
// ============================================================================

export function buildMidpointPlaza(
  ctx: BuilderCtx,
  col: number,
  style: MidpointStyle = 'gazebo_lookout'
): number {
  const width = 8;
  for (let c = col; c < col + width; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  // Ensure center cols + 3 and + 4 are completely free of obstacles at rows 10-11
  removeBlock(ctx, col + 3, 10);
  removeBlock(ctx, col + 3, 11);
  removeBlock(ctx, col + 4, 10);
  removeBlock(ctx, col + 4, 11);

  switch (style) {
    case 'gazebo_lookout': {
      // Flanking stone pillars with high bridge gazebo arch
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 9, 'hard');
      putBlock(ctx, col + 6, 11, 'hard');
      putBlock(ctx, col + 6, 10, 'hard');
      putBlock(ctx, col + 6, 9, 'hard');
      for (let c = col + 1; c <= col + 6; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      putBlock(ctx, col + 3, 4, 'question', 'powerup');
      break;
    }

    case 'arch_sanctuary': {
      // Classical high arch spanning cols + 1 to + 6
      for (let c = col + 1; c <= col + 6; c++) {
        putBlock(ctx, c, 5, 'brick');
      }
      addCoinArc(ctx, col + 1, 6, 3.0);
      putBlock(ctx, col, 11, 'hard');
      putBlock(ctx, col + 7, 11, 'hard');
      break;
    }

    case 'high_terrace': {
      // Flanking terraces overlooking the checkpoint banner
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 6, 10, 'hard');
      putBlock(ctx, col + 6, 11, 'hard');
      putBlock(ctx, col + 1, 7, 'question', 'coin');
      putBlock(ctx, col + 6, 7, 'question', 'one_up');
      break;
    }

    case 'sunken_oasis': {
      // Parapets on flanks with overhanging vine canopy
      putBlock(ctx, col, 11, 'hard');
      putBlock(ctx, col + 7, 11, 'hard');
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      addCoin(ctx, col + 2, 4.5);
      addCoin(ctx, col + 5, 4.5);
      break;
    }
  }

  return width;
}

// ============================================================================
// SERVICE PLAZAS (100% Guaranteed Success for Secrets & Abilities)
// ============================================================================

/**
 * Inserts a 10-column pristine architectural plaza:
 * - 'vault_plaza': Ground at 12 solid, rows 5..11 completely clean for findVaultCol.
 *   Places a stone block at (col + 1, row 4) to serve as candidate for findKeySpot!
 * - 'shaft_plaza': Ground at 12 solid, rows 2..11 completely empty for findShaftCol.
 */
export function buildServicePlaza(
  ctx: BuilderCtx,
  col: number,
  kind: 'vault_plaza' | 'shaft_plaza'
): number {
  const width = 10;
  for (let c = col; c < col + width; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
    // Clear rows 2..11 of existing blocks
    for (let r = 2; r < GROUND_ROW; r++) {
      removeBlock(ctx, c, r);
    }
  }

  if (kind === 'vault_plaza') {
    // Upper decorative block at row 4 (with rows 2, 3 free above it)
    // Serves as guaranteed support for findKeySpot while row 4 < 5 keeps findVaultCol free!
    putBlock(ctx, col + 1, 4, 'hard');
    addCoin(ctx, col + 4, 7.5);
    addCoin(ctx, col + 5, 7.5);
  }

  return width;
}

// ============================================================================
// THE 8 FINALE STYLES (Pre-flagpole Climax, returns advance width)
// ============================================================================

export function buildFinaleStyle(
  ctx: BuilderCtx,
  style: FinaleStyle,
  col: number
): number {
  // Flag approach ground is always solid
  for (let c = col; c < col + 20; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  switch (style) {
    case 'classic_staircase': {
      // Dynamic height staircase 5..8 steps
      const steps = 5 + variantOf(ctx, col);
      for (let s = 0; s < steps; s++) {
        for (let h = 0; h <= s; h++) {
          putBlock(ctx, col + s, GROUND_ROW - 1 - h, 'hard');
        }
      }
      return steps + 4;
    }

    case 'sky_platform_leap': {
      // Moving lift shuttling to high row 5 platform for direct jump to flag peak
      addPlatform(ctx, col + 2, 9, 3, 0, 2.5, 0.04, 0);
      for (let c = col + 6; c <= col + 8; c++) {
        putBlock(ctx, c, 5, 'hard');
      }
      putBlock(ctx, col + 7, 2, 'question', 'one_up');
      return 12;
    }

    case 'spring_citadel_launch': {
      // Guarded citadel rampart + super spring towards flag apex
      for (let c = col + 2; c <= col + 4; c++) {
        putBlock(ctx, c, 8, 'hard');
        putBlock(ctx, c, 9, 'hard');
      }
      addEnemy(ctx, col + 3, 7, 'koopa_red');
      addSpring(ctx, col + 6, GROUND_ROW);
      addCoinArc(ctx, col + 6, 5, 4.0);
      return 12;
    }

    case 'twin_deck_sprint': {
      // Dual-tier sprint: lower road at row 10 + high reward bridge at row 5
      for (let c = col + 1; c <= col + 9; c++) {
        putBlock(ctx, c, 10, 'hard');
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, col + 5, 2, 'question', 'powerup');
      return 12;
    }

    case 'stepping_archway': {
      // Ascending pillars at rows 10, 8, 6, 4 with 1-col gaps (consecutiveGap = 1)
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 3, 8, 'hard');
      putBlock(ctx, col + 5, 6, 'hard');
      putBlock(ctx, col + 7, 4, 'hard');
      addCoin(ctx, col + 2, 9.0);
      addCoin(ctx, col + 4, 7.0);
      addCoin(ctx, col + 6, 5.0);
      return 11;
    }

    case 'cloud_highway_drop': {
      // High bridge cloudwalk spanning rows 5 descending towards flag
      for (let c = col + 1; c <= col + 7; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, col + 8, 7, 'hard');
      putBlock(ctx, col + 9, 9, 'hard');
      return 12;
    }

    case 'moving_lift_tower': {
      // Two staggered lifts in vertical zigzag
      addPlatform(ctx, col + 2, 9, 2, 0, 2.0, 0.035, 0);
      addPlatform(ctx, col + 5, 6, 2, 0, 2.0, 0.035, Math.PI);
      for (let c = col + 8; c <= col + 10; c++) {
        putBlock(ctx, c, 5, 'hard');
      }
      return 12;
    }

    case 'gauntlet_ramp': {
      // Broad ramp with final guardian + hidden block overhead
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 2, 10, 'hard');
      putBlock(ctx, col + 3, 9, 'hard');
      putBlock(ctx, col + 4, 8, 'hard');
      putBlock(ctx, col + 5, 8, 'hard');
      addEnemy(ctx, col + 4, 7, foe(ctx));
      putBlock(ctx, col + 4, 4, 'hidden', 'one_up');
      return 12;
    }
  }
}

// ============================================================================
// THE 18 FORTRESS SECTIONS (Fully Parametric with variantOf)
// ============================================================================

export function buildFortressSection(
  ctx: BuilderCtx,
  kind: FortressSection,
  c: number
): number {
  const w = ctx.worldNum;
  const v = variantOf(ctx, c);

  switch (kind) {
    case 'lava_pillar': {
      carvePit(ctx, c + 1, 3, true);
      putBlock(ctx, c + 2, 9 - (v % 2), 'hard');
      addCoinArc(ctx, c + 1, 3, 6.5 - (v % 2));
      addEnemy(ctx, c + 6, GROUND_ROW - 1, foe(ctx));
      return 8;
    }

    case 'guard_corridor': {
      addEnemy(ctx, c + 1, GROUND_ROW - 1, 'koopa_red');
      addEnemy(ctx, c + 5, GROUND_ROW - 1, w >= 2 ? 'spiny' : 'goomba');
      putBlock(ctx, c + 3, 7 - (v % 2), 'question', 'coin');
      putBlock(ctx, c + 4, 7 - (v % 2), 'question', w % 2 === 0 ? 'powerup' : 'coin');
      if (w >= 4) addEnemy(ctx, c + 7, GROUND_ROW - 1, foe(ctx));
      return 9;
    }

    case 'lift_chasm': {
      carvePit(ctx, c + 1, 4, true);
      carvePit(ctx, c + 5, 3, true);
      addPlatform(ctx, c + 3, 9 - (v % 2), 3, 2.8, 0, 0.036 + w * 0.003, 0.5);
      addCoinArc(ctx, c + 2, 5, 5.8);
      return 10;
    }

    case 'dual_route': {
      carvePit(ctx, c + 2, 4, true);
      for (let k = c + 1; k <= c + 7; k++) {
        putBlock(ctx, k, 8, 'bridge');
        if (k >= c + 3 && k <= c + 5) putBlock(ctx, k, 4, 'brick');
      }
      putBlock(ctx, c + 4, 4, 'question', v === 0 ? 'one_up' : 'coin');
      addEnemy(ctx, c + 5, 7, 'paratroopa');
      return 10;
    }

    case 'vertical_lift': {
      carvePit(ctx, c + 1, 4, true);
      addPlatform(ctx, c + 2, 8.5, 2, 0, 2.2, 0.04, 1.2);
      putBlock(ctx, c + 7, 8 - (v % 2), 'question', 'powerup');
      addEnemy(ctx, c + 9, GROUND_ROW - 1, foe(ctx));
      return 11;
    }

    case 'lava_staircase': {
      for (let s = 0; s < 3; s++) {
        for (let h = 0; h <= s; h++) putBlock(ctx, c + s, GROUND_ROW - 1 - h, 'hard');
      }
      carvePit(ctx, c + 3, 3, true);
      for (let s = 0; s < 3; s++) {
        for (let h = 0; h <= 2 - s; h++) putBlock(ctx, c + 6 + s, GROUND_ROW - 1 - h, 'hard');
      }
      addCoinArc(ctx, c + 2, 5, 6.0);
      addEnemy(ctx, c + 10, GROUND_ROW - 1, foe(ctx));
      return 12;
    }

    case 'cramped_hall': {
      for (let k = c; k <= c + 10; k++) {
        const isQ = k === c + 3 || k === c + 8;
        putBlock(
          ctx,
          k,
          7,
          isQ ? 'question' : 'hard',
          isQ ? (k === c + 3 ? 'powerup' : 'coin') : null
        );
      }
      addEnemy(ctx, c + 5, GROUND_ROW - 1, w >= 3 ? 'spiny' : 'goomba');
      addEnemy(ctx, c + 9, GROUND_ROW - 1, foe(ctx));
      return 13;
    }

    case 'pillar_hops': {
      for (let i = 0; i < 3; i++) {
        const col = c + 1 + i * 3;
        putBlock(ctx, col, 11, 'hard');
        putBlock(ctx, col, 10, 'hard');
        carvePit(ctx, col + 1, 2, true);
        addCoin(ctx, col, 8.4);
      }
      putBlock(ctx, c + 10, 11, 'hard');
      return 13;
    }

    case 'supply_room': {
      putBlock(ctx, c + 1, 8, 'question', 'powerup');
      putBlock(ctx, c + 2, 8, 'question', w >= 4 ? 'one_up' : 'coin');
      addEnemy(ctx, c + 5, GROUND_ROW - 1, 'koopa_red');
      return 8;
    }

    case 'magma_catwalk': {
      carvePit(ctx, c + 2, 4, true);
      for (let k = c + 1; k <= c + 7; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      addEnemy(ctx, c + 4, 8, 'paratroopa');
      addCoinArc(ctx, c + 2, 5, 6.0);
      return 10;
    }

    case 'chuck_bastion': {
      for (let k = c + 2; k <= c + 6; k++) {
        putBlock(ctx, k, 8, 'hard');
      }
      addEnemy(ctx, c + 4, 7, w >= 3 ? 'chuck' : 'koopa_red');
      putBlock(ctx, c + 4, 5, 'question', 'powerup');
      return 10;
    }

    case 'pendulum_lifts': {
      carvePit(ctx, c + 1, 4, true);
      carvePit(ctx, c + 5, 4, true);
      addPlatform(ctx, c + 2, 9, 2, 1.8, 0, 0.04, 0);
      addPlatform(ctx, c + 6, 8, 2, 1.8, 0, 0.04, Math.PI);
      addCoinArc(ctx, c + 2, 6, 5.5);
      return 11;
    }

    case 'rotating_maze_hall': {
      for (let k = c + 1; k <= c + 8; k++) {
        if (k % 2 === 0) {
          putBlock(ctx, k, 8, 'brick');
        } else {
          putBlock(ctx, k, 6, 'brick', 'coin');
        }
      }
      addEnemy(ctx, c + 4, GROUND_ROW - 1, foe(ctx));
      return 11;
    }

    case 'sunken_lava_dais': {
      carvePit(ctx, c + 1, 2, true);
      for (let k = c + 3; k <= c + 6; k++) {
        putBlock(ctx, k, 10, 'hard');
        putBlock(ctx, k, 11, 'hard');
      }
      carvePit(ctx, c + 7, 2, true);
      addCoinArc(ctx, c + 3, 4, 7.5);
      return 11;
    }

    case 'twin_tier_gauntlet': {
      for (let k = c + 1; k <= c + 8; k++) {
        putBlock(ctx, k, 7, 'bridge');
      }
      addEnemy(ctx, c + 3, GROUND_ROW - 1, foe(ctx));
      addEnemy(ctx, c + 6, 6, 'koopa_red');
      putBlock(ctx, c + 4, 4, 'question', 'powerup');
      return 11;
    }

    case 'fire_bar_alley': {
      carvePit(ctx, c + 1, 3, true);
      putBlock(ctx, c + 2, 10, 'hard');
      putBlock(ctx, c + 5, 8, 'hard');
      carvePit(ctx, c + 6, 3, true);
      putBlock(ctx, c + 7, 9, 'hard');
      addCoin(ctx, c + 2, 8.0);
      addCoin(ctx, c + 5, 6.0);
      addCoin(ctx, c + 7, 7.0);
      return 11;
    }

    case 'crusher_drop': {
      for (let s = 0; s <= 3; s++) {
        putBlock(ctx, c + s * 2, 5 + s, 'hard');
        putBlock(ctx, c + s * 2 + 1, 5 + s, 'hard');
      }
      addEnemy(ctx, c + 4, GROUND_ROW - 1, 'spiny');
      return 10;
    }

    case 'spiny_gauntlet': {
      for (let k = c + 1; k <= c + 7; k++) {
        putBlock(ctx, k, 10, 'hard');
      }
      addEnemy(ctx, c + 3, 9, 'spiny');
      addEnemy(ctx, c + 5, 9, 'spiny');
      putBlock(ctx, c + 4, 6, 'question', 'powerup');
      return 10;
    }
  }
}

// ============================================================================
// THE 4 REY KOOPA ARENA STYLES
// ============================================================================

export function buildFortressArena(
  ctx: BuilderCtx,
  startCol: number,
  arenaStyle: ArenaStyle = 0
): { arenaWidth: number; boss: FortressBoss } {
  const arenaWidth = 34;
  const bridgeStart = startCol + 4;
  const bridgeLen = 13;
  const bridgeCols: number[] = [];

  // Approach steps
  putBlock(ctx, startCol + 2, 11, 'hard');
  putBlock(ctx, startCol + 3, 10, 'hard');
  putBlock(ctx, startCol + 3, 11, 'hard');

  // Suspension bridge over magma
  for (let b = 0; b < bridgeLen; b++) {
    const col = bridgeStart + b;
    ctx.pits.add(col);
    ctx.lavaCols.add(col);
    putBlock(ctx, col, 10, 'bridge');
    bridgeCols.push(col);
  }

  // Golden axe dais
  const axeCol = bridgeStart + bridgeLen;
  putBlock(ctx, axeCol, 10, 'hard');
  putBlock(ctx, axeCol, 11, 'hard');

  // Varied battlements based on ArenaStyle
  switch (arenaStyle) {
    case 0: {
      // Classic Floating Escape Blocks (Row 5)
      for (let k = 0; k < 5; k++) {
        putBlock(ctx, bridgeStart + 3 + k, 5, 'hard');
      }
      break;
    }

    case 1: {
      // Dual-Tier Battlements: High catwalk at row 6 with drop aperture
      for (let k = 0; k < 8; k++) {
        if (k !== 3) {
          putBlock(ctx, bridgeStart + 2 + k, 6, 'hard');
        }
      }
      putBlock(ctx, bridgeStart + 3, 3, 'question', 'powerup');
      break;
    }

    case 2: {
      // Stepping Pillar Magma Pit: High stone pillars embedded along bridge
      putBlock(ctx, bridgeStart + 3, 9, 'hard');
      putBlock(ctx, bridgeStart + 6, 8, 'hard');
      putBlock(ctx, bridgeStart + 9, 9, 'hard');
      putBlock(ctx, bridgeStart + 6, 4, 'hard');
      break;
    }

    case 3: {
      // Fortified Throne Bastion: Raised stone dais near axe and stone chandelier
      for (let k = axeCol - 3; k < axeCol; k++) {
        putBlock(ctx, k, 9, 'hard');
      }
      putBlock(ctx, bridgeStart + 4, 4, 'hard');
      putBlock(ctx, bridgeStart + 5, 4, 'hard');
      putBlock(ctx, bridgeStart + 8, 4, 'hard');
      break;
    }
  }

  const maxHp = 5 + ctx.worldNum * 2;
  const boss: FortressBoss = {
    x: (bridgeStart + 8) * TILE,
    y: 10 * TILE - 60,
    homeX: (bridgeStart + 8) * TILE,
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
    axeX: axeCol * TILE,
    axeY: 9 * TILE,
    axeGrabbed: false,
    bridgeCols,
    bridgeCollapseTimer: 0,
  };

  return { arenaWidth, boss };
}
