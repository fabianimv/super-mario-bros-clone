// ============================================================================
// HABILIDADES DEL PLOMERO (Fase 4)
//   · Salto en pared: en el aire, empujar contra una pared hace deslizarse
//     lento; con A se rebota hacia el lado contrario.
//   · Deslizarse: corriendo, abajo = barrida por el suelo. Pasa por huecos
//     bajos y derriba a los enemigos comunes.
//   · Llave inglesa: con el botón de fuego (sin flor ni capa) se lanza como
//     bumerán. Derriba enemigos, golpea bloques, junta monedas y trae de vuelta
//     gemas, relojes o llaves.
//   · Chimeneas: dos paredes flotantes con un tesoro arriba que solo se
//     alcanza con salto en pared. Se pasa por debajo, así que son opcionales.
// La lógica del jugador vive en physics.ts; aquí están las constantes, la
// llave inglesa y la ubicación de las chimeneas.
// ============================================================================
import { GROUND_ROW, STAGES_PER_WORLD, TILE } from './biomes';
import { isGoalLocked } from './objectives';
import type { Block, BlockType, Enemy, EnemyType, GameEvent, InputState, Pickup, Wrench, WorldState } from './types';

const key = (col: number, row: number): number => row * 1024 + col;

// ============================================================================
// SISTEMA PLOMERO BRAWL (Combate Melee, Sismo, Parry y Modo Furia)
// ============================================================================
export const MELEE_ACTIVE_FRAMES = 12;
export const COMBO_WINDOW_FRAMES = 30;
export const PARRY_WINDOW_FRAMES = 14;
export const PARRY_COOLDOWN_FRAMES = 22;
export const FURY_DURATION_FRAMES = 480;
export const GROUND_POUND_SPIN_DELAY = 6;
export const GROUND_POUND_SPEED = 14.5;
export const SHOCKWAVE_DURATION = 18;

/**
 * Activa el combo cuerpo a cuerpo de 3 golpes (Jab -> Uppercut -> Patada Meteoro).
 */
export function triggerMeleeCombo(
  world: WorldState,
  events?: GameEvent[],
  upPressed = false
): boolean {
  const p = world.player;
  if ((p.comboTimer ?? 0) > 0 && (p.comboStep ?? 0) < 3) {
    p.comboStep = (((p.comboStep ?? 0) + 1) as 1 | 2 | 3);
  } else {
    p.comboStep = 1;
  }
  p.meleeTimer = MELEE_ACTIVE_FRAMES;
  p.comboTimer = COMBO_WINDOW_FRAMES;
  p.meleeHitIds = [];

  // Golpe 2 + ▲ = Air Juggle (impulso ascendente)
  if (p.comboStep === 2 && upPressed) {
    p.vy = Math.min(p.vy, -5.2);
  }

  if (events) {
    const sfx = p.comboStep === 3 ? 'kick' : 'bump';
    events.push({ type: 'sfx', id: sfx });
    events.push({ type: 'haptic', kind: p.comboStep === 3 ? 'heavy' : 'light' });
  }

  // En Modo Furia: lanza una Onda Cortante de Energía de alto daño y penetrante
  if ((p.furyTimer ?? 0) > 0) {
    launchFuryWave(world, events);
  }

  return true;
}

/**
 * Lanza una Onda Cortante de Energía cuando está activo el Modo Furia.
 */
export function launchFuryWave(world: WorldState, events?: GameEvent[]): boolean {
  const p = world.player;
  world.wrench = {
    x: p.facing === 1 ? p.x + p.width : p.x - 24,
    y: p.y + Math.min(10, p.height / 3),
    width: 24,
    height: 20,
    vx: p.facing * (WRENCH_SPEED + 3),
    vy: 0,
    dir: p.facing === 1 ? 1 : -1,
    phase: 'out',
    travelled: 0,
    timer: 0,
    spin: 0,
    carryId: null,
    hitBoss: false,
    dmg: 3,
    fury: true,
    piercing: true,
  };
  p.throwPoseTimer = 10;
  if (events) {
    events.push({ type: 'sfx', id: 'fireball' });
    events.push({ type: 'haptic', kind: 'heavy' });
  }
  return true;
}

