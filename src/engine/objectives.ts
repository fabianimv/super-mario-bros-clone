// ============================================================================
// OBJETIVOS POR NIVEL (Super Plomero Brawl)
// Cero gemas (0%): combate, asedio, caza de capitanes y destrucción de núcleos.
//   · brawl_captain: derriba al Capitán Guardián acorazado para abrir la meta.
//   · bounty_hunt: caza a los 3 Comandantes Fugitivos atrincherados en el nivel.
//   · shadow_combo: vence a los Guardianes Espejo con combo en pinza con tu Eco.
//   · core_breaker: destruye los 3 Núcleos Gravitacionales Blindados.
//   · time_attack: poco tiempo, relojes que suman segundos.
//   · chase: una sombra avanza desde la izquierda; si te alcanza, pierdes.
//   · fortune: coliseo de apuestas; gana monedas apostando o vence al campeón.
//   · reach: llegar a la meta / vencer al jefe del castillo.
// ============================================================================
import { GROUND_ROW, TILE } from './biomes';
import type { Enemy, GameEvent, GamePartition, Pickup, StageObjective, StageObjectiveKind, WorldState } from './types';

const key = (col: number, row: number): number => row * 1024 + col;

// Objetivo por índice de nivel. Los castillos (X-4) y los no listados son 'reach'.
const CLASSIC_OBJECTIVES: Record<number, StageObjective> = {
  2: 'brawl_captain',
  5: 'time_attack',
  6: 'chase',
  8: 'brawl_captain',
  10: 'chase',
  12: 'time_attack',
  13: 'brawl_captain',
  16: 'chase',
  18: 'time_attack',
  20: 'brawl_captain',
  21: 'chase',
  22: 'time_attack',
};
const SMW_OBJECTIVES: Record<number, StageObjective> = {
  1: 'time_attack',
  2: 'brawl_captain',
  4: 'brawl_captain',
  6: 'chase',
  8: 'time_attack',
  9: 'chase',
  12: 'chase',
  13: 'brawl_captain',
  14: 'time_attack',
  16: 'brawl_captain',
  17: 'time_attack',
  18: 'chase',
};

const EXP_OBJECTIVES: Record<number, StageObjective> = {
  1: 'brawl_captain',
  2: 'chase',
  4: 'time_attack',
  5: 'brawl_captain',
  6: 'chase',
  8: 'brawl_captain',
  9: 'time_attack',
  10: 'chase',
  12: 'time_attack',
  14: 'brawl_captain',
  16: 'chase',
  17: 'brawl_captain',
  18: 'time_attack',
  20: 'brawl_captain',
  21: 'chase',
  22: 'time_attack',
  24: 'brawl_captain',
  25: 'chase',
  26: 'time_attack',
};

const DIM_OBJECTIVES: Record<number, StageObjective> = {
  1: 'brawl_captain',
  2: 'time_attack',
  4: 'chase',
  6: 'brawl_captain',
  8: 'time_attack',
  9: 'brawl_captain',
  10: 'chase',
  12: 'brawl_captain',
  13: 'chase',
  14: 'time_attack',
  16: 'chase',
  17: 'brawl_captain',
  18: 'time_attack',
  20: 'brawl_captain',
  21: 'chase',
  24: 'time_attack',
  25: 'brawl_captain',
  26: 'chase',
  28: 'brawl_captain',
  29: 'time_attack',
  30: 'chase',
};
const FRONTIER_OBJECTIVES: Record<number, StageObjective> = {
  0: 'brawl_captain',
  1: 'chase',
  2: 'time_attack',
  4: 'brawl_captain',
  5: 'chase',
  6: 'time_attack',
};

// Mundo 6 FORTUNA: capital de monedas + gladiador de apuestas.
const FORTUNE_OBJECTIVES: Record<number, StageObjective> = {
  0: 'fortune',
  1: 'brawl_captain',
  2: 'time_attack',
  4: 'fortune',
  5: 'chase',
  6: 'time_attack',
  8: 'fortune',
  9: 'brawl_captain',
  10: 'chase',
  12: 'time_attack',
  13: 'chase',
  14: 'brawl_captain',
};

// Mundo 7 ESPECTRO: Caza de 3 Comandantes Fugitivos (bounty_hunt).
const MIRAGE_OBJECTIVES: Record<number, StageObjective> = {
  0: 'bounty_hunt',
  1: 'bounty_hunt',
  2: 'time_attack',
  4: 'bounty_hunt',
  5: 'chase',
  6: 'time_attack',
  8: 'bounty_hunt',
  9: 'bounty_hunt',
  10: 'chase',
  12: 'time_attack',
  13: 'chase',
  14: 'bounty_hunt',
};

