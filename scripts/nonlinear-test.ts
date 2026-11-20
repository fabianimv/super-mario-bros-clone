// ============================================================================
// Pruebas Integrales de Tuberías Secretas y Mundos No-Lineales (Proyecto ARGON)
// Fase 3 (Wave 3 Verifier) — Validación 60 Hz en Node:
//   12a. Tuberías Secretas (▼) en los 8 modos base (subroom + return)
//   12b. Warp Zone estilo SMB 1-2 y Desbloqueo del Mundo Secreto (Star Road)
//   12c. Modo Tower: La Torre Infinita (8 niveles verticales, wrap y magma)
//   12d. Modo Flip: Templo Inverso (8 salas puzzle, gravedad Y, ON/OFF y gemas)
//   12e. Modo Star Road: Senda Estelar (4 Coliseos por oleadas y 4 Corredores 3D)
//   12f. Solvabilidad universal de los 24 niveles nuevos y las 4 sub-salas
// ============================================================================

import * as THREE from 'three';
import {
  BIOMES,
  GROUND_ROW,
  LOGICAL_HEIGHT,
  TILE,
  getStageBiome,
  getWorldLabel,
  partitionTotalLevels,
} from '../src/engine/biomes';
import { isGoalLocked } from '../src/engine/objectives';
import {
  ALL_PARTITIONS,
  NONLINEAR_PARTITIONS,
  PARTITION_ORDER,
} from '../src/engine/partitions';
import { stepWorld } from '../src/engine/physics';
import { checkPipeEntry, stepPipeTransition } from '../src/engine/secrets';
import type {
  GameEvent,
  GamePartition,
  InputState,
  Pipe,
  WorldState,
} from '../src/engine/types';
import { buildWorldState, gridKey } from '../src/levels/levelBuilder';
import {
  buildCloudHeaven,
  buildCoinVault,
  buildStarSanctuary,
  buildWarpChamber,
  enterPipeSubroom,
  exitPipeSubroom,
} from '../src/levels/subroomBuilder';
import { World3DScene } from '../src/renderer3d/scene3d';
import { DEFAULT_PROGRESS } from '../src/storage/saveStorage';

const VIEW_W = 970;
const SCREEN_W = 844;
const SCREEN_H = 390;

const NO_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  run: false,
  fire: false,
  spin: false,
};

let passed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`   ✖ ${msg}`);
    process.exit(1);
  }
  passed++;
}

function finiteScene(scene: THREE.Scene): boolean {
  let ok = true;
  const m = new THREE.Matrix4();
  scene.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) {
      for (let i = 0; i < obj.count; i++) {
        obj.getMatrixAt(i, m);
        if (m.elements.some((v) => !Number.isFinite(v))) ok = false;
      }
    }
    if (
      !Number.isFinite(obj.position.x) ||
      !Number.isFinite(obj.position.y) ||
      !Number.isFinite(obj.position.z)
    ) {
      ok = false;
    }
  });
  return ok;
}

console.log('12. Validando Tuberías Secretas y Mundos No-Lineales (Proyecto ARGON)...');

// ============================================================================
// 12a. Tuberías Secretas (▼) en los 8 Modos Base
// ============================================================================
console.log('   - 12a. Verificando Tuberías Secretas (▼) en las 8 campañas base...');

let subroomPipesFound = 0;
let warpZonePipesFound = 0;

for (const part of PARTITION_ORDER) {
  // Comprobar que en cada modo base existen tuberías con warpKind
  let foundSubroomInPart = false;
  let foundWarpInPart = false;

  // Revisar todas las etapas de cada partición
  for (let lvl = 0; lvl < partitionTotalLevels(part); lvl++) {
    const w = buildWorldState(lvl, undefined, part);
    for (const p of w.pipes) {
      if (p.warpKind === 'subroom') {
        foundSubroomInPart = true;
        subroomPipesFound++;
        assert(p.warpAccent === 'gold', `${part} etapa ${lvl}: subroom accent dorado`);
        assert(p.warpLabel === '▼ BONUS', `${part} etapa ${lvl}: etiqueta ▼ BONUS`);
        assert(p.subroomTheme != null, `${part} etapa ${lvl}: tiene tema de sub-sala`);
        assert(p.exitPipeCol != null && p.exitPipeCol > 0, `${part} etapa ${lvl}: exitPipeCol definido`);
      } else if (p.warpKind === 'warp_zone') {
        foundWarpInPart = true;
        warpZonePipesFound++;
        assert(p.warpAccent === 'violet', `${part} etapa ${lvl}: warp_zone accent morado`);
        assert(p.warpLabel === '▼ WARP', `${part} etapa ${lvl}: etiqueta ▼ WARP`);
        assert(p.subroomTheme === 'warp_chamber', `${part} etapa ${lvl}: tema warp_chamber`);
      }
    }
  }
  assert(foundSubroomInPart, `${part}: debe tener al menos una tubería de subroom`);
  assert(foundWarpInPart, `${part}: debe tener al menos una tubería de warp_zone (etapa X-2)`);
}

assert(subroomPipesFound >= 8, `Al menos 8 tuberías subroom en modos base (halladas ${subroomPipesFound})`);
assert(warpZonePipesFound >= 8, `Al menos 8 tuberías warp_zone en modos base (halladas ${warpZonePipesFound})`);

