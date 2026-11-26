// ============================================================================
// REINOS ABIERTOS - Generador de los 3 mundos abiertos
// Cada reino combina terreno generado con semilla fija (siempre el mismo mapa)
// y estructuras hechas a mano: islas, árboles, fosas, torres y santuarios.
// ============================================================================

import {
  REALM_METAS,
  REALM_ORDER,
  T,
  type RealmEnemy,
  type RealmEnemyKind,
  type RealmId,
  type RealmPickupKind,
  type RealmWorld,
  type PaintColor,
} from './realmTypes';

export const REALM_TILE = 32;
export const EXPLORE_CELL = 4;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pequeña API de edición de grilla compartida por los tres generadores. */
class Grid {
  constructor(public cols: number, public rows: number, public tiles: Uint8Array) {}
  inside(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }
  get(c: number, r: number): number {
    if (!this.inside(c, r)) return T.BEDROCK;
    return this.tiles[r * this.cols + c];
  }
  set(c: number, r: number, t: number): void {
    if (!this.inside(c, r)) return;
    if (this.tiles[r * this.cols + c] === T.BEDROCK && t !== T.BEDROCK) {
      // Los bordes de roca madre son intocables salvo que se fuerce
      if (c <= 1 || c >= this.cols - 2 || r >= this.rows - 2) return;
    }
    this.tiles[r * this.cols + c] = t;
  }
  rect(c0: number, r0: number, w: number, h: number, t: number): void {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) this.set(c, r, t);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, t: number): void {
    for (let r = Math.floor(cy - ry); r <= Math.ceil(cy + ry); r++) {
      for (let c = Math.floor(cx - rx); c <= Math.ceil(cx + rx); c++) {
        const dx = (c - cx) / rx;
        const dy = (r - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(c, r, t);
      }
    }
  }
  /** Primer tile sólido desde arriba en una columna (o rows si no hay). */
  surface(c: number, solid: (t: number) => boolean, from = 0): number {
    for (let r = from; r < this.rows; r++) if (solid(this.get(c, r))) return r;
    return this.rows;
  }
}

function emptyWorld(realm: RealmId, levelIndex: number, cols: number, rows: number): RealmWorld {
  const meta = REALM_METAS[levelIndex];
  const ec = Math.ceil(cols / EXPLORE_CELL);
  const er = Math.ceil(rows / EXPLORE_CELL);
  return {
    realm,
    levelIndex,
    name: meta.name,
    code: meta.code,
    tileSize: REALM_TILE,
    cols,
    rows,
    tiles: new Uint8Array(cols * rows),
    paint: new Uint8Array(cols * rows),
    damage: new Map(),
    explored: new Uint8Array(ec * er),
    exploredCols: ec,
    exploredRows: er,
    exploredVersion: 0,
    player: {
      x: 0,
      y: 0,
      w: 20,
      h: 28,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      airJumps: 0,
      jumpRising: false,
      hp: 5,
      maxHp: 5,
      invuln: 60,
      climbing: false,
      swimming: false,
      gliding: false,
      stuck: 'none',
      magnetCling: false,
      oxygen: 1200,
      maxOxygen: 1200,
      polarity: 1,
      polarityCooldown: 0,
      paintColor: 1,
      seeds: 4,
      toolCooldown: 0,
      drilling: 0,
      anim: 0,
      lastSafeX: 0,
      lastSafeY: 0,
      deathTimer: 0,
    },
    upgrades: {
      doubleJump: false,
      diamondDrill: false,
      paintOrange: false,
      paintGreen: false,
      oxygenTank: false,
      magnetBoots: false,
    },
    enemies: [],
    pickups: [],
    fragments: [],
    fragmentsNeeded: 6,
    shrines: [],
    beacons: [],
    zones: [],
    sunflowers: [],
    projectiles: [],
    particles: [],
    floatTexts: [],
    portal: { x: 0, y: 0, open: false },
    respawnShrine: 0,
    orbs: 0,
    score: 0,
    clock: 0,
    dayLength: 4200,
    hasDayNight: false,
    isNight: false,
    cameraX: 0,
    cameraY: 0,
    shake: 0,
    frame: 0,
    hint: meta.tagline,
    hintTimer: 300,
    cleared: false,
    clearTimer: 0,
    requestNext: false,
    prevJump: false,
    prevFire: false,
    prevSpin: false,
    prevUp: false,
    nextId: 1,
    tileVersion: 0,
    deaths: 0,
    returnHold: 0,
    backdropRow: null,
  };
}

