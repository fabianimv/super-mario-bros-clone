// Pruebas headless del motor de Reinos Abiertos (sin Skia)
import { buildRealmWorld, REALM_TILE } from '../src/realms/realmBuilder';
import { fragmentsCollected, solidAt, stepRealmWorld, tileAt } from '../src/realms/realmPhysics';
import { PAINT, T, type RealmWorld } from '../src/realms/realmTypes';
import type { GameEvent, InputState } from '../src/engine/types';

let failures = 0;
function check(cond: boolean, msg: string): void {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  }
}
function blank(): InputState {
  return { left: false, right: false, up: false, down: false, jump: false, run: false, fire: false, spin: false };
}
function run(w: RealmWorld, input: Partial<InputState>, frames: number): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < frames; i++) all.push(...stepRealmWorld(w, { ...blank(), ...input }, 970, 448));
  return all;
}
function settle(w: RealmWorld): void {
  run(w, {}, 40);
}
const TS = REALM_TILE;

console.log('--- 1. Construcción de los 3 reinos ---');
for (let i = 0; i < 3; i++) {
  const w = buildRealmWorld(i);
  const goals = w.fragments.length + w.beacons.length;
  check(goals === w.fragmentsNeeded, `${w.code}: ${goals} objetivos, se esperaban ${w.fragmentsNeeded}`);
  check(w.shrines.length >= 5, `${w.code}: al menos 5 santuarios (hay ${w.shrines.length})`);
  check(w.cols * w.rows === w.tiles.length, `${w.code}: tamaño de grilla`);
  check(w.cols >= 200, `${w.code}: mundo grande (cols=${w.cols})`);
  const p = w.player;
  check(!solidAt(w, Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)), `${w.code}: el jugador no nace dentro de un bloque`);
  for (const f of w.fragments) {
    check(!solidAt(w, Math.floor(f.x / TS), Math.floor(f.y / TS)), `${w.code}: fragmento en (${Math.floor(f.x / TS)},${Math.floor(f.y / TS)}) dentro de un bloque`);
  }
  for (const b of w.beacons) {
    check(!solidAt(w, Math.floor(b.x / TS), Math.floor(b.y / TS)), `${w.code}: faro dentro de un bloque`);
  }
  for (const s of w.shrines) {
    const c = Math.floor(s.x / TS);
    const r = Math.floor(s.y / TS);
    check(solidAt(w, c, r) || tileAt(w, c, r) === T.PLANK, `${w.code}: santuario ${s.name} sin suelo`);
    check(!solidAt(w, c, r - 1), `${w.code}: santuario ${s.name} enterrado`);
  }
  for (const pk of w.pickups) {
    if (pk.kind.startsWith('up_')) check(!solidAt(w, Math.floor(pk.x / TS), Math.floor(pk.y / TS)), `${w.code}: mejora ${pk.kind} enterrada`);
  }
  settle(w);
  check(w.player.onGround, `${w.code}: el jugador aterriza al nacer`);
  console.log(`  ${w.code} ${w.name}: ${w.cols}×${w.rows} tiles, ${w.enemies.length} enemigos, ${w.pickups.length} objetos`);
}

console.log('--- 2. Caminar y saltar sin errores numéricos ---');
for (let i = 0; i < 3; i++) {
  const w = buildRealmWorld(i);
  for (let f = 0; f < 900; f++) {
    stepRealmWorld(w, { ...blank(), right: true, run: true, jump: f % 50 < 20 }, 970, 448);
  }
  const p = w.player;
  check(Number.isFinite(p.x) && Number.isFinite(p.y), `${w.code}: posición finita`);
  check(p.x > 100, `${w.code}: el jugador avanzó (x=${p.x.toFixed(0)})`);
}