// Simulación completa a 60 Hz de entrada a sub-sala, recolección y retorno
{
  const w = buildWorldState(0, undefined, 'classic');
  const bonusPipe = w.pipes.find((p) => p.warpKind === 'subroom');
  assert(bonusPipe != null, 'Nivel 1-1 clásico debe tener tubería subroom');

  const p = w.player;
  const initialCoins = w.coins;
  const initialScore = w.score;
  const initialLives = w.lives;
  const exitCol = bonusPipe!.exitPipeCol!;

  // 1. Posicionar al jugador encima de la tubería
  p.x = bonusPipe!.x + (bonusPipe!.width - p.width) / 2;
  p.y = bonusPipe!.y - p.height;
  p.onGround = true;
  p.vy = 0;
  p.vx = 0;

  // 2. Presionar ▼ para iniciar transición
  const events1 = stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  assert(w.status === 'pipe_enter', 'Entrada iniciada: status === pipe_enter');
  assert(w.statusTimer === 30, 'Timer de descenso en 30 frames');
  assert(w.activeWarpPipe === bonusPipe, 'activeWarpPipe asignada');
  assert(events1.some((e) => e.type === 'sfx' && e.id === 'pipe_warp'), 'Emite sfx pipe_warp al entrar');

  // 3. Ejecutar los 30 frames de descenso
  for (let f = 0; f < 30; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }

  // Al terminar pipe_enter, debe haber cargado la sub-sala y estar en pipe_exit (24 frames)
  assert(w.subArea === 'subroom', 'Ahora está en subArea === subroom');
  assert(w.returnSnapshot != null, 'returnSnapshot guardado con la geometría original');
  assert(w.totalCols === 28, 'Sub-sala de 28 columnas');
  assert(w.worldRows === 14, 'Sub-sala de 14 filas');
  assert(w.status === 'pipe_exit', 'Transición de salida del tubo dentro de la sub-sala');
  assert(w.statusTimer === 24, 'Timer de salida inicializado en 24');

  // 4. Completar los 24 frames de pipe_exit dentro de la sub-sala
  for (let f = 0; f < 24; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert(w.status === 'playing', 'Sub-sala activa en modo playing');
  assert(w.player.onGround === true, 'Jugador apoyado sobre el suelo o tubo de la sub-sala');

  // 5. Ganar monedas, puntaje y powerup en la sub-sala
  w.coins += 10;
  w.score += 1500;
  w.player.powerState = 2; // Flor de Fuego

  // 6. Buscar la tubería de retorno esmeralda en col 23
  const returnPipe = w.pipes.find((pipe) => pipe.warpKind === 'return');
  assert(returnPipe != null, 'La sub-sala debe tener un tubo de retorno');
  assert(returnPipe!.warpAccent === 'emerald', 'Tubo de retorno con acento esmeralda');

  // Posicionarse sobre el tubo de retorno
  p.x = returnPipe!.x + (returnPipe!.width - p.width) / 2;
  p.y = returnPipe!.y - p.height;
  p.onGround = true;
  p.vy = 0;

  // Presionar ▼ sobre el tubo de retorno
  stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  assert(w.status === 'pipe_enter', 'Descenso en tubo de retorno iniciado');

  // Ejecutar los 30 frames de descenso en el tubo de retorno
  for (let f = 0; f < 30; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }

  // Al terminar, debe restaurar la etapa principal y emerger en pipe_exit
  assert(w.subArea === null, 'Regreso completado: subArea === null');
  assert(w.returnSnapshot === null, 'Snapshot limpiado');
  assert(w.status === 'pipe_exit', 'Emergiendo en la etapa principal: pipe_exit');
  assert(w.totalCols > 100, 'Dimensiones originales de etapa restauradas');

  // Completar los 24 frames de emergencia
  for (let f = 0; f < 24; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert(w.status === 'playing', 'Nivel principal restaurado en playing');

  // Verificar conservación de ganancias y avance de posición
  assert(w.coins === initialCoins + 10, 'Monedas ganadas en sub-sala conservadas');
  assert(w.score === initialScore + 1500, 'Puntaje ganado en sub-sala conservado');
  assert(w.lives === initialLives, 'Vidas intactas');
  assert(w.player.powerState === 2, 'PowerState flor de fuego conservado');
  assert(
    Math.abs(Math.floor(w.player.x / TILE) - exitCol) <= 3,
    `Jugador reemergió cerca de exitPipeCol (${Math.floor(w.player.x / TILE)} vs ${exitCol})`
  );
  assert(bonusPipe!.visited === true, 'Tubería bonus marcada como visitada (no re-entrable)');
}

// ============================================================================
// 12b. Warp Zone y Desbloqueo del Mundo Secreto (Star Road)
// ============================================================================
console.log('   - 12b. Verificando Warp Zone estilo SMB 1-2 y Desbloqueo de Senda Estelar...');

{
  const w = buildWorldState(1, undefined, 'classic'); // Etapa 1-2
  const warpPipe = w.pipes.find((p) => p.warpKind === 'warp_zone');
  assert(warpPipe != null, '1-2 debe tener tubería warp_zone');
  assert(warpPipe!.subroomTheme === 'warp_chamber', 'Tema warp_chamber');

  // Posicionarse sobre el tubo warp_zone y descender
  w.player.x = warpPipe!.x + (warpPipe!.width - w.player.width) / 2;
  w.player.y = warpPipe!.y - w.player.height;
  w.player.onGround = true;

  stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);

  // Cámara Warp Zone cargada
  assert(w.subArea === 'warp_zone', 'En subArea === warp_zone');
  for (let f = 0; f < 24; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'playing', 'Cámara warp en playing');

  // Verificar la existencia de los 4 tubos en la Warp Zone:
  // Tubo 1: salto MUNDO W+1
  const pipeW1 = w.pipes.find((p) => p.warpKind === 'warp_zone' && p.warpAccent === 'gold');
  assert(pipeW1 != null, 'Tubo 1 de salto al siguiente mundo existe');
  assert(pipeW1!.warpTargetLevel != null, 'Tubo 1 tiene nivel destino');

  // Tubo 2: salto MUNDO W+2
  const pipeW2 = w.pipes.find((p) => p.warpKind === 'warp_zone' && p.warpAccent === 'violet');
  assert(pipeW2 != null, 'Tubo 2 de salto a 2 mundos existe');
  assert(pipeW2!.warpTargetLevel != null, 'Tubo 2 tiene nivel destino');

  // Tubo 3: tubo carmesí secret_world -> star_road
  const secretPipe = w.pipes.find((p) => p.warpKind === 'secret_world');
  assert(secretPipe != null, 'Tubo 3 carmesí de Mundo Secreto existe');
  assert(secretPipe!.warpAccent === 'crimson', 'Acento carmesí en tubo secreto');
  assert(secretPipe!.warpTargetPartition === 'star_road', 'Destino star_road');

  // Tubo 4: tubo de retorno
  const returnPipe = w.pipes.find((p) => p.warpKind === 'return');
  assert(returnPipe != null, 'Tubo 4 de retorno existe');

  // Entrar al tubo carmesí de Mundo Secreto
  w.player.x = secretPipe!.x + (secretPipe!.width - w.player.width) / 2;
  w.player.y = secretPipe!.y - w.player.height;
  w.player.onGround = true;

  const events2 = stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  assert(w.status === 'pipe_enter', 'Descendiendo al tubo de Mundo Secreto');

  let unlockEvents: GameEvent[] = [];
  for (let f = 0; f < 30; f++) {
    const ev = stepWorld(w, NO_INPUT, VIEW_W);
    unlockEvents = unlockEvents.concat(ev);
  }

  // Comprobar que emitió secret_unlocked y cambió a partition === 'star_road'
  assert(
    unlockEvents.some((e) => e.type === 'secret_unlocked' && e.partition === 'star_road'),
    'Evento secret_unlocked emitido con partition star_road'
  );
  assert(w.partition === 'star_road', 'Mundo cambiado a star_road');
  assert(w.levelIndex === 0, 'Inicia en el nivel 0 de star_road');
}

// ============================================================================
// 12c. Modo Tower: La Torre Infinita (8 niveles T-1..T-4, A-1..A-4)
// ============================================================================
console.log('   - 12c. Verificando Modo Tower (8 niveles verticales, wrap y magma)...');

for (let lvl = 0; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'tower');
  assert(w.partition === 'tower', `Tower ${lvl}: partición tower`);
  assert(w.totalCols === 28, `Tower ${lvl}: totalCols === 28`);
  assert(w.worldRows != null && w.worldRows >= 72, `Tower ${lvl}: worldRows >= 72 (${w.worldRows})`);

  // Spawn en la base
  assert(
    w.player.y >= (w.worldRows! - 4) * TILE,
    `Tower ${lvl}: jugador aparece en la base (fila ${Math.floor(w.player.y / TILE)} de ${w.worldRows})`
  );
  assert(w.player.onGround === true, `Tower ${lvl}: spawn sobre suelo sólido`);

  // 3 dojo_master guardianes de piso
  const dojoMasters = w.enemies.filter((e) => e.brawlRole === 'dojo_master');
  assert(dojoMasters.length === 3, `Tower ${lvl}: debe tener 3 guardianes dojo_master (tiene ${dojoMasters.length})`);
  for (const dm of dojoMasters) {
    assert(dm.hp === 3 && dm.maxHp === 3, `Tower ${lvl}: dojo_master con 3 HP`);
    assert((dm.hp ?? 0) > 0 && dm.state !== 'squashed' && dm.state !== 'knocked', `Tower ${lvl}: dojo_master vivo`);
  }

  // Meta en la cima
  const isFortress = lvl % 4 === 3;
  if (isFortress) {
    assert(w.boss != null, `Tower ${lvl} (Guardián de la Cumbre): jefe en la cima`);
    assert(w.boss!.y < 16 * TILE, `Tower ${lvl}: jefe ubicado en pisos superiores`);
  } else {
    assert(w.flagpole != null, `Tower ${lvl}: asta de meta presente`);
    assert(w.flagpole!.y < 12 * TILE, `Tower ${lvl}: asta de meta en la cumbre`);
  }

  // Wrap Horizontal en impares (T-1, T-3, A-1, A-3 => lvl 0, 2, 4, 6)
  const isOddStage = lvl % 2 === 0;
  assert(
    w.wrapHorizontal === isOddStage,
    `Tower ${lvl}: wrapHorizontal debe ser ${isOddStage} (es ${w.wrapHorizontal})`
  );

  // Magma ascendente
  assert(w.risingHazardY != null, `Tower ${lvl}: risingHazardY definido`);
  assert(w.risingHazardSpeed != null && w.risingHazardSpeed > 0, `Tower ${lvl}: risingHazardSpeed > 0`);
}

