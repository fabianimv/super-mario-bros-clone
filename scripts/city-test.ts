import { buildCityWorld } from '../src/city/cityBuilder';
import { stepCityWorld } from '../src/city/cityPhysics';
import { InputState } from '../src/engine/types';

function createBlankInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
    fire: false,
    spin: false,
  };
}

console.log('--- TEST 1: buildCityWorld ---');
const world = buildCityWorld();
console.assert(world.cols === 100, 'cols should be 100');
console.assert(world.rows === 76, 'rows should be 76');
console.assert(world.tiles.length === 76, 'tiles length should be 76');
console.assert(world.tiles[0].length === 100, 'tiles[0] length should be 100');
console.assert(world.vehicles.length >= 11, 'at least 11 vehicles');
console.assert(world.turrets.length === 4, '4 turrets');
console.assert(world.garages.length === 2, '2 garages');
console.assert(world.ramps.length === 4, '4 ramps');
console.assert(world.raceCheckpoints.length === 6, '6 checkpoints');
console.assert(world.player.vehicleId === null, 'player starts on foot');
console.assert(world.player.hp === 100, 'player starts with 100 hp');

const boss = world.npcs.find((n) => n.kind === 'boss_mob');
console.assert(boss !== undefined, 'boss_mob exists');
console.assert(boss?.hp === 24, 'boss has 24 hp');

console.log('✓ Build test passed.');

console.log('--- TEST 2: On Foot Movement & Dash & Fire ---');
const inputWalk = createBlankInput();
inputWalk.right = true;
stepCityWorld(world, inputWalk, 800, 480);
console.assert(world.player.x > 48 * 32 + 16, 'player walked right');

// Dash test
const inputDash = createBlankInput();
inputDash.jump = true;
stepCityWorld(world, inputDash, 800, 480);
console.assert(world.player.dashTimer === 10, 'dash timer activated');
console.assert(world.player.invulnTimer > 0, 'invuln timer activated on dash');

// Fire test
const inputFire = createBlankInput();
inputFire.fire = true;
stepCityWorld(world, inputFire, 800, 480);
console.assert(world.projectiles.length > 0, 'projectile spawned');
console.assert(world.projectiles[0].owner === 'player', 'player is owner');

console.log('✓ On foot tests passed.');

console.log('--- TEST 3: Mounting Vehicle & Driving & Drift & Nitro ---');
// Teleport player near starter kart
const kart = world.vehicles.find((v) => v.kind === 'kart_turbo')!;
world.player.x = kart.x;
world.player.y = kart.y;
const inputMount = createBlankInput();
inputMount.spin = true;
stepCityWorld(world, inputMount, 800, 480);
console.assert(world.player.vehicleId === kart.id, 'mounted kart');
console.assert(kart.driver === 'player', 'kart driver is player');

// Drive forward with right + nitro + drift for several frames
const inputDrive = createBlankInput();
inputDrive.right = true;
inputDrive.run = true; // drift
inputDrive.jump = true; // nitro
for (let f = 0; f < 20; f++) {
  stepCityWorld(world, inputDrive, 800, 480);
}
console.assert(kart.speed > 2.0, 'kart speed > 2.0');
console.assert(kart.nitro < 100, 'nitro was consumed');
console.assert(world.skidMarks.length > 0, 'skidmarks created');

console.log('✓ Driving tests passed.');

console.log('--- TEST 4: Ramp Jumping Physics & Reward ---');
kart.z = 0;
kart.speed = 6.0;
kart.x = world.ramps[0].x + 10;
kart.y = world.ramps[0].y + 10;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(kart.vz === 6.5, 'ramp launched kart');
console.assert(kart.z > 0, 'kart is airborne');

// Simulate gravity until landing
const cashBefore = world.cash;
while (kart.z > 0) {
  stepCityWorld(world, createBlankInput(), 800, 480);
}
console.assert(kart.z === 0, 'kart landed');
console.assert(world.cash >= cashBefore + 500, 'received stunt jump reward');

console.log('✓ Ramp tests passed.');

console.log('--- TEST 5: Pay & Spray Garage ---');
kart.hp = 50;
world.wantedLevel = 3;
kart.x = world.garages[0].x + 10;
kart.y = world.garages[0].y + 10;
world.player.x = kart.x;
world.player.y = kart.y;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(kart.hp === kart.maxHp, 'kart repaired to 100%');
console.assert(world.wantedLevel === 0, 'wanted level cleared');

console.log('✓ Garage tests passed.');

console.log('--- TEST 6: Missions Progression ---');
// 1. Race Checkpoint
const cp0 = world.raceCheckpoints[0];
kart.x = cp0.x;
kart.y = cp0.y;
world.player.x = cp0.x;
world.player.y = cp0.y;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.missions.raceIndex === 1, 'checkpoint reached, raceIndex is 1');

// 2. Turret destruction
world.missions.turretsLeft = 1;
world.turrets[0].hp = 1;
world.projectiles.push({
  id: 9999,
  x: world.turrets[0].x,
  y: world.turrets[0].y,
  vx: 0,
  vy: 0,
  owner: 'player',
  dmg: 5,
  radius: 10,
  color: '#ffffff',
  life: 10,
});
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.missions.demolitionDone === true, 'demolition mission done');

// 3. Delivery Express
kart.x = world.missions.deliveryPickup.x;
kart.y = world.missions.deliveryPickup.y;
world.player.x = world.missions.deliveryPickup.x;
world.player.y = world.missions.deliveryPickup.y;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.missions.deliveryState === 'carrying', 'package picked up');

kart.x = world.missions.deliveryDropoff.x;
kart.y = world.missions.deliveryDropoff.y;
world.player.x = world.missions.deliveryDropoff.x;
world.player.y = world.missions.deliveryDropoff.y;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.missions.deliveryState === 'done', 'delivery completed');

// 4. Boss Defeat
boss.hp = 1;
world.projectiles.push({
  id: 9998,
  x: boss.x,
  y: boss.y,
  vx: 0,
  vy: 0,
  owner: 'player',
  dmg: 10,
  radius: 10,
  color: '#ffffff',
  life: 10,
});
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.missions.bossDone === true, 'boss mission done');

console.log('✓ Missions tests passed.');

console.log('--- TEST 7: Hospital Plaza Instant Respawn ---');
world.player.hp = -10;
stepCityWorld(world, createBlankInput(), 800, 480);
console.assert(world.player.hp === 100, 'player healed to 100');
console.assert(world.player.x === 48 * 32 + 16, 'player respawned at hospital');
console.assert(world.player.vehicleId === null, 'player ejected from vehicle on death');

console.log('✓ Hospital respawn tests passed.');
console.log('ALL CITY ENGINE TESTS PASSED SUCCESSFULLY! 🏎️💨');