console.log('--- 3. Raíces: taladro, semillas, día/noche ---');
{
  const w = buildRealmWorld(0);
  settle(w);
  const p = w.player;
  const c = Math.floor((p.x + p.w / 2) / TS);
  const r = Math.floor((p.y + p.h + 2) / TS);
  const before = tileAt(w, c, r);
  run(w, { down: true, fire: true }, 40);
  check(before !== T.AIR && tileAt(w, c, r) === T.AIR, 'el taladro excava hacia abajo');
  const w2 = buildRealmWorld(0);
  settle(w2);
  const seeds = w2.player.seeds;
  run(w2, { spin: true }, 1);
  run(w2, {}, 1);
  const vc = Math.floor((w2.player.x + w2.player.w / 2) / TS);
  const vr = Math.floor((w2.player.y + w2.player.h - 1) / TS);
  check(tileAt(w2, vc, vr) === T.VINE && tileAt(w2, vc, vr - 8) === T.VINE, 'la semilla hace crecer una enredadera alta');
  check(w2.player.seeds === seeds - 1, 'plantar gasta una semilla');
  const y0 = w2.player.y;
  run(w2, { up: true }, 60);
  check(w2.player.y < y0 - 100, 'se puede trepar la enredadera');
  // Piedra sin diamante
  const w3 = buildRealmWorld(0);
  let stoneC = -1;
  let stoneR = -1;
  for (let rr = 40; rr < 70 && stoneC < 0; rr++) {
    for (let cc = 20; cc < 60; cc++) {
      if (tileAt(w3, cc, rr) === T.STONE && tileAt(w3, cc, rr - 1) === T.STONE) {
        stoneC = cc;
        stoneR = rr;
        break;
      }
    }
  }
  // Caja de aire sobre la piedra para pararse
  for (let cc = stoneC - 1; cc <= stoneC + 1; cc++) for (let rr = stoneR - 3; rr < stoneR; rr++) w3.tiles[rr * w3.cols + cc] = T.AIR;
  w3.player.x = stoneC * TS + 6;
  w3.player.y = stoneR * TS - w3.player.h - 1;
  run(w3, { down: true, fire: true }, 60);
  check(tileAt(w3, stoneC, stoneR) === T.STONE, 'la piedra resiste sin el taladro de diamante');
  w3.upgrades.diamondDrill = true;
  run(w3, { down: true, fire: true }, 60);
  check(tileAt(w3, stoneC, stoneR) === T.AIR, 'con taladro de diamante la piedra cae');
  // Noche
  const w4 = buildRealmWorld(0);
  w4.clock = Math.floor(w4.dayLength * 0.6) - 2;
  run(w4, {}, 5);
  check(w4.isNight, 'llega la noche');
  // Ruta al taladro de diamante solo cavando tierra (sin piedra)
  const drill = w4.pickups.find((pk) => pk.kind === 'up_diamond_drill')!;
  const start = Math.floor(w4.shrines[0].y / TS) - 1;
  const seen = new Uint8Array(w4.cols * w4.rows);
  const q: number[] = [start * w4.cols + Math.floor(w4.shrines[0].x / TS)];
  let found = false;
  const goal = Math.floor(drill.y / TS) * w4.cols + Math.floor(drill.x / TS);
  while (q.length) {
    const k = q.pop()!;
    if (seen[k]) continue;
    seen[k] = 1;
    if (k === goal) {
      found = true;
      break;
    }
    const cc = k % w4.cols;
    const rr = Math.floor(k / w4.cols);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cc + dc;
      const nr = rr + dr;
      if (nc < 0 || nr < 0 || nc >= w4.cols || nr >= w4.rows) continue;
      const t = tileAt(w4, nc, nr);
      if (t === T.STONE || t === T.BEDROCK) continue;
      q.push(nr * w4.cols + nc);
    }
  }
  check(found, 'el taladro de diamante es alcanzable cavando solo tierra');
}