// Validación física de wrap horizontal y magma en T-1
{
  const w = buildWorldState(0, undefined, 'tower');
  assert(w.wrapHorizontal === true, 'T-1 tiene wrap horizontal');

  // 1. Wrap de izquierda a derecha
  w.player.x = TILE * 0.5 - w.player.width;
  w.player.vx = -3;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(
    w.player.x >= (w.totalCols - 3) * TILE,
    `Jugador envuelve de izquierda a derecha (${w.player.x.toFixed(1)} px)`
  );

  // 2. Wrap de derecha a izquierda
  w.player.x = (w.totalCols - 2) * TILE + 2;
  w.player.vx = 3;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(
    w.player.x <= TILE * 2,
    `Jugador envuelve de derecha a izquierda (${w.player.x.toFixed(1)} px)`
  );

  // 3. Ascenso del magma (risingHazardY disminuye)
  const hazardY0 = w.risingHazardY!;
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(
    w.risingHazardY! < hazardY0,
    `Magma asciende: inicial ${hazardY0.toFixed(1)} -> final ${w.risingHazardY!.toFixed(1)}`
  );

  // 3b. Derrotar a un dojo_master empuja el magma hacia abajo (+6 * TILE) y da super impulso
  const dm = w.enemies.find((e) => e.brawlRole === 'dojo_master')!;
  assert(dm != null, 'T-1 tiene dojo_master');
  dm.active = true;
  w.player.x = dm.x - 20;
  w.player.y = dm.y;
  w.player.facing = 1;
  w.player.onGround = true;
  w.risingHazardY = w.player.y + 4 * TILE;
  const hazardBefore = w.risingHazardY;
  dm.hp = 1;
  stepWorld(w, { ...NO_INPUT, fire: true }, VIEW_W); // Combo melee jab derrota a dojo_master
  assert(
    w.risingHazardY >= hazardBefore + 5 * TILE,
    `Derrotar a un dojo_master empuja el magma hacia abajo (antes ${hazardBefore}, ahora ${w.risingHazardY})`
  );
  assert(w.player.vy < -8, `Derrotar a un dojo_master otorga super impulso vertical (vy=${w.player.vy})`);

  // 4. Seguimiento vertical de cameraY
  const camY0 = w.cameraY ?? 0;
  // Subir al jugador a la mitad de la torre
  w.player.y = (w.worldRows! / 2) * TILE;
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(
    w.cameraY != null && w.cameraY < camY0,
    `cameraY sigue al jugador al ascender (${camY0.toFixed(1)} -> ${w.cameraY!.toFixed(1)})`
  );
}

// ============================================================================
// 12d. Modo Flip: Templo Inverso (8 salas puzzle G-1..I-4, core_breaker)
// ============================================================================
console.log('   - 12d. Verificando Modo Flip (8 salas puzzle, gravedad Y, ON/OFF y núcleos)...');

for (let lvl = 0; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'flip');
  assert(w.partition === 'flip', `Flip ${lvl}: partición flip`);
  assert(w.worldRows === 26, `Flip ${lvl}: worldRows === 26`);
  assert(w.totalCols === 52, `Flip ${lvl}: totalCols === 52`);
  assert(w.gravityDir === 1, `Flip ${lvl}: gravedad inicial 1`);
  assert(w.onOffState === 'on', `Flip ${lvl}: onOffState inicial 'on'`);
  assert(w.objective === 'core_breaker', `Flip ${lvl}: objetivo 'core_breaker'`);
  assert(w.gemsNeeded === 0, `Flip ${lvl}: gemsNeeded === 0`);
  assert(w.gemsCollected === 0 || w.gemsCollected === undefined, `Flip ${lvl}: 0 gemas recolectadas`);
  assert(!(w.pickups ?? []).some((p) => p.kind === 'gem'), `Flip ${lvl}: cero pickups de tipo gem`);

  const cores = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(cores.length === 3, `Flip ${lvl}: exactamente 3 núcleos gravitacionales core_crystal`);
  for (const c of cores) {
    assert(c.hp === 3 && c.maxHp === 3, `Flip ${lvl}: core_crystal con 3 HP`);
    assert(c.active === true, `Flip ${lvl}: core_crystal activo`);
  }

  // Nexo Central: spawn alrededor de col 25, row 22
  assert(
    Math.abs(Math.floor(w.player.x / TILE) - 25) <= 2,
    `Flip ${lvl}: spawn horizontal en nexo central col 25`
  );
  assert(
    Math.abs(Math.floor(w.player.y / TILE) - 22) <= 2,
    `Flip ${lvl}: spawn vertical en nexo central row 22`
  );

  // Red de tubos hermanos con pairPipeIndex
  const pairedPipes = w.pipes.filter((p) => p.pairPipeIndex != null);
  assert(pairedPipes.length >= 4, `Flip ${lvl}: al menos 4 tubos conectados en parejas`);
  for (const pipe of pairedPipes) {
    const sibling = w.pipes[pipe.pairPipeIndex!];
    assert(sibling != null, `Flip ${lvl}: tubo hermano existe`);
    assert(
      w.pipes.indexOf(pipe) === sibling.pairPipeIndex,
      `Flip ${lvl}: conexión simétrica entre tubos (${w.pipes.indexOf(pipe)} <-> ${pipe.pairPipeIndex})`
    );
  }
}

