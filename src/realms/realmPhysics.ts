// ============================================================================
// REINOS ABIERTOS - Simulación 60 Hz
// Plataformas laterales con cámara libre en ambos ejes y mecánicas nuevas:
//  • Raíces Hondas: taladro (terreno destructible), semillas trepadoras,
//    ciclo día/noche (plataformas de luciérnaga, girasoles, sombras).
//  • Archipiélago Tinta: pintura de superficies (azul rebota, naranja acelera,
//    verde adhiere a paredes y techos), planeo y corrientes ascendentes.
//  • Fosa Magnética: polaridad del jugador frente a imanes rojos/azules
//    (atracción, repulsión, lanzamiento), nado libre con oxígeno y pulso.
// Común: santuarios con viaje rápido, mapa con niebla, mejoras persistentes.
// ============================================================================

import type { GameEvent, InputState } from '../engine/types';
import { EXPLORE_CELL, REALM_TILE, spawnEnemy } from './realmBuilder';
import {
  PAINT,
  T,
  type PaintColor,
  type RealmEnemy,
  type RealmPickupKind,
  type RealmPlayer,
  type RealmWorld,
} from './realmTypes';

const TS = REALM_TILE;
const GRAVITY = 0.55;
const MAX_FALL = 12;
const WALK = 3.3;
const RUN = 5.2;
const ORANGE_RUN = 9.6;
const JUMP_V = 10.6;
const RUN_JUMP_V = 11.4;
const DOUBLE_JUMP_V = 9.6;
const COYOTE = 6;
const BUFFER = 7;
export const MAGNET_LAUNCH = 18;
export const RETURN_HOLD_FRAMES = 100;

// ---------------------------------------------------------------------------
// Consultas de tiles
// ---------------------------------------------------------------------------
export function tileAt(w: RealmWorld, c: number, r: number): number {
  if (c < 0 || c >= w.cols || r >= w.rows) return T.BEDROCK;
  if (r < 0) return T.AIR;
  return w.tiles[r * w.cols + c];
}

function isSolidTile(w: RealmWorld, t: number): boolean {
  switch (t) {
    case T.AIR:
    case T.VINE:
    case T.WATER:
    case T.CLOUD:
    case T.PLANK:
    case T.NIGHT_PLAT:
    case T.SPIKES:
    case T.INK_SEA:
      return false;
    default:
      return true;
  }
}

function isOneWay(w: RealmWorld, t: number): boolean {
  if (t === T.CLOUD || t === T.PLANK) return true;
  if (t === T.NIGHT_PLAT) return w.isNight;
  return false;
}

export function solidAt(w: RealmWorld, c: number, r: number): boolean {
  return isSolidTile(w, tileAt(w, c, r));
}

function solidAtPx(w: RealmWorld, x: number, y: number): boolean {
  return solidAt(w, Math.floor(x / TS), Math.floor(y / TS));
}

function paintAt(w: RealmWorld, c: number, r: number): number {
  if (c < 0 || r < 0 || c >= w.cols || r >= w.rows) return 0;
  return w.paint[r * w.cols + c];
}

function setTile(w: RealmWorld, c: number, r: number, t: number): void {
  if (c < 0 || r < 0 || c >= w.cols || r >= w.rows) return;
  w.tiles[r * w.cols + c] = t;
  w.tileVersion++;
}

function isMagnet(t: number): number {
  if (t === T.MAGNET_RED) return 1;
  if (t === T.MAGNET_BLUE) return -1;
  return 0;
}

/** Dureza para el taladro (golpes necesarios). Infinity = indestructible. */
export function tileHardness(t: number, diamond: boolean): number {
  switch (t) {
    case T.DIRT:
    case T.GRASS:
    case T.ROOT:
      return diamond ? 1 : 2;
    case T.ORE:
      return diamond ? 2 : 3;
    case T.CRYSTAL:
      return diamond ? 2 : 4;
    case T.STONE:
      return diamond ? 3 : Infinity;
    default:
      return Infinity;
  }
}

// ---------------------------------------------------------------------------
// Efectos
// ---------------------------------------------------------------------------
function burst(w: RealmWorld, x: number, y: number, color: string, n: number, speed = 3, gravity = 0.18): void {
  if (w.particles.length > 260) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (w.frame % 7) * 0.3;
    const s = speed * (0.4 + ((i * 37 + w.frame) % 10) / 10);
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1,
      life: 26 + (i % 10),
      maxLife: 36,
      color,
      size: 2 + (i % 3),
      gravity,
    });
  }
}

function floatText(w: RealmWorld, x: number, y: number, text: string, color: string): void {
  w.floatTexts.push({ x, y, text, color, life: 60 });
  if (w.floatTexts.length > 14) w.floatTexts.shift();
}

function showHint(w: RealmWorld, text: string, frames = 200): void {
  w.hint = text;
  w.hintTimer = frames;
}

const TILE_COLORS: Record<number, string> = {
  [T.DIRT]: '#8b5a2b',
  [T.GRASS]: '#4ade80',
  [T.STONE]: '#9ca3af',
  [T.ORE]: '#fbbf24',
  [T.CRYSTAL]: '#c084fc',
  [T.ROOT]: '#a16207',
};

const PAINT_HEX: Record<PaintColor, string> = {
  1: '#3b82f6',
  2: '#f97316',
  3: '#22c55e',
};
export const PAINT_NAMES: Record<PaintColor, string> = {
  1: 'AZUL',
  2: 'NARANJA',
  3: 'VERDE',
};

// ---------------------------------------------------------------------------
// Colisión del jugador (AABB contra la grilla, eje por eje)
// ---------------------------------------------------------------------------
function moveX(w: RealmWorld, p: RealmPlayer): number {
  // Devuelve -1/1 si chocó contra una pared en esa dirección, 0 si no
  if (p.vx === 0) return 0;
  p.x += p.vx;
  const top = Math.floor(p.y / TS);
  const bottom = Math.floor((p.y + p.h - 1) / TS);
  if (p.vx > 0) {
    const c = Math.floor((p.x + p.w) / TS);
    for (let r = top; r <= bottom; r++) {
      if (solidAt(w, c, r)) {
        p.x = c * TS - p.w - 0.01;
        p.vx = 0;
        return 1;
      }
    }
  } else {
    const c = Math.floor(p.x / TS);
    for (let r = top; r <= bottom; r++) {
      if (solidAt(w, c, r)) {
        p.x = (c + 1) * TS + 0.01;
        p.vx = 0;
        return -1;
      }
    }
  }
  return 0;
}

function moveY(w: RealmWorld, p: RealmPlayer, dropThrough: boolean): number {
  // Devuelve 1 si aterrizó, -1 si golpeó techo
  const prevBottom = p.y + p.h;
  p.y += p.vy;
  if (p.y < -64) {
    p.y = -64;
    if (p.vy < 0) p.vy = 0;
  }
  const left = Math.floor(p.x / TS);
  const right = Math.floor((p.x + p.w - 1) / TS);
  if (p.vy > 0) {
    const r = Math.floor((p.y + p.h) / TS);
    for (let c = left; c <= right; c++) {
      const t = tileAt(w, c, r);
      const hitSolid = isSolidTile(w, t);
      const hitPlatform = !dropThrough && isOneWay(w, t) && prevBottom <= r * TS + 0.5;
      if (hitSolid || hitPlatform) {
        p.y = r * TS - p.h;
        return 1;
      }
    }
  } else if (p.vy < 0) {
    const r = Math.floor(p.y / TS);
    for (let c = left; c <= right; c++) {
      if (solidAt(w, c, r)) {
        p.y = (r + 1) * TS + 0.01;
        return -1;
      }
    }
  }
  return 0;
}

