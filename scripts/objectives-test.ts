// Pruebas de los objetivos por nivel (Super Plomero Brawl), usando la física real a 60 Hz.
import { partitionTotalLevels } from '../src/engine/biomes';
import { PARTITION_ORDER } from '../src/engine/partitions';
import { GROUND_ROW, SMW_TOTAL_LEVELS, TILE, TOTAL_LEVELS, EXP_TOTAL_LEVELS, ECHO_TOTAL_LEVELS, FORTUNE_TOTAL_LEVELS, FRONTIER_TOTAL_LEVELS, MIRAGE_TOTAL_LEVELS, DIM_TOTAL_LEVELS } from '../src/engine/biomes';
import {
  CHASE_DELAY,
  CLOCKS_PER_STAGE,
  CLOCK_BONUS,
  TIME_ATTACK_START,
  getStageObjective,
  objectiveForStage,
  timeAttackBudget,
  isGoalLocked,
  objectiveHudLabel,
  countBrawlTargets,
} from '../src/engine/objectives';
import { addFury } from '../src/engine/abilities';
import { stepWorld } from '../src/engine/physics';
import type { Block, Enemy, GamePartition, InputState, StageObjective, WorldState } from '../src/engine/types';
import { buildWorldState, gridKey } from '../src/levels/levelBuilder';

// Todos los modos del juego (así ningún modo nuevo queda fuera de las pruebas)
const ALL_MODES: Array<[GamePartition, number]> = PARTITION_ORDER.map((p) => [p, partitionTotalLevels(p)]);

const VIEW_W = 970;
const NO_INPUT: InputState = {
  left: false, right: false, up: false, down: false, jump: false, run: false, fire: false, spin: false,
};

let passed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`   ✖ ${msg}`);
    process.exit(1);
  }
  passed++;
}

function run(w: WorldState, frames: number, input: Partial<InputState> = NO_INPUT): void {
  for (let f = 0; f < frames; f++) {
    if (w.status !== 'playing') return;
    stepWorld(w, { ...NO_INPUT, ...input }, VIEW_W);
  }
}

/** Quita enemigos y peligros para aislar lo que se prueba. */
function calm(w: WorldState): void {
  w.enemies = [];
  w.icicles = [];
  w.wind = null;
  w.lavaTide = false;
  w.player.invulnTimer = 0;
}