// Pruebas de físicas de Flip: inversión de gravedad con botón Y, techo, salto y ON/OFF
{
  const w = buildWorldState(0, undefined, 'flip');
  assert(w.gravityDir === 1, 'Gravedad normal inicial');

  // 1. Invertir gravedad pulsando spin (botón Y)
  const evFlip = stepWorld(w, { ...NO_INPUT, spin: true }, VIEW_W);
  assert(w.gravityDir === -1, 'Gravedad invertida: gravityDir === -1');
  assert(evFlip.some((e) => e.type === 'sfx' && e.id === 'gravity_flip'), 'Emite sfx gravity_flip');

  // Dejar de pulsar spin
  stepWorld(w, NO_INPUT, VIEW_W);

  // 2. Caminar sobre el techo y saltar hacia abajo (vy > 0)
  // Apoyar los pies del jugador contra la parte inferior del techo en col 15, row 1 (y = 2 * TILE)
  w.player.x = 15 * TILE;
  w.player.y = 2 * TILE;
  w.player.vy = 0;
  w.player.onGround = true;

  // Saltar con botón jump
  stepWorld(w, { ...NO_INPUT, jump: true }, VIEW_W);
  assert(
    w.player.vy > 0,
    `En gravedad invertida, saltar lanza hacia abajo: vy === ${w.player.vy.toFixed(2)} > 0`
  );

  // Volver a gravedad normal
  w.gravityDir = 1;
  w.player.y = 22 * TILE;
  w.player.onGround = true;
  w.player.vy = 0;

  // 3. Conmutar bloque ON/OFF golpeándolo con la cabeza
  const sw = w.blocks.find((b) => b.type === 'on_off_switch');
  assert(sw != null, 'Bloque on_off_switch encontrado');
  assert(w.onOffState === 'on', 'Estado inicial ON');

  // Posicionar al jugador directamente debajo del interruptor saltando hacia arriba
  w.player.x = sw!.x + 4;
  w.player.y = sw!.baseY + TILE;
  w.player.vy = -8;
  w.player.onGround = false;

  const evSwitch = stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.onOffState === 'off', 'onOffState conmutado a OFF tras golpe');
  assert(evSwitch.some((e) => e.type === 'sfx' && e.id === 'switch_toggle'), 'Emite sfx switch_toggle');

  // 4. Conmutar bloque ON/OFF a distancia con la llave inglesa (X)
  w.player.powerState = 1; // Super Plomero lanza la llave inglesa con fire (botón X)
  w.player.x = sw!.x - 60;
  w.player.y = sw!.baseY + 6;
  w.player.facing = 1;

  // Disparar llave inglesa con fire
  stepWorld(w, { ...NO_INPUT, fire: true }, VIEW_W);
  assert(w.wrench != null, 'Llave inglesa lanzada');

  // Avanzar frames hasta que la llave impacte el interruptor
  let toggledByWrench = false;
  for (let f = 0; f < 30; f++) {
    const ev = stepWorld(w, NO_INPUT, VIEW_W);
    if (ev.some((e) => e.type === 'sfx' && e.id === 'switch_toggle')) {
      toggledByWrench = true;
      break;
    }
  }
  assert(toggledByWrench, 'Llave inglesa impactó el interruptor ON/OFF');
  assert(w.onOffState === 'on', 'onOffState conmutado de vuelta a ON por la llave');

  // 5. Teletransporte interno entre tubos hermanos
  const pipe0 = w.pipes[0];
  const targetPipeIndex = pipe0.pairPipeIndex!;
  const pipe1 = w.pipes[targetPipeIndex];

  w.player.x = pipe0.x + (pipe0.width - w.player.width) / 2;
  w.player.y = pipe0.y - w.player.height;
  w.player.onGround = true;
  w.gravityDir = 1;

  stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  assert(w.status === 'pipe_enter', 'Descenso en tubo de teletransporte interno');

  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'pipe_exit', 'Emergiendo en el tubo hermano: pipe_exit');
  assert(
    Math.abs(w.player.x - (pipe1.x + (pipe1.width - w.player.width) / 2)) <= 4,
    'Jugador posicionado en el tubo hermano de destino'
  );

  for (let f = 0; f < 24; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'playing', 'Teletransporte completado en playing');

  // 6. Desbloqueo de meta al destruir los 3 núcleos core_crystal
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio (3 núcleos core_crystal vivos)');
  const cores = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(cores.length === 3, '3 núcleos core_crystal encontrados en el nivel');

  for (const core of cores) {
    core.hp = 0;
    (core as any).alive = false;
    core.state = 'knocked';
  }
  w.brawlTargetsDefeated = 3;
  assert(isGoalLocked(w) === false, 'Meta desbloqueada al destruir los 3 núcleos core_crystal');
}

// ============================================================================
// 12e. Modo Star Road: Senda Estelar (4 Coliseos + 4 Corredores 3D)
// ============================================================================
console.log('   - 12e. Verificando Modo Star Road (4 Coliseos + 4 Corredores 3D)...');