/**
 * Activa el Machaque Sísmico (Ground Pound) en el aire.
 */
export function triggerGroundPound(world: WorldState, events?: GameEvent[]): boolean {
  const p = world.player;
  if (p.onGround || p.groundPounding) return false;
  p.groundPounding = true;
  p.groundPoundDelay = GROUND_POUND_SPIN_DELAY;
  p.vx = 0;
  p.vy = 0;
  if (events) {
    events.push({ type: 'sfx', id: 'spin_jump' });
    events.push({ type: 'haptic', kind: 'medium' });
  }
  return true;
}

/**
 * Activa el escudo de Parry / Contraataque perfecto durante 14 frames.
 */
export function triggerParry(world: WorldState, events?: GameEvent[]): boolean {
  const p = world.player;
  if ((p.parryCooldown ?? 0) > 0) return false;
  p.parryTimer = PARRY_WINDOW_FRAMES;
  p.parryCooldown = PARRY_COOLDOWN_FRAMES;
  if (events) {
    events.push({ type: 'sfx', id: 'bump' });
    events.push({ type: 'haptic', kind: 'light' });
  }
  return true;
}

/**
 * Añade energía a la barra de Furia (0..100). Al alcanzar 100 activa Modo Furia por 8s.
 */
export function addFury(world: WorldState, amount: number, events?: GameEvent[]): void {
  const p = world.player;
  const current = p.furyMeter ?? 0;
  const next = Math.min(100, Math.max(0, current + amount));
  p.furyMeter = next;

  if (next >= 100 && (p.furyTimer ?? 0) <= 0) {
    p.furyTimer = FURY_DURATION_FRAMES;
    p.furyMeter = 100;
    world.screenShake = 6;
    world.floatingTexts.push({
      x: p.x - 30,
      y: p.y - 30,
      text: '🔥 ¡MODO FURIA!',
      color: '#ef4444',
      life: 140,
      maxLife: 140,
    });
    if (events) {
      events.push({ type: 'sfx', id: 'treasure' });
      events.push({ type: 'haptic', kind: 'rigid' });
    }
  }
}

/**
 * Decrementa frame a frame los temporizadores del sistema de combate.
 */
export function stepBrawlTimers(world: WorldState): void {
  const p = world.player;
  if (p.comboTimer && p.comboTimer > 0) {
    p.comboTimer -= 1;
    if (p.comboTimer === 0) p.comboStep = 0;
  }
  if (p.meleeTimer && p.meleeTimer > 0) {
    p.meleeTimer -= 1;
  }
  if (p.groundPounding && (p.groundPoundDelay ?? 0) > 0) {
    p.groundPoundDelay! -= 1;
  }
  if (p.shockwaveTimer && p.shockwaveTimer > 0) {
    p.shockwaveTimer -= 1;
  }
  if (p.parryTimer && p.parryTimer > 0) {
    p.parryTimer -= 1;
  }
  if (p.parryCooldown && p.parryCooldown > 0) {
    p.parryCooldown -= 1;
  }
  if (p.parryFlashTimer && p.parryFlashTimer > 0) {
    p.parryFlashTimer -= 1;
  }
  if (p.furyTimer && p.furyTimer > 0) {
    p.furyTimer -= 1;
    if (p.furyTimer === 0) {
      p.furyMeter = 0;
    }
  }
  if (world.arenaGoTimer && world.arenaGoTimer > 0) {
    world.arenaGoTimer -= 1;
  }
  if (world.echoAttackPulse && world.echoAttackPulse > 0) {
    world.echoAttackPulse -= 1;
  }
}

/**
 * Función central de actualización de habilidades y timers para cada tick.
 */
export function stepAbilities(
  world: WorldState,
  input?: Partial<InputState>,
  events?: GameEvent[],
  cb?: WrenchCallbacks
): void {
  stepBrawlTimers(world);
  if (cb && events) {
    updateWrench(world, events, cb);
  }
}