function overlapsTile(w: RealmWorld, p: RealmPlayer, tile: number, inset = 2): boolean {
  const c0 = Math.floor((p.x + inset) / TS);
  const c1 = Math.floor((p.x + p.w - inset) / TS);
  const r0 = Math.floor((p.y + inset) / TS);
  const r1 = Math.floor((p.y + p.h - inset) / TS);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (tileAt(w, c, r) === tile) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Daño / muerte / reaparición
// ---------------------------------------------------------------------------
function hurtPlayer(w: RealmWorld, events: GameEvent[], fromX: number, amount = 1): void {
  const p = w.player;
  if (p.invuln > 0 || p.deathTimer > 0 || w.cleared) return;
  p.hp -= amount;
  p.invuln = 90;
  const dir = p.x + p.w / 2 < fromX ? -1 : 1;
  p.vx = dir * 5;
  p.vy = -6;
  p.stuck = 'none';
  p.magnetCling = false;
  p.climbing = false;
  w.shake = 8;
  events.push({ type: 'sfx', id: 'power_down' }, { type: 'haptic', kind: 'heavy' });
  burst(w, p.x + p.w / 2, p.y + p.h / 2, '#f87171', 10);
  if (p.hp <= 0) {
    p.hp = 0;
    p.deathTimer = 70;
    events.push({ type: 'sfx', id: 'die' }, { type: 'haptic', kind: 'error' });
  }
}

export function warpToShrine(w: RealmWorld, idx: number): void {
  const s = w.shrines[idx];
  if (!s) return;
  const p = w.player;
  p.x = s.x - p.w / 2 + 30;
  p.y = s.y - p.h - 1;
  p.vx = 0;
  p.vy = 0;
  p.stuck = 'none';
  p.magnetCling = false;
  p.climbing = false;
  p.gliding = false;
  p.lastSafeX = p.x;
  p.lastSafeY = p.y;
  w.respawnShrine = idx;
  burst(w, s.x, s.y - 20, '#fde68a', 16, 3.5, 0.05);
}

function respawn(w: RealmWorld): void {
  const p = w.player;
  const lost = Math.floor(w.orbs * 0.2);
  w.orbs -= lost;
  w.deaths++;
  p.hp = p.maxHp;
  p.oxygen = p.maxOxygen;
  p.invuln = 120;
  p.deathTimer = 0;
  warpToShrine(w, w.respawnShrine);
  showHint(w, lost > 0 ? `Despiertas en el santuario • perdiste ${lost} orbes` : 'Despiertas en el santuario');
}

// ---------------------------------------------------------------------------
// Herramientas
// ---------------------------------------------------------------------------
function drill(w: RealmWorld, events: GameEvent[], input: InputState): void {
  const p = w.player;
  p.drilling = 10;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const targets: Array<[number, number]> = [];
  if (input.down && !p.climbing) {
    const r = Math.floor((p.y + p.h + 4) / TS);
    targets.push([Math.floor((p.x + 3) / TS), r], [Math.floor((p.x + p.w - 3) / TS), r]);
  } else if (input.up) {
    const r = Math.floor((p.y - 4) / TS);
    targets.push([Math.floor((p.x + 3) / TS), r], [Math.floor((p.x + p.w - 3) / TS), r]);
  } else {
    const c = Math.floor((p.facing > 0 ? p.x + p.w + 6 : p.x - 6) / TS);
    targets.push([c, Math.floor((p.y + 2) / TS)], [c, Math.floor((p.y + p.h - 2) / TS)]);
  }
  const seen = new Set<number>();
  let broke = false;
  let blocked = false;
  for (const [c, r] of targets) {
    const key = r * w.cols + c;
    if (seen.has(key)) continue;
    seen.add(key);
    const t = tileAt(w, c, r);
    if (t === T.AIR || t === T.WATER || t === T.VINE) continue;
    const hard = tileHardness(t, w.upgrades.diamondDrill);
    if (!isFinite(hard)) {
      blocked = true;
      continue;
    }
    const dmg = (w.damage.get(key) ?? 0) + 1;
    burst(w, c * TS + 16, r * TS + 16, TILE_COLORS[t] ?? '#d6d3d1', 4, 2.2);
    if (dmg >= hard) {
      w.damage.delete(key);
      setTile(w, c, r, T.AIR);
      w.paint[key] = 0;
      broke = true;
      burst(w, c * TS + 16, r * TS + 16, TILE_COLORS[t] ?? '#d6d3d1', 8, 3);
      if (t === T.ORE || t === T.CRYSTAL) {
        const gain = t === T.CRYSTAL ? 8 : 3;
        w.orbs += gain;
        w.score += gain * 10;
        floatText(w, c * TS + 16, r * TS, `+${gain}`, t === T.CRYSTAL ? '#e9d5ff' : '#fde68a');
        events.push({ type: 'sfx', id: t === T.CRYSTAL ? 'gem' : 'coin' });
      }
    } else {
      w.damage.set(key, dmg);
    }
  }
  // Enemigos tocados por la broca
  const hx = p.facing > 0 ? p.x + p.w : p.x - 16;
  const hy = input.down ? p.y + p.h : input.up ? p.y - 16 : p.y;
  for (const en of w.enemies) {
    if (!en.alive) continue;
    if (hx < en.x + en.w && hx + 16 > en.x && hy < en.y + en.h && hy + p.h > en.y) {
      damageEnemy(w, events, en, 1, p.facing);
    }
  }
  if (broke) {
    events.push({ type: 'sfx', id: 'break_block' }, { type: 'haptic', kind: 'light' });
    w.shake = Math.max(w.shake, 2);
  } else if (blocked) {
    events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'rigid' });
    if (!w.upgrades.diamondDrill) {
      floatText(w, cx, cy - 24, 'MUY DURO', '#e5e7eb');
      if (w.hintTimer <= 0) showHint(w, 'La piedra gris necesita el TALADRO DE DIAMANTE (enterrado cerca del Prado de Topos)');
    }
  } else {
    events.push({ type: 'sfx', id: 'bump' });
  }
}

function plantSeed(w: RealmWorld, events: GameEvent[]): void {
  const p = w.player;
  if (p.seeds <= 0) {
    showHint(w, 'Sin semillas: búscalas en la superficie (reaparecen con el tiempo)');
    events.push({ type: 'sfx', id: 'goal_locked' });
    return;
  }
  const c = Math.floor((p.x + p.w / 2) / TS);
  let startRow: number;
  if (p.climbing || overlapsTile(w, p, T.VINE, 5)) {
    // Extiende la enredadera desde su punta
    let r = Math.floor((p.y + p.h / 2) / TS);
    while (r > 0 && tileAt(w, c, r - 1) === T.VINE) r--;
    startRow = r - 1;
  } else if (p.onGround) {
    startRow = Math.floor((p.y + p.h - 1) / TS);
  } else {
    showHint(w, 'Planta en el suelo o desde la punta de una enredadera');
    return;
  }
  let grown = 0;
  for (let r = startRow; r > startRow - 12 && r > 0; r--) {
    const t = tileAt(w, c, r);
    if (t !== T.AIR && t !== T.VINE) break;
    if (t === T.AIR) setTile(w, c, r, T.VINE);
    grown++;
  }
  if (grown === 0) return;
  p.seeds--;
  events.push({ type: 'sfx', id: 'powerup_spawn' }, { type: 'haptic', kind: 'medium' });
  burst(w, c * TS + 16, startRow * TS + 16, '#86efac', 12, 2.5, -0.05);
  floatText(w, c * TS + 16, (startRow - grown) * TS, 'ENREDADERA', '#bbf7d0');
}

