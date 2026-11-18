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
// 12d. Modo Flip: Templo Inverso (8 salas puzzle G-1..I-4)
// ============================================================================
console.log('   - 12d. Verificando Modo Flip (8 salas puzzle, gravedad Y, ON/OFF y gemas)...');

for (let lvl = 0; lvl < 8; lvl++) {
  const w = buildWorldState(lvl, undefined, 'flip');
  assert(w.partition === 'flip', `Flip ${lvl}: partición flip`);
  assert(w.worldRows === 26, `Flip ${lvl}: worldRows === 26`);
  assert(w.totalCols === 52, `Flip ${lvl}: totalCols === 52`);
  assert(w.gravityDir === 1, `Flip ${lvl}: gravedad inicial 1`);
  assert(w.onOffState === 'on', `Flip ${lvl}: onOffState inicial 'on'`);
  assert(w.objective === 'collect', `Flip ${lvl}: objetivo 'collect'`);
  assert(w.gemsNeeded != null && w.gemsNeeded >= 3, `Flip ${lvl}: requiere >= 3 gemas`);

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

  // 6. Desbloqueo de meta al recoger todas las gemas
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio (0 gemas recolectadas)');
  const gems = w.pickups!.filter((pk) => pk.kind === 'gem');
  assert(gems.length >= w.gemsNeeded!, 'Gemas suficientes en el nivel');

  for (const gem of gems) gem.collected = true;
  w.gemsCollected = w.gemsNeeded!;
  assert(isGoalLocked(w) === false, 'Meta desbloqueada al reunir todas las gemas');
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
}

// Simulación de las 3 oleadas y mutación de suelo en ★-1
{
  const w = buildWorldState(0, undefined, 'star_road');
  assert(w.arenaWave!.current === 1, 'Inicia oleada 1');
  const onOff0 = w.onOffState ?? 'on';

  // Meta bloqueada mientras la arena esté activa
  w.player.x = w.flagpole!.x;
  w.player.y = w.flagpole!.y + 50;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.status === 'playing', 'Meta bloqueada: no se puede tocar asta durante la arena');
  assert(w.player.x < w.flagpole!.x, 'Jugador repelido lejos de la meta');

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
  for (let lvl = 0; lvl < 8; lvl++) {
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

console.log(`\n✔ ALL ${passed} NON-LINEAR & SECRET PIPE VERIFICATIONS PASSED 100%!`);
