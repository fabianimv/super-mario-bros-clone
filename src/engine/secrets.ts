// ============================================================================
// RUTAS Y SECRETOS (Fase 3) & TUBERÍAS SECRETAS (Proyecto ARGON)
//   · Bóveda: un cuarto bajo de piedra con puerta cerrada. Adentro hay tesoro.
//   · Llave: escondida en el punto más alto de la primera parte del nivel.
//   · Portal secreto: en las bóvedas de los niveles X-2, lleva directo al
//     castillo del mundo (salta el X-3).
//   · Tuberías secretas interactivas: Bonus subrooms, Warp Zone SMB 1-2, Senda Estelar.
// ============================================================================
import { BIOMES, GROUND_ROW, STAGES_PER_WORLD, TILE } from './biomes';
import type {
  Block,
  BlockType,
  GameEvent,
  InputState,
  Pickup,
  Pipe,
  SubroomTheme,
  WorldState,
} from './types';
import { enterPipeSubroom, exitPipeSubroom } from '../levels/subroomBuilder';
import { buildWorldState } from '../levels/levelBuilder';

export { exitPipeSubroom };

const key = (col: number, row: number): number => row * 1024 + col;

export const VAULT_WIDTH = 7; // columnas, incluidas las paredes
export const TREASURE_SCORE = 2000;

export function stageHasVault(levelIndex: number, partition: WorldState['partition']): boolean {
  const stageNum = (levelIndex % STAGES_PER_WORLD) + 1;
  if (stageNum === 4) return false; // castillos: el jefe es el desafío
  if (levelIndex === 0) return false; // primer nivel de cada modo: tutorial
  if (partition === 'classic' && levelIndex === 1) return false; // 1-2 hecho a mano
  return true;
}

export function stageHasPortal(levelIndex: number): boolean {
  return (levelIndex % STAGES_PER_WORLD) + 1 === 2;
}

/** Índice del castillo del mundo al que pertenece un nivel. */
export function castleIndexOf(levelIndex: number): number {
  return Math.floor(levelIndex / STAGES_PER_WORLD) * STAGES_PER_WORLD + STAGES_PER_WORLD - 1;
}

function placeBlock(world: WorldState, col: number, row: number, type: BlockType): void {
  const old = world.blockGrid.get(key(col, row));
  if (old) world.blocks.splice(world.blocks.indexOf(old), 1);
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
    content: null,
    coinsRemaining: 0,
    bounceY: 0,
    bounceVel: 0,
    spinTimer: 0,
  };
  world.blocks.push(b);
  world.blockGrid.set(key(col, row), b);
}

function pickup(world: WorldState, kind: Pickup['kind'], x: number, y: number, w: number, h: number): Pickup {
  return { id: world.nextEntityId++, kind, x, y, width: w, height: h, collected: false, phase: x * 0.01 };
}

/** Busca un tramo de suelo plano y despejado para la bóveda. */
function findVaultCol(world: WorldState): number | null {
  const from = Math.max(14, Math.floor(world.totalCols * 0.3));
  const to = world.totalCols - 30; // antes de la escalera final
  const cpCol = world.checkpoint ? Math.floor(world.checkpoint.x / TILE) : -99;
  const anchors = [0.34, 0.52, 0.68, 0.42];
  const anchorFrac = anchors[(world.levelIndex * 3 + world.totalCols) % anchors.length];
  const mid = Math.max(from, Math.min(to, Math.floor(world.totalCols * anchorFrac)));
  const order: number[] = [];
  for (let d = 0; d <= to - from; d++) {
    if (mid + d <= to) order.push(mid + d);
    if (d > 0 && mid - d >= from) order.push(mid - d);
  }
  for (const c of order) {
    const c0 = c - 1;
    const c1 = c + VAULT_WIDTH;
    let ok = true;
    for (let col = c0; col <= c1 && ok; col++) {
      if (!world.blockGrid.has(key(col, GROUND_ROW)) || world.lavaCols.has(col)) ok = false;
      // Dentro de la bóveda: libre hasta la fila 5 (para saltar por encima).
      // En la entrada y la salida: libre a la altura del jugador.
      const inside = col >= c && col < c + VAULT_WIDTH;
      for (let r = inside ? 5 : 9; r < GROUND_ROW && ok; r++) if (world.blockGrid.has(key(col, r))) ok = false;
      if (Math.abs(col - cpCol) <= 1) ok = false;
    }
    if (!ok) continue;
    const x0 = c0 * TILE;
    const x1 = (c1 + 1) * TILE;
    const clash = (x: number, w: number) => x + w > x0 && x < x1;
    if (world.pipes.some((p) => clash(p.x, p.width))) continue;
    if (world.springs.some((s) => clash(s.x, s.width))) continue;
    if (world.platforms.some((p) => clash(p.startX - Math.abs(p.rangeX), p.width + 2 * Math.abs(p.rangeX)))) continue;
    return c;
  }
  return null;
}