// 1. Región 1: ★-1..★-4 — Coliseo Abisal por Oleadas
for (let lvl = 0; lvl < 4; lvl++) {
  const w = buildWorldState(lvl, undefined, 'star_road');
  assert(w.partition === 'star_road', `Star Road ${lvl}: partición star_road`);
  assert(w.totalCols === 26, `Coliseo ${lvl}: totalCols === 26`);
  assert(w.worldRows === 14, `Coliseo ${lvl}: worldRows === 14`);
  assert(w.arenaWave != null, `Coliseo ${lvl}: arenaWave definido`);
  assert(w.arenaWave!.total === 3, `Coliseo ${lvl}: 3 oleadas totales`);
  assert(w.arenaWave!.current === 1, `Coliseo ${lvl}: inicia en oleada 1`);
  assert(w.flagpole != null, `Coliseo ${lvl}: asta de meta en col 13`);

  // Rival: Plomero Sombra (shadow_rival)
  const shadow = w.enemies.find((e) => e.brawlRole === 'shadow_rival');
  assert(shadow != null, `Coliseo ${lvl}: Plomero Sombra presente`);
  assert((shadow!.hp ?? 0) >= 6, `Coliseo ${lvl}: Plomero Sombra con HP >= 6 (tiene ${shadow!.hp})`);
  assert(shadow!.active === true, `Coliseo ${lvl}: Plomero Sombra activo`);

  // Zona de spawn 100% segura (ningún enemigo dentro de 6 * TILE)
  const spawnDist = Math.abs(shadow!.x - w.player.x);
  assert(spawnDist >= 6 * TILE, `Coliseo ${lvl}: Plomero Sombra fuera de zona de spawn (${(spawnDist / TILE).toFixed(1)} tiles)`);
  const spawnDanger = w.enemies.filter((e) => e.active && Math.abs(e.x - w.player.x) < 6 * TILE);
  assert(spawnDanger.length === 0, `Coliseo ${lvl}: zona de spawn 100% libre de enemigos`);
}

// Simulación de las 3 oleadas y mutación de suelo en ★-1
{
  const w = buildWorldState(0, undefined, 'star_road');
  assert(w.arenaWave!.current === 1, 'Inicia oleada 1');
  const onOff0 = w.onOffState ?? 'on';

  // Meta bloqueada mientras la arena esté activa (sin repeler al jugador ni activar secuencia)
  w.player.x = w.flagpole!.x;
  w.player.y = w.flagpole!.y + 50;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'playing', 'Meta bloqueada: no se puede tocar asta durante la arena');
  assert(
    Math.abs(w.player.x - w.flagpole!.x) <= 2,
    'Jugador cruza libremente por col 13 sin ser repelido por pared invisible'
  );

  // Limpiar oleada 1
  for (const en of w.enemies) en.state = 'knocked';
  const evW2 = stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.arenaWave!.current === 2, 'Transiciona a oleada 2');
  assert(w.onOffState !== onOff0, 'Mutación automática de onOffState entre oleadas');
  assert(evW2.some((e) => e.type === 'sfx' && e.id === 'arena_wave'), 'Emite sfx arena_wave');

  // Limpiar oleada 2
  for (const en of w.enemies) en.state = 'knocked';
  const evW3 = stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.arenaWave!.current === 3, 'Transiciona a oleada 3');
  assert(w.onOffState === onOff0, 'Suelo vuelve a mutar para oleada 3');
  assert(evW3.some((e) => e.type === 'sfx' && e.id === 'arena_wave'), 'Emite sfx arena_wave en oleada 3');

  // Limpiar oleada 3
  for (const en of w.enemies) en.state = 'knocked';
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.arenaWave!.remaining === 0, 'Oleada 3 completada: remaining === 0');

  // Tocar el asta ahora desbloqueada
  w.player.vx = 0;
  w.player.vy = 0;
  w.player.x = w.flagpole!.x;
  w.player.y = w.flagpole!.y + 50;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'flagpole', 'Asta alcanzada tras vencer las 3 oleadas');
}

// 2. Región 2: Ω-1..Ω-4 — Corredor Cósmico 3D y sincronización Three.js
const sc = new World3DScene();

for (let lvl = 4; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'star_road');
  assert(w.cameraMode === 'corridor3d', `Corredor 3D ${lvl}: cameraMode === corridor3d`);
  assert(w.totalCols >= 110, `Corredor 3D ${lvl}: totalCols >= 110`);
  assert(w.worldRows === 14, `Corredor 3D ${lvl}: worldRows === 14`);
  if (lvl === 7) {
    assert(w.boss != null, `Corredor 3D ${lvl}: jefe cósmico al final del corredor`);
  } else {
    assert(w.flagpole != null, `Corredor 3D ${lvl}: meta al final del corredor`);
  }

  // Avanzar algunos frames
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);

  // Sincronizar con la escena 3D Three.js
  sc.sync(w, SCREEN_W, SCREEN_H);

  // Verificar que la cámara se posiciona detrás del hombro
  assert(finiteScene(sc.scene), `Corredor 3D ${lvl}: escena 3D finita sin NaN`);
  assert(
    Number.isFinite(sc.camera.position.x) &&
    Number.isFinite(sc.camera.position.y) &&
    Number.isFinite(sc.camera.position.z),
    `Corredor 3D ${lvl}: posición de cámara finita`
  );
  assert(sc.camera.position.z > 4.0, `Corredor 3D ${lvl}: cámara elevada en Z detrás de hombro`);
}

// ============================================================================
// 12f. Solvabilidad Universal de los 24 Niveles Nuevos y las 4 Sub-Salas
// ============================================================================
console.log('   - 12f. Verificando Solvabilidad Universal (24 niveles + 4 sub-salas)...');

// 1. Validar los 24 niveles no-lineales
for (const part of NONLINEAR_PARTITIONS) {
  for (let lvl = 0; lvl < partitionTotalLevels(part); lvl++) {
    const w = buildWorldState(lvl, undefined, part);

    // Cantidad mínima de bloques
    assert(w.blocks.length >= 20, `${part} ${w.worldLabel}: suficientes bloques (${w.blocks.length})`);

    // Spawn sobre suelo sólido
    const spawnCol = Math.floor(w.player.x / TILE);
    const spawnRow = Math.floor((w.player.y + w.player.height) / TILE);
    assert(
      w.player.onGround === true || w.blockGrid.has(gridKey(spawnCol, spawnRow)),
      `${part} ${w.worldLabel}: spawn sobre suelo sólido`
    );

    // Meta alcanzable
    if (part === 'tower' && lvl % 4 === 3) {
      assert(w.boss != null, `${part} ${w.worldLabel}: jefe guardián presente`);
    } else if (part === 'star_road' && lvl === 7) {
      assert(w.boss != null, `${part} ${w.worldLabel}: jefe cósmico presente`);
    } else {
      assert(w.flagpole != null, `${part} ${w.worldLabel}: meta presente`);
    }

    // Sin huecos horizontales imposibles en corredores
    if (part === 'star_road' && lvl >= 4) {
      let consecutiveGap = 0;
      let maxGap = 0;
      const supportRows = [6, 7, 8, 9, 10, 11, 12];
      for (let c = 0; c < w.totalCols - 8; c++) {
        const hasGround = w.blockGrid.has(gridKey(c, GROUND_ROW));
        const hasStep = supportRows.some((r) => w.blockGrid.has(gridKey(c, r)));
        const hasPlatform = w.platforms.some((pl) => Math.abs(pl.startX - c * TILE) <= 6 * TILE);
        if (!hasGround && !hasStep && !hasPlatform) {
          consecutiveGap++;
          maxGap = Math.max(maxGap, consecutiveGap);
        } else {
          consecutiveGap = 0;
        }
      }
      assert(maxGap <= 4, `${part} ${w.worldLabel}: maxGap sin paso/plataforma <= 4 (es ${maxGap})`);
    }
  }
}