function putBlock(w: WorldState, col: number, row: number, type: Block['type'] = 'hard'): void {
  const b: Block = {
    id: 80000 + row * 1024 + col,
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
  const old = w.blockGrid.get(gridKey(col, row));
  if (old) w.blocks.splice(w.blocks.indexOf(old), 1);
  w.blocks.push(b);
  w.blockGrid.set(gridKey(col, row), b);
}

function flatWorld(): WorldState {
  const w = buildWorldState(2);
  for (const b of [...w.blocks]) {
    w.blockGrid.delete(gridKey(b.col, b.row));
  }
  w.blocks = [];
  for (let c = 0; c < w.totalCols; c++) putBlock(w, c, GROUND_ROW, 'ground_top');
  calm(w);
  w.pipes = [];
  w.springs = [];
  w.platforms = [];
  w.coinsList = [];
  w.pickups = [];
  w.flagpole = null;
  w.checkpoint = null;
  w.player.x = 10 * TILE;
  w.player.y = GROUND_ROW * TILE - w.player.height;
  w.player.vx = 0;
  w.player.vy = 0;
  w.player.onGround = true;
  w.player.furyMeter = 0;
  w.player.furyTimer = 0;
  w.player.comboStep = 0;
  w.player.comboTimer = 0;
  w.player.meleeTimer = 0;
  w.player.parryTimer = 0;
  w.player.groundPounding = false;
  return w;
}

function makeBrawlEnemy(id: number, x: number, y: number, opts: Partial<Enemy> = {}): Enemy {
  return {
    id,
    type: 'galoomba',
    state: 'walk',
    x,
    y,
    baseY: y,
    vx: 0,
    vy: 0,
    width: 28,
    height: 28,
    facing: -1,
    onGround: true,
    hp: 3,
    maxHp: 3,
    stateTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    animTimer: 0,
    active: true,
    ...opts,
  };
}

console.log('7. Validando objetivos por nivel (Super Plomero Brawl)...');

// 7a. Reparto de objetivos
for (const [part, total] of ALL_MODES) {
  const count: Record<StageObjective, number> = {
    reach: 0,
    brawl_captain: 0,
    bounty_hunt: 0,
    core_breaker: 0,
    shadow_combo: 0,
    time_attack: 0,
    chase: 0,
    fortune: 0,
    collect: 0,
    recover: 0,
  };

  for (let i = 0; i < total; i++) {
    const w = buildWorldState(i, undefined, part);
    assert(w.objective === objectiveForStage(part, i), `${part} ${w.worldLabel}: objetivo inconsistente`);
    if (i % 4 === 3) assert(w.objective === 'reach', `${part} ${w.worldLabel}: los castillos terminan con el jefe`);
    count[w.objective!]++;
  }

  const expectedFirst: Record<GamePartition, StageObjective> = {
    classic: 'reach',
    smw: 'reach',
    expedition: 'reach',
    frontier: 'brawl_captain',
    fortune: 'fortune',
    mirage: 'bounty_hunt',
    echo: 'shadow_combo',
    dimension: 'reach',
    tower: 'reach',
    flip: 'core_breaker',
    star_road: 'reach',
    odyssey: 'core_breaker',
  };
  const firstObjective = objectiveForStage(part, 0);
  assert(
    firstObjective === expectedFirst[part],
    `${part}: objetivo inicial inesperado (${firstObjective})`
  );
}

// 7b. CERO GEMAS (0%): Comprueba en TODOS los niveles de todas las particiones
for (const [part, total] of ALL_MODES) {
  for (let i = 0; i < total; i++) {
    const w = buildWorldState(i, undefined, part);
    assert(w.gemsNeeded === 0, `${part} ${w.worldLabel}: w.gemsNeeded === 0 (tiene ${w.gemsNeeded})`);
    assert(
      w.gemsCollected === 0 || w.gemsCollected === undefined,
      `${part} ${w.worldLabel}: w.gemsCollected === 0`
    );
    const gems = (w.pickups ?? []).filter((pk) => pk.kind === 'gem');
    assert(gems.length === 0, `${part} ${w.worldLabel}: cero gemas en pickups (tiene ${gems.length})`);
  }
}

// 7c. Objetivos de Combate: brawl_captain, bounty_hunt, shadow_combo, core_breaker
// 7c.1. brawl_captain en Classic 1-3
{
  const w = buildWorldState(2); // 1-3 (brawl_captain)
  assert(w.objective === 'brawl_captain', '1-3 tiene objetivo brawl_captain');
  const captain = w.enemies.find((e) => e.brawlRole === 'captain');
  assert(captain != null, '1-3 contiene un Capitán Guardián');
  assert(captain!.hp === 5 && captain!.shieldFront === true, 'Capitán con 5 HP y escudo frontal');
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio con Capitán vivo');
  assert(objectiveHudLabel(w) === '⚔ CAPITÁN', 'Label HUD: ⚔ CAPITÁN');

  // Derrotar al capitán desbloquea la meta
  captain!.hp = 0;
  (captain as any).alive = false;
  captain!.state = 'knocked';
  w.brawlTargetsDefeated = 1;
  assert(isGoalLocked(w) === false, 'Derrotar al capitán desbloquea la meta');
  assert(objectiveHudLabel(w) === '⚔ ¡META LIBRE!', 'Label HUD: ⚔ ¡META LIBRE!');

  // Cruzar la meta
  calm(w);
  const fp = w.flagpole!;
  w.player.x = fp.x - 20;
  w.player.y = GROUND_ROW * TILE - w.player.height;
  run(w, 30, { right: true });
  assert(w.status !== 'playing', 'Meta cruzada con éxito tras derrotar al capitán');
}

// 7c.2. bounty_hunt en Mirage M-1
{
  const w = buildWorldState(0, undefined, 'mirage'); // M-1 (bounty_hunt)
  assert(w.objective === 'bounty_hunt', 'M-1 tiene objetivo bounty_hunt');
  const commanders = w.enemies.filter((e) => e.brawlRole === 'bounty_commander');
  assert(commanders.length === 3, `M-1 tiene 3 Comandantes Fugitivos (tiene ${commanders.length})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');
  assert(objectiveHudLabel(w) === '🎯 CAZA 0/3', 'Label HUD: 🎯 CAZA 0/3');

  // Derrotar 1 comandante
  commanders[0].hp = 0;
  (commanders[0] as any).alive = false;
  commanders[0].state = 'knocked';
  w.brawlTargetsDefeated = 1;
  assert(isGoalLocked(w) === true, 'Meta sigue bloqueada con 2 comandantes vivos');
  assert(objectiveHudLabel(w) === '🎯 CAZA 1/3', 'Label HUD: 🎯 CAZA 1/3');

  // Derrotar los otros 2
  for (let i = 1; i < 3; i++) {
    commanders[i].hp = 0;
    (commanders[i] as any).alive = false;
    commanders[i].state = 'knocked';
  }
  w.brawlTargetsDefeated = 3;
  assert(isGoalLocked(w) === false, 'Derrotar a los 3 comandantes desbloquea la meta');
  assert(objectiveHudLabel(w) === '🎯 CAZA 3/3', 'Label HUD: 🎯 CAZA 3/3');
}

// 7c.3. shadow_combo en Echo E-2
{
  const w = buildWorldState(1, undefined, 'echo'); // E-2 (shadow_combo)
  assert(w.objective === 'shadow_combo', 'E-2 tiene objetivo shadow_combo');
  const mirrorGuardians = w.enemies.filter((e) => e.shieldFront === true);
  assert(mirrorGuardians.length === 2, `E-2 tiene 2 Guardianes Espejo con escudo (tiene ${mirrorGuardians.length})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');
  assert(objectiveHudLabel(w) === '🪞 DUO ECO 0/2', 'Label HUD: 🪞 DUO ECO 0/2');

  for (const g of mirrorGuardians) {
    g.hp = 0;
    (g as any).alive = false;
    g.state = 'knocked';
  }
  w.brawlTargetsDefeated = 2;
  assert(isGoalLocked(w) === false, 'Derrotar a los 2 guardianes espejo desbloquea la meta');
  assert(objectiveHudLabel(w) === '🪞 DUO ECO 2/2', 'Label HUD: 🪞 DUO ECO 2/2');
}

// 7c.4. core_breaker en Flip G-1
{
  const w = buildWorldState(0, undefined, 'flip'); // G-1 (core_breaker)
  assert(w.objective === 'core_breaker', 'G-1 tiene objetivo core_breaker');
  const cores = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(cores.length === 3, `G-1 tiene 3 Núcleos Gravitacionales (tiene ${cores.length})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');
  assert(objectiveHudLabel(w) === '💥 NÚCLEOS 0/3', 'Label HUD: 💥 NÚCLEOS 0/3');

  for (const c of cores) {
    c.hp = 0;
    (c as any).alive = false;
    c.state = 'knocked';
  }
  w.brawlTargetsDefeated = 3;
  assert(isGoalLocked(w) === false, 'Derrotar los 3 núcleos desbloquea la meta');
  assert(objectiveHudLabel(w) === '💥 NÚCLEOS 3/3', 'Label HUD: 💥 NÚCLEOS 3/3');
}

// 7d. Físicas de Combate Brawl a 60 Hz (stepWorld)

// 7d.1. Combo 1-2-3 (Jab -> Uppercut -> Patada Meteoro proyectil)
{
  const w = flatWorld();
  const en1 = makeBrawlEnemy(101, w.player.x + 22, GROUND_ROW * TILE - 28, { hp: 5, maxHp: 5 });
  const en2 = makeBrawlEnemy(102, w.player.x + 90, GROUND_ROW * TILE - 28, { hp: 3, maxHp: 3 });
  w.enemies = [en1, en2];
  w.player.facing = 1;

  // Golpe 1 (Jab)
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.player.comboStep === 1, 'Golpe 1: comboStep === 1 (Jab)');
  assert((en1.stunTimer ?? 0) >= 44, 'Golpe 1: aturde al enemigo 45 frames');
  assert((w.player.furyMeter ?? 0) >= 15, 'Golpe 1: otorga furia >= 15');

  // Suelta botón de fuego por 1 frame para registrar edge-trigger
  stepWorld(w, NO_INPUT, VIEW_W);

  // Golpe 2 (Uppercut)
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.player.comboStep === 2, 'Golpe 2: comboStep === 2 (Uppercut)');
  assert(en1.vy < 0, `Golpe 2: lanza hacia arriba (vy=${en1.vy.toFixed(1)})`);
  assert((en1.stunTimer ?? 0) >= 58, 'Golpe 2: aturde al enemigo 60 frames');
  assert((w.player.furyMeter ?? 0) >= 35, 'Golpe 2: otorga furia >= 35');

  // Suelta botón de fuego por 1 frame
  stepWorld(w, NO_INPUT, VIEW_W);

  // Golpe 3 (Patada Meteoro)
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.player.comboStep === 3, 'Golpe 3: comboStep === 3 (Patada Meteoro)');
  assert(en1.launchedByPlayer === true, 'Golpe 3: convierte al enemigo en proyectil (launchedByPlayer === true)');
  assert(en1.vx > 8, `Golpe 3: velocidad de lanzamiento horizontal alta (vx=${en1.vx.toFixed(1)})`);

  // Avanzar frames mientras vuela como proyectil y golpea a en2
  const en2HpBefore = en2.hp ?? 3;
  for (let f = 0; f < 15; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
    if ((en2.hp ?? 3) < en2HpBefore) break;
  }
  assert((en2.hp ?? 3) <= en2HpBefore - 2, 'Enemigo proyectil impacta a en2 y le resta al menos 2 HP');
}

// 7d.2. Ground Pound Sísmico (▼ en aire)
{
  const w = flatWorld();
  w.player.y = (GROUND_ROW - 4) * TILE;
  w.player.onGround = false;
  w.player.vy = 2;

  // Ladrillo destructible justo debajo
  const colUnder = Math.floor((w.player.x + w.player.width / 2) / TILE);
  putBlock(w, colUnder, GROUND_ROW, 'brick');

  // Núcleo core_crystal y enemigo con escudo dentro de 4.5 tiles
  const core = makeBrawlEnemy(201, (colUnder + 2) * TILE, GROUND_ROW * TILE - 28, {
    brawlRole: 'core_crystal',
    hp: 3,
    maxHp: 3,
  });
  const shielded = makeBrawlEnemy(202, (colUnder - 2) * TILE, GROUND_ROW * TILE - 28, {
    shieldFront: true,
    hp: 3,
    maxHp: 3,
  });
  w.enemies = [core, shielded];

  // Iniciar Ground Pound en el aire con pulsación Down
  stepWorld(w, { down: true }, VIEW_W);
  assert(w.player.groundPounding === true, 'Pulsar Down en el aire activa groundPounding');

  // Avanzar hasta que aterrice e impacte
  for (let f = 0; f < 30 && w.player.groundPounding; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert(w.player.groundPounding === false, 'Aterrizaje finaliza groundPounding');
  assert((w.player.shockwaveTimer ?? 0) > 0, 'Aterrizaje genera shockwaveTimer > 0');
  assert(!w.blockGrid.has(gridKey(colUnder, GROUND_ROW)), 'Ground Pound destruye bloque brick debajo');
  assert((core.hp ?? 0) < 3, 'Onda sísmica daña core_crystal');
  assert(shielded.shieldFront === false, 'Onda sísmica rompe el escudo frontal');
  assert((shielded.stunTimer ?? 0) >= 90, 'Onda sísmica aturde enemigos dentro del radio sísmico');
}

// 7d.3. Parry (Y, 14 frames)
{
  const w = flatWorld();
  w.player.x = 10 * TILE;
  w.player.furyMeter = 0;

  // Bala Bill viajando hacia el jugador
  const bill = makeBrawlEnemy(301, w.player.x + 24, w.player.y, {
    type: 'bullet_bill',
    vx: -4,
    facing: -1,
  });
  w.enemies = [bill];

  // Pulsar Spin (Y) para activar Parry (14 frames)
  stepWorld(w, { spin: true }, VIEW_W);
  assert(!w.player.dead && w.player.powerState === 0, 'Parry evita todo daño a Plomero');
  assert(bill.launchedByPlayer === true, 'Bala Bill reflejada como proyectil (launchedByPlayer === true)');
  assert(bill.vx > 0, `Bala Bill invertida hacia adelante (vx=${bill.vx.toFixed(1)})`);
  assert(w.player.furyMeter === 35, `Parry exitoso suma +35 a furyMeter (tiene ${w.player.furyMeter})`);
}

// 7d.4. Modo Furia
{
  const w = flatWorld();
  w.player.facing = 1;
  w.player.furyMeter = 0;
  w.player.furyTimer = 0;

  addFury(w, 100);
  assert((w.player.furyTimer ?? 0) > 0, 'Al llegar furyMeter a 100 se activa furyTimer > 0 (Modo Furia)');

  // Pulsar X en Modo Furia proyecta Onda Cortante penetrante
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.wrench != null, 'Golpe en Modo Furia proyecta Onda Cortante');
  assert(w.wrench!.fury === true && w.wrench!.piercing === true, 'Onda de Furia es penetrante');
  assert((w.wrench!.dmg ?? 1) >= 3, `Onda de Furia tiene daño aumentado (${w.wrench!.dmg})`);
}

// 7d.5. Pinza Temporal (echo)
{
  const w = flatWorld();
  const mirrorGuardian = makeBrawlEnemy(401, w.player.x + 40, w.player.y, {
    shieldFront: true,
    hp: 3,
    maxHp: 3,
    facing: -1,
  });
  w.enemies = [mirrorGuardian];

  // Golpe frontal normal rebota si no es furia ni aturdido
  stepWorld(w, { fire: true }, VIEW_W);
  assert(mirrorGuardian.shieldFront === true, 'Golpe frontal normal rebota contra escudo');
  assert(mirrorGuardian.hp === 3, 'Escudo bloquea daño normal');

  // Activar pulso de ataque del Eco (Pinza Temporal)
  w.echoAttackPulse = 20;
  w.echoAttackX = mirrorGuardian.x;
  w.echoAttackY = mirrorGuardian.y;
  stepWorld(w, NO_INPUT, VIEW_W);

  assert(mirrorGuardian.shieldFront === false, 'Ataque del Eco rompe el escudo frontal (Pinza Temporal)');
  assert((mirrorGuardian.stunTimer ?? 0) >= 74, 'Ataque del Eco aturde al guardián 75 frames');
  assert(mirrorGuardian.hp === 1, 'Ataque del Eco inflige -2 HP');
}

// 7e. Contrarreloj: tiempo corto y relojes que suman
{
  const idx = [...Array(TOTAL_LEVELS).keys()].find((i) => getStageObjective(i, 'classic') === 'time_attack')!;
  const w = buildWorldState(idx);
  calm(w);
  assert(w.timeLeft === timeAttackBudget(w.totalCols), `Contrarreloj empieza con ${timeAttackBudget(w.totalCols)}`);
  assert(w.timeLeft >= TIME_ATTACK_START, 'Contrarreloj nunca da menos del mínimo');
  for (const part of PARTITION_ORDER) {
    for (let i = 0; i < partitionTotalLevels(part); i++) {
      if (getStageObjective(i, part) !== 'time_attack') continue;
      const lv = buildWorldState(i, undefined, part);
      const needed = (lv.totalCols * TILE) / 2.5 / 38;
      assert(needed <= lv.timeLeft, `${part} ${lv.worldLabel}: el tiempo (${lv.timeLeft}) no alcanza (${needed.toFixed(0)})`);
    }
  }
  const clocks = w.pickups!.filter((p) => p.kind === 'clock');
  assert(clocks.length === CLOCKS_PER_STAGE, `Contrarreloj tiene ${CLOCKS_PER_STAGE} relojes (tiene ${clocks.length})`);
  const before = w.timeLeft;
  w.player.x = clocks[0].x;
  w.player.y = clocks[0].y;
  run(w, 1);
  assert(w.timeLeft >= before + CLOCK_BONUS - 1, 'Tomar un reloj suma tiempo');
}

// 7f. Persecución: quedarse quieto es perder; correr es sobrevivir
{
  const idx = [...Array(TOTAL_LEVELS).keys()].find((i) => getStageObjective(i, 'classic') === 'chase')!;
  const still = buildWorldState(idx);
  calm(still);
  run(still, CHASE_DELAY - 5);
  assert(still.status === 'playing', 'La sombra espera antes de avanzar');
  run(still, 600);
  assert(still.status !== 'playing', 'Si te quedas quieto la sombra te alcanza');

  // Correr por suelo plano deja atrás a la sombra
  const w = buildWorldState(idx);
  calm(w);
  for (let c = 0; c < w.totalCols; c++) {
    for (let r = 0; r < GROUND_ROW; r++) {
      const b = w.blockGrid.get(gridKey(c, r));
      if (b) { w.blockGrid.delete(gridKey(c, r)); w.blocks.splice(w.blocks.indexOf(b), 1); }
    }
    if (!w.blockGrid.has(gridKey(c, GROUND_ROW))) {
      const nb = { id: 70000 + c, col: c, row: GROUND_ROW, x: c * TILE, y: GROUND_ROW * TILE, baseY: GROUND_ROW * TILE,
        width: TILE, height: TILE, type: 'ground_top' as const, content: null, coinsRemaining: 0, bounceY: 0, bounceVel: 0, spinTimer: 0 };
      w.blocks.push(nb);
      w.blockGrid.set(gridKey(c, GROUND_ROW), nb);
    }
  }
  w.pipes = [];
  w.springs = [];
  w.platforms = [];
  w.lavaCols.clear();
  run(w, 400, { right: true, run: true });
  assert(w.status === 'playing', 'Corriendo se escapa de la sombra');
  assert(w.chase!.x >= w.cameraX - 50, 'La sombra siempre asoma por el borde izquierdo');
}

// 7g. Sprint Interruptor [P] y Skill Bypass en etapas de combate
// 7g.1. Sprint [P]: en etapa brawl_captain con meta cerrada, activar [P] desbloquea la meta temporalmente
{
  const w = buildWorldState(2); // 1-3 (brawl_captain)
  calm(w);
  const captain = makeBrawlEnemy(999, w.flagpole!.x - 100, GROUND_ROW * TILE - 28, {
    brawlRole: 'captain',
    hp: 5,
    maxHp: 5,
  });
  w.enemies = [captain];
  assert(isGoalLocked(w) === true, 'Meta cerrada por capitán vivo');

  const psw = w.pickups!.find((p) => p.kind === 'p_switch');
  assert(psw != null, 'Etapa de combate contiene pickup p_switch');
  const goalCol = Math.floor(w.flagpole!.x / TILE);
  const pswCol = Math.floor(psw!.x / TILE);
  const colDistance = goalCol - pswCol;
  assert(colDistance >= 15 && colDistance <= 24, `p_switch ubicado en la recta final: ${colDistance} cols antes de meta (esperado ~15..24)`);

  // Activar p_switch
  w.player.x = psw!.x;
  w.player.y = psw!.y;
  w.player.vy = 0;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(psw!.collected === true, 'p_switch recogido');
  assert((w.pSwitchTimer ?? 0) > 0, 'w.pSwitchTimer > 0');
  assert(!isGoalLocked(w), 'Meta desbloqueada temporalmente mientras dura el timer de p_switch');
}

// 7g.2. Diana Rompe-Candado (Skill Bypass)
// a) Salto al tercio superior del asta
{
  const w = buildWorldState(2);
  calm(w);
  const captain = makeBrawlEnemy(999, w.flagpole!.x - 300, GROUND_ROW * TILE - 28, {
    brawlRole: 'captain',
    hp: 5,
    maxHp: 5,
  });
  w.enemies = [captain];
  assert(isGoalLocked(w) === true, 'Meta cerrada al inicio');
  const fp = w.flagpole!;
  w.player.x = fp.x - 8;
  w.player.y = fp.y + 8;
  w.player.vx = 0;
  w.player.vy = 0;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.goalSealBroken === true, 'Salto al tercio superior del asta rompe el candado');
  assert(!isGoalLocked(w), '!isGoalLocked(w) tras romper el candado con skill bypass');
}

// b) Lanzar llave inglesa a meta cerrada
{
  const w = buildWorldState(2);
  calm(w);
  const captain = makeBrawlEnemy(999, w.flagpole!.x - 300, GROUND_ROW * TILE - 28, {
    brawlRole: 'captain',
    hp: 5,
    maxHp: 5,
  });
  w.enemies = [captain];
  assert(isGoalLocked(w) === true, 'Meta cerrada al inicio');
  const fp = w.flagpole!;
  w.player.x = fp.x - 80;
  w.player.y = GROUND_ROW * TILE - w.player.height;
  w.player.facing = 1;
  w.player.powerState = 0;
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.wrench !== null, 'Llave inglesa lanzada hacia el asta');
  for (let f = 0; f < 30; f++) {
    if (w.goalSealBroken) break;
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert(w.goalSealBroken === true, 'La llave inglesa rompe el candado');
  assert(!isGoalLocked(w), '!isGoalLocked(w) tras impacto de la llave inglesa en la meta');
}

console.log(`   ✔ ${passed} comprobaciones de objetivos en verde.`);