/** El punto más alto (y escondido) antes de la bóveda para dejar la llave. */
function findKeySpot(world: WorldState, beforeCol: number): { col: number; row: number } | null {
  const candidates: { col: number; row: number }[] = [];
  for (const b of world.blocks) {
    if (b.type === 'hidden' || b.type === 'ground_top' || b.type === 'ground_deep') continue;
    if (b.row < 3 || b.row > 8 || b.col < 12 || b.col > beforeCol - 4) continue;
    if (world.blockGrid.has(key(b.col, b.row - 1)) || world.blockGrid.has(key(b.col, b.row - 2))) continue;
    candidates.push({ col: b.col, row: b.row - 1 });
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const pickIdx = Math.abs(world.levelIndex * 5 + beforeCol) % topCandidates.length;
    return topCandidates[pickIdx];
  }
  // Sin bloques altos: sobre la tubería más alta
  const pipes = world.pipes.filter((p) => p.x / TILE >= 12 && p.x / TILE < beforeCol - 4);
  if (pipes.length > 0) {
    const tallest = pipes.reduce((a, b) => (b.y < a.y ? b : a));
    return { col: Math.floor(tallest.x / TILE), row: Math.floor(tallest.y / TILE) - 1 };
  }
  return null;
}

/**
 * REGLA CERO REGRESIÓN: Etiqueta tuberías ya existentes en world.pipes
 * sin tocar p.x, p.height, world.blocks ni world.enemies.
 */
export function applyPipeSecrets(world: WorldState): void {
  if (!world.pipes || world.pipes.length === 0) return;
  // Si las tuberías ya tienen metadatos de warp asignados, respetarlos
  if (world.pipes.some((p) => p.warpKind != null || p.pairPipeIndex != null)) return;

  const isX2 = (world.levelIndex % STAGES_PER_WORLD) + 1 === 2;
  const sorted = [...world.pipes].sort((a, b) => a.x - b.x);

  if (isX2) {
    // Warp zone pipe en etapas X-2
    const minX = 8 * TILE;
    const maxX = (world.totalCols - 18) * TILE;
    const candidates = sorted.filter((p) => p.x >= minX && p.x <= maxX);
    const pool = candidates.length > 0 ? candidates : sorted;
    const warpPipe = pool.find((p) => !p.hasPiranha) ?? pool[Math.floor(pool.length / 2)] ?? pool[0];

    warpPipe.warpKind = 'warp_zone';
    warpPipe.warpAccent = 'violet';
    warpPipe.warpLabel = '▼ WARP';
    warpPipe.subroomTheme = 'warp_chamber';

    const exitCandidate = sorted.find((p) => p.x > warpPipe.x + 14 * TILE);
    warpPipe.exitPipeCol = exitCandidate
      ? Math.floor(exitCandidate.x / TILE)
      : Math.min(world.totalCols - 12, Math.floor(warpPipe.x / TILE) + 16);
  } else if (world.pipes.length >= 1) {
    // Bonus subroom en otras etapas
    const minX = 8 * TILE;
    const maxX = (world.totalCols - 20) * TILE;
    const candidates = sorted.filter((p) => p.x >= minX && p.x <= maxX);
    const pool = candidates.length > 0 ? candidates : sorted;
    const bonusPipe = pool.find((p) => !p.hasPiranha) ?? pool[0];

    const themes: SubroomTheme[] = ['coin_vault', 'star_sanctuary', 'cloud_heaven'];
    const themeIdx = (world.levelIndex + (world.partition ? world.partition.length : 0)) % themes.length;

    bonusPipe.warpKind = 'subroom';
    bonusPipe.warpAccent = 'gold';
    bonusPipe.warpLabel = '▼ BONUS';
    bonusPipe.subroomTheme = themes[themeIdx];

    const exitCandidate = sorted.find((p) => p.x > bonusPipe.x + 16 * TILE)
      ?? sorted.find((p) => p.x > bonusPipe.x + 8 * TILE);
    bonusPipe.exitPipeCol = exitCandidate
      ? Math.floor(exitCandidate.x / TILE)
      : Math.min(world.totalCols - 12, Math.floor(bonusPipe.x / TILE) + 16);
  }
}