// --- Salto en pared ---
export const WALL_SLIDE_SPEED = 2.2;
export const WALL_JUMP_VY = -10.6;
export const WALL_JUMP_VX = 4.6;
export const WALL_JUMP_LOCK = 10;
export const WALL_COYOTE = 6;

// --- Deslizarse ---
export const SLIDE_MIN_SPEED = 3.4;
export const SLIDE_FRAMES = 36;
export const SLIDE_FRICTION = 0.978;
export const SLIDE_HEIGHT = 22;
/** Enemigos que una barrida derriba (los demás siguen dañando). */
export const SLIDE_KO = new Set<EnemyType>(['goomba', 'galoomba', 'koopa_green', 'koopa_red', 'rex']);

// --- Llave inglesa ---
export const WRENCH_SPEED = 8;
export const WRENCH_RANGE = 6 * TILE;
export const WRENCH_RETURN_SPEED = 9;
export const WRENCH_MAX_FRAMES = 150;

export function throwWrench(world: WorldState, events: GameEvent[]): boolean {
  const p = world.player;
  if (world.wrench) return false;
  world.wrench = {
    x: p.facing === 1 ? p.x + p.width : p.x - 18,
    y: p.y + Math.min(10, p.height / 3),
    width: 18,
    height: 18,
    vx: p.facing * WRENCH_SPEED,
    vy: 0,
    dir: p.facing === 1 ? 1 : -1,
    phase: 'out',
    travelled: 0,
    timer: 0,
    spin: 0,
    carryId: null,
    hitBoss: false,
  };
  p.throwPoseTimer = 10;
  events.push({ type: 'sfx', id: 'wrench_throw' });
  events.push({ type: 'haptic', kind: 'light' });
  return true;
}

export interface WrenchCallbacks {
  knockEnemy: (en: Enemy) => void;
  collectCoin: (x: number, y: number) => void;
  hitBlock: (b: Block) => void;
  hitBoss: () => void;
  sparks: (x: number, y: number, color: string, count: number) => void;
}

const hit = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const CARRYABLE: Array<Pickup['kind']> = ['gem', 'clock', 'key', 'p_switch'];