console.log('--- 4. Tinta: pintura azul rebota, verde adhiere ---');
{
  const w = buildRealmWorld(1);
  settle(w);
  const p = w.player;
  const fc = Math.floor((p.x + p.w / 2) / TS);
  const fr = Math.floor((p.y + p.h + 2) / TS);
  run(w, { down: true, fire: true }, 2);
  run(w, {}, 30);
  check(w.paint[fr * w.cols + fc] === PAINT.BLUE || w.paint[fr * w.cols + fc + 1] === PAINT.BLUE || w.paint[fr * w.cols + fc - 1] === PAINT.BLUE, 'la tinta azul pinta el suelo');
  for (let cc = fc - 2; cc <= fc + 2; cc++) w.paint[fr * w.cols + cc] = PAINT.BLUE;
  p.y -= 160;
  p.vy = 6;
  let minY = Infinity;
  for (let f = 0; f < 90; f++) {
    stepRealmWorld(w, blank(), 970, 448);
    minY = Math.min(minY, p.y);
  }
  check(minY < p.lastSafeY - 120 || minY < fr * TS - 200, 'aterrizar sobre azul te hace rebotar alto');
  // Verde en pared
  const w2 = buildRealmWorld(1);
  settle(w2);
  const q = w2.player;
  const wallC = Math.floor((q.x + q.w) / TS) + 2;
  const baseR = Math.floor((q.y + q.h) / TS) - 1;
  for (let rr = baseR - 6; rr <= baseR; rr++) {
    w2.tiles[rr * w2.cols + wallC] = T.ROCK;
    w2.paint[rr * w2.cols + wallC] = PAINT.GREEN;
  }
  run(w2, { right: true, up: true }, 30);
  check(q.stuck === 'wall_right', `te pegas a la pared verde (estado ${q.stuck})`);
  const y0 = q.y;
  run(w2, { right: true, up: true }, 30);
  check(q.y < y0 - 40, 'se trepa por la pared verde');
  // Planeo
  const w3 = buildRealmWorld(1);
  settle(w3);
  w3.player.y -= 400;
  w3.player.vy = 0;
  run(w3, { jump: true }, 30);
  check(w3.player.gliding && w3.player.vy <= 1.5, 'mantener A en el aire planea');
}

console.log('--- 5. Fosa: imanes, nado y oxígeno ---');
{
  const w = buildRealmWorld(2);
  settle(w);
  const p = w.player;
  // Bajo el techo imán rojo con polo azul => sube y se pega
  p.x = 80 * TS;
  p.y = 9 * TS;
  p.vx = 0;
  p.vy = 0;
  p.polarity = -1;
  run(w, {}, 60);
  check(p.magnetCling && p.y < 8 * TS, `polo opuesto atrae al techo (y=${(p.y / TS).toFixed(1)}, cling=${p.magnetCling})`);
  // Invertir polo => sale disparado
  run(w, { spin: true }, 1);
  run(w, {}, 10);
  check(!p.magnetCling && p.y > 8 * TS, 'invertir la polaridad te despega');
  // Placa azul con polo azul => lanzamiento
  const w2 = buildRealmWorld(2);
  const q = w2.player;
  q.x = 190 * TS;
  q.y = 17 * TS - q.h - 2;
  q.polarity = -1;
  let minY = Infinity;
  for (let f = 0; f < 60; f++) {
    stepRealmWorld(w2, blank(), 970, 448);
    minY = Math.min(minY, q.y);
  }
  check(minY < 17 * TS - 6 * TS, `la placa azul lanza con polo azul (subió ${((17 * TS - minY) / TS).toFixed(1)} tiles)`);
  // Agua
  const w3 = buildRealmWorld(2);
  let wc = 100;
  let wr = 40;
  while (tileAt(w3, wc, wr) !== T.WATER || tileAt(w3, wc, wr - 1) !== T.WATER) wr++;
  w3.player.x = wc * TS + 6;
  w3.player.y = (wr - 1) * TS;
  run(w3, {}, 5);
  check(w3.player.swimming, 'el jugador nada en el agua');
  const ox = w3.player.oxygen;
  run(w3, {}, 60);
  check(w3.player.oxygen < ox, 'el oxígeno baja bajo el agua');
}

console.log('--- 6. Fragmentos, portal y victoria ---');
for (let i = 0; i < 3; i++) {
  const w = buildRealmWorld(i);
  settle(w);
  for (const f of w.fragments.slice(1)) f.taken = true;
  for (const b of w.beacons.slice(w.fragments.length ? 0 : 1)) b.lit = true;
  const last = w.fragments[0];
  if (last) {
    w.player.x = last.x - w.player.w / 2;
    w.player.y = last.y - w.player.h / 2;
    run(w, {}, 1);
  } else {
    const b = w.beacons[0];
    w.player.x = b.x - 60;
    w.player.y = b.y;
    w.player.facing = 1;
    w.projectiles.push({ id: 999, kind: 'paint', x: b.x, y: b.y, vx: 0, vy: 0, color: b.color, life: 10, owner: 'player' });
    run(w, {}, 1);
  }
  check(fragmentsCollected(w) === w.fragmentsNeeded, `${w.code}: todos los objetivos cuentan (${fragmentsCollected(w)})`);
  check(w.portal.open, `${w.code}: el portal se abre`);
  w.player.x = w.portal.x - w.player.w / 2;
  w.player.y = w.portal.y - w.player.h - 1;
  w.player.vy = 0;
  const ev = run(w, {}, 3);
  check(w.cleared, `${w.code}: entrar al portal completa el reino`);
  check(ev.some((e) => e.type === 'stage_cleared'), `${w.code}: se emite stage_cleared`);
  run(w, {}, 280);
  check(w.requestNext, `${w.code}: pide pasar al siguiente reino`);
}