export function applyStageSecrets(world: WorldState): WorldState {
  world.hasKey = false;
  world.vaultOpened = false;
  world.warpTo = null;
  if (!world.pickups) world.pickups = [];

  // Etiquetar tuberías secretas (bonus/warp) en tuberías existentes
  applyPipeSecrets(world);

  if (!stageHasVault(world.levelIndex, world.partition)) return world;

  const c = findVaultCol(world);
  if (c === null) return world;
  const keySpot = findKeySpot(world, c);
  if (!keySpot) return world;

  // Bóveda: techo en la fila 9, puerta cerrada a la izquierda, pared a la derecha
  for (let col = c; col < c + VAULT_WIDTH; col++) placeBlock(world, col, 9, 'hard');
  placeBlock(world, c, 10, 'lock');
  placeBlock(world, c, 11, 'lock');
  placeBlock(world, c + VAULT_WIDTH - 1, 10, 'hard');
  placeBlock(world, c + VAULT_WIDTH - 1, 11, 'hard');

  // Sin enemigos encima ni dentro de la bóveda
  const vx0 = (c - 1) * TILE;
  const vx1 = (c + VAULT_WIDTH + 1) * TILE;
  world.enemies = world.enemies.filter((e) => e.x + e.width < vx0 || e.x > vx1);

  // Tesoro y monedas
  for (let col = c + 1; col <= c + 3; col++) {
    world.coinsList.push({
      x: col * TILE + 7,
      y: 10 * TILE + 5,
      baseY: 10 * TILE + 5,
      width: 18,
      height: 22,
      collected: false,
      phase: col * 0.45,
    });
  }
  if (stageHasPortal(world.levelIndex)) {
    world.pickups.push(pickup(world, 'treasure', (c + 2) * TILE + 4, 11 * TILE + 2, 24, 28));
    world.pickups.push(pickup(world, 'portal', (c + 4) * TILE + 4, 10 * TILE + 2, 26, 60));
  } else {
    world.pickups.push(pickup(world, 'treasure', (c + 4) * TILE + 4, 11 * TILE + 2, 24, 28));
  }

  // Llave escondida en lo alto
  const k = pickup(world, 'key', keySpot.col * TILE + 6, keySpot.row * TILE + 6, 20, 22);
  if (world.player.x > 6 * TILE && k.x < world.player.x) {
    // Reaparece en el checkpoint después de la llave: ya la tiene
    k.collected = true;
    world.hasKey = true;
  }
  world.pickups.push(k);
  return world;
}

// ============================================================================
// MECÁNICA DE TUBERÍAS SECRETAS (checkPipeEntry & stepPipeTransition)
// ============================================================================