export function updateWrench(world: WorldState, events: GameEvent[], cb: WrenchCallbacks): void {
  const w = world.wrench;
  if (!w) return;
  const p = world.player;
  w.timer += 1;
  w.spin += 0.45;

  if (w.phase === 'out') {
    w.x += w.vx;
    w.travelled += Math.abs(w.vx);
    // Choca con bloques: golpea ? y ladrillos, y vuelve
    const col = Math.floor((w.x + (w.dir === 1 ? w.width : 0)) / TILE);
    const row = Math.floor((w.y + w.height / 2) / TILE);
    const b = world.blockGrid.get(key(col, row));
    if (b && b.type !== 'hidden') {
      if (
        b.type === 'question' ||
        b.type === 'brick' ||
        b.type === 'rotating' ||
        b.type === 'on_off_switch'
      ) {
        cb.hitBlock(b);
      }
      cb.sparks(w.x + w.width / 2, w.y + w.height / 2, '#e2e8f0', 4);
      events.push({ type: 'sfx', id: 'bump' });
      w.phase = 'back';
    } else if (world.pipes.some((pp) => hit(w, pp))) {
      w.phase = 'back';
    } else if (w.travelled >= WRENCH_RANGE) {
      w.phase = 'back';
    }
  } else {
    // Vuelve a la mano del plomero
    const tx = p.x + p.width / 2 - w.width / 2;
    const ty = p.y + Math.min(10, p.height / 3);
    const dx = tx - w.x;
    const dy = ty - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    w.x += (dx / dist) * WRENCH_RETURN_SPEED;
    w.y += (dy / dist) * WRENCH_RETURN_SPEED;
    if (dist < WRENCH_RETURN_SPEED + 4) {
      // Atrapada: entrega lo que traía
      if (w.carryId !== null) {
        const pk = world.pickups?.find((x) => x.id === w.carryId);
        if (pk) {
          pk.x = p.x + p.width / 2 - pk.width / 2;
          pk.y = p.y + p.height / 2 - pk.height / 2;
        }
      }
      world.wrench = null;
      events.push({ type: 'sfx', id: 'wrench_catch' });
      return;
    }
  }

  // Enemigos
  for (const en of world.enemies) {
    if (en.state === 'squashed' || en.state === 'knocked' || !en.active) continue;
    if (en.type === 'piranha' && en.y > en.baseY + en.height - 6) continue;
    if (hit(w, en)) {
      if (w.dmg && en.hp) {
        en.hp = Math.max(0, en.hp - w.dmg);
      }
      cb.knockEnemy(en);
      if (w.phase === 'out' && !w.piercing) w.phase = 'back';
    }
  }

  // Jefe: un golpe por lanzamiento
  if (world.boss && !world.boss.defeated && !w.hitBoss && hit(w, world.boss)) {
    w.hitBoss = true;
    w.phase = 'back';
    cb.hitBoss();
  }

  // Monedas
  for (const c of world.coinsList) {
    if (!c.collected && hit(w, c)) {
      c.collected = true;
      cb.collectCoin(c.x, c.y);
    }
  }

  // Trae de vuelta gemas, relojes o llaves, o activa p_switch
  if (world.pickups) {
    if (w.carryId === null) {
      const pk = world.pickups.find((x) => !x.collected && CARRYABLE.includes(x.kind) && hit(w, x));
      if (pk) {
        if (pk.kind === 'p_switch') {
          pk.collected = true;
          world.pSwitchTimer = 600;
          world.goalSealBroken = true;
          cb.sparks(pk.x + 12, pk.y + 12, '#38bdf8', 12);
          world.floatingTexts.push({
            x: pk.x - 20,
            y: pk.y - 14,
            text: '¡SPRINT [P] 10s! ¡A LA META!',
            color: '#38bdf8',
            life: 120,
            maxLife: 120,
          });
          events.push({ type: 'sfx', id: 'switch_toggle' });
          events.push({ type: 'haptic', kind: 'success' });
          w.phase = 'back';
        } else {
          w.carryId = pk.id;
          w.phase = 'back';
        }
      }
    }
    if (w.carryId !== null) {
      const pk = world.pickups.find((x) => x.id === w.carryId);
      if (pk && !pk.collected) {
        pk.x = w.x + w.width / 2 - pk.width / 2;
        pk.y = w.y + w.height / 2 - pk.height / 2;
      } else {
        w.carryId = null;
      }
    }
  }

  // Impacto contra meta cerrada: rompe el candado
  const fp = world.flagpole ?? world.goalTape;
  if (fp && isGoalLocked(world)) {
    const lockRect = { x: fp.x - 16, y: fp.y, width: 36, height: fp.height };
    if (hit(w, lockRect)) {
      world.goalSealBroken = true;
      world.gemsCollected = world.gemsNeeded ?? world.gemsCollected;
      cb.sparks(fp.x + 2, fp.y + Math.round(fp.height * 0.3), '#fde047', 16);
      world.floatingTexts.push({
        x: fp.x - 24,
        y: fp.y - 16,
        text: '¡CANDADO ROTO!',
        color: '#fde047',
        life: 120,
        maxLife: 120,
      });
      events.push({ type: 'sfx', id: 'treasure' });
      events.push({ type: 'haptic', kind: 'success' });
      w.phase = 'back';
    }
  }

  if (w.timer > WRENCH_MAX_FRAMES) world.wrench = null;
}

// ============================================================================
// CHIMENEAS (retos de salto en pared)
// ============================================================================
export const SHAFT_TOP_ROW = 3;
export const SHAFT_BOTTOM_ROW = 8;
export const SHAFT_INNER = 2; // columnas libres entre las paredes

export function stageHasShaft(levelIndex: number, partition: WorldState['partition']): boolean {
  const stageNum = (levelIndex % STAGES_PER_WORLD) + 1;
  if (stageNum === 4 || levelIndex === 0) return false;
  if (partition === 'classic' && levelIndex === 1) return false;
  return true;
}