// Mundo 8 ECO: Combate Doble con tu Eco (shadow_combo).
const ECHO_OBJECTIVES: Record<number, StageObjective> = {
  1: 'shadow_combo',
  2: 'time_attack',
  4: 'shadow_combo',
  5: 'chase',
  6: 'shadow_combo',
  8: 'time_attack',
  9: 'shadow_combo',
  10: 'chase',
  12: 'shadow_combo',
  13: 'chase',
  14: 'time_attack',
};

export const CLOCKS_PER_STAGE = 5;
export const TIME_ATTACK_START = 75; // mínimo, en unidades del contador (1 unidad = 38 frames)
const TIME_ATTACK_PACE = 2.5; // px/frame: más lento que caminar, para que sea justo
const TIME_ATTACK_SLACK = 0.85; // el nivel debe poder cruzarse usando el 85% del tiempo

/** Tiempo inicial del contrarreloj según el largo del nivel (los niveles largos dan más). */
export function timeAttackBudget(totalCols: number): number {
  const needed = (totalCols * TILE) / TIME_ATTACK_PACE / 38;
  return Math.max(TIME_ATTACK_START, Math.ceil(needed / TIME_ATTACK_SLACK));
}
export const CLOCK_BONUS = 15;
export const CHASE_DELAY = 150; // frames antes de que la sombra empiece a moverse
export const THIEF_STEAL_PERIOD = 260; // @deprecated
export const CHASE_START_GAP = 12 * TILE;
export const CHASE_MAX_LAG = 40;
export const CHASE_MIN_FACTOR = 0.3; // velocidad mínima relativa cuando está pegada al jugador // px máximos fuera de pantalla por la izquierda

export const OBJECTIVE_LABELS: Record<StageObjective, { text: string; color: string }> = {
  reach: { text: '', color: '#ffffff' },
  brawl_captain: { text: '⚔ ¡DERROTA AL CAPITÁN GUARDIÁN!', color: '#f87171' },
  bounty_hunt: { text: '🎯 ¡CAZA A LOS 3 COMANDANTES!', color: '#c084fc' },
  core_breaker: { text: '💥 ¡DESTRUYE LOS 3 NÚCLEOS GRAVITACIONALES!', color: '#38bdf8' },
  shadow_combo: { text: '🪞 ¡COMBATE EN PINZA CON TU ECO!', color: '#a78bfa' },
  time_attack: { text: '⏱ ¡CONTRARRELOJ!', color: '#fde047' },
  chase: { text: '👁 ¡ESCAPA DE LA SOMBRA!', color: '#c084fc' },
  fortune: { text: '🪙 OBJETIVO: CAPITAL DE MONEDAS', color: '#fde68a' },
  collect: { text: '', color: '#ffffff' },
  recover: { text: '', color: '#ffffff' },
};

/** Determina el objetivo de combate para una partición y etapa. */
export function objectiveForStage(
  partition: GamePartition,
  stageIndex: number,
  isCastle = false,
  isBoss = false
): StageObjective {
  if (isCastle || isBoss || stageIndex % 4 === 3) return 'reach';
  if (partition === 'flip') return 'core_breaker';
  if (partition === 'mirage') {
    const obj = MIRAGE_OBJECTIVES[stageIndex];
    return obj === 'time_attack' || obj === 'chase' ? obj : 'bounty_hunt';
  }
  if (partition === 'echo') {
    const obj = ECHO_OBJECTIVES[stageIndex];
    return obj === 'time_attack' || obj === 'chase' ? obj : 'shadow_combo';
  }
  return getStageObjective(stageIndex, partition);
}

export function getStageObjective(levelIndex: number, partition: GamePartition): StageObjective {
  if (levelIndex % 4 === 3) return 'reach';
  if (partition === 'flip') return 'core_breaker';
  const table =
    partition === 'smw'
      ? SMW_OBJECTIVES
      : partition === 'expedition'
      ? EXP_OBJECTIVES
      : partition === 'frontier'
      ? FRONTIER_OBJECTIVES
      : partition === 'fortune'
      ? FORTUNE_OBJECTIVES
      : partition === 'mirage'
      ? MIRAGE_OBJECTIVES
      : partition === 'echo'
      ? ECHO_OBJECTIVES
      : partition === 'dimension'
      ? DIM_OBJECTIVES
      : CLASSIC_OBJECTIVES;
  return table[levelIndex] ?? 'reach';
}