function shootPaint(w: RealmWorld, events: GameEvent[], input: InputState): void {
  const p = w.player;
  let vx = p.facing * 7.6 + p.vx * 0.3;
  let vy = -3.4;
  if (input.up) {
    vx = p.facing * 2.4;
    vy = -10;
  } else if (input.down) {
    vx = p.facing * 4;
    vy = 4;
  }
  w.projectiles.push({
    id: w.nextId++,
    kind: 'paint',
    x: p.x + p.w / 2 + p.facing * 10,
    y: p.y + 10,
    vx,
    vy,
    color: p.paintColor,
    life: 64,
    owner: 'player',
  });
  events.push({ type: 'sfx', id: 'wrench_throw' });
}

function cyclePaint(w: RealmWorld, events: GameEvent[]): void {
  const p = w.player;
  const unlocked: PaintColor[] = [1];
  if (w.upgrades.paintOrange) unlocked.push(2);
  if (w.upgrades.paintGreen) unlocked.push(3);
  if (unlocked.length === 1) {
    showHint(w, 'Solo tienes AZUL: busca las cubetas NARANJA y VERDE en las islas altas');
    events.push({ type: 'sfx', id: 'goal_locked' });
    return;
  }
  const i = unlocked.indexOf(p.paintColor);
  p.paintColor = unlocked[(i + 1) % unlocked.length];
  floatText(w, p.x + p.w / 2, p.y - 10, PAINT_NAMES[p.paintColor], PAINT_HEX[p.paintColor]);
  events.push({ type: 'sfx', id: 'switch_toggle' }, { type: 'haptic', kind: 'tick' });
}

function splashPaint(w: RealmWorld, c0: number, r0: number, color: PaintColor): void {
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const t = tileAt(w, c, r);
      if (!isSolidTile(w, t) || t === T.BEDROCK) continue;
      w.paint[r * w.cols + c] = color;
    }
  }
}

function magnetPulse(w: RealmWorld, events: GameEvent[]): void {
  const p = w.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  w.projectiles.push({ id: w.nextId++, kind: 'pulse', x: cx, y: cy, vx: 0, vy: 0, color: 1, life: 20, owner: 'player' });
  for (const en of w.enemies) {
    if (!en.alive) continue;
    const dx = en.x + en.w / 2 - cx;
    const dy = en.y + en.h / 2 - cy;
    const d = Math.hypot(dx, dy);
    if (d < 104) {
      damageEnemy(w, events, en, 1, dx >= 0 ? 1 : -1);
      en.vx = (dx / (d || 1)) * 6;
      en.vy = (dy / (d || 1)) * 6;
    }
  }
  events.push({ type: 'sfx', id: 'gravity_flip' }, { type: 'haptic', kind: 'medium' });
  w.shake = Math.max(w.shake, 3);
}

function damageEnemy(w: RealmWorld, events: GameEvent[], en: RealmEnemy, amount: number, dir: number): void {
  if (!en.alive || en.hurtTimer > 0) return;
  en.hp -= amount;
  en.hurtTimer = 16;
  en.vx = dir * 3;
  if (en.hp <= 0) {
    en.alive = false;
    w.score += 200;
    w.orbs += 2;
    floatText(w, en.x + en.w / 2, en.y, '+200', '#fef08a');
    burst(w, en.x + en.w / 2, en.y + en.h / 2, '#fef9c3', 12);
    events.push({ type: 'sfx', id: 'stomp' });
  } else {
    events.push({ type: 'sfx', id: 'kick' });
  }
}

// ---------------------------------------------------------------------------
// Magnetismo
// ---------------------------------------------------------------------------
function magnetField(w: RealmWorld, p: RealmPlayer): { ax: number; ay: number } {
  const range = w.upgrades.magnetBoots ? 8 : 6;
  const gain = w.upgrades.magnetBoots ? 1.45 : 1.0;
  const cap = w.upgrades.magnetBoots ? 1.9 : 1.35;
  const cx = (p.x + p.w / 2) / TS;
  const cy = (p.y + p.h / 2) / TS;
  const c0 = Math.max(0, Math.floor(cx - range));
  const c1 = Math.min(w.cols - 1, Math.floor(cx + range));
  const r0 = Math.max(0, Math.floor(cy - range));
  const r1 = Math.min(w.rows - 1, Math.floor(cy + range));
  let ax = 0;
  let ay = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const pol = isMagnet(w.tiles[r * w.cols + c]);
      if (pol === 0) continue;
      const dx = c + 0.5 - cx;
      const dy = r + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > range || d < 0.01) continue;
      // Opuestos se atraen (+), iguales se repelen (-)
      // (la repulsión a distancia es suave: el empujón fuerte llega al contacto)
      const sign = pol === p.polarity ? -0.3 : 1;
      const mag = (gain * 0.55) / Math.pow(Math.max(1, d), 1.25);
      ax += (dx / d) * mag * sign;
      ay += (dy / d) * mag * sign;
    }
  }
  const len = Math.hypot(ax, ay);
  if (len > cap) {
    ax = (ax / len) * cap;
    ay = (ay / len) * cap;
  }
  return { ax, ay };
}