const ENEMY_SIZE: Record<RealmEnemyKind, [number, number, number]> = {
  // ancho, alto, vida
  mole: [24, 20, 1],
  shade: [22, 22, 1],
  gull: [26, 16, 2],
  eraser: [26, 22, 2],
  jelly: [22, 24, 2],
  crab: [28, 18, 2],
  drone: [24, 18, 1],
};

function addEnemy(w: RealmWorld, kind: RealmEnemyKind, cx: number, footY: number, dir = 1): void {
  const [ew, eh, hp] = ENEMY_SIZE[kind];
  const x = cx - ew / 2;
  const y = footY - eh;
  w.enemies.push({
    id: w.nextId++,
    kind,
    x,
    y,
    w: ew,
    h: eh,
    vx: 0,
    vy: 0,
    hp,
    alive: true,
    dir,
    homeX: x,
    homeY: y,
    tick: Math.floor(cx) % 97,
    hurtTimer: 0,
  });
}

export function spawnEnemy(w: RealmWorld, kind: RealmEnemyKind, cx: number, cy: number): RealmEnemy {
  const [ew, eh, hp] = ENEMY_SIZE[kind];
  const en: RealmEnemy = {
    id: w.nextId++,
    kind,
    x: cx - ew / 2,
    y: cy - eh / 2,
    w: ew,
    h: eh,
    vx: 0,
    vy: 0,
    hp,
    alive: true,
    dir: 1,
    homeX: cx,
    homeY: cy,
    tick: 0,
    hurtTimer: 0,
  };
  w.enemies.push(en);
  return en;
}

function addPickup(
  w: RealmWorld,
  kind: RealmPickupKind,
  tileC: number,
  tileR: number,
  respawn = 0
): void {
  w.pickups.push({
    id: w.nextId++,
    kind,
    x: tileC * REALM_TILE + REALM_TILE / 2,
    y: tileR * REALM_TILE + REALM_TILE / 2,
    taken: false,
    respawn,
    respawnTimer: 0,
    bob: (tileC * 7 + tileR * 13) % 60,
  });
}

function addFragment(w: RealmWorld, tileC: number, tileR: number, hint: string): void {
  w.fragments.push({
    id: w.nextId++,
    x: tileC * REALM_TILE + REALM_TILE / 2,
    y: tileR * REALM_TILE + REALM_TILE / 2,
    taken: false,
    hint,
  });
}

function addShrine(w: RealmWorld, g: Grid, tileC: number, footRow: number, name: string): void {
  // Explanada de 5 tiles para que el santuario siempre tenga suelo firme
  const floorTile = g.get(tileC, footRow);
  const solidFloor = floorTile !== T.AIR && floorTile !== T.WATER && floorTile !== T.VINE ? floorTile : T.STONE;
  for (let c = tileC - 2; c <= tileC + 2; c++) {
    g.set(c, footRow, solidFloor === T.CLOUD ? T.ROCK : solidFloor);
    for (let r = footRow - 3; r < footRow; r++) {
      const t = g.get(c, r);
      if (t !== T.WATER) g.set(c, r, T.AIR);
    }
  }
  w.shrines.push({
    id: w.shrines.length,
    x: tileC * REALM_TILE + REALM_TILE / 2,
    y: footRow * REALM_TILE,
    active: w.shrines.length === 0,
    name,
  });
}

function orbArc(w: RealmWorld, c0: number, r0: number, count: number, dc = 1, dr = 0): void {
  for (let i = 0; i < count; i++) addPickup(w, 'orb', c0 + i * dc, r0 + i * dr);
}

function placePlayerAtShrine(w: RealmWorld, shrineIdx: number): void {
  const s = w.shrines[shrineIdx];
  const p = w.player;
  p.x = s.x - p.w / 2 + 22;
  p.y = s.y - p.h;
  p.lastSafeX = p.x;
  p.lastSafeY = p.y;
  w.respawnShrine = shrineIdx;
}