// 2. Validar las 4 sub-salas
const dummyWorld = (): WorldState => {
  const w = buildWorldState(0, undefined, 'classic');
  w.totalCols = 28;
  w.worldRows = 14;
  w.blocks = [];
  w.blockGrid = new Map();
  w.pipes = [];
  w.coinsList = [];
  w.springs = [];
  w.lowGravZones = [];
  return w;
};

// Sub-sala 1: Bóveda de Monedas
{
  const w = dummyWorld();
  buildCoinVault(w);
  assert(w.biomeId === 'cavern', 'CoinVault: bioma cavern');
  assert(w.coinsList.length >= 24, `CoinVault: al menos 24 monedas (tiene ${w.coinsList.length})`);
  assert(
    w.blocks.some((b) => b.content === 'multi_coin'),
    'CoinVault: tiene bloque multi_coin'
  );
  assert(
    w.pipes.some((p) => p.warpKind === 'return'),
    'CoinVault: tiene tubo de retorno'
  );
}

// Sub-sala 2: Santuario Estelar
{
  const w = dummyWorld();
  buildStarSanctuary(w);
  assert(w.biomeId === 'starfield', 'StarSanctuary: bioma starfield');
  assert(w.lowGravZones != null && w.lowGravZones.length > 0, 'StarSanctuary: baja gravedad');
  assert(
    w.blocks.some((b) => b.content === 'star'),
    'StarSanctuary: tiene estrella de invulnerabilidad'
  );
  assert(
    w.blocks.some((b) => b.content === 'one_up'),
    'StarSanctuary: tiene bloque 1-UP'
  );
  assert(
    w.pipes.some((p) => p.warpKind === 'return'),
    'StarSanctuary: tiene tubo de retorno'
  );
}

// Sub-sala 3: Cielo de Nubes
{
  const w = dummyWorld();
  buildCloudHeaven(w);
  assert(w.biomeId === 'cloudland', 'CloudHeaven: bioma cloudland');
  assert(
    w.springs.some((s) => s.kind === 'mushroom'),
    'CloudHeaven: tiene hongos trampolín'
  );
  assert(w.coinsList.length >= 20, `CloudHeaven: al menos 20 monedas (tiene ${w.coinsList.length})`);
  assert(
    w.pipes.some((p) => p.warpKind === 'return'),
    'CloudHeaven: tiene tubo de retorno'
  );
}

// Sub-sala 4: Cámara Warp Zone
{
  const w = dummyWorld();
  buildWarpChamber(w);
  assert(w.biomeId === 'cavern', 'WarpChamber: bioma cavern');
  assert(w.pipes.length === 5, `WarpChamber: 5 tubos (entrada + 3 saltos + retorno) (hay ${w.pipes.length})`);
  assert(
    w.pipes.some((p) => p.warpKind === 'secret_world'),
    'WarpChamber: tiene tubo carmesí a Mundo Secreto'
  );
  assert(
    w.pipes.some((p) => p.warpKind === 'return'),
    'WarpChamber: tiene tubo de retorno'
  );
}

// ============================================================================
// 12g. Paquete 3 Argon — Verificaciones Anti-Regresión 60 Hz y Acertijos SMW
// ============================================================================
console.log('   - 12g. Verificando Anti-Regresión 60 Hz y Acertijos de Jefes SMW...');

// 1. Flip Torre C (todas G-1..I-4): caminata real desde spawn hacia la derecha cruzando col 28.31 con 0 gemas hasta > 35*TILE
for (let lvl = 0; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'flip');
  assert(w.gemsCollected === 0 || w.gemsCollected === undefined, `Flip ${w.worldLabel}: 0 gemas iniciales`);
  for (let f = 0; f < 300 && w.player.x <= 35 * TILE; f++) {
    stepWorld(w, { ...NO_INPUT, right: true, run: true }, VIEW_W);
  }
  assert(
    w.player.x > 35 * TILE,
    `Flip ${w.worldLabel}: Plomero cruza col 28.31 hacia Ala Derecha / Torre C sin bloqueo de meta (x=${w.player.x.toFixed(1)})`
  );

  // Suelo firme bajo jefe en G-4 e I-4 (lvl 3 y 7)
  if (lvl === 3 || lvl === 7) {
    assert(w.boss != null, `Flip ${w.worldLabel}: Jefe presente en etapa 4`);
    const bossCol = Math.floor(w.boss!.x / TILE);
    const bossFootRow = Math.floor((w.boss!.y + w.boss!.height) / TILE);
    const solidUnderBoss =
      w.blockGrid.has(gridKey(bossCol, bossFootRow)) ||
      w.blockGrid.has(gridKey(bossCol + 1, bossFootRow));
    assert(solidUnderBoss, `Flip ${w.worldLabel}: Suelo firme bajo el jefe (fila ${bossFootRow})`);
  }
}

// 2. Tower Ascenso Real (T-1..A-4)
// 2a. Plataformas con rangeX <= 6*TILE y velocidad suave en tower y star_road
for (const part of ['tower', 'star_road'] as const) {
  for (let lvl = 0; lvl < 8; lvl++) {
    const w = buildWorldState(lvl, undefined, part);
    for (const pl of w.platforms) {
      assert(
        pl.rangeX <= 6 * TILE,
        `${part} ${w.worldLabel}: plataforma móvil con rangeX <= 6 tiles (es ${pl.rangeX} px)`
      );
      assert(
        Math.abs(pl.rangeX * pl.speed) <= 8,
        `${part} ${w.worldLabel}: plataforma móvil con velocidad <= 8 px/frame (es ${Math.abs(pl.rangeX * pl.speed).toFixed(2)})`
      );
    }
  }
}

