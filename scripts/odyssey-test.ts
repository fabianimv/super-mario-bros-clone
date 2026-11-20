// ============================================================================
// SUITE DE VERIFICACIÓN: ODISEA ABIERTA (partition: 'odyssey')
// Validación 60 Hz (stepWorld) de los 3 Mundos Abiertos y sus Mecánicas Únicas
// O-1 CIUDADELA DEL GANCHO: Gancho Magnético, Péndulo, Catapulta, 3 Balizas
// O-2 CAÑÓN DEL TIEMPO: Traje Crono-Jetpack, Tiempo Bala (30%), Rebote Bullet Bill
// O-3 CRÁTER DEL TITÁN: Armadura Mecha, Cañón de Plasma, Escudo 18f, Titán Rex 3 Fases
// Cámara Vertical 2D: Seguimiento suave bidimensional
// ============================================================================

import { TILE, LOGICAL_HEIGHT } from '../src/engine/biomes';
import {
  isGoalLocked,
  objectiveHudLabel,
  countBrawlTargets,
} from '../src/engine/objectives';
import { stepWorld } from '../src/engine/physics';
import { launchPlasmaBeam, triggerParry } from '../src/engine/abilities';
import type { InputState, WorldState, Enemy } from '../src/engine/types';
import { buildWorldState } from '../src/levels/levelBuilder';

const VIEW_W = 970;
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
    console.error(`   ✖ ERROR: ${msg}`);
    process.exit(1);
  }
  passed++;
}

console.log('🌍 Iniciando Batería de Pruebas: 🌍 ODISEA ABIERTA (60 Hz)...');