// ============================================================================
// R-1 RAÍCES HONDAS
// ============================================================================
function buildRoots(levelIndex: number): RealmWorld {
  const cols = 240;
  const rows = 80;
  const w = emptyWorld('roots', levelIndex, cols, rows);
  w.hasDayNight = true;
  w.dayLength = 4200;
  w.clock = 200;
  const g = new Grid(cols, rows, w.tiles);
  const rnd = mulberry32(0x5eed01);
  const p1 = rnd() * 6;
  const p2 = rnd() * 6;
  const p3 = rnd() * 6;

  const surf: number[] = [];
  for (let c = 0; c < cols; c++) {
    let h = 26 + 4 * Math.sin(c * 0.045 + p1) + 2.4 * Math.sin(c * 0.13 + p2) + 1.2 * Math.sin(c * 0.31 + p3);
    if (c < 24) h = 26;
    surf.push(Math.round(h));
  }
  for (let c = 0; c < cols; c++) {
    const dirtDepth = 9 + Math.round(2 * Math.sin(c * 0.08 + p2));
    for (let r = 0; r < rows; r++) {
      let t: number = T.AIR;
      if (r === surf[c]) t = T.GRASS;
      else if (r > surf[c] && r <= surf[c] + dirtDepth) t = rnd() < 0.025 ? T.ORE : T.DIRT;
      else if (r > surf[c] + dirtDepth) {
        const roll = rnd();
        t = r > 56 && roll < 0.012 ? T.CRYSTAL : roll < 0.04 ? T.ORE : T.STONE;
      }
      g.set(c, r, t);
    }
  }

  // Cuevas serpenteantes
  for (let i = 0; i < 11; i++) {
    let cx = 20 + rnd() * (cols - 40);
    let cy = 40 + rnd() * 30;
    let ang = rnd() * Math.PI * 2;
    const len = 50 + rnd() * 90;
    for (let s = 0; s < len; s++) {
      const rad = 1.3 + rnd() * 1.1;
      g.ellipse(cx, cy, rad + 0.6, rad, T.AIR);
      ang += (rnd() - 0.5) * 0.7;
      cx += Math.cos(ang) * 1.1;
      cy += Math.sin(ang) * 0.6;
      if (cy < 34) cy = 34;
      if (cy > rows - 6) cy = rows - 6;
      if (cx < 4 || cx > cols - 5) ang += Math.PI;
    }
  }

  // Roca madre en bordes y fondo
  for (let r = 0; r < rows; r++) {
    w.tiles[r * cols] = T.BEDROCK;
    w.tiles[r * cols + 1] = T.BEDROCK;
    w.tiles[r * cols + cols - 1] = T.BEDROCK;
    w.tiles[r * cols + cols - 2] = T.BEDROCK;
  }
  for (let c = 0; c < cols; c++) {
    for (let r = rows - 3; r < rows; r++) w.tiles[r * cols + c] = T.BEDROCK;
  }

  w.backdropRow = Int16Array.from(surf.map((s) => s + 1));

  // --- Santuario de inicio y portal
  addShrine(w, g, 8, surf[8], 'CLARO DEL ALBA');

  // --- Pozo de Raíces (fragmento en el fondo + santuario de salida)
  const shaftC = 100;
  for (let r = surf[shaftC] + 2; r < 62; r++) {
    g.set(shaftC - 2, r, T.ROOT);
    g.set(shaftC + 2, r, T.ROOT);
    for (let c = shaftC - 1; c <= shaftC + 1; c++) g.set(c, r, T.AIR);
  }
  g.rect(shaftC - 6, 60, 13, 4, T.AIR);
  g.rect(shaftC - 7, 64, 15, 1, T.ROOT);
  addFragment(w, shaftC + 4, 62, 'En el fondo del Pozo de Raíces: cava donde ves las raíces');
  addShrine(w, g, shaftC - 3, 64, 'FONDO DEL POZO');

  // --- Árbol Ancestral (copa alta: enredaderas o doble salto)
  const treeC = 124;
  const treeBase = surf[treeC];
  for (let r = treeBase - 13; r < treeBase; r++) {
    g.set(treeC, r, T.ROOT);
    g.set(treeC + 1, r, T.ROOT);
  }
  g.rect(treeC - 5, treeBase - 15, 12, 2, T.GRASS);
  g.rect(treeC - 3, treeBase - 16, 8, 1, T.GRASS);
  addFragment(w, treeC + 1, treeBase - 17, 'Copa del Árbol Ancestral: planta enredaderas a su lado');
  orbArc(w, treeC - 3, treeBase - 4, 4, 0, -2);

  // --- Isla del Alba (oeste, por encima del bosque)
  const westC = 88;
  g.rect(westC, 10, 11, 2, T.DIRT);
  g.rect(westC, 9, 11, 1, T.GRASS);
  g.rect(westC + 2, 12, 7, 1, T.DIRT);
  addFragment(w, westC + 5, 8, 'Isla del Alba: enredadera hacia el cielo + doble salto');
  orbArc(w, westC + 1, 8, 3);
  // Escalones de raíces voladoras para guiar la subida
  g.rect(westC - 6, 19, 3, 1, T.PLANK);
  g.rect(westC - 2, 15, 3, 1, T.PLANK);

  // --- Isla Nocturna (este, solo con plataformas de luciérnaga)
  const eastC = 204;
  g.rect(eastC, 8, 14, 2, T.DIRT);
  g.rect(eastC, 7, 14, 1, T.GRASS);
  addFragment(w, eastC + 7, 6, 'Isla Nocturna: de noche aparecen plataformas de luciérnagas');
  let pc = 180;
  let pr = surf[180] - 3;
  while (pr > 9) {
    g.rect(pc, pr, 3, 1, T.NIGHT_PLAT);
    orbArc(w, pc + 1, pr - 1, 1);
    pc += 4;
    pr -= 2;
  }
  g.rect(pc, pr, 4, 1, T.NIGHT_PLAT);

  // --- Geoda de Cristal (profunda, rodeada de piedra)
  const geoC = 150;
  const geoR = 66;
  g.ellipse(geoC, geoR, 10, 6, T.CRYSTAL);
  g.ellipse(geoC, geoR, 8, 4.5, T.AIR);
  g.rect(geoC - 6, geoR + 4, 13, 1, T.CRYSTAL);
  addFragment(w, geoC, geoR + 2, 'Geoda de Cristal: muy abajo, tras la piedra dura');
  orbArc(w, geoC - 5, geoR + 1, 11);

  // --- Cámara del Topo Rey (piedra al este)
  const kingC = 226;
  const kingR = 46;
  g.rect(kingC - 6, kingR - 3, 12, 4, T.AIR);
  g.rect(kingC - 7, kingR + 1, 14, 1, T.ORE);
  addFragment(w, kingC + 3, kingR - 1, 'Cámara del Topo Rey: excava hacia el este, bajo la piedra');
  addEnemy(w, 'mole', (kingC - 3) * REALM_TILE, (kingR + 1) * REALM_TILE, -1);
  addEnemy(w, 'mole', (kingC + 1) * REALM_TILE, (kingR + 1) * REALM_TILE, 1);

  // --- Mejoras
  // Botas de doble salto: en un templete fácil de ver
  const bootC = 42;
  g.rect(bootC - 2, surf[bootC] - 4, 5, 1, T.PLANK);
  addPickup(w, 'up_double_jump', bootC, surf[bootC] - 5);
  // Taladro de diamante: enterrado en tierra blanda
  const drillC = 62;
  const drillR = surf[drillC] + 5;
  g.rect(drillC - 2, drillR - 1, 5, 2, T.AIR);
  g.rect(drillC - 2, drillR + 1, 5, 1, T.ROOT);
  addPickup(w, 'up_diamond_drill', drillC, drillR);

  // --- Santuarios
  addShrine(w, g, 70, surf[70], 'PRADO DE TOPOS');
  addShrine(w, g, 140, surf[140], 'RAÍZ MADRE');
  addShrine(w, g, 190, surf[190], 'BOSQUE LUCIÉRNAGA');
  addShrine(w, g, 230, surf[230], 'ACANTILADO ESTE');

  // Portal de salida junto al inicio
  w.portal = { x: 18 * REALM_TILE + 16, y: surf[18] * REALM_TILE, open: false };

  // --- Girasoles (trampolines de día)
  for (const c of [30, 56, 84, 112, 160, 176, 214]) {
    w.sunflowers.push({ id: w.nextId++, x: c * REALM_TILE + 16, y: g.surface(c, (t) => t !== T.AIR) * REALM_TILE });
  }

  // --- Semillas (reaparecen), corazones y orbes
  for (const c of [14, 36, 52, 78, 96, 118, 132, 166, 196, 222]) {
    const s = g.surface(c, (t) => t !== T.AIR && t !== T.NIGHT_PLAT && t !== T.PLANK);
    addPickup(w, 'seed', c, s - 1, 1500);
  }
  addPickup(w, 'seed', shaftC + 1, 63, 900);
  addPickup(w, 'seed', shaftC - 5, 63, 900);
  for (let i = 0; i < 8; i++) {
    const c = 10 + Math.floor(rnd() * (cols - 20));
    // corazones en bolsillos de cueva
    for (let r = 36; r < rows - 4; r++) {
      if (g.get(c, r) === T.AIR && g.get(c, r + 1) !== T.AIR) {
        addPickup(w, 'heart', c, r, 2400);
        break;
      }
    }
  }
  for (let c = 6; c < cols - 6; c += 5) {
    const s = g.surface(c, (t) => t !== T.AIR && t !== T.NIGHT_PLAT);
    if (rnd() < 0.55) orbArc(w, c, s - 2 - Math.floor(rnd() * 2), 2);
  }
  // Orbes subterráneos
  for (let i = 0; i < 60; i++) {
    const c = 4 + Math.floor(rnd() * (cols - 8));
    const r = 34 + Math.floor(rnd() * (rows - 40));
    if (g.get(c, r) === T.AIR) addPickup(w, 'orb', c, r);
  }

  // --- Topos
  for (let i = 0; i < 26; i++) {
    const c = 30 + Math.floor(rnd() * (cols - 40));
    if (Math.abs(c - 8) < 12) continue;
    if (i % 3 === 0) {
      // en cuevas
      for (let r = 36; r < rows - 4; r++) {
        if (g.get(c, r) === T.AIR && g.get(c, r + 1) !== T.AIR && g.get(c, r + 1) !== T.VINE) {
          addEnemy(w, 'mole', c * REALM_TILE + 16, (r + 1) * REALM_TILE, rnd() < 0.5 ? -1 : 1);
          break;
        }
      }
    } else {
      addEnemy(w, 'mole', c * REALM_TILE + 16, g.surface(c, (t) => t !== T.AIR && t !== T.NIGHT_PLAT && t !== T.PLANK) * REALM_TILE, rnd() < 0.5 ? -1 : 1);
    }
  }

  placePlayerAtShrine(w, 0);
  return w;
}