/** Detecta si el jugador pulsa ▼ sobre una tubería con warpKind o pairPipeIndex */
export function checkPipeEntry(
  world: WorldState,
  input: InputState,
  events: GameEvent[]
): boolean {
  if (world.status !== 'playing') return false;
  const p = world.player;
  if (p.dead) return false;
  if (!p.onGround) return false;

  const gDir = world.gravityDir ?? 1;
  const downPressed = gDir === 1 ? input.down : input.up;
  if (!downPressed) return false;

  for (const pipe of world.pipes) {
    if (!pipe.warpKind && pipe.pairPipeIndex == null) continue;
    if (pipe.visited) continue;

    // Centro del jugador apoyado dentro del borde superior del tubo
    const centerX = p.x + p.width / 2;
    const hAligned = centerX >= pipe.x + 4 && centerX <= pipe.x + pipe.width - 4;
    if (!hAligned) continue;

    // Pies alineados con la boca del tubo
    let vAligned = false;
    if (gDir === 1) {
      vAligned = Math.abs((p.y + p.height) - pipe.y) <= 8;
    } else {
      vAligned = Math.abs(p.y - (pipe.y + pipe.height)) <= 8;
    }
    if (!vAligned) continue;

    // Iniciar descenso en la tubería
    world.status = 'pipe_enter';
    world.statusTimer = 30;
    world.activeWarpPipe = pipe;
    p.x = pipe.x + (pipe.width - p.width) / 2;
    p.vx = 0;
    p.vy = 0;
    p.crouching = true;

    events.push({ type: 'sfx', id: 'pipe_warp' });
    events.push({ type: 'haptic', kind: 'heavy' });
    return true;
  }

  return false;
}

/** Ejecuta la animación frame a frame de pipe_enter y pipe_exit */
export function stepPipeTransition(world: WorldState, events: GameEvent[]): void {
  const gDir = world.gravityDir ?? 1;
  const p = world.player;

  if (world.status === 'pipe_enter') {
    p.vx = 0;
    p.vy = 0;
    p.crouching = true;
    p.y += 1.4 * gDir;
    world.statusTimer--;

    if (world.statusTimer <= 0) {
      const pipe = world.activeWarpPipe;
      if (!pipe) {
        world.status = 'playing';
        return;
      }

      // 1. Teletransporte entre tubos hermanos (modo Flip)
      if (pipe.pairPipeIndex != null && world.pipes[pipe.pairPipeIndex]) {
        const targetPipe = world.pipes[pipe.pairPipeIndex];
        p.x = targetPipe.x + (targetPipe.width - p.width) / 2;
        p.y = targetPipe.y - p.height + 28 * gDir;
        world.activeWarpPipe = targetPipe;
        world.status = 'pipe_exit';
        world.statusTimer = 24;
        p.crouching = false;
        events.push({ type: 'sfx', id: 'pipe_warp' });
        return;
      }

      // 2. Retorno de sub-sala al nivel principal
      if (pipe.warpKind === 'return') {
        exitPipeSubroom(world, events);
        return;
      }

      // 3. Salto a mundo secreto (Star Road)
      if (pipe.warpKind === 'secret_world') {
        events.push({ type: 'secret_unlocked', partition: 'star_road' });
        const targetPart = pipe.warpTargetPartition ?? 'star_road';
        const targetLvl = pipe.warpTargetLevel ?? 0;
        const carry = {
          score: world.score,
          highScore: world.highScore,
          coins: world.coins,
          lives: world.lives,
          powerState: p.powerState,
          doubleJumpAssist: world.doubleJumpAssist,
        };
        const nextWorld = buildWorldState(targetLvl, carry, targetPart);
        Object.assign(world, nextWorld);
        const bgm = BIOMES[world.biomeId]?.bgm ?? 'dim_theme';
        events.push({ type: 'bgm', track: bgm });
        return;
      }

      // 4. Salto de mundo desde Warp Chamber (SMB 1-2 style)
      if (pipe.warpKind === 'warp_zone' && pipe.warpTargetLevel != null && world.subArea === 'warp_zone') {
        const carry = {
          score: world.score,
          highScore: world.highScore,
          coins: world.coins,
          lives: world.lives,
          powerState: p.powerState,
          doubleJumpAssist: world.doubleJumpAssist,
        };
        const nextWorld = buildWorldState(pipe.warpTargetLevel, carry, world.partition);
        Object.assign(world, nextWorld);
        const bgm = BIOMES[world.biomeId]?.bgm ?? 'overworld';
        events.push({ type: 'bgm', track: bgm });
        return;
      }

      // 5. Entrada a sub-sala bonus o cámara warp zone
      if (pipe.warpKind === 'subroom' || pipe.warpKind === 'warp_zone') {
        pipe.visited = true;
        enterPipeSubroom(world, pipe, events);
        return;
      }

      // Fallback
      world.status = 'playing';
      world.activeWarpPipe = null;
    }
  } else if (world.status === 'pipe_exit') {
    p.vx = 0;
    p.vy = 0;
    p.crouching = false;
    p.y -= 1.25 * gDir;
    world.statusTimer--;

    if (world.statusTimer <= 0) {
      world.status = 'playing';
      p.onGround = true;
      if (world.activeWarpPipe) {
        if (gDir === 1) {
          p.y = world.activeWarpPipe.y - p.height;
        } else {
          p.y = world.activeWarpPipe.y + world.activeWarpPipe.height;
        }
      }
      world.activeWarpPipe = null;
    }
  }
}