// ============================================================================
// 1. O-1: CIUDADELA DEL GANCHO (citadel_grapple)
// ============================================================================
console.log('   - 1. Validando O-1 CIUDADELA DEL GANCHO (citadel_grapple)...');
{
  const w = buildWorldState(0, undefined, 'odyssey');

  // a) Parámetros base y cero gemas
  assert(w.partition === 'odyssey', 'Partición es odyssey');
  assert(w.odysseyMode === 'citadel_grapple', 'Modo es citadel_grapple');
  assert(w.worldRows === 30, `worldRows === 30 (es ${w.worldRows})`);
  assert(w.totalCols === 80, `totalCols === 80 (es ${w.totalCols})`);
  assert(w.gemsNeeded === 0, `0 gemas necesarias (es ${w.gemsNeeded})`);
  assert(w.gemsCollected === 0 || w.gemsCollected === undefined, '0 gemas recolectadas');
  const gemsInPickups = (w.pickups ?? []).filter((p) => p.kind === 'gem');
  assert(gemsInPickups.length === 0, 'No existen gemas en pickups');

  // b) Anclas magnéticas >= 12
  const anchors = w.grappleAnchors ?? [];
  assert(anchors.length >= 12, `Al menos 12 anclas magnéticas (tiene ${anchors.length})`);

  // c) Spawn seguro (> 6 * TILE sin enemigos)
  const spawnX = w.player.x;
  const spawnY = w.player.y;
  for (const en of w.enemies) {
    const dist = Math.hypot(en.x - spawnX, en.y - spawnY);
    assert(
      dist > 6 * TILE,
      `Spawn seguro: enemigo #${en.id} (${en.type}) a distancia ${dist.toFixed(1)} px > 6*TILE (${6 * TILE} px)`
    );
  }

  // d) 3 Balizas (core_crystal) bloqueando la meta
  const balizas = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(balizas.length === 3, `3 Balizas presentes (tiene ${balizas.length})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');
  assert(objectiveHudLabel(w) === '🪝 BALIZAS 0/3', `Label HUD inicial esperado '🪝 BALIZAS 0/3' (es '${objectiveHudLabel(w)}')`);

  // e) Enganche de Gancho (Y cerca de un ancla -> grappleAnchorId != null)
  // Colocamos al jugador cerca del ancla #11 (x: 34 * TILE + 16, y: 21 * TILE + 16)
  const anchor11 = anchors.find((a) => a.id === 11)!;
  assert(anchor11 != null, 'Ancla #11 encontrada');
  w.player.x = anchor11.x - 20;
  w.player.y = anchor11.y + 80;
  w.player.vx = 0;
  w.player.vy = 0;
  w.player.onGround = false;

  stepWorld(w, { spin: true }, VIEW_W);
  assert(w.player.grappleAnchorId != null, `Gancho enganchado con botón Y (anchorId: ${w.player.grappleAnchorId})`);
  assert(w.player.grappleAnchorId === anchor11.id, 'Enganchado al ancla correcta');

  // f) Balanceo pendular por varios frames
  const initialAngle = w.player.grappleAngle ?? 0;
  for (let f = 0; f < 20; f++) {
    stepWorld(w, { right: true }, VIEW_W);
    assert(w.player.grappleAnchorId != null, 'Mantiene el balanceo con el gancho');
  }
  assert(w.player.grappleAngle !== initialAngle, 'El ángulo pendular cambió durante el balanceo');
  assert(Math.abs(w.player.grappleAngVel ?? 0) > 0, 'Posee velocidad angular de balanceo');

  // g) Catapulta (A / jump -> grappleAnchorId == null, vy < -8, furyMeter > 0)
  const furyBefore = w.player.furyMeter ?? 0;
  stepWorld(w, { jump: true }, VIEW_W);
  assert(w.player.grappleAnchorId == null, 'Gancho liberado tras presionar Salto (Catapulta)');
  assert(w.player.vy < -8, `Velocidad vertical de catapulta vy < -8 (es ${w.player.vy.toFixed(2)})`);
  assert((w.player.furyMeter ?? 0) > furyBefore, `Furia otorgada por catapulta (antes: ${furyBefore}, ahora: ${w.player.furyMeter})`);

  // h) Al destruir las 3 Balizas, !isGoalLocked(w) y label '🪝 ¡CUMBRE LIBRE!'
  for (const b of balizas) {
    b.hp = 0;
    (b as any).alive = false;
    b.state = 'knocked';
  }
  assert(!isGoalLocked(w), 'Meta desbloqueada al destruir las 3 Balizas');
  assert(objectiveHudLabel(w) === '🪝 ¡CUMBRE LIBRE!', `Label HUD final esperado '🪝 ¡CUMBRE LIBRE!' (es '${objectiveHudLabel(w)}')`);

  // i) Cámara Vertical 2D: Al mover al jugador hacia arriba, cameraY se desplaza suavemente hacia arriba
  const initialCamY = w.cameraY ?? 0;
  // Colocamos al jugador en la parte superior del mapa
  w.player.y = 4 * TILE;
  w.player.vy = 0;
  for (let f = 0; f < 30; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert((w.cameraY ?? 0) < initialCamY, `cameraY se desplaza suavemente hacia arriba (inicial: ${initialCamY.toFixed(1)}, nuevo: ${(w.cameraY ?? 0).toFixed(1)})`);
}

// ============================================================================
// 2. O-2: CAÑÓN DEL TIEMPO (chrono_canyon)
// ============================================================================
console.log('   - 2. Validando O-2 CAÑÓN DEL TIEMPO (chrono_canyon)...');
{
  const w = buildWorldState(1, undefined, 'odyssey');

  // a) Parámetros base y cero gemas
  assert(w.partition === 'odyssey', 'Partición es odyssey');
  assert(w.odysseyMode === 'chrono_canyon', 'Modo es chrono_canyon');
  assert(w.gemsNeeded === 0, `0 gemas necesarias (es ${w.gemsNeeded})`);
  assert(w.gemsCollected === 0 || w.gemsCollected === undefined, '0 gemas recolectadas');
  const gemsInPickups = (w.pickups ?? []).filter((p) => p.kind === 'gem');
  assert(gemsInPickups.length === 0, 'No existen gemas en pickups');
  assert(w.player.jetpackFuel === 100, `jetpackFuel inicial === 100 (es ${w.player.jetpackFuel})`);

  // b) 3 Reactores Crono bloqueando meta
  const reactores = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(reactores.length === 3, `3 Reactores Crono presentes (tiene ${reactores.length})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');
  assert(objectiveHudLabel(w) === '⏳ REACTORES 0/3', `Label HUD inicial esperado '⏳ REACTORES 0/3' (es '${objectiveHudLabel(w)}')`);

  // c) Jetpack: salto y mantener A en el aire activa jetpackActive, gasta fuel, aterrizar recarga
  // Salto inicial para despegarse del suelo
  stepWorld(w, { jump: true }, VIEW_W);
  assert(!w.player.onGround, 'Jugador en el aire tras saltar');

  // Continuar manteniendo A hasta que el jetpack se active
  let activatedJetpack = false;
  for (let f = 0; f < 25; f++) {
    stepWorld(w, { jump: true }, VIEW_W);
    if (w.player.jetpackActive) {
      activatedJetpack = true;
      break;
    }
  }
  assert(activatedJetpack, 'Jetpack activado en el aire con A sostenido');
  assert((w.player.jetpackFuel ?? 100) < 100, `jetpackFuel se consumió (es ${w.player.jetpackFuel})`);

  // Aterrizaje recarga combustible
  const fuelBeforeLanding = w.player.jetpackFuel!;
  // Aterrizamos sobre suelo sólido
  w.player.y = 22 * TILE - w.player.height;
  w.player.vy = 0;
  w.player.onGround = true;
  for (let f = 0; f < 10; f++) {
    stepWorld(w, NO_INPUT, VIEW_W);
  }
  assert((w.player.jetpackFuel ?? 0) > fuelBeforeLanding, `Aterrizar recarga combustible (antes: ${fuelBeforeLanding.toFixed(1)}, ahora: ${(w.player.jetpackFuel ?? 0).toFixed(1)})`);

  // d) Tiempo Bala (Y): activa chronoTimer > 0 y timeScale === 0.30
  w.player.chronoTimer = 0;
  w.player.chronoCooldown = 0;
  stepWorld(w, { spin: true }, VIEW_W);
  assert((w.player.chronoTimer ?? 0) > 0, `chronoTimer activado > 0 (es ${w.player.chronoTimer})`);
  assert(w.timeScale === 0.30, `timeScale === 0.30 (es ${w.timeScale})`);

  // e) Verificar que un enemigo se mueve ~30% más lento en Tiempo Bala
  // Creamos un enemigo de prueba en mundo libre
  const testEnemy1: Enemy = {
    id: 991,
    type: 'galoomba',
    state: 'walk',
    x: 400,
    y: 200,
    baseY: 200,
    vx: 2.0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    active: true,
    animTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    stateTimer: 0,
  };
  const testEnemy2: Enemy = {
    id: 992,
    type: 'galoomba',
    state: 'walk',
    x: 400,
    y: 200,
    baseY: 200,
    vx: 2.0,
    vy: 0,
    width: 28,
    height: 28,
    facing: 1,
    onGround: true,
    active: true,
    animTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    stateTimer: 0,
  };

  // Simulación de 10 frames con timeScale 1.0 vs 0.30
  const simWorld1 = buildWorldState(1, undefined, 'odyssey');
  simWorld1.timeScale = 1.0;
  simWorld1.enemies = [testEnemy1];
  for (let f = 0; f < 10; f++) stepWorld(simWorld1, NO_INPUT, VIEW_W);
  const deltaNormal = testEnemy1.x - 400;

  const simWorld2 = buildWorldState(1, undefined, 'odyssey');
  simWorld2.player.chronoTimer = 100;
  simWorld2.timeScale = 0.30;
  simWorld2.enemies = [testEnemy2];
  for (let f = 0; f < 10; f++) stepWorld(simWorld2, NO_INPUT, VIEW_W);
  const deltaSlow = testEnemy2.x - 400;

  const ratio = deltaSlow / deltaNormal;
  assert(
    Math.abs(ratio - 0.30) < 0.05,
    `Enemigo se mueve ~30% más lento en Tiempo Bala (ratio: ${ratio.toFixed(3)})`
  );

  // f) Saltar sobre una bullet_bill durante Tiempo Bala rebota a Plomero hacia arriba (vy < -8) y recarga combustible
  w.timeScale = 0.30;
  w.player.chronoTimer = 180;
  w.player.parryTimer = 0;
  w.player.jetpackFuel = 40;
  const bill: Enemy = {
    id: 995,
    type: 'bullet_bill',
    state: 'walk',
    x: 300,
    y: 300,
    baseY: 300,
    vx: -2.5,
    vy: 0,
    width: 28,
    height: 24,
    facing: -1,
    onGround: false,
    active: true,
    animTimer: 0,
    kickGraceTimer: 0,
    shellCombo: 0,
    stateTimer: 0,
  };
  w.enemies.push(bill);
  w.player.x = bill.x;
  w.player.y = bill.y - w.player.height + 2;
  w.player.vy = 4.0; // cayendo sobre la bala
  w.player.onGround = false;

  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.player.vy < -8, `Rebote vertical en Bullet Bill con Tiempo Bala vy < -8 (es ${w.player.vy.toFixed(2)})`);
  assert(w.player.jetpackFuel >= 80, `Recarga de combustible al rebotar (jetpackFuel: ${w.player.jetpackFuel})`);

  // g) Al destruir los 3 Reactores, !isGoalLocked(w) y label '⏳ ¡PORTAL LIBRE!'
  for (const r of reactores) {
    r.hp = 0;
    (r as any).alive = false;
    r.state = 'knocked';
  }
  assert(!isGoalLocked(w), 'Meta desbloqueada al destruir los 3 Reactores Crono');
  assert(objectiveHudLabel(w) === '⏳ ¡PORTAL LIBRE!', `Label HUD final esperado '⏳ ¡PORTAL LIBRE!' (es '${objectiveHudLabel(w)}')`);
}