// 2b. Ninguna tubería tapada y checkpoints con >= 2 tiles libres arriba en tower
for (let lvl = 0; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'tower');
  for (const pipe of w.pipes) {
    const topRow = Math.floor(pipe.y / TILE) - 1;
    const colStart = Math.floor(pipe.x / TILE);
    const colEnd = Math.floor((pipe.x + pipe.width - 1) / TILE);
    for (let c = colStart; c <= colEnd; c++) {
      assert(
        !w.blockGrid.has(gridKey(c, topRow)),
        `Tower ${w.worldLabel}: boca superior de tubería en col ${c}, row ${topRow} sin bloques tapándola`
      );
    }
  }
  if (w.checkpoint) {
    const cpCol = Math.floor(w.checkpoint.x / TILE);
    const cpRow = Math.floor(w.checkpoint.y / TILE);
    for (let r = cpRow - 2; r < cpRow; r++) {
      assert(
        !w.blockGrid.has(gridKey(cpCol, r)),
        `Tower ${w.worldLabel}: checkpoint con >= 2 tiles libres arriba en col ${cpCol}, row ${r}`
      );
    }
  }
}

// 2c. Simulación real de salto en T-1: Piso 1 -> Piso 2 -> Piso 3
{
  const w = buildWorldState(0, undefined, 'tower');
  w.enemies = []; // Aislar simulación geométrica y plataformas libres de enemigos
  w.player.x = 7 * TILE;
  w.player.y = 67 * TILE - w.player.height;
  w.player.onGround = true;
  w.player.vy = 0;

  // Salto de Piso 1 a Piso 2
  for (let f = 0; f < 35; f++) {
    stepWorld(w, { ...NO_INPUT, right: true, jump: f < 10 }, VIEW_W);
  }
  const footRow2 = (w.player.y + w.player.height) / TILE;
  assert(
    Math.abs(footRow2 - 64) <= 1.0 && w.player.onGround,
    `T-1: Plomero asciende y aterriza en Piso 2 (row 64, footRow=${footRow2.toFixed(2)})`
  );

  // Salto de Piso 2 a Piso 3
  for (let f = 0; f < 35; f++) {
    stepWorld(w, { ...NO_INPUT, left: true, jump: f < 12 }, VIEW_W);
  }
  const footRow3 = (w.player.y + w.player.height) / TILE;
  assert(
    Math.abs(footRow3 - 61) <= 1.0 && w.player.onGround,
    `T-1: Plomero sube a Piso 3 sin cabezazos que lo boten (footRow=${footRow3.toFixed(2)})`
  );

  // Rebote en trampolín SIN mantener A subiendo >= 4.5 tiles
  const sp = w.springs[0];
  assert(sp != null, 'T-1 tiene trampolín en Piso 3');
  w.player.x = sp.x;
  w.player.y = sp.y - w.player.height - 4;
  w.player.vy = 4;
  w.player.onGround = false;
  const startY = sp.y;
  let minY = sp.y;
  for (let f = 0; f < 45; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
    if (w.player.y < minY) minY = w.player.y;
  }
  const tilesClimbed = (startY - minY) / TILE;
  assert(
    tilesClimbed >= 4.5,
    `T-1: Rebote en resorte sin presionar A asciende >= 4.5 tiles (${tilesClimbed.toFixed(2)} tiles)`
  );

  // Salida limpia de sub-sala al tubo de checkpointRow sin daño de magma
  const bonusPipe = w.pipes.find((p) => p.warpKind === 'subroom');
  assert(bonusPipe != null, 'T-1 tiene tubería ▼ BONUS');
  w.player.x = bonusPipe!.x + (bonusPipe!.width - w.player.width) / 2;
  w.player.y = bonusPipe!.y - w.player.height;
  w.player.onGround = true;
  stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.subArea === 'subroom', 'T-1: Plomero ingresa a la bóveda de monedas');
  for (let f = 0; f < 24; f++) stepWorld(w, NO_INPUT, VIEW_W);

  const retPipe = w.pipes.find((p) => p.warpKind === 'return');
  assert(retPipe != null, 'T-1: Tubo de retorno existe en sub-sala');
  w.player.x = retPipe!.x + (retPipe!.width - w.player.width) / 2;
  w.player.y = retPipe!.y - w.player.height;
  w.player.onGround = true;
  stepWorld(w, { ...NO_INPUT, down: true }, VIEW_W);
  for (let f = 0; f < 30; f++) stepWorld(w, NO_INPUT, VIEW_W);
  for (let f = 0; f < 24; f++) stepWorld(w, NO_INPUT, VIEW_W);

  assert(w.subArea === null && w.status === 'playing', 'T-1: Retorna a la torre en modo playing');
  assert(!w.player.dead, 'T-1: Plomero con vida tras retornar');
  assert(
    w.risingHazardY != null && w.risingHazardY > w.player.y + 4 * TILE,
    'T-1: Magma lejos de la salida del checkpoint sin daño al jugador'
  );
}

// 3. Star Road
// 3a. 60 frames quietos en ★-1..★-4 sin morir (cero muertes en spawn Frame 1)
for (let lvl = 0; lvl < 4; lvl++) {
  const w = buildWorldState(lvl, undefined, 'star_road');
  for (let f = 0; f < 60; f++) stepWorld(w, NO_INPUT, VIEW_W);
  assert(
    !w.player.dead && w.status === 'playing',
    `Star Road ★-${lvl + 1}: 60 frames sin muerte en spawn`
  );
}

// 3b. Cruce libre por col 13 en Oleada 1
{
  const w0 = buildWorldState(0, undefined, 'star_road');
  w0.player.x = 9 * TILE;
  w0.player.y = 12 * TILE - w0.player.height;
  w0.player.onGround = true;
  for (let f = 0; f < 40; f++) {
    stepWorld(w0, { ...NO_INPUT, right: true, jump: f < 16, run: true }, VIEW_W);
  }
  assert(
    w0.player.x > 13.5 * TILE && !w0.player.dead,
    'Star Road ★-1: Cruce libre por col 13 sin bloqueo de candado en meta'
  );
}

// 3c. Hacha de ★-4 fuera de tuberías y bloques
{
  const wBoss = buildWorldState(3, undefined, 'star_road');
  assert(wBoss.boss != null, 'Star Road ★-4 tiene jefe');
  const axeCol = Math.floor(wBoss.boss!.axeX / TILE);
  const axeRow = Math.floor(wBoss.boss!.axeY / TILE);
  assert(!wBoss.blockGrid.has(gridKey(axeCol, axeRow)), 'Star Road ★-4: Hacha dorada fuera de bloques');
  const axeInPipe = wBoss.pipes.some(
    (p) =>
      wBoss.boss!.axeX < p.x + p.width &&
      wBoss.boss!.axeX + TILE > p.x &&
      wBoss.boss!.axeY < p.y + p.height &&
      wBoss.boss!.axeY + TILE > p.y
  );
  assert(!axeInPipe, 'Star Road ★-4: Hacha dorada fuera de tuberías sólidas');
}