export function chaseSpeed(worldNum: number): number {
  return 1.65 + worldNum * 0.06;
}

function isOpen(world: WorldState, col: number, row: number): boolean {
  return !world.blockGrid.has(key(col, row));
}

function overlapsPipe(world: WorldState, col: number): boolean {
  const x = col * TILE;
  return world.pipes.some((p) => x + TILE > p.x && x < p.x + p.width);
}

/**
 * Busca `count` lugares repartidos por el nivel. Prefiere la parte de arriba de
 * bloques flotantes (premia explorar); si no hay, usa el aire sobre el suelo.
 */
function findSpots(world: WorldState, count: number, preferHigh: boolean): Array<{ col: number; row: number }> {
  const first = 14;
  const last = world.totalCols - 16;
  const span = last - first;
  const spots: Array<{ col: number; row: number }> = [];
  for (let i = 0; i < count; i++) {
    const center = Math.round(first + ((i + 0.5) * span) / count);
    let best: { col: number; row: number; score: number } | null = null;
    for (let d = 0; d <= 7; d++) {
      for (const col of d === 0 ? [center] : [center - d, center + d]) {
        if (col < first || col > last || overlapsPipe(world, col)) continue;
        // Encima de un bloque flotante
        if (preferHigh) {
          for (let row = 4; row <= 9; row++) {
            const b = world.blockGrid.get(key(col, row));
            if (!b || b.type === 'hidden') continue;
            if (isOpen(world, col, row - 1) && isOpen(world, col, row - 2)) {
              const score = d;
              if (!best || score < best.score) best = { col, row: row - 1, score };
            }
            break;
          }
        }
        // En el aire sobre suelo firme (hay que saltar para tomarlo)
        if (
          world.blockGrid.has(key(col, GROUND_ROW)) &&
          isOpen(world, col, 9) &&
          isOpen(world, col, 10) &&
          isOpen(world, col, 11)
        ) {
          const score = d + (preferHigh ? 3 : 0);
          if (!best || score < best.score) best = { col, row: 9, score };
        }
      }
      if (best && best.score <= d) break;
    }
    if (best && !spots.some((s) => s.col === best!.col)) spots.push({ col: best.col, row: best.row });
  }
  return spots;
}

function makePickup(world: WorldState, kind: Pickup['kind'], col: number, row: number): Pickup {
  return {
    id: world.nextEntityId++,
    kind,
    x: col * TILE + 6,
    y: row * TILE + 4,
    width: 20,
    height: 24,
    collected: false,
    phase: col * 0.37,
  };
}

function placeFinalSprintSwitch(world: WorldState): void {
  if (world.partition === 'flip') return;
  const combatObj =
    world.objective === 'brawl_captain' ||
    world.objective === 'bounty_hunt' ||
    world.objective === 'shadow_combo' ||
    world.objective === 'core_breaker';
  if (!combatObj && world.objective !== 'collect' && world.objective !== 'recover') return;
  if ((world.totalCols ?? 0) < 45) return;
  const fp = world.flagpole ?? world.goalTape;
  if (!fp) return;

  const goalCol = Math.floor(fp.x / TILE);
  const minCol = Math.max(12, goalCol - 24);
  const maxCol = goalCol - 15;
  if (maxCol <= minCol) return;

  let bestCol = -1;
  let bestRow = -1;

  for (let c = maxCol; c >= minCol; c--) {
    if (world.lavaCols?.has(c)) continue;
    if (overlapsPipe(world, c)) continue;
    for (let r = GROUND_ROW; r >= 4; r--) {
      if (world.blockGrid.has(key(c, r))) {
        if (isOpen(world, c, r - 1) && isOpen(world, c, r - 2)) {
          bestCol = c;
          bestRow = r - 1;
          break;
        }
      }
    }
    if (bestCol !== -1) break;
  }

  if (bestCol === -1) {
    for (let c = maxCol; c >= minCol; c--) {
      if (!world.lavaCols?.has(c) && !overlapsPipe(world, c)) {
        bestCol = c;
        bestRow = GROUND_ROW - 1;
        break;
      }
    }
  }

  if (bestCol !== -1 && bestRow !== -1) {
    world.pickups = world.pickups ?? [];
    if (!world.pickups.some((pk) => pk.kind === 'p_switch')) {
      world.pickups.push({
        id: world.nextEntityId++,
        kind: 'p_switch',
        x: bestCol * TILE + 4,
        y: bestRow * TILE + 8,
        width: 24,
        height: 24,
        collected: false,
        phase: 0,
      });
    }
  }
}