/** Tile magnético en contacto con el jugador (lado: 'down'|'up'|'left'|'right'). */
function touchingMagnet(w: RealmWorld, p: RealmPlayer): { pol: number; side: 'down' | 'up' | 'left' | 'right' } | null {
  const l = Math.floor((p.x + 2) / TS);
  const rr = Math.floor((p.x + p.w - 2) / TS);
  const below = Math.floor((p.y + p.h + 2) / TS);
  const above = Math.floor((p.y - 2) / TS);
  for (let c = l; c <= rr; c++) {
    const pb = isMagnet(tileAt(w, c, below));
    if (pb) return { pol: pb, side: 'down' };
    const pa = isMagnet(tileAt(w, c, above));
    if (pa) return { pol: pa, side: 'up' };
  }
  const t0 = Math.floor((p.y + 2) / TS);
  const t1 = Math.floor((p.y + p.h - 2) / TS);
  const leftC = Math.floor((p.x - 2) / TS);
  const rightC = Math.floor((p.x + p.w + 2) / TS);
  for (let r = t0; r <= t1; r++) {
    const pl = isMagnet(tileAt(w, leftC, r));
    if (pl) return { pol: pl, side: 'left' };
    const pr = isMagnet(tileAt(w, rightC, r));
    if (pr) return { pol: pr, side: 'right' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recolección
// ---------------------------------------------------------------------------
const UPGRADE_TEXT: Partial<Record<RealmPickupKind, string>> = {
  up_double_jump: '¡BOTAS DE DOBLE SALTO! Pulsa A en el aire',
  up_diamond_drill: '¡TALADRO DE DIAMANTE! Ahora perforas la piedra gris',
  up_paint_orange: '¡TINTA NARANJA! Y cambia color • el naranja te hace correr al doble',
  up_paint_green: '¡TINTA VERDE! Píntala en paredes y techos para pegarte a ellos',
  up_oxygen: '¡TANQUE DE OXÍGENO! Aguantas el doble bajo el agua',
  up_magnet_boots: '¡BOTAS IMÁN! Campo magnético más fuerte y lanzamientos más altos',
};

function collect(w: RealmWorld, events: GameEvent[]): void {
  const p = w.player;
  const px0 = p.x - 6;
  const px1 = p.x + p.w + 6;
  const py0 = p.y - 6;
  const py1 = p.y + p.h + 6;
  for (const it of w.pickups) {
    if (it.taken) {
      if (it.respawn > 0) {
        it.respawnTimer--;
        if (it.respawnTimer <= 0) it.taken = false;
      }
      continue;
    }
    if (it.x < px0 || it.x > px1 || it.y < py0 || it.y > py1) continue;
    if (it.kind === 'heart' && p.hp >= p.maxHp) continue;
    it.taken = true;
    it.respawnTimer = it.respawn;
    switch (it.kind) {
      case 'orb':
        w.orbs++;
        w.score += 10;
        events.push({ type: 'sfx', id: 'coin' });
        break;
      case 'heart':
        p.hp = Math.min(p.maxHp, p.hp + 2);
        floatText(w, it.x, it.y - 10, '+♥', '#fca5a5');
        events.push({ type: 'sfx', id: 'powerup_collect' });
        break;
      case 'seed':
        p.seeds = Math.min(9, p.seeds + 2);
        floatText(w, it.x, it.y - 10, '+2 SEMILLAS', '#bbf7d0');
        events.push({ type: 'sfx', id: 'powerup_collect' });
        break;
      default: {
        if (it.kind === 'up_double_jump') w.upgrades.doubleJump = true;
        if (it.kind === 'up_diamond_drill') w.upgrades.diamondDrill = true;
        if (it.kind === 'up_paint_orange') {
          w.upgrades.paintOrange = true;
          p.paintColor = 2;
        }
        if (it.kind === 'up_paint_green') {
          w.upgrades.paintGreen = true;
          p.paintColor = 3;
        }
        if (it.kind === 'up_oxygen') {
          w.upgrades.oxygenTank = true;
          p.maxOxygen = 2400;
          p.oxygen = 2400;
        }
        if (it.kind === 'up_magnet_boots') w.upgrades.magnetBoots = true;
        p.maxHp += 1;
        p.hp = p.maxHp;
        w.score += 1000;
        showHint(w, UPGRADE_TEXT[it.kind] ?? '¡MEJORA!', 320);
        burst(w, it.x, it.y, '#fde047', 22, 4, 0.05);
        events.push({ type: 'sfx', id: 'treasure' }, { type: 'haptic', kind: 'success' });
      }
    }
  }
  for (const f of w.fragments) {
    if (f.taken) continue;
    if (f.x < px0 || f.x > px1 || f.y < py0 || f.y > py1) continue;
    f.taken = true;
    w.score += 2000;
    burst(w, f.x, f.y, '#fef08a', 26, 4.5, 0.04);
    events.push({ type: 'sfx', id: 'dragon_coin' }, { type: 'haptic', kind: 'success' });
    onFragment(w, events);
  }
}

export function fragmentsCollected(w: RealmWorld): number {
  let n = 0;
  for (const f of w.fragments) if (f.taken) n++;
  for (const b of w.beacons) if (b.lit) n++;
  return n;
}

function onFragment(w: RealmWorld, events: GameEvent[]): void {
  const got = fragmentsCollected(w);
  if (got >= w.fragmentsNeeded && !w.portal.open) {
    w.portal.open = true;
    showHint(w, '¡TODOS LOS FRAGMENTOS! El portal del santuario inicial está abierto', 400);
    events.push({ type: 'sfx', id: 'vault_open' });
  } else {
    showHint(w, `FRAGMENTO ${got}/${w.fragmentsNeeded}`, 160);
  }
}

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------
function enemyGroundMove(w: RealmWorld, en: RealmEnemy, speed: number): void {
  en.vy = Math.min(MAX_FALL, en.vy + GRAVITY);
  en.vx += (en.dir * speed - en.vx) * 0.2;
  // Horizontal
  const nx = en.x + en.vx;
  const aheadX = en.vx > 0 ? nx + en.w : nx;
  const c = Math.floor(aheadX / TS);
  const rTop = Math.floor((en.y + 2) / TS);
  const rBot = Math.floor((en.y + en.h - 2) / TS);
  let wall = false;
  for (let r = rTop; r <= rBot; r++) if (solidAt(w, c, r)) wall = true;
  // Borde: no caerse
  const footR = Math.floor((en.y + en.h + 4) / TS);
  const footT = tileAt(w, c, footR);
  const ledge = !isSolidTile(w, footT) && !isOneWay(w, footT) && footT !== T.WATER;
  if (wall || (ledge && Math.abs(en.vy) < 1)) {
    en.dir = -en.dir;
    en.vx = 0;
  } else {
    en.x = nx;
  }
  // Vertical
  en.y += en.vy;
  const r = Math.floor((en.y + en.h) / TS);
  const l = Math.floor((en.x + 2) / TS);
  const rr = Math.floor((en.x + en.w - 2) / TS);
  for (let cc = l; cc <= rr; cc++) {
    const t = tileAt(w, cc, r);
    if (isSolidTile(w, t) || isOneWay(w, t)) {
      en.y = r * TS - en.h;
      en.vy = 0;
      break;
    }
  }
  if (en.y > w.rows * TS) en.alive = false;
}

function stepEnemies(w: RealmWorld, events: GameEvent[]): void {
  const p = w.player;
  const pcx = p.x + p.w / 2;
  const pcy = p.y + p.h / 2;
  const viewR = 1100;

  // Sombras nocturnas en Raíces Hondas
  if (w.realm === 'roots') {
    if (w.isNight && w.frame % 150 === 0) {
      let shades = 0;
      for (const en of w.enemies) if (en.alive && en.kind === 'shade') shades++;
      if (shades < 4) {
        const sx = pcx + (w.frame % 300 < 150 ? 1 : -1) * 520;
        const en = spawnEnemy(w, 'shade', sx, pcy - 180);
        en.nightOnly = true;
      }
    }
  }

  for (const en of w.enemies) {
    if (!en.alive) continue;
    const dxp = en.x + en.w / 2 - pcx;
    const dyp = en.y + en.h / 2 - pcy;
    if (Math.abs(dxp) > viewR || Math.abs(dyp) > viewR) continue;
    en.tick++;
    if (en.hurtTimer > 0) en.hurtTimer--;

    switch (en.kind) {
      case 'mole':
      case 'crab':
        enemyGroundMove(w, en, en.kind === 'crab' ? 1.3 : 1.0);
        break;
      case 'eraser': {
        enemyGroundMove(w, en, 1.2);
        // Borra la pintura que pisa
        const c0 = Math.floor(en.x / TS);
        const c1 = Math.floor((en.x + en.w) / TS);
        const r = Math.floor((en.y + en.h + 2) / TS);
        for (let c = c0; c <= c1; c++) if (c >= 0 && r >= 0 && c < w.cols && r < w.rows) w.paint[r * w.cols + c] = 0;
        break;
      }
      case 'shade': {
        if (!w.isNight) {
          en.alive = false;
          burst(w, en.x + en.w / 2, en.y + en.h / 2, '#a78bfa', 10, 2, -0.02);
          break;
        }
        const d = Math.hypot(dxp, dyp) || 1;
        en.vx += (-dxp / d) * 0.08;
        en.vy += (-dyp / d) * 0.08 + Math.sin(en.tick * 0.08) * 0.03;
        const sp = Math.hypot(en.vx, en.vy);
        if (sp > 1.9) {
          en.vx = (en.vx / sp) * 1.9;
          en.vy = (en.vy / sp) * 1.9;
        }
        en.x += en.vx;
        en.y += en.vy;
        break;
      }
      case 'gull':
      case 'drone': {
        const speed = en.kind === 'drone' ? 1.6 : 2.1;
        en.x += en.dir * speed;
        en.y = en.homeY + Math.sin(en.tick * 0.05) * 34;
        if (Math.abs(en.x - en.homeX) > 150 || solidAtPx(w, en.x + (en.dir > 0 ? en.w : 0), en.y + en.h / 2)) {
          en.dir = -en.dir;
        }
        // Los drones se lanzan en picada si estás debajo
        if (en.kind === 'drone' && Math.abs(dxp) < 30 && dyp < 0 && dyp > -260 && en.tick % 120 < 40) {
          en.y = Math.min(en.homeY + 160, en.y + (en.tick % 120) * 3);
        }
        break;
      }
      case 'jelly': {
        en.vy = Math.sin(en.tick * 0.04) * 0.9;
        en.vx = Math.cos(en.tick * 0.015) * 0.7;
        en.vx *= 0.96;
        const nx = en.x + en.vx;
        const ny = en.y + en.vy;
        const t = tileAt(w, Math.floor((nx + en.w / 2) / TS), Math.floor((ny + en.h / 2) / TS));
        if (t === T.WATER) {
          en.x = nx;
          en.y = ny;
        }
        break;
      }
    }

    // Contacto con el jugador
    if (p.deathTimer > 0) continue;
    if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
      const stompable = en.kind !== 'jelly' && en.kind !== 'shade';
      const falling = p.vy > 0.5 && p.y + p.h - p.vy <= en.y + 8;
      if (stompable && falling) {
        damageEnemy(w, events, en, 2, 0);
        p.vy = -8.5;
        p.airJumps = w.upgrades.doubleJump ? 1 : 0;
      } else if (p.drilling > 0 && w.realm === 'roots') {
        damageEnemy(w, events, en, 1, p.facing);
      } else {
        hurtPlayer(w, events, en.x + en.w / 2);
      }
    }
  }
  // Limpieza ocasional de enemigos muertos
  if (w.frame % 600 === 0) w.enemies = w.enemies.filter((e) => e.alive || e.kind !== 'shade');
}

// ---------------------------------------------------------------------------
// Proyectiles
// ---------------------------------------------------------------------------
function stepProjectiles(w: RealmWorld, events: GameEvent[]): void {
  for (const pr of w.projectiles) {
    pr.life--;
    if (pr.kind === 'pulse') continue;
    pr.vy += 0.32;
    pr.x += pr.vx;
    pr.y += pr.vy;
    const c = Math.floor(pr.x / TS);
    const r = Math.floor(pr.y / TS);
    const t = tileAt(w, c, r);
    if (pr.kind === 'paint') {
      // Faros
      for (const b of w.beacons) {
        if (b.lit) continue;
        if (Math.abs(pr.x - b.x) < 24 && Math.abs(pr.y - b.y) < 28) {
          pr.life = 0;
          if (b.color === pr.color) {
            b.lit = true;
            w.score += 2500;
            burst(w, b.x, b.y, PAINT_HEX[b.color], 30, 4.5, 0.02);
            events.push({ type: 'sfx', id: 'dragon_coin' }, { type: 'haptic', kind: 'success' });
            onFragment(w, events);
          } else {
            floatText(w, b.x, b.y - 30, `NECESITA ${PAINT_NAMES[b.color]}`, PAINT_HEX[b.color]);
            events.push({ type: 'sfx', id: 'goal_locked' });
          }
        }
      }
      if (pr.life <= 0) continue;
      // Enemigos
      for (const en of w.enemies) {
        if (!en.alive) continue;
        if (pr.x > en.x && pr.x < en.x + en.w && pr.y > en.y && pr.y < en.y + en.h) {
          damageEnemy(w, events, en, 1, pr.vx >= 0 ? 1 : -1);
          pr.life = 0;
          burst(w, pr.x, pr.y, PAINT_HEX[pr.color], 8, 2);
          break;
        }
      }
      if (pr.life <= 0) continue;
      if (isSolidTile(w, t)) {
        splashPaint(w, c, r, pr.color);
        burst(w, pr.x, pr.y, PAINT_HEX[pr.color], 10, 2.4);
        pr.life = 0;
        events.push({ type: 'sfx', id: 'stomp' });
      } else if (t === T.INK_SEA) {
        pr.life = 0;
      }
    }
  }
  w.projectiles = w.projectiles.filter((pr) => pr.life > 0);
}

// ---------------------------------------------------------------------------
// Paso principal
// ---------------------------------------------------------------------------
export function stepRealmWorld(
  w: RealmWorld,
  input: InputState,
  viewW: number,
  viewH: number,
  partition: 'realms' = 'realms'
): GameEvent[] {
  const events: GameEvent[] = [];
  w.frame++;
  const p = w.player;
  const jumpPressed = input.jump && !w.prevJump;
  const firePressed = input.fire && !w.prevFire;
  const spinPressed = input.spin && !w.prevSpin;
  const upPressed = input.up && !w.prevUp;
  w.prevJump = input.jump;
  w.prevFire = input.fire;
  w.prevSpin = input.spin;
  w.prevUp = input.up;

  if (w.hintTimer > 0) w.hintTimer--;
  if (w.shake > 0) w.shake -= 0.5;

  // Partículas y textos siempre se animan
  for (const pa of w.particles) {
    pa.vy += pa.gravity;
    pa.x += pa.vx;
    pa.y += pa.vy;
    pa.life--;
  }
  if (w.frame % 4 === 0) w.particles = w.particles.filter((pa) => pa.life > 0);
  for (const ft of w.floatTexts) {
    ft.y -= 0.7;
    ft.life--;
  }
  if (w.frame % 8 === 0) w.floatTexts = w.floatTexts.filter((ft) => ft.life > 0);

  // Victoria: animación y pedido de siguiente reino
  if (w.cleared) {
    w.clearTimer++;
    if (w.clearTimer % 10 === 0) {
      burst(w, w.portal.x + Math.sin(w.clearTimer) * 60, w.portal.y - 60, ['#f472b6', '#60a5fa', '#fde047'][w.clearTimer % 3], 10, 4, 0.06);
    }
    if (w.clearTimer > 260) w.requestNext = true;
    updateCamera(w, viewW, viewH);
    return events;
  }

  // Ciclo día/noche
  if (w.hasDayNight) {
    w.clock++;
    const phase = (w.clock % w.dayLength) / w.dayLength;
    const night = phase > 0.6;
    if (night !== w.isNight) {
      w.isNight = night;
      showHint(
        w,
        night
          ? 'CAE LA NOCHE: brillan las plataformas de luciérnagas • cuidado con las sombras'
          : 'AMANECE: los girasoles vuelven a impulsarte',
        220
      );
      events.push({ type: 'sfx', id: night ? 'chase_growl' : 'checkpoint' });
      events.push({ type: 'bgm', track: night ? 'exp_cave' : 'exp_overworld' });
    }
  }

  // Muerte y reaparición
  if (p.deathTimer > 0) {
    p.deathTimer--;
    p.vy = Math.min(p.vy + 0.3, 6);
    p.y += p.vy;
    if (p.deathTimer <= 0) respawn(w);
    updateCamera(w, viewW, viewH);
    return events;
  }

  if (p.invuln > 0) p.invuln--;
  if (p.toolCooldown > 0) p.toolCooldown--;
  if (p.polarityCooldown > 0) p.polarityCooldown--;
  if (p.drilling > 0) p.drilling--;
  p.anim++;

  // --- Volver al santuario manteniendo Y
  w.returnHold = input.spin ? w.returnHold + 1 : 0;
  if (w.returnHold === RETURN_HOLD_FRAMES) {
    warpToShrine(w, w.respawnShrine);
    events.push({ type: 'sfx', id: 'portal' }, { type: 'haptic', kind: 'medium' });
    showHint(w, `Regresas a ${w.shrines[w.respawnShrine]?.name ?? 'el santuario'}`);
  }

  // --- Herramientas (X) y acción secundaria (Y)
  if (w.realm === 'roots') {
    if (input.fire && p.toolCooldown <= 0) {
      drill(w, events, input);
      p.toolCooldown = 9;
    }
    if (spinPressed) plantSeed(w, events);
  } else if (w.realm === 'ink') {
    if (firePressed && p.toolCooldown <= 0) {
      shootPaint(w, events, input);
      p.toolCooldown = 12;
    } else if (input.fire && p.toolCooldown <= 0) {
      shootPaint(w, events, input);
      p.toolCooldown = 16;
    }
    if (spinPressed) cyclePaint(w, events);
  } else {
    if (firePressed && p.toolCooldown <= 0) {
      magnetPulse(w, events);
      p.toolCooldown = 34;
    }
    if (spinPressed && p.polarityCooldown <= 0) {
      p.polarity = p.polarity === 1 ? -1 : 1;
      p.polarityCooldown = 10;
      events.push({ type: 'sfx', id: 'switch_toggle' }, { type: 'haptic', kind: 'tick' });
      burst(w, p.x + p.w / 2, p.y + p.h / 2, p.polarity === 1 ? '#ef4444' : '#3b82f6', 10, 2.5, 0);
      // Invertir mientras estás pegado = salir disparado
      const touch = touchingMagnet(w, p);
      if (touch && touch.pol === p.polarity) {
        const boost = w.upgrades.magnetBoots ? MAGNET_LAUNCH + 3 : MAGNET_LAUNCH;
        if (touch.side === 'down') p.vy = -boost;
        if (touch.side === 'up') p.vy = boost * 0.6;
        if (touch.side === 'left') p.vx = boost * 0.7;
        if (touch.side === 'right') p.vx = -boost * 0.7;
        p.magnetCling = false;
        events.push({ type: 'sfx', id: 'spring' });
      }
    }
  }

  // --- Estado del entorno
  const centerC = Math.floor((p.x + p.w / 2) / TS);
  const centerR = Math.floor((p.y + p.h / 2) / TS);
  const headR = Math.floor((p.y + 4) / TS);
  const inWater = tileAt(w, centerC, centerR) === T.WATER;
  const headInWater = tileAt(w, centerC, headR) === T.WATER;
  const onVine = overlapsTile(w, p, T.VINE, 5);
  p.swimming = inWater;

  if (!onVine) p.climbing = false;
  if (onVine && (input.up || (input.down && !p.onGround)) && !p.climbing) p.climbing = true;

  // Oxígeno
  if (headInWater) {
    p.oxygen -= 1;
    if (p.oxygen <= 0) {
      p.oxygen = 0;
      if (w.frame % 80 === 0) {
        p.invuln = 0;
        hurtPlayer(w, events, p.x + p.w / 2);
        showHint(w, '¡SIN AIRE! Sube a la superficie o busca burbujas', 120);
      }
    } else if (p.oxygen === 300) {
      showHint(w, '¡Oxígeno bajo! Busca una columna de burbujas', 120);
      events.push({ type: 'sfx', id: 'goal_locked' });
    }
  } else {
    p.oxygen = Math.min(p.maxOxygen, p.oxygen + 10);
  }

  // Zonas (corrientes y burbujas)
  let updraft = 0;
  for (const z of w.zones) {
    if (p.x + p.w > z.x && p.x < z.x + z.w && p.y + p.h > z.y && p.y < z.y + z.h) {
      if (z.kind === 'bubbles') {
        p.oxygen = Math.min(p.maxOxygen, p.oxygen + 14);
        updraft = Math.max(updraft, z.force * 0.5);
      } else {
        updraft = Math.max(updraft, z.force);
      }
    }
  }

  // --- Movimiento horizontal objetivo
  const dirX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dirX !== 0 && p.stuck === 'none') p.facing = dirX;
  const footC0 = Math.floor((p.x + 2) / TS);
  const footC1 = Math.floor((p.x + p.w - 2) / TS);
  const footR = Math.floor((p.y + p.h + 1) / TS);
  let floorPaint = 0;
  if (p.onGround) {
    floorPaint = paintAt(w, footC0, footR) || paintAt(w, footC1, footR);
  }
  const orange = floorPaint === PAINT.ORANGE;
  let maxSpeed = input.run ? RUN : WALK;
  if (orange) maxSpeed = ORANGE_RUN;
  if (inWater) maxSpeed = input.run ? 3.6 : 2.6;
  if (p.gliding) maxSpeed = Math.max(3.4, Math.abs(p.vx));

  // ===================== MODOS DE MOVIMIENTO =====================
  let landed = 0;
  let wallHit = 0;

  if (p.climbing) {
    // Enredadera
    p.vx = dirX * 2;
    p.vy = input.up ? -3 : input.down ? 3 : 0;
    p.airJumps = w.upgrades.doubleJump ? 1 : 0;
    if (jumpPressed) {
      p.climbing = false;
      p.vy = -JUMP_V * 0.9;
      events.push({ type: 'sfx', id: 'jump' });
    }
    wallHit = moveX(w, p);
    const prevY = p.y;
    landed = moveY(w, p, true);
    // La punta de la enredadera hace de tope: no se sube más allá
    if (p.vy < 0 && tileAt(w, Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + 6) / TS)) !== T.VINE) {
      p.y = prevY;
    }
    if (!overlapsTile(w, p, T.VINE, 5)) p.climbing = false;
  } else if (p.stuck !== 'none') {
    // Pintura verde: pegado a pared o techo
    if (p.stuck === 'ceiling') {
      p.vy = 0;
      p.vx = dirX * 3;
      wallHit = moveX(w, p);
      const above = Math.floor((p.y - 2) / TS);
      const stillGreen =
        paintAt(w, Math.floor((p.x + p.w / 2) / TS), above) === PAINT.GREEN && solidAt(w, Math.floor((p.x + p.w / 2) / TS), above);
      if (!stillGreen || input.down || jumpPressed) {
        p.stuck = 'none';
        p.vy = 1;
      }
    } else {
      const side = p.stuck === 'wall_right' ? 1 : -1;
      p.vx = 0;
      p.vy = input.up ? -2.8 : input.down ? 2.8 : 0;
      landed = moveY(w, p, false);
      const wallC = Math.floor((side > 0 ? p.x + p.w + 2 : p.x - 2) / TS);
      const stillGreen =
        paintAt(w, wallC, Math.floor((p.y + p.h / 2) / TS)) === PAINT.GREEN && solidAt(w, wallC, Math.floor((p.y + p.h / 2) / TS));
      if (jumpPressed) {
        p.stuck = 'none';
        p.vx = -side * 6;
        p.vy = -JUMP_V;
        p.facing = -side;
        events.push({ type: 'sfx', id: 'wall_jump' });
      } else if (!stillGreen || dirX === -side || landed === 1) {
        // Al subir por encima del borde, se impulsa sobre la cornisa
        if (!stillGreen && input.up) {
          p.vy = -7;
          p.vx = side * 2.5;
        }
        p.stuck = 'none';
      }
    }
  } else if (p.magnetCling) {
    const touch = touchingMagnet(w, p);
    if (!touch || touch.pol === p.polarity) {
      p.magnetCling = false;
    } else {
      p.airJumps = w.upgrades.doubleJump ? 1 : 0;
      if (touch.side === 'up' || touch.side === 'down') {
        p.vx = dirX * 3;
        p.vy = touch.side === 'up' ? -0.5 : 0.5;
      } else {
        p.vx = touch.side === 'right' ? 0.5 : -0.5;
        p.vy = input.up ? -3 : input.down ? 3 : 0;
      }
      wallHit = moveX(w, p);
      landed = moveY(w, p, false);
      if (jumpPressed) {
        p.magnetCling = false;
        if (touch.side === 'up') p.vy = 3;
        else if (touch.side === 'down') p.vy = -JUMP_V;
        else {
          p.vx = touch.side === 'right' ? -6 : 6;
          p.vy = -JUMP_V * 0.9;
        }
        events.push({ type: 'sfx', id: 'jump' });
      }
    }
  } else {
    // Física normal (tierra, aire o agua)
    const accel = p.onGround ? (orange ? 0.9 : 0.55) : 0.38;
    if (dirX !== 0) {
      p.vx += dirX * accel;
      if (Math.abs(p.vx) > maxSpeed) p.vx = Math.sign(p.vx) * Math.max(maxSpeed, Math.abs(p.vx) - 0.4);
    } else {
      const fr = p.onGround ? (orange ? 0.92 : 0.78) : 0.95;
      p.vx *= fr;
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
    }

    if (jumpPressed) p.jumpBuffer = BUFFER;
    else if (p.jumpBuffer > 0) p.jumpBuffer--;
    if (p.onGround) {
      p.coyote = COYOTE;
      p.airJumps = w.upgrades.doubleJump ? 1 : 0;
    } else if (p.coyote > 0) p.coyote--;

    if (inWater) {
      p.vy += 0.13;
      if (input.up) p.vy -= 0.4;
      if (input.down) p.vy += 0.3;
      if (jumpPressed) {
        p.vy = headInWater ? -4.4 : -10.2;
        events.push({ type: 'sfx', id: 'jump' });
      }
      p.vy = Math.max(-5, Math.min(p.vy, 3.4));
      p.vx *= 0.97;
      p.jumpBuffer = 0;
    } else {
      // Salto
      if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
        let v = Math.abs(p.vx) > 4.5 ? RUN_JUMP_V : JUMP_V;
        if (floorPaint === PAINT.BLUE) v = 15.5;
        p.vy = -v;
        p.jumpRising = floorPaint !== PAINT.BLUE;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        events.push({ type: 'sfx', id: floorPaint === PAINT.BLUE ? 'spring' : 'jump' });
      } else if (jumpPressed && !p.onGround && p.airJumps > 0 && w.realm !== 'ink') {
        p.airJumps--;
        p.vy = -DOUBLE_JUMP_V;
        p.jumpRising = true;
        p.jumpBuffer = 0;
        burst(w, p.x + p.w / 2, p.y + p.h, '#e0f2fe', 8, 2, 0.05);
        events.push({ type: 'sfx', id: 'spin_jump' });
      }
      // Salto variable (solo para saltos propios, no rebotes ni lanzamientos)
      if (p.vy >= 0) p.jumpRising = false;
      if (p.jumpRising && !input.jump && p.vy < -4) p.vy += 0.6;

      // Planeo (Archipiélago Tinta)
      p.gliding = w.realm === 'ink' && !p.onGround && input.jump && (p.vy > -1 || updraft > 0);
      p.vy += GRAVITY;
      if (p.gliding) {
        p.vy = Math.min(p.vy, 1.4);
        if (updraft > 0) p.vy = Math.max(-7.5, p.vy - updraft - 0.55);
      } else if (updraft > 0) {
        p.vy -= updraft * 0.45;
      }
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;
    }

    // Magnetismo
    if (w.realm === 'magnet') {
      const f = magnetField(w, p);
      p.vx += f.ax;
      p.vy += f.ay;
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;
      if (Math.abs(p.vx) > 13) p.vx = Math.sign(p.vx) * 13;
    }

    const prevVy = p.vy;
    wallHit = moveX(w, p);
    landed = moveY(w, p, input.down && !inWater);

    if (landed === 1) {
      // Pintura azul: rebote
      const fc0 = Math.floor((p.x + 2) / TS);
      const fc1 = Math.floor((p.x + p.w - 2) / TS);
      const fr = Math.floor((p.y + p.h + 1) / TS);
      const fpaint = paintAt(w, fc0, fr) || paintAt(w, fc1, fr);
      if (fpaint === PAINT.BLUE && prevVy > 3.5) {
        p.vy = -Math.max(prevVy * 0.92, 11.5) - (input.jump ? 2.5 : 0);
        p.onGround = false;
        events.push({ type: 'sfx', id: 'spring' }, { type: 'haptic', kind: 'light' });
        burst(w, p.x + p.w / 2, p.y + p.h, '#93c5fd', 6, 2);
      } else {
        p.vy = 0;
        p.onGround = true;
        if (prevVy > 9) events.push({ type: 'haptic', kind: 'light' });
      }
    } else if (landed === -1) {
      p.vy = 0.5;
      p.onGround = false;
    } else {
      p.onGround = false;
    }

    // Detección de pegado a pintura verde (paredes y techos)
    if (w.realm === 'ink' && (!p.onGround || input.up)) {
      if (wallHit !== 0 || dirX !== 0) {
        const side = wallHit !== 0 ? wallHit : dirX;
        const wallC = Math.floor((side > 0 ? p.x + p.w + 2 : p.x - 2) / TS);
        const midR = Math.floor((p.y + p.h / 2) / TS);
        if (solidAt(w, wallC, midR) && paintAt(w, wallC, midR) === PAINT.GREEN) {
          p.stuck = side > 0 ? 'wall_right' : 'wall_left';
          p.vx = 0;
          p.vy = 0;
          p.gliding = false;
        }
      }
      if (p.stuck === 'none' && (landed === -1 || p.vy <= 0.5) && (input.up || input.jump)) {
        const above = Math.floor((p.y - 2) / TS);
        const cc = Math.floor((p.x + p.w / 2) / TS);
        if (solidAt(w, cc, above) && paintAt(w, cc, above) === PAINT.GREEN) {
          p.stuck = 'ceiling';
          p.vy = 0;
          p.y = (above + 1) * TS + 0.5;
        }
      }
    }

    // Detección de imanes
    if (w.realm === 'magnet') {
      const touch = touchingMagnet(w, p);
      if (touch) {
        if (touch.pol === p.polarity) {
          // Igual polo = repulsión explosiva
          const boost = w.upgrades.magnetBoots ? MAGNET_LAUNCH + 3 : MAGNET_LAUNCH;
          if (touch.side === 'down') {
            p.vy = -boost;
            p.onGround = false;
          } else if (touch.side === 'up') p.vy = boost * 0.5;
          else if (touch.side === 'left') p.vx = boost * 0.6;
          else p.vx = -boost * 0.6;
          if (w.frame % 6 === 0) events.push({ type: 'sfx', id: 'spring' });
          burst(w, p.x + p.w / 2, p.y + (touch.side === 'down' ? p.h : 0), p.polarity === 1 ? '#fca5a5' : '#93c5fd', 6, 2.5);
        } else if (touch.side !== 'down') {
          if (!p.magnetCling && w.hintTimer <= 0) {
            showHint(w, 'Pegado al imán • Y invierte tu polo y te despega de golpe', 180);
          }
          p.magnetCling = true;
          p.vx = 0;
          p.vy = 0;
        }
      }
    }
  }

  // --- Girasoles (día) y peligros
  if (w.realm === 'roots' && !w.isNight && p.vy > 0) {
    for (const sf of w.sunflowers) {
      if (Math.abs(p.x + p.w / 2 - sf.x) < 18 && p.y + p.h > sf.y - 20 && p.y + p.h < sf.y + 4) {
        p.vy = -16.5;
        p.onGround = false;
        events.push({ type: 'sfx', id: 'spring' }, { type: 'haptic', kind: 'light' });
        burst(w, sf.x, sf.y - 18, '#fde047', 8, 2.5);
      }
    }
  }
  if (overlapsTile(w, p, T.SPIKES, 4)) {
    hurtPlayer(w, events, p.x + p.w / 2);
    p.vy = -8;
  }
  if (overlapsTile(w, p, T.INK_SEA, 4) || p.y > w.rows * TS) {
    hurtPlayer(w, events, p.x + p.w / 2);
    if (p.deathTimer <= 0) {
      p.x = p.lastSafeX;
      p.y = p.lastSafeY;
      p.vx = 0;
      p.vy = 0;
      showHint(w, 'La tinta te escupe al último suelo firme', 120);
      events.push({ type: 'sfx', id: 'pipe_warp' });
    }
  }
  if (p.onGround && w.frame % 20 === 0 && p.invuln <= 0) {
    p.lastSafeX = p.x;
    p.lastSafeY = p.y;
  }

  // --- Santuarios: activar y viajar
  let atShrine = -1;
  for (const s of w.shrines) {
    if (Math.abs(p.x + p.w / 2 - s.x) < 34 && Math.abs(p.y + p.h - s.y) < 40) {
      atShrine = s.id;
      if (!s.active) {
        s.active = true;
        w.score += 500;
        showHint(w, `SANTUARIO ${s.name} • ▲ para viajar entre santuarios`, 240);
        events.push({ type: 'sfx', id: 'checkpoint' }, { type: 'haptic', kind: 'success' });
        burst(w, s.x, s.y - 30, '#fde68a', 18, 3, 0.02);
      }
      if (w.respawnShrine !== s.id) w.respawnShrine = s.id;
      if (p.hp < p.maxHp && w.frame % 30 === 0) p.hp++;
    }
  }
  if (atShrine >= 0 && upPressed && !p.climbing) {
    const active = w.shrines.filter((s) => s.active).map((s) => s.id);
    if (active.length > 1) {
      const i = active.indexOf(atShrine);
      const dest = active[(i + 1) % active.length];
      warpToShrine(w, dest);
      events.push({ type: 'sfx', id: 'portal' }, { type: 'haptic', kind: 'medium' });
      showHint(w, `VIAJE RÁPIDO → ${w.shrines[dest].name}`, 150);
    } else {
      showHint(w, 'Activa más santuarios para viajar entre ellos', 150);
    }
  }

  // --- Recolección, enemigos y proyectiles
  collect(w, events);
  stepEnemies(w, events);
  stepProjectiles(w, events);

  // --- Portal de salida
  if (w.portal.open) {
    if (Math.abs(p.x + p.w / 2 - w.portal.x) < 30 && p.y + p.h > w.portal.y - 80 && p.y < w.portal.y) {
      w.cleared = true;
      w.clearTimer = 0;
      const bonus = Math.max(0, 5000 - w.deaths * 250);
      w.score += bonus + w.orbs * 5;
      events.push(
        { type: 'sfx', id: 'stage_clear' },
        { type: 'haptic', kind: 'success' },
        { type: 'bgm', track: null },
        { type: 'stage_cleared', partition, levelIndex: w.levelIndex, score: w.score, coins: w.orbs }
      );
    }
  }

  // --- Exploración (niebla del mapa)
  const ecx = Math.floor(centerC / EXPLORE_CELL);
  const ecy = Math.floor(centerR / EXPLORE_CELL);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const ex = ecx + dx;
      const ey = ecy + dy;
      if (ex < 0 || ey < 0 || ex >= w.exploredCols || ey >= w.exploredRows) continue;
      const k = ey * w.exploredCols + ex;
      if (!w.explored[k]) {
        w.explored[k] = 1;
        w.exploredVersion++;
      }
    }
  }

  updateCamera(w, viewW, viewH);
  return events;
}

export function updateCamera(w: RealmWorld, viewW: number, viewH: number): void {
  const p = w.player;
  const tx = p.x + p.w / 2 - viewW * 0.45 + p.facing * 48;
  const ty = p.y + p.h / 2 - viewH * 0.5;
  const maxX = Math.max(0, w.cols * TS - viewW);
  const maxY = Math.max(0, w.rows * TS - viewH);
  const k = w.frame < 3 ? 1 : 0.12;
  w.cameraX += (Math.max(0, Math.min(maxX, tx)) - w.cameraX) * k;
  w.cameraY += (Math.max(0, Math.min(maxY, ty)) - w.cameraY) * (w.frame < 3 ? 1 : 0.1);
}

/** Progreso (0..1) del regreso al santuario manteniendo Y. */
export function returnHoldProgress(w: RealmWorld): number {
  const h = w.returnHold;
  if (h < 20) return 0;
  return Math.min(1, h / RETURN_HOLD_FRAMES);
}