// 4. star_sanctuary: golpe real con la cabeza debajo de los 3 [?] ((12,4), (14,4), (13,3))
{
  const wSanct = dummyWorld();
  buildStarSanctuary(wSanct);
  const targets = [
    { col: 12, row: 4, item: 'star' },
    { col: 14, row: 4, item: 'one_up' },
    { col: 13, row: 3, item: 'powerup' },
  ];
  for (const tgt of targets) {
    const blk = wSanct.blockGrid.get(gridKey(tgt.col, tgt.row));
    assert(blk != null && blk.content === tgt.item, `Star Sanctuary: bloque [?] en (${tgt.col},${tgt.row}) con ${tgt.item}`);
    wSanct.player.x = tgt.col * TILE + 4;
    wSanct.player.y = tgt.row * TILE + 34;
    wSanct.player.vy = -6;
    for (let f = 0; f < 10; f++) stepWorld(wSanct, { ...NO_INPUT, jump: true }, VIEW_W);
    assert(blk!.type === 'empty', `Star Sanctuary: bloque (${tgt.col},${tgt.row}) golpeado con la cabeza`);
  }
}

// 5. Acertijos de Jefes SMW (smw Y-4..K-4 y classic)
// 5a. Trampa ON/OFF de magma
{
  const wTrap = buildWorldState(3, undefined, 'classic');
  wTrap.cameraX = wTrap.boss!.x - 200;
  wTrap.player.x = wTrap.boss!.x - 100;
  wTrap.boss!.puzzleKind = 'on_off_trap';
  wTrap.onOffState = 'off';
  const preTrapHp = wTrap.boss!.hp;
  wTrap.boss!.x = (wTrap.boss!.bridgeCols[2] ?? 12) * TILE;
  wTrap.boss!.y = 10.4 * TILE;
  stepWorld(wTrap, NO_INPUT, VIEW_W);
  assert(wTrap.boss!.hp < preTrapHp, 'Jefe sufre daño por trampa de magma (-3 HP)');
  const trapPhase: string = wTrap.boss?.phase ?? '';
  assert(trapPhase === 'stunned', 'Jefe aturdido tras caer en trampa de magma');
  const trapOnOff: string = wTrap.onOffState ?? '';
  assert(trapOnOff === 'on', 'onOffState se restablece a ON para reponer el puente');
}

// 5b. Rebote seguro sobre jefe blindado desde arriba
{
  const wBounce = buildWorldState(3, undefined, 'classic');
  wBounce.cameraX = wBounce.boss!.x - 200;
  wBounce.boss!.puzzleKind = 'on_off_trap';
  wBounce.boss!.phase = 'idle';
  wBounce.player.x = wBounce.boss!.x + 10;
  wBounce.player.y = wBounce.boss!.y - wBounce.player.height + 4;
  wBounce.player.vy = 5;
  const livesPre = wBounce.lives;
  stepWorld(wBounce, NO_INPUT, VIEW_W);
  assert(wBounce.player.vy < 0, 'Rebote seguro hacia arriba sobre jefe blindado');
  assert(
    wBounce.lives === livesPre && wBounce.status === 'playing',
    'Plomero no recibe daño al rebotar sobre jefe blindado'
  );
}

// 5c. Ruptura de shell_spin con caparazón deslizante y llave inglesa
{
  // Con caparazón deslizante
  const wShell = buildWorldState(3, undefined, 'classic');
  wShell.cameraX = wShell.boss!.x - 200;
  wShell.player.x = wShell.boss!.x - 100;
  wShell.boss!.phase = 'shell_spin';
  wShell.boss!.phaseTimer = 100;
  const preShellHp = wShell.boss!.hp;
  wShell.enemies = [
    {
      id: 999,
      type: 'koopa_green',
      state: 'shell_slide',
      x: wShell.boss!.x - 20,
      y: wShell.boss!.y + 10,
      baseY: wShell.boss!.y + 10,
      vx: 5.5,
      vy: 0,
      width: 26,
      height: 26,
      facing: 1,
      onGround: true,
      hp: 1,
      stateTimer: 0,
      kickGraceTimer: 0,
      shellCombo: 0,
      animTimer: 0,
      active: true,
    },
  ];
  stepWorld(wShell, NO_INPUT, VIEW_W);
  assert(wShell.boss!.hp < preShellHp, 'Caparazón deslizante daña al jefe en shell_spin (-2 HP)');
  const shellBossPhase: string = wShell.boss?.phase ?? '';
  assert(shellBossPhase === 'stunned', 'Caparazón deslizante aturde al jefe rompiendo su giro');

  // Con llave inglesa
  const wWrench = buildWorldState(3, undefined, 'classic');
  wWrench.cameraX = wWrench.boss!.x - 200;
  wWrench.player.x = wWrench.boss!.x - 100;
  wWrench.boss!.phase = 'shell_spin';
  wWrench.boss!.phaseTimer = 100;
  const preWrenchHp = wWrench.boss!.hp;
  wWrench.wrench = {
    x: wWrench.boss!.x - 10,
    y: wWrench.boss!.y + 10,
    vx: 6,
    vy: 0,
    width: 24,
    height: 24,
    dir: 1,
    phase: 'out',
    travelled: 0,
    timer: 0,
    spin: 0,
    carryId: null,
    hitBoss: false,
  };
  stepWorld(wWrench, NO_INPUT, VIEW_W);
  assert(wWrench.boss!.hp < preWrenchHp, 'Llave inglesa daña al jefe en shell_spin (-2 HP)');
  const wrenchBossPhase: string = wWrench.boss?.phase ?? '';
  assert(wrenchBossPhase === 'stunned', 'Llave inglesa aturde al jefe rompiendo su giro');
}

// 5d. pillar_stomp aturdido por switch
{
  const wPillar = buildWorldState(3, undefined, 'classic');
  wPillar.cameraX = wPillar.boss!.x - 200;
  wPillar.boss!.puzzleKind = 'pillar_stomp';
  wPillar.boss!.phase = 'idle';
  const swPillar = wPillar.blocks.find((b) => b.type === 'on_off_switch')!;
  wPillar.player.x = swPillar.x + 8;
  wPillar.player.y = swPillar.baseY + 34;
  wPillar.player.vy = -6;
  stepWorld(wPillar, { ...NO_INPUT, jump: true }, VIEW_W);
  const pillarBossPhase: string = wPillar.boss?.phase ?? '';
  assert(pillarBossPhase === 'stunned', 'Pillar Stomp aturdido por interruptor');
  assert(wPillar.boss!.hp < wPillar.boss!.maxHp, 'Pillar Stomp sufre daño al activar switch');
}

// 5e. Desbloqueo de star_road por defecto (secretUnlocked === true)
assert(
  DEFAULT_PROGRESS.secretUnlocked === true,
  'star_road desbloqueado por defecto en DEFAULT_PROGRESS (secretUnlocked === true)'
);

console.log(`\n✔ ALL ${passed} NON-LINEAR & SECRET PIPE VERIFICATIONS PASSED 100%!`);