function placeBlock(world: WorldState, col: number, row: number, type: BlockType): void {
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

function findShaftCol(world: WorldState): number | null {
  const from = Math.max(14, Math.floor(world.totalCols * 0.2));
  const to = world.totalCols - 30;
  const cpCol = world.checkpoint ? Math.floor(world.checkpoint.x / TILE) : -99;
  const lockCol = world.blocks.find((b) => b.type === 'lock')?.col ?? -99;
  const width = SHAFT_INNER + 2;
  const span = Math.max(1, to - from + 1);
  const startOffset = Math.abs((world.levelIndex * 23 + world.totalCols * 7) % span);
  for (let step = 0; step < span; step++) {
    const c = from + ((startOffset + step) % span);
    if (Math.abs(c - lockCol) < 12) continue;
    let ok = true;
    for (let col = c - 1; col <= c + width && ok; col++) {
      if (!world.blockGrid.has(key(col, GROUND_ROW)) || world.lavaCols.has(col)) ok = false;
      const inside = col >= c && col < c + width;
      for (let r = inside ? 2 : 9; r < GROUND_ROW && ok; r++) if (world.blockGrid.has(key(col, r))) ok = false;
      if (Math.abs(col - cpCol) <= 1) ok = false;
    }
    if (!ok) continue;
    const x0 = (c - 1) * TILE;
    const x1 = (c + width + 1) * TILE;
    const clash = (x: number, w: number) => x + w > x0 && x < x1;
    if (world.pipes.some((p) => clash(p.x, p.width))) continue;
    if (world.springs.some((s) => clash(s.x, s.width))) continue;
    if (world.platforms.some((p) => clash(p.startX - Math.abs(p.rangeX), p.width + 2 * Math.abs(p.rangeX)))) continue;
    if (world.pickups?.some((p) => clash(p.x, p.width))) continue;
    return c;
  }
  return null;
}

export function applyAbilityChallenges(world: WorldState): WorldState {
  world.wrench = null;
  world.shafts = [];
  if (!stageHasShaft(world.levelIndex, world.partition)) return world;
  const c = findShaftCol(world);
  if (c === null) return world;

  const right = c + SHAFT_INNER + 1;
  for (let r = SHAFT_TOP_ROW; r <= SHAFT_BOTTOM_ROW; r++) {
    placeBlock(world, c, r, 'hard');
    placeBlock(world, right, r, 'hard');
  }
  // Monedas que marcan el camino hacia arriba
  for (let r = SHAFT_BOTTOM_ROW - 1; r >= SHAFT_TOP_ROW; r -= 2) {
    for (let col = c + 1; col <= c + SHAFT_INNER; col++) {
      world.coinsList.push({
        x: col * TILE + 7,
        y: r * TILE + 5,
        baseY: r * TILE + 5,
        width: 18,
        height: 22,
        collected: false,
        phase: col * 0.45 + r,
      });
    }
  }
  // Tesoro sobre la pared derecha
  if (!world.pickups) world.pickups = [];
  world.pickups.push({
    id: world.nextEntityId++,
    kind: 'treasure',
    x: right * TILE + 4,
    y: (SHAFT_TOP_ROW - 1) * TILE + 2,
    width: 24,
    height: 28,
    collected: false,
    phase: 0,
  });
  world.shafts.push({ x: (c + 1) * TILE, y: SHAFT_BOTTOM_ROW * TILE, hinted: false });
  return world;
}

/** Muestra una pista la primera vez que el jugador se acerca a una chimenea. */
export function updateShaftHints(world: WorldState, text: (x: number, y: number, t: string, c: string) => void): void {
  if (!world.shafts) return;
  for (const s of world.shafts) {
    if (s.hinted) continue;
    if (Math.abs(world.player.x - s.x) < 7 * TILE) {
      s.hinted = true;
      text(s.x - 70, s.y - 20, 'SALTA ENTRE LAS PAREDES', '#a5f3fc');
    }
  }
}