// ============================================================================
// R-2 ARCHIPIÉLAGO TINTA
// ============================================================================
function buildInk(levelIndex: number): RealmWorld {
  const cols = 260;
  const rows = 70;
  const w = emptyWorld('ink', levelIndex, cols, rows);
  w.fragmentsNeeded = 6;
  const g = new Grid(cols, rows, w.tiles);
  const rnd = mulberry32(0x1a4b02);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c <= 1 || c >= cols - 2) g.set(c, r, T.BEDROCK);
      else if (r >= 64) g.set(c, r, T.INK_SEA);
    }
  }

  const island = (c0: number, top: number, width: number, depth: number): void => {
    for (let c = c0; c < c0 + width; c++) {
      const t = (c - c0 + 0.5) / width;
      const d = Math.max(1, Math.round(depth * Math.sin(t * Math.PI)));
      for (let r = top; r <= top + d; r++) g.set(c, r, r === top ? T.GRASS : T.ROCK);
    }
  };

  // Capa baja: cadena principal de islas (siempre transitable planeando)
  const lowIslands: Array<[number, number, number]> = [];
  let c = 4;
  while (c < cols - 14) {
    const width = 9 + Math.floor(rnd() * 8);
    const top = 50 + Math.floor(rnd() * 5);
    island(c, top, width, 4 + Math.floor(rnd() * 3));
    lowIslands.push([c, top, width]);
    c += width + 4 + Math.floor(rnd() * 4);
  }
  // Capa media e islas altas
  const midIslands: Array<[number, number, number]> = [];
  c = 14;
  while (c < cols - 16) {
    const width = 7 + Math.floor(rnd() * 7);
    const top = 34 + Math.floor(rnd() * 6);
    island(c, top, width, 3 + Math.floor(rnd() * 3));
    midIslands.push([c, top, width]);
    c += width + 8 + Math.floor(rnd() * 8);
  }
  const highIslands: Array<[number, number, number]> = [];
  c = 22;
  while (c < cols - 18) {
    const width = 6 + Math.floor(rnd() * 6);
    const top = 16 + Math.floor(rnd() * 6);
    island(c, top, width, 3);
    highIslands.push([c, top, width]);
    c += width + 12 + Math.floor(rnd() * 10);
  }

  // Nubes one-way entre capas
  for (let i = 0; i < 40; i++) {
    const cc = 6 + Math.floor(rnd() * (cols - 14));
    const rr = 12 + Math.floor(rnd() * 40);
    let free = true;
    for (let k = -1; k < 5 && free; k++) if (g.get(cc + k, rr) !== T.AIR || g.get(cc + k, rr - 1) !== T.AIR) free = false;
    if (free) g.rect(cc, rr, 4, 1, T.CLOUD);
  }

  // Corrientes ascendentes: de la capa baja a la media y de la media a la alta
  const addDraft = (tc: number, rTop: number, rBottom: number): void => {
    for (let r = rTop; r <= rBottom; r++) for (let k = 0; k < 3; k++) if (g.get(tc + k, r) !== T.INK_SEA) g.set(tc + k, r, T.AIR);
    w.zones.push({
      x: tc * REALM_TILE,
      y: rTop * REALM_TILE,
      w: 3 * REALM_TILE,
      h: (rBottom - rTop + 1) * REALM_TILE,
      kind: 'updraft',
      force: 0.95,
    });
  };
  for (let i = 0; i < lowIslands.length - 1; i += 2) {
    const [ic, , iw] = lowIslands[i];
    addDraft(ic + iw + 1, 26, 62);
  }
  for (let i = 1; i < midIslands.length - 1; i += 3) {
    const [ic, , iw] = midIslands[i];
    addDraft(ic + iw + 2, 8, 33);
  }

  // Inicio
  const [sc, stop] = lowIslands[0];
  addShrine(w, g, sc + 3, stop, 'MUELLE DE TINTA');
  w.portal = { x: (sc + 8) * REALM_TILE + 16, y: stop * REALM_TILE, open: false };

  // Torres: columnas de roca altísimas con faro arriba
  const tower = (tc: number, baseRow: number, height: number, color: PaintColor): void => {
    // Espacio libre alrededor de la cima para el faro
    g.rect(tc - 2, baseRow - height - 5, 7, 4, T.AIR);
    for (let r = baseRow - height; r < baseRow; r++) g.rect(tc, r, 3, 1, T.ROCK);
    g.rect(tc - 1, baseRow - height - 1, 5, 1, T.GRASS);
    w.beacons.push({
      id: w.nextId++,
      x: (tc + 1) * REALM_TILE + 16,
      y: (baseRow - height - 2) * REALM_TILE + 8,
      color,
      lit: false,
    });
  };
  // Faro azul 1: torre baja sobre isla 3 (rebote azul)
  const li = (i: number) => lowIslands[Math.min(lowIslands.length - 1, i)];
  tower(li(2)[0] + 3, li(2)[1], 9, 1);
  // Faro naranja: al final de una pista larga sin islas (salto veloz)
  const runway = li(6);
  g.rect(runway[0], runway[1], runway[2] + 6, 1, T.GRASS);
  // hueco largo y faro al otro lado
  const farC = runway[0] + runway[2] + 6 + 13;
  island(farC, runway[1] - 1, 6, 3);
  w.beacons.push({ id: w.nextId++, x: (farC + 3) * REALM_TILE, y: (runway[1] - 3) * REALM_TILE, color: 2, lit: false });
  // Faro verde 1: torre muy alta y lisa (trepa con verde)
  tower(li(9)[0] + 4, li(9)[1], 17, 3);
  // Faro azul 2: isla alta
  const hi = highIslands[Math.min(highIslands.length - 1, 3)];
  w.beacons.push({ id: w.nextId++, x: (hi[0] + Math.floor(hi[2] / 2)) * REALM_TILE + 16, y: (hi[1] - 2) * REALM_TILE, color: 1, lit: false });
  // Faro verde 2: bajo un techo — pegarse al techo verde y avanzar
  const ceil = midIslands[Math.min(midIslands.length - 1, 5)];
  const ceilC = ceil[0] + ceil[2] + 3;
  g.rect(ceilC, ceil[1] - 6, 14, 2, T.ROCK);
  g.rect(ceilC + 12, ceil[1] - 6, 2, 6, T.ROCK);
  w.beacons.push({ id: w.nextId++, x: (ceilC + 11) * REALM_TILE, y: (ceil[1] - 3) * REALM_TILE, color: 3, lit: false });
  // Faro naranja 2: en lo alto del extremo este
  const lastHi = highIslands[highIslands.length - 1];
  w.beacons.push({ id: w.nextId++, x: (lastHi[0] + 2) * REALM_TILE, y: (lastHi[1] - 2) * REALM_TILE, color: 2, lit: false });

  // Mejoras: cubeta naranja (capa media temprana) y verde (capa alta)
  const m1 = midIslands[1];
  addPickup(w, 'up_paint_orange', m1[0] + Math.floor(m1[2] / 2), m1[1] - 1);
  const h1 = highIslands[1];
  addPickup(w, 'up_paint_green', h1[0] + Math.floor(h1[2] / 2), h1[1] - 1);

  // Santuarios repartidos
  const shrineIslands = [li(5), midIslands[3], li(10), highIslands[2], li(14)];
  const shrineNames = ['ARRECIFE NARANJA', 'NUBE MEDIA', 'PISTA LARGA', 'ALTO CIELO', 'COSTA ESTE'];
  shrineIslands.forEach((isl, i) => {
    if (isl) addShrine(w, g, isl[0] + 2, isl[1], shrineNames[i]);
  });

  // Orbes, corazones y enemigos
  for (const [ic, top, iw] of [...lowIslands, ...midIslands, ...highIslands]) {
    orbArc(w, ic + 1, top - 2, Math.min(4, iw - 2));
    if (rnd() < 0.5 && ic > 20) addEnemy(w, 'eraser', (ic + iw / 2) * REALM_TILE, top * REALM_TILE, rnd() < 0.5 ? 1 : -1);
  }
  for (let i = 0; i < 16; i++) {
    const cc = 24 + Math.floor(rnd() * (cols - 40));
    const rr = 10 + Math.floor(rnd() * 36);
    if (g.get(cc, rr) === T.AIR) addEnemy(w, 'gull', cc * REALM_TILE, rr * REALM_TILE + 16, rnd() < 0.5 ? 1 : -1);
  }
  for (let i = 0; i < 7; i++) {
    const isl = midIslands[Math.floor(rnd() * midIslands.length)];
    addPickup(w, 'heart', isl[0] + 1, isl[1] - 1, 2400);
  }

  placePlayerAtShrine(w, 0);
  return w;
}