// ============================================================================
// 3. O-3: CRÁTER DEL TITÁN (titan_crater)
// ============================================================================
console.log('   - 3. Validando O-3 CRÁTER DEL TITÁN (titan_crater)...');
{
  const w = buildWorldState(2, undefined, 'odyssey');

  // a) Parámetros base, armadura mecha y cero gemas
  assert(w.partition === 'odyssey', 'Partición es odyssey');
  assert(w.odysseyMode === 'titan_crater', 'Modo es titan_crater');
  assert(w.player.mechaSuit === true, 'player.mechaSuit === true');
  assert(w.gemsNeeded === 0, `0 gemas necesarias (es ${w.gemsNeeded})`);
  assert(w.gemsCollected === 0 || w.gemsCollected === undefined, '0 gemas recolectadas');
  const gemsInPickups = (w.pickups ?? []).filter((p) => p.kind === 'gem');
  assert(gemsInPickups.length === 0, 'No existen gemas en pickups');

  // b) 2 Generadores + Jefe Colosal (titan_boss, 18 HP, shieldFront === true, titanPhase === 1)
  const generators = w.enemies.filter((e) => e.brawlRole === 'core_crystal');
  assert(generators.length === 2, `2 Generadores presentes (tiene ${generators.length})`);
  const titan = w.enemies.find((e) => e.brawlRole === 'titan_boss');
  assert(titan != null, 'Jefe Colosal titan_boss presente');
  assert(titan!.hp === 18, `Titán con 18 HP (es ${titan!.hp})`);
  assert(titan!.shieldFront === true, 'Titán con shieldFront === true');
  assert(w.titanPhase === 1, `titanPhase inicial === 1 (es ${w.titanPhase})`);
  assert(isGoalLocked(w) === true, 'Meta bloqueada al inicio');

  // c) Cañón de Plasma (X): dispara proyectil de plasma (wrench.fury === true, piercing === true)
  stepWorld(w, { fire: true }, VIEW_W);
  assert(w.wrench != null, 'Cañón de Plasma disparado con botón X');
  assert(w.wrench!.fury === true, 'wrench.fury === true');
  assert(w.wrench!.piercing === true, 'wrench.piercing === true');

  // d) Escudo Reflector (Y): concede parryTimer === 18
  stepWorld(w, { spin: true }, VIEW_W);
  assert(w.player.parryTimer === 18, `parryTimer concedido es 18 (es ${w.player.parryTimer})`);

  // e) Reflejar proyectil bossFires hacia el Titán quitándole -4 HP
  const initialTitanHp = titan!.hp ?? 18;
  w.player.parryTimer = 14;
  w.player.x = 200;
  w.player.y = 200;
  w.bossFires = [
    {
      x: w.player.x + 10,
      y: w.player.y + 4,
      targetY: w.player.y + 4,
      vx: -4,
      width: 24,
      height: 20,
      animTimer: 0,
    },
  ];

  // Paso de colisión / parry del proyectil
  stepWorld(w, NO_INPUT, VIEW_W);
  const reflectedFire = w.bossFires[0];
  assert(reflectedFire != null, 'Proyectil aún existe');
  assert(reflectedFire.vx > 0, `Proyectil reflejado con vx invertida positiva (es ${reflectedFire.vx})`);
  assert((reflectedFire as any).reflected === true, 'Proyectil marcado como reflected');
  assert((reflectedFire as any).mechaReflected === true, 'Proyectil marcado como mechaReflected');

  // Conducir proyectil reflejado contra el Titán
  reflectedFire.x = titan!.x + titan!.width / 2;
  reflectedFire.y = titan!.y + titan!.height / 2;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(titan!.hp === initialTitanHp - 4, `Reflejar proyectil quita -4 HP al Titán (antes: ${initialTitanHp}, ahora: ${titan!.hp})`);

  // f) Transiciones de fase del Titán
  // Al caer los 2 Generadores cae su shieldFront
  for (const g of generators) {
    g.hp = 0;
    (g as any).alive = false;
    g.state = 'knocked';
  }
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(titan!.shieldFront === false, 'Al destruir los 2 Generadores cae shieldFront del Titán');

  // Al bajar HP a <= 12 pasa a titanPhase === 2
  titan!.hp = 12;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.titanPhase === 2, `Al bajar HP a <= 12 pasa a titanPhase === 2 (es ${w.titanPhase})`);

  // Al bajar HP a <= 6 pasa a titanPhase === 3
  titan!.hp = 6;
  stepWorld(w, NO_INPUT, VIEW_W);
  assert(w.titanPhase === 3, `Al bajar HP a <= 6 pasa a titanPhase === 3 (es ${w.titanPhase})`);

  // Al morir el Titán + Generadores, !isGoalLocked(w) y label '🤖 ¡TITÁN CAÍDO!'
  titan!.hp = 0;
  (titan as any).alive = false;
  titan!.state = 'knocked';
  assert(!isGoalLocked(w), 'Meta desbloqueada al morir Titán y Generadores');
  assert(objectiveHudLabel(w) === '🤖 ¡TITÁN CAÍDO!', `Label HUD final esperado '🤖 ¡TITÁN CAÍDO!' (es '${objectiveHudLabel(w)}')`);
}

console.log(`\n🎉 ¡TODAS LAS ${passed} PRUEBAS DE ODISEA ABIERTA COMPLETADAS EN VERDE!`);