// ============================================================================
// ACTUALIZACIÓN POR FRAME (Secretos y Bóvedas)
// ============================================================================
export interface SecretCallbacks {
  removeBlock: (b: Block) => void;
  sparks: (x: number, y: number, color: string, count: number) => void;
  text: (x: number, y: number, text: string, color: string) => void;
}

const hit = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export function updateSecrets(
  world: WorldState,
  events: GameEvent[],
  cb: SecretCallbacks,
  enterHeld: boolean
): void {
  const p = world.player;
  if (world.pickups) {
    for (const pk of world.pickups) {
      if (pk.collected) continue;
      if (pk.kind !== 'key' && pk.kind !== 'treasure' && pk.kind !== 'portal') continue;
      if (!hit(p, pk)) continue;
      // El portal es una decisión: hay que pulsar ▲ o ▼ frente a él
      if (pk.kind === 'portal' && !enterHeld) {
        if (world.frameCount % 90 === 0) cb.text(pk.x - 40, pk.y - 16, 'ABAJO: ENTRAR AL PORTAL', '#e9d5ff');
        continue;
      }
      pk.collected = true;
      if (pk.kind === 'key') {
        world.hasKey = true;
        cb.text(pk.x - 24, pk.y - 10, '¡LLAVE!', '#fde047');
        cb.sparks(pk.x + 10, pk.y + 10, '#fde047', 10);
        events.push({ type: 'sfx', id: 'key_get' });
        events.push({ type: 'haptic', kind: 'success' });
      } else if (pk.kind === 'treasure') {
        world.lives += 1;
        world.score += TREASURE_SCORE;
        cb.text(pk.x - 30, pk.y - 14, '¡TESORO! +1 VIDA', '#4ade80');
        cb.sparks(pk.x + 12, pk.y + 12, '#4ade80', 12);
        events.push({ type: 'sfx', id: 'treasure' });
        events.push({ type: 'haptic', kind: 'success' });
      } else {
        // Portal secreto: atajo al castillo del mundo
        world.warpTo = castleIndexOf(world.levelIndex);
        world.status = 'flagpole';
        world.statusTimer = 100;
        p.vx = 0;
        p.vy = 0;
        p.enteringCastle = true;
        cb.text(pk.x - 50, pk.y - 20, '¡PORTAL SECRETO!', '#c084fc');
        cb.sparks(pk.x + 12, pk.y + 30, '#c084fc', 16);
        events.push({ type: 'bgm', track: null });
        events.push({ type: 'sfx', id: 'portal' });
        events.push({ type: 'haptic', kind: 'success' });
        return;
      }
    }
  }

  // Con la llave, tocar la puerta la abre
  if (world.hasKey && !world.vaultOpened) {
    const reach = { x: p.x - 4, y: p.y, width: p.width + 8, height: p.height };
    const locks = world.blocks.filter((b) => b.type === 'lock');
    if (locks.some((b) => hit(reach, b))) {
      for (const b of locks) {
        cb.removeBlock(b);
        cb.sparks(b.x + TILE / 2, b.y + TILE / 2, '#fde047', 6);
      }
      world.vaultOpened = true;
      world.hasKey = false;
      cb.text(p.x - 30, p.y - 20, '¡BÓVEDA ABIERTA!', '#fde047');
      events.push({ type: 'sfx', id: 'vault_open' });
      events.push({ type: 'haptic', kind: 'heavy' });
    }
  }
}