function promoteOrSpawnCaptain(world: WorldState): void {
  const eligible = (world.enemies ?? []).filter(
    (e) => e.type !== 'piranha' && e.state !== 'squashed' && e.state !== 'knocked'
  );
  if (eligible.length > 0) {
    // Promover el enemigo más cercano a la recta final
    eligible.sort((a, b) => b.x - a.x);
    const captain = eligible[0];
    captain.brawlRole = 'captain';
    captain.hp = 5;
    captain.maxHp = 5;
    captain.shieldFront = true;
  } else {
    // Solo si no hay enemigos, spawnear capitán
    const c = Math.max(14, world.totalCols - 18);
    world.enemies = world.enemies ?? [];
    world.enemies.push({
      id: world.nextEntityId++,
      type: 'chuck',
      state: 'walk',
      x: c * TILE,
      y: (GROUND_ROW - 2) * TILE,
      baseY: (GROUND_ROW - 2) * TILE,
      vx: -1,
      vy: 0,
      width: 32,
      height: 32,
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
  }
}

function promoteOrSpawnBountyHunt(world: WorldState): void {
  const eligible = (world.enemies ?? []).filter(
    (e) => e.type !== 'piranha' && e.state !== 'squashed' && e.state !== 'knocked'
  );
  eligible.sort((a, b) => a.x - b.x);

  const needed = 3;
  let promoted = 0;

  if (eligible.length >= needed) {
    const idx1 = Math.floor(eligible.length * 0.25);
    const idx2 = Math.floor(eligible.length * 0.55);
    const idx3 = Math.min(eligible.length - 1, Math.floor(eligible.length * 0.85));
    const chosen = new Set([idx1, idx2, idx3]);
    for (let i = 0; chosen.size < needed && i < eligible.length; i++) {
      chosen.add(i);
    }
    for (const idx of chosen) {
      const en = eligible[idx];
      en.brawlRole = 'bounty_commander';
      en.hp = 3;
      en.maxHp = 3;
      promoted++;
    }
  } else {
    for (const en of eligible) {
      en.brawlRole = 'bounty_commander';
      en.hp = 3;
      en.maxHp = 3;
      promoted++;
    }
    const cols = [
      Math.floor(world.totalCols * 0.32),
      Math.floor(world.totalCols * 0.58),
      Math.floor(world.totalCols * 0.82),
    ];
    world.enemies = world.enemies ?? [];
    while (promoted < needed) {
      const c = cols[promoted % cols.length];
      const type = (world.levelIndex + promoted) % 2 === 0 ? 'rex' : 'spiny';
      world.enemies.push({
        id: world.nextEntityId++,
        type,
        state: 'walk',
        x: c * TILE,
        y: (GROUND_ROW - 2) * TILE,
        baseY: (GROUND_ROW - 2) * TILE,
        vx: -1,
        vy: 0,
        width: 28,
        height: 30,
        facing: -1,
        onGround: true,
        hp: 3,
        maxHp: 3,
        stateTimer: 0,
        kickGraceTimer: 0,
        shellCombo: 0,
        animTimer: 0,
        active: true,
        brawlRole: 'bounty_commander',
      });
      promoted++;
    }
  }
}

function promoteOrSpawnShadowCombo(world: WorldState): void {
  const halfX = world.totalCols * TILE * 0.45;
  const eligible = (world.enemies ?? []).filter(
    (e) => e.x >= halfX && e.type !== 'piranha' && e.state !== 'squashed' && e.state !== 'knocked'
  );
  eligible.sort((a, b) => a.x - b.x);

  const needed = 2;
  let promoted = 0;

  for (let i = 0; i < Math.min(needed, eligible.length); i++) {
    const en = eligible[eligible.length - 1 - i];
    en.brawlRole = 'captain';
    en.shieldFront = true;
    en.hp = 3;
    en.maxHp = 3;
    promoted++;
  }

  const cols = [Math.floor(world.totalCols * 0.65), Math.floor(world.totalCols * 0.84)];
  world.enemies = world.enemies ?? [];
  while (promoted < needed) {
    const c = cols[promoted % cols.length];
    world.enemies.push({
      id: world.nextEntityId++,
      type: 'chuck',
      state: 'walk',
      x: c * TILE,
      y: (GROUND_ROW - 2) * TILE,
      baseY: (GROUND_ROW - 2) * TILE,
      vx: -1,
      vy: 0,
      width: 30,
      height: 32,
      facing: -1,
      onGround: true,
      hp: 3,
      maxHp: 3,
      stateTimer: 0,
      kickGraceTimer: 0,
      shellCombo: 0,
      animTimer: 0,
      active: true,
      brawlRole: 'captain',
      shieldFront: true,
    });
    promoted++;
  }
}

function ensureCoreBreaker(world: WorldState): void {
  world.enemies = world.enemies ?? [];
  const cores = world.enemies.filter((e) => e.brawlRole === 'core_crystal');
  if (cores.length >= 3) return;

  const cols = [
    Math.floor(world.totalCols * 0.28),
    Math.floor(world.totalCols * 0.54),
    Math.floor(world.totalCols * 0.78),
  ];
  for (let i = cores.length; i < 3; i++) {
    const c = cols[i % cols.length];
    const r = i === 1 && world.worldRows ? 4 : GROUND_ROW - 2;
    world.enemies.push({
      id: world.nextEntityId++,
      type: 'spiny',
      state: 'walk',
      x: c * TILE,
      y: r * TILE,
      baseY: r * TILE,
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
    });
  }
}

export function applyStageObjective(world: WorldState): WorldState {
  const objective = objectiveForStage(world.partition, world.levelIndex);
  world.objective = objective;
  world.pickups = (world.pickups ?? []).filter((pk) => pk.kind !== 'gem');
  world.gemsNeeded = 0;
  world.gemsCollected = 0;
  world.chase = null;
  world.goalBlockedTimer = 0;

  switch (objective) {
    case 'brawl_captain': {
      promoteOrSpawnCaptain(world);
      break;
    }
    case 'bounty_hunt': {
      promoteOrSpawnBountyHunt(world);
      break;
    }
    case 'shadow_combo': {
      promoteOrSpawnShadowCombo(world);
      break;
    }
    case 'core_breaker': {
      ensureCoreBreaker(world);
      break;
    }
    case 'time_attack': {
      world.timeLeft = timeAttackBudget(world.totalCols);
      for (const s of findSpots(world, CLOCKS_PER_STAGE, false)) {
        world.pickups.push(makePickup(world, 'clock', s.col, s.row));
      }
      break;
    }
    case 'chase':
      world.chase = {
        x: world.player.x - CHASE_START_GAP,
        speed: chaseSpeed(Math.floor(world.levelIndex / 4) + 1),
        delay: CHASE_DELAY,
      };
      break;
    case 'fortune': {
      const w = Math.floor(world.levelIndex / 4) + 1;
      world.fortuneTarget = world.coins + 12 + w * 2;
      break;
    }
    case 'reach':
      break;
    default:
      break;
  }

  const { total } = countBrawlTargets(world);
  world.brawlTargetsTotal = total;
  world.brawlTargetsDefeated = 0;

  placeFinalSprintSwitch(world);

  const label = OBJECTIVE_LABELS[objective];
  if (label && label.text) {
    world.floatingTexts.push({
      x: world.player.x - 40,
      y: world.player.y - 40,
      text: label.text,
      color: label.color,
      life: 170,
      maxLife: 170,
    });
  }
  return world;
}

/** Contabiliza objetivos de combate totales, vivos y derrotados */
export function countBrawlTargets(world: WorldState): { total: number; alive: number; defeated: number } {
  const isTarget = (e: Enemy): boolean => {
    if (e.brawlRole && ['captain', 'bounty_commander', 'core_crystal', 'shadow_rival', 'dojo_master'].includes(e.brawlRole)) {
      return true;
    }
    if (world.objective === 'shadow_combo' && e.shieldFront) return true;
    return false;
  };

  const isAlive = (e: Enemy): boolean => {
    return (e as any).alive !== false && (e.hp ?? 1) > 0 && e.state !== 'squashed' && e.state !== 'knocked';
  };

  const targets = (world.enemies ?? []).filter(isTarget);
  const alive = targets.filter(isAlive).length;
  const initialTotal = world.brawlTargetsTotal ?? targets.length;
  const total = Math.max(initialTotal, targets.length);
  const defeated = Math.max(world.brawlTargetsDefeated ?? 0, total - alive);

  return { total, alive, defeated };
}

/** ¿La meta está cerrada por objetivos de combate pendientes o apuesta? */
export function isGoalLocked(world: WorldState): boolean {
  if (world.goalSealBroken || (world.pSwitchTimer ?? 0) > 0) return false;
  switch (world.objective) {
    case 'brawl_captain':
    case 'bounty_hunt':
    case 'core_breaker':
    case 'shadow_combo': {
      const { alive } = countBrawlTargets(world);
      return alive > 0;
    }
    case 'fortune':
      return (world.coins ?? 0) < (world.fortuneTarget ?? 0);
    default:
      return false;
  }
}

/** Texto corto para el HUD */
export function objectiveHudLabel(world: WorldState): string | null {
  if ((world.pSwitchTimer ?? 0) > 0) {
    return `⚡ SPRINT [P] ${Math.ceil(world.pSwitchTimer! / 60)}s`;
  }
  const { total, alive, defeated } = countBrawlTargets(world);
  switch (world.objective) {
    case 'brawl_captain':
      return alive > 0 ? '⚔ CAPITÁN' : '⚔ ¡META LIBRE!';
    case 'bounty_hunt':
      return `🎯 CAZA ${defeated}/${total || 3}`;
    case 'core_breaker':
      return `💥 NÚCLEOS ${defeated}/${total || 3}`;
    case 'shadow_combo':
      return `🪞 DUO ECO ${defeated}/${total || 2}`;
    case 'time_attack':
      return '⏱ CONTRARRELOJ';
    case 'chase':
      return '👁 ¡CORRE!';
    case 'fortune':
      return `🪙 ${world.coins ?? 0}/${world.fortuneTarget ?? 0}`;
    default:
      return null;
  }
}

// ============================================================================
// ACTUALIZACIÓN POR FRAME
// ============================================================================
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const hit = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export interface ObjectiveCallbacks {
  killPlayer: () => void;
  sparks: (x: number, y: number, color: string, count: number) => void;
  text: (x: number, y: number, text: string, color: string) => void;
}

/** Activa el interruptor [P] de sprint final */
function activatePSwitch(
  world: WorldState,
  pk: Pickup,
  events: GameEvent[],
  cb: ObjectiveCallbacks
): void {
  pk.collected = true;
  world.pSwitchTimer = 600;
  world.goalSealBroken = true;
  cb.text(pk.x - 20, pk.y - 14, '¡SPRINT [P] 10s! ¡A LA META!', '#38bdf8');
  cb.sparks(pk.x + 12, pk.y + 12, '#38bdf8', 12);
  events.push({ type: 'sfx', id: 'switch_toggle' });
  events.push({ type: 'haptic', kind: 'success' });
}

/** Diana Rompe-Candado (Skill Bypass) */
export function checkGoalSkillBypass(
  world: WorldState,
  events: GameEvent[],
  cb: ObjectiveCallbacks
): boolean {
  if (!isGoalLocked(world)) return false;
  const fp = world.flagpole ?? world.goalTape;
  if (!fp) return false;

  const targetRect = {
    x: fp.x - 14,
    y: fp.y,
    width: 32,
    height: Math.round(fp.height * 0.42),
  };
  const lockRect = {
    x: fp.x - 16,
    y: fp.y,
    width: 36,
    height: fp.height,
  };

  const p = world.player;
  let bypassed = false;

  // 1. Salto alto al tercio superior del asta
  if (hit(p, targetRect)) {
    bypassed = true;
  }

  // 2. Giro de capa cerca del candado
  if (!bypassed && (p.capeSpinTimer ?? 0) > 0) {
    const spinHitbox = {
      x: p.x - 10,
      y: p.y - 6,
      width: p.width + 20,
      height: p.height + 12,
    };
    if (hit(spinHitbox, lockRect)) {
      bypassed = true;
    }
  }

  // 3. Bolas de fuego impactan el candado
  if (!bypassed && world.fireballs) {
    for (let i = world.fireballs.length - 1; i >= 0; i--) {
      const fb = world.fireballs[i];
      if (hit(fb, lockRect)) {
        world.fireballs.splice(i, 1);
        bypassed = true;
        break;
      }
    }
  }

  // 4. Llave inglesa impacta el candado
  if (!bypassed && world.wrench && hit(world.wrench, lockRect)) {
    world.wrench.phase = 'back';
    bypassed = true;
  }

  // 5. Caparazón deslizándose impacta el candado
  if (!bypassed && world.enemies) {
    for (const en of world.enemies) {
      if (en.active && en.state === 'shell_slide' && hit(en, lockRect)) {
        bypassed = true;
        break;
      }
    }
  }

  if (bypassed) {
    world.goalSealBroken = true;
    cb.sparks(fp.x + 2, fp.y + Math.round(fp.height * 0.3), '#fde047', 16);
    cb.text(fp.x - 24, fp.y - 16, '¡CANDADO ROTO!', '#fde047');
    events.push({ type: 'sfx', id: 'treasure' });
    events.push({ type: 'haptic', kind: 'success' });
    return true;
  }

  return false;
}

/** Paso por frame del sistema de objetivos, asedio y replicación de Eco */
export function stepObjective(
  world: WorldState,
  events?: GameEvent[],
  cb?: ObjectiveCallbacks
): void {
  const p = world.player;
  const ev = events ?? [];
  const dummyCb: ObjectiveCallbacks = {
    killPlayer: () => { p.dead = true; },
    sparks: () => {},
    text: () => {},
  };
  const callback = cb ?? dummyCb;

  // Temporizador del interruptor [P]
  if (world.pSwitchTimer && world.pSwitchTimer > 0) {
    world.pSwitchTimer -= 1;
    if (world.pSwitchTimer === 0) {
      if (world.status === 'playing' && isGoalLocked(world)) {
        world.goalSealBroken = false;
        if (world.pickups) {
          for (const pk of world.pickups) {
            if (pk.kind === 'p_switch') {
              pk.collected = false;
            }
          }
        }
      }
    }
  }

  // --- Pickups: p_switch y relojes ---
  if (world.pickups) {
    for (const pk of world.pickups) {
      if (!pk.collected && pk.kind === 'p_switch') {
        let triggered = hit(p, pk);
        if (!triggered && (p.capeSpinTimer ?? 0) > 0) {
          const spinHitbox = { x: p.x - 10, y: p.y - 6, width: p.width + 20, height: p.height + 12 };
          if (hit(spinHitbox, pk)) triggered = true;
        }
        if (!triggered && world.wrench && hit(world.wrench, pk)) {
          world.wrench.phase = 'back';
          triggered = true;
        }
        if (!triggered && world.fireballs) {
          for (let i = world.fireballs.length - 1; i >= 0; i--) {
            if (hit(world.fireballs[i], pk)) {
              world.fireballs.splice(i, 1);
              triggered = true;
              break;
            }
          }
        }
        if (!triggered && world.enemies) {
          for (const en of world.enemies) {
            if (en.active && en.state === 'shell_slide' && hit(en, pk)) {
              triggered = true;
              break;
            }
          }
        }
        if (triggered) {
          activatePSwitch(world, pk, ev, callback);
          continue;
        }
      }

      if (pk.collected || pk.kind !== 'clock' || !hit(p, pk)) {
        // Compatibilidad: si existe gema residual en test, permitir tomarla
        if (!pk.collected && pk.kind === 'gem' && hit(p, pk)) {
          pk.collected = true;
          world.gemsCollected = (world.gemsCollected ?? 0) + 1;
          world.score += 1000;
          callback.sparks(pk.x + 10, pk.y + 12, '#f0abfc', 10);
        }
        continue;
      }
      pk.collected = true;
      world.timeLeft += CLOCK_BONUS;
      callback.text(pk.x - 10, pk.y - 10, `+${CLOCK_BONUS}`, '#fde047');
      callback.sparks(pk.x + 10, pk.y + 12, '#fde047', 8);
      ev.push({ type: 'sfx', id: 'clock' });
      ev.push({ type: 'haptic', kind: 'light' });
    }
  }

  // --- Actualización de Objetivos de Combate (Plomero Brawl) ---
  const isBrawl =
    world.objective === 'brawl_captain' ||
    world.objective === 'bounty_hunt' ||
    world.objective === 'core_breaker' ||
    world.objective === 'shadow_combo';

  if (isBrawl) {
    const { total, alive, defeated } = countBrawlTargets(world);
    world.brawlTargetsTotal = total;
    const prevDefeated = world.brawlTargetsDefeated ?? 0;
    world.brawlTargetsDefeated = defeated;

    if (total > 0 && alive === 0 && !world.goalSealBroken) {
      world.goalSealBroken = true;
      world.score += 1000;
      callback.text(world.player.x - 20, world.player.y - 30, '¡META DESBLOQUEADA!', '#fde047');
      callback.sparks(world.player.x + 10, world.player.y + 10, '#fde047', 18);
      ev.push({ type: 'sfx', id: 'treasure' });
      ev.push({ type: 'haptic', kind: 'success' });
    }
  }

  // --- Historial del Eco y Replicación de Golpes (60 frames después) ---
  if (world.echoTrail && world.echoTrail.length > 0) {
    const latest = world.echoTrail[world.echoTrail.length - 1];
    if (p.meleeTimer === 11) latest.melee = true;
    if (p.groundPounding) latest.groundPound = true;
    latest.facing = p.facing;
  }
  if (world.echo && (world.echo.melee || world.echo.groundPound)) {
    world.echoAttackPulse = 10;
    world.echoAttackX = world.echo.x;
    world.echoAttackY = world.echo.y;
    world.echoAttackFacing = world.echo.facing ?? 1;
    callback.sparks(world.echo.x + 10, world.echo.y + 10, '#c084fc', 8);
    callback.text(world.echo.x - 20, world.echo.y - 20, '⚔ ¡GOLPE ECO!', '#c084fc');
    ev.push({ type: 'sfx', id: 'kick' });
    ev.push({ type: 'haptic', kind: 'medium' });
  }

  // Diana Rompe-Candado en el asta
  checkGoalSkillBypass(world, ev, callback);

  // --- Sombra que persigue ---
  const ch = world.chase;
  if (ch) {
    if (ch.delay > 0) {
      ch.delay -= 1;
      if (ch.delay === 0) ev.push({ type: 'sfx', id: 'chase_growl' });
    } else {
      const dist = p.x - ch.x;
      const factor = Math.max(CHASE_MIN_FACTOR, Math.min(1, (dist - 60) / 240));
      ch.x += ch.speed * factor;
    }
    ch.x = Math.max(ch.x, world.cameraX - CHASE_MAX_LAG);
    if (p.x < ch.x + 4) {
      callback.killPlayer();
      return;
    }
    if (world.frameCount % 3 === 0) {
      world.particles.push({
        x: ch.x - 4,
        y: 40 + ((world.frameCount * 53) % 360),
        vx: 1.2 + ch.speed,
        vy: -0.4,
        gravity: 0,
        size: 4,
        color: '#a855f7',
        life: 24,
        maxLife: 24,
        kind: 'spark',
      });
    }
  }

  if (world.goalBlockedTimer && world.goalBlockedTimer > 0) world.goalBlockedTimer -= 1;
}

export function updateObjectives(world: WorldState, events: GameEvent[], cb: ObjectiveCallbacks): void {
  stepObjective(world, events, cb);
}

/**
 * Si la meta está cerrada y el jugador la alcanza, lo empuja hacia atrás.
 */
export function enforceGoalLock(world: WorldState, events: GameEvent[], cb: ObjectiveCallbacks): boolean {
  if (checkGoalSkillBypass(world, events, cb)) return false;
  if (!isGoalLocked(world)) return false;
  const p = world.player;
  const fp = world.flagpole ?? world.goalTape;
  if (!fp) return false;

  const { alive } = countBrawlTargets(world);
  const msg =
    world.objective === 'brawl_captain'
      ? '¡DERROTA AL CAPITÁN!'
      : alive > 0
      ? `¡FALTAN ${alive} OBJETIVOS!`
      : '¡META BLOQUEADA!';

  const isNonlinear = world.partition === 'flip' || world.arenaWave != null;
  if (isNonlinear) {
    const fpW = 'width' in fp ? fp.width : 16;
    const overlapsGoal =
      p.x < fp.x + fpW &&
      p.x + p.width > fp.x &&
      p.y < fp.y + fp.height &&
      p.y + p.height > fp.y;
    if (overlapsGoal) {
      if (!world.goalBlockedTimer) {
        cb.text(fp.x - 70, p.y - 24, msg, '#f87171');
        events.push({ type: 'sfx', id: 'goal_locked' });
        events.push({ type: 'haptic', kind: 'error' });
        world.goalBlockedTimer = 60;
      }
      return true;
    }
    return false;
  }

  const goalX = fp.x;
  if (p.x + p.width < goalX - 2) return false;
  p.x = goalX - p.width - 6;
  p.vx = -3.5;
  if (!world.goalBlockedTimer) {
    cb.text(goalX - 70, p.y - 24, msg, '#f87171');
    events.push({ type: 'sfx', id: 'goal_locked' });
    events.push({ type: 'haptic', kind: 'error' });
    world.goalBlockedTimer = 60;
  }
  return true;
}