console.log('--- 7. Santuarios: viaje rápido y regreso manteniendo Y ---');
{
  const w = buildRealmWorld(0);
  settle(w);
  w.shrines[1].active = true;
  run(w, { up: true }, 1);
  check(w.respawnShrine === 1, '▲ en un santuario viaja al siguiente');
  run(w, {}, 2);
  w.player.x += 600;
  run(w, { spin: true }, 105);
  check(Math.abs(w.player.x + w.player.w / 2 - w.shrines[1].x) < 60, 'mantener Y regresa al santuario');
  // Muerte y reaparición
  w.player.hp = 1;
  w.player.invuln = 0;
  w.enemies.push({ id: 5000, kind: 'jelly', x: w.player.x, y: w.player.y, w: 22, h: 24, vx: 0, vy: 0, hp: 2, alive: true, dir: 1, homeX: 0, homeY: 0, tick: 0, hurtTimer: 0 });
  run(w, {}, 90);
  check(w.player.hp === w.player.maxHp && w.deaths === 1, 'al morir reapareces con vida completa');
}

console.log('--- 8. Rutas clave alcanzables (simulación con controlador) ---');
{
  // Sube en vertical hasta superar la fila objetivo y luego se dirige al centro
  const hop = (w: RealmWorld, tx: number, topRow: number, frames: number, extra: Partial<InputState> = {}): boolean => {
    for (let i = 0; i < frames; i++) {
      const cx = (w.player.x + w.player.w / 2) / TS;
      const feet = (w.player.y + w.player.h) / TS;
      const free = feet < topRow - 0.6 || (w.player.onGround && Math.abs(feet - topRow) < 0.3);
      const d = tx - cx;
      stepRealmWorld(w, { ...blank(), ...extra, right: free && d > 0.3, left: free && d < -0.3 }, 970, 448);
      if (Math.abs(d) < 0.8 && Math.abs(feet - topRow) < 0.3 && w.player.vy <= 0.5) return true;
    }
    return false;
  };
  const steer = (w: RealmWorld, tx: number, frames: number): void => {
    for (let i = 0; i < frames; i++) {
      const d = tx - (w.player.x + w.player.w / 2) / TS;
      stepRealmWorld(w, { ...blank(), right: d > 0.2, left: d < -0.2 }, 970, 448);
    }
  };
  const taken = (w: RealmWorld) => w.fragments.filter((f) => f.taken).length;
  // Cadena de placas azules hasta la cima polar
  const w = buildRealmWorld(2);
  w.player.x = 185 * TS;
  w.player.y = 20 * TS - w.player.h - 1;
  w.player.polarity = -1;
  const chain: Array<[number, number]> = [[190.5, 20], [196, 14], [201, 8], [206, 2]];
  let ok = true;
  for (const [tx, row] of chain) ok = ok && hop(w, tx, row, 240);
  steer(w, 206.5, 40);
  check(ok && taken(w) === 1, `R-3: la cadena de placas azules lleva a la perla de la cima (${taken(w)})`);
  // Techo imán: cruzarlo, soltarse invirtiendo el polo y lanzarse desde la placa
  const w2 = buildRealmWorld(2);
  w2.player.x = 62 * TS;
  w2.player.y = 7 * TS;
  w2.player.polarity = -1;
  steer(w2, 111, 650);
  check(w2.player.magnetCling, 'R-3: se cruza el techo imán colgado');
  run(w2, { spin: true }, 1);
  run(w2, {}, 40);
  steer(w2, 119.5, 80);
  run(w2, { spin: true }, 1);
  steer(w2, 119.5, 25);
  steer(w2, 114.5, 60);
  check(taken(w2) === 1, 'R-3: la perla del final del techo imán es alcanzable');
  // Raíces: de noche, las plataformas de luciérnagas llevan a la Isla Nocturna
  const rn = buildRealmWorld(0);
  const plats: Array<[number, number]> = [];
  for (let r = 0; r < rn.rows; r++) {
    for (let c = 170; c < rn.cols; c++) {
      if (tileAt(rn, c, r) === T.NIGHT_PLAT && tileAt(rn, c - 1, r) !== T.NIGHT_PLAT) plats.push([c + 1.5, r]);
    }
  }
  plats.sort((a, b) => a[0] - b[0]);
  rn.clock = Math.floor(rn.dayLength * 0.65);
  run(rn, {}, 2);
  const firstPlat = plats[0];
  rn.player.x = (firstPlat[0] - 3) * TS;
  rn.player.y = (firstPlat[1] + 3) * TS - rn.player.h - 1;
  let rok = true;
  const jumpHop = (w: RealmWorld, tx: number, row: number): boolean => {
    for (let i = 0; i < 160; i++) {
      const cx = (w.player.x + w.player.w / 2) / TS;
      const feet = (w.player.y + w.player.h) / TS;
      const d = tx - cx;
      const jump = w.player.onGround && Math.abs(feet - row) > 0.3 ? true : i % 30 < 18 && !w.player.onGround;
      stepRealmWorld(w, { ...blank(), jump, right: d > 0.2, left: d < -0.2 }, 970, 448);
      if (Math.abs(d) < 0.6 && Math.abs(feet - row) < 0.2 && w.player.onGround) return true;
    }
    return false;
  };
  run(rn, {}, 30);
  for (const [tx, row] of plats) rok = rok && jumpHop(rn, tx, row);
  rok = rok && jumpHop(rn, 211.5, 7);
  check(rok, `R-1: se sube por las plataformas de luciérnagas de noche (${plats.length} plataformas)`);
  check(taken(rn) >= 1, 'R-1: el fragmento de la Isla Nocturna es alcanzable');
  // Raíces: enredaderas encadenadas hasta la copa del Árbol Ancestral
  const rt = buildRealmWorld(0);
  const treeFrag = rt.fragments.find((f) => f.hint.includes('Árbol'))!;
  let base = 0;
  while (!solidAt(rt, 118, base)) base++;
  rt.player.x = 118 * TS + 6;
  rt.player.y = base * TS - rt.player.h - 1;
  run(rt, {}, 20);
  run(rt, { spin: true }, 1);
  run(rt, { up: true }, 130);
  run(rt, { up: true, spin: true }, 1);
  run(rt, { up: true }, 130);
  for (let i = 0; i < 120; i++) {
    const d = treeFrag.x / TS - (rt.player.x + rt.player.w / 2) / TS;
    stepRealmWorld(rt, { ...blank(), right: d > 0.2, left: d < -0.2, jump: i < 4 }, 970, 448);
  }
  check(treeFrag.taken, 'R-1: la copa del Árbol Ancestral se alcanza encadenando enredaderas');

  // Tinta: planear dentro de una corriente ascendente te eleva
  const ik = buildRealmWorld(1);
  const z = ik.zones[0];
  ik.player.x = z.x + z.w / 2 - ik.player.w / 2;
  ik.player.y = z.y + z.h - 200;
  ik.player.vy = 0;
  const y0 = ik.player.y;
  run(ik, { jump: true }, 90);
  check(ik.player.y < y0 - 150, 'R-2: la corriente ascendente eleva al planear');

  // Cada faro de tinta tiene suelo cerca desde donde dispararle
  const ink = buildRealmWorld(1);
  for (const b of ink.beacons) {
    const bc = Math.floor(b.x / TS);
    const br = Math.floor(b.y / TS);
    let found = false;
    for (let c = bc - 8; c <= bc + 8 && !found; c++) {
      for (let r = br - 2; r <= br + 8 && !found; r++) {
        const below = tileAt(ink, c, r + 1);
        if (!solidAt(ink, c, r) && (solidAt(ink, c, r + 1) || below === T.CLOUD || below === T.PLANK)) found = true;
      }
    }
    check(found, `R-2: el faro en (${bc},${br}) tiene suelo cercano`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} PRUEBA(S) FALLARON`);
  process.exit(1);
}
console.log('\nREINOS ABIERTOS: TODAS LAS PRUEBAS PASARON 🌍');