// ============================================================================
// R-3 FOSA MAGNÉTICA
// ============================================================================
function buildMagnet(levelIndex: number): RealmWorld {
  const cols = 240;
  const rows = 90;
  const w = emptyWorld('magnet', levelIndex, cols, rows);
  const g = new Grid(cols, rows, w.tiles);
  const rnd = mulberry32(0x3a9e03);
  const waterTop = 22;

  const floor: number[] = [];
  for (let c = 0; c < cols; c++) {
    let f = 64 + 7 * Math.sin(c * 0.05) + 3 * Math.sin(c * 0.17 + 1.3);
    if (c >= 150 && c <= 176) f = 84; // fosa
    if (c >= 146 && c < 150) f = 64 + (c - 146) * 5;
    if (c > 176 && c <= 180) f = 84 - (c - 176) * 5;
    floor.push(Math.round(f));
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let t: number = T.AIR;
      if (r >= floor[c]) t = r === floor[c] && rnd() < 0.3 ? T.CORAL : T.ROCK;
      else if (r >= waterTop) t = T.WATER;
      if (c <= 1 || c >= cols - 2 || r >= rows - 2) t = T.BEDROCK;
      g.set(c, r, t);
    }
  }
  // Muelle metálico de inicio (sobre el agua)
  g.rect(2, waterTop - 2, 30, 2, T.METAL);
  for (let c = 4; c < 30; c += 6) g.rect(c, waterTop, 1, floor[c] - waterTop, T.METAL);

  // Formaciones de roca submarinas con cavernas
  for (let i = 0; i < 14; i++) {
    const cx = 36 + rnd() * (cols - 60);
    if (cx > 144 && cx < 182) continue;
    const cy = 40 + rnd() * 18;
    g.ellipse(cx, cy, 4 + rnd() * 5, 2 + rnd() * 3, rnd() < 0.3 ? T.CORAL : T.ROCK);
    g.ellipse(cx, cy, 1.6, 1, T.WATER);
  }

  // Techo magnético rojo sobre el agua (aférrate con polo azul)
  const ceilC0 = 64;
  const ceilC1 = 112;
  g.rect(ceilC0, 6, ceilC1 - ceilC0, 1, T.MAGNET_RED);
  g.rect(ceilC0, 5, ceilC1 - ceilC0, 1, T.METAL);
  // Repisa al final del techo + plataforma repulsora hacia la perla alta
  g.rect(108, 10, 14, 1, T.METAL);
  g.rect(118, 10, 4, 1, T.MAGNET_BLUE);
  g.rect(112, 4, 6, 1, T.METAL);
  addFragment(w, 114, 3, 'Fin del Techo Imán: aférrate con polo AZUL y salta en la placa azul');
  // Pilar de acceso al techo
  g.rect(58, 10, 5, 1, T.METAL);
  g.rect(60, 11, 1, waterTop - 11, T.METAL);
  g.rect(52, 14, 4, 1, T.METAL);
  g.rect(45, 17, 4, 1, T.METAL);
  g.rect(38, 20, 4, 1, T.METAL);

  // Escalones y plataformas repulsoras azules: lanzan si tienes polo AZUL
  g.rect(120, 20, 5, 1, T.METAL);
  g.rect(122, 17, 3, 1, T.METAL);
  g.rect(129, 18, 7, 1, T.METAL);
  g.rect(181, 20, 8, 1, T.METAL);
  const pads: Array<[number, number]> = [
    [125, 16],
    [189, 20],
    [194, 14],
    [199, 8],
  ];
  for (const [pc, pr] of pads) {
    g.rect(pc, pr, 4, 1, T.MAGNET_BLUE);
    g.rect(pc, pr + 1, 4, 1, T.METAL);
  }
  // Cima del Faro Polar (muy alta)
  g.rect(204, 2, 6, 1, T.METAL);
  addFragment(w, 206, 1, 'Cima polar: encadena las placas AZULES con polo AZUL');

  // Fosa: imán rojo en el fondo que atrae (usa polo rojo para flotar lejos)
  g.rect(156, 84, 14, 1, T.MAGNET_RED);
  addFragment(w, 163, 82, 'Fondo de la Fosa: necesitarás oxígeno extra o burbujas');
  // Columnas de burbujas en la fosa y en el mar
  const bubble = (tc: number, r0: number, r1: number) =>
    w.zones.push({ x: tc * REALM_TILE, y: r0 * REALM_TILE, w: 2 * REALM_TILE, h: (r1 - r0) * REALM_TILE, kind: 'bubbles', force: 0.5 });
  bubble(150, 40, 82);
  bubble(174, 50, 82);
  bubble(40, waterTop, floor[40]);
  bubble(96, waterTop, floor[96]);
  bubble(124, waterTop, floor[124]);
  bubble(214, waterTop, floor[214]);

  // Cueva de pinchos con perla
  g.ellipse(90, 52, 7, 3.5, T.ROCK);
  g.ellipse(90, 52, 5.5, 2, T.WATER);
  g.rect(85, 54, 4, 1, T.SPIKES);
  g.rect(92, 54, 4, 1, T.SPIKES);
  g.set(84, 52, T.WATER);
  g.set(83, 52, T.WATER);
  addFragment(w, 90, 53, 'Cueva de Pinchos: entra nadando por el oeste');

  // Barco hundido entre corales
  g.rect(30, floor[38] - 3, 16, 1, T.PLANK);
  g.rect(30, floor[38] - 7, 1, 4, T.METAL);
  g.rect(45, floor[38] - 7, 1, 4, T.METAL);
  g.rect(30, floor[38] - 8, 16, 1, T.METAL);
  addFragment(w, 38, floor[38] - 5, 'Barco hundido: casco metálico al oeste del mar');

  // Cámara este bajo voladizo magnético azul (aférrate con polo ROJO)
  g.rect(218, 26, 18, 1, T.MAGNET_BLUE);
  g.rect(218, 25, 18, 1, T.ROCK);
  g.rect(234, 26, 2, 12, T.ROCK);
  addFragment(w, 231, 28, 'Voladizo azul del este, bajo el agua: con polo ROJO te pegas a él');

  // Mejoras
  g.rect(67, 42, 7, 4, T.WATER);
  g.rect(67, 46, 7, 1, T.CORAL);
  addPickup(w, 'up_oxygen', 70, 44);
  addPickup(w, 'up_magnet_boots', 127, 14);

  // Santuarios
  addShrine(w, g, 8, waterTop - 2, 'MUELLE OXIDADO');
  addShrine(w, g, 104, floor[104], 'LECHO CORAL');
  addShrine(w, g, 132, 18, 'PLATAFORMA REPULSORA');
  addShrine(w, g, 184, 20, 'BORDE DE LA FOSA');
  addShrine(w, g, 226, floor[226], 'ABISMO ESTE');
  w.portal = { x: 20 * REALM_TILE, y: (waterTop - 2) * REALM_TILE, open: false };

  // Orbes, corazones, enemigos
  for (let i = 0; i < 90; i++) {
    const cc = 4 + Math.floor(rnd() * (cols - 8));
    const rr = 4 + Math.floor(rnd() * (rows - 10));
    const t = g.get(cc, rr);
    if (t === T.AIR || t === T.WATER) addPickup(w, 'orb', cc, rr);
  }
  orbArc(w, ceilC0 + 2, 8, 22, 2, 0);
  for (let i = 0; i < 8; i++) {
    const cc = 40 + Math.floor(rnd() * (cols - 60));
    addPickup(w, 'heart', cc, floor[cc] - 1, 2400);
  }
  for (let i = 0; i < 18; i++) {
    const cc = 36 + Math.floor(rnd() * (cols - 50));
    const rr = waterTop + 4 + Math.floor(rnd() * 40);
    if (g.get(cc, rr) === T.WATER) addEnemy(w, 'jelly', cc * REALM_TILE, rr * REALM_TILE, 1);
  }
  for (let i = 0; i < 12; i++) {
    const cc = 40 + Math.floor(rnd() * (cols - 50));
    addEnemy(w, 'crab', cc * REALM_TILE + 16, floor[cc] * REALM_TILE, rnd() < 0.5 ? -1 : 1);
  }
  for (let i = 0; i < 9; i++) {
    const cc = 60 + Math.floor(rnd() * (cols - 80));
    const rr = 8 + Math.floor(rnd() * 10);
    if (g.get(cc, rr) === T.AIR) addEnemy(w, 'drone', cc * REALM_TILE, rr * REALM_TILE, 1);
  }

  placePlayerAtShrine(w, 0);
  w.player.maxOxygen = 1200;
  w.player.oxygen = 1200;
  return w;
}

export function buildRealmWorld(levelIndex: number): RealmWorld {
  const idx = Math.max(0, Math.min(REALM_ORDER.length - 1, levelIndex));
  const realm = REALM_ORDER[idx];
  const w = realm === 'roots' ? buildRoots(idx) : realm === 'ink' ? buildInk(idx) : buildMagnet(idx);
  w.tileVersion = 1;
  return w;
}
