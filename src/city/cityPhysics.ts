// ============================================================================
// CIUDAD CAOS - Motor de Simulación 60 Hz Top-Down 360° GTA 2D
// Controles arcade, conducción, drift, rampas, misiones y wanted level
// ============================================================================

import { InputState, GameEvent } from '../engine/types';
import {
  CityWorld,
  CityVehicle,
  CityNpc,
  CityTurret,
  CityProjectile,
  CityParticle,
  CityFloatText,
} from './cityTypes';

export function stepCityWorld(
  world: CityWorld,
  input: InputState,
  viewW: number,
  viewH: number
): GameEvent[] {
  const events: GameEvent[] = [];

  // ID helper
  function nextId(): number {
    return world.nextEntityId++;
  }

  // 1. Detección de flanco de entrada
  const justPressedJump = input.jump && !world.prevJump;
  const justPressedFire = input.fire && !world.prevFire;
  const justPressedSpin = input.spin && !world.prevSpin;

  // 2. Vector direccional del D-Pad (8 direcciones)
  let inputDx = 0;
  let inputDy = 0;
  if (input.left) inputDx -= 1;
  if (input.right) inputDx += 1;
  if (input.up) inputDy -= 1;
  if (input.down) inputDy -= 1;
  const inputLen = Math.hypot(inputDx, inputDy);
  const hasInput = inputLen > 0.001;
  if (hasInput) {
    inputDx /= inputLen;
    inputDy /= inputLen;
  }

  // 3. Helpers de colisión
  const mapW = world.cols * world.tileSize;
  const mapH = world.rows * world.tileSize;

  function isSolidTile(x: number, y: number, allowWater = false): boolean {
    if (x < 16 || x >= mapW - 16 || y < 16 || y >= mapH - 16) return true;
    const c = Math.floor(x / world.tileSize);
    const r = Math.floor(y / world.tileSize);
    if (r < 0 || r >= world.rows || c < 0 || c >= world.cols) return true;
    const tile = world.tiles[r][c];
    if (tile === 'building') return true;
    if (!allowWater && tile === 'water') return true;
    return false;
  }

  function collidesBuildingAABB(x: number, y: number, radius: number): boolean {
    for (const b of world.buildings) {
      if (
        x + radius > b.x &&
        x - radius < b.x + b.w &&
        y + radius > b.y &&
        y - radius < b.y + b.h
      ) {
        return true;
      }
    }
    return false;
  }

  const p = world.player;
  p.animTick++;

  // Enfriamientos del jugador
  if (p.dashTimer > 0) p.dashTimer--;
  if (p.dashCooldown > 0) p.dashCooldown--;
  if (p.invulnTimer > 0) p.invulnTimer--;
  if (p.fireCooldown > 0) p.fireCooldown--;

  // ==========================================================================
  // 4. JUGADOR A PIE (p.vehicleId == null)
  // ==========================================================================
  if (p.vehicleId == null) {
    // Movimiento 360° en 8 direcciones
    if (hasInput) {
      p.angle = Math.atan2(inputDy, inputDx);
      const moveSpeed = p.dashTimer > 0 ? 8.5 : input.run ? 4.8 : 3.4;
      p.vx = inputDx * moveSpeed;
      p.vy = inputDy * moveSpeed;
    } else if (p.dashTimer <= 0) {
      p.vx *= 0.7;
      p.vy *= 0.7;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
      if (Math.abs(p.vy) < 0.1) p.vy = 0;
    }

    // Dash evasivo (A / jump)
    if (justPressedJump && p.dashCooldown <= 0) {
      p.dashTimer = 10;
      p.dashCooldown = 32;
      p.invulnTimer = 14;
      p.vx = Math.cos(p.angle) * 8.5;
      p.vy = Math.sin(p.angle) * 8.5;
      events.push({ type: 'sfx', id: 'jump' }, { type: 'haptic', kind: 'light' });

      // Partículas de estela
      for (let i = 0; i < 4; i++) {
        world.particles.push({
          id: nextId(),
          x: p.x - Math.cos(p.angle) * 12,
          y: p.y - Math.sin(p.angle) * 12,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: '#38bdf8',
          size: 4,
          life: 14,
          maxLife: 14,
          kind: 'spark',
        });
      }
    }

    // Colisión deslizante en X e Y de forma independiente
    const newX = p.x + p.vx;
    if (!isSolidTile(newX, p.y) && !collidesBuildingAABB(newX, p.y, 10)) {
      p.x = newX;
    } else {
      p.vx = 0;
    }

    const newY = p.y + p.vy;
    if (!isSolidTile(p.x, newY) && !collidesBuildingAABB(p.x, newY, 10)) {
      p.y = newY;
    } else {
      p.vy = 0;
    }

    // Disparo de plasma 360° a pie (X / fire)
    if (input.fire && p.fireCooldown <= 0) {
      const projSpeed = 10;
      world.projectiles.push({
        id: nextId(),
        x: p.x + Math.cos(p.angle) * 14,
        y: p.y + Math.sin(p.angle) * 14,
        vx: Math.cos(p.angle) * projSpeed,
        vy: Math.sin(p.angle) * projSpeed,
        owner: 'player',
        dmg: 2,
        radius: 4,
        color: '#38bdf8',
        life: 42,
      });
      p.fireCooldown = 11;
      events.push({ type: 'sfx', id: 'fireball' }, { type: 'haptic', kind: 'light' });
    }

    // Subir a un vehículo cercano (Y / spin)
    if (justPressedSpin) {
      let nearestVeh: CityVehicle | null = null;
      let minDist = 64;
      for (const veh of world.vehicles) {
        if (veh.z === 0) {
          const d = Math.hypot(veh.x - p.x, veh.y - p.y);
          if (d < minDist) {
            minDist = d;
            nearestVeh = veh;
          }
        }
      }

      if (nearestVeh) {
        p.vehicleId = nearestVeh.id;
        nearestVeh.driver = 'player';
        events.push({ type: 'sfx', id: 'yoshi_mount' }, { type: 'haptic', kind: 'medium' });

        const vehName = nearestVeh.kind.toUpperCase().replace('_', ' ');
        world.floatTexts.push({
          id: nextId(),
          x: nearestVeh.x,
          y: nearestVeh.y - 28,
          text: `¡PILOTANDO ${vehName}!`,
          color: '#38bdf8',
          life: 90,
          maxLife: 90,
        });
      }
    }
  }

  // ==========================================================================
  // 5. CONDUCIENDO VEHÍCULO (p.vehicleId != null)
  // ==========================================================================
  else {
    const curVeh = world.vehicles.find((v) => v.id === p.vehicleId);
    if (!curVeh || curVeh.hp <= 0) {
      // Vehículo destruido o desaparecido -> eyectar jugador
      p.vehicleId = null;
      world.screenShake = 12;
      events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'heavy' });
    } else {
      // Velocidades máximas y aceleraciones por tipo
      let maxSpd = 5.2;
      let accel = 0.18;
      let turnRate = 0.10;

      if (curVeh.kind === 'moto_plasma') {
        maxSpd = 7.6;
        accel = 0.25;
        turnRate = 0.13;
      } else if (curVeh.kind === 'kart_turbo') {
        maxSpd = 6.8;
        accel = 0.22;
        turnRate = 0.11;
      } else if (curVeh.kind === 'patrulla') {
        maxSpd = 6.2;
        accel = 0.19;
        turnRate = 0.09;
      } else if (curVeh.kind === 'tanque_plomero') {
        maxSpd = 4.6;
        accel = 0.13;
        turnRate = 0.07;
      }

      // Drift (B / run)
      curVeh.drifting = input.run && curVeh.speed > 2.0;
      if (curVeh.drifting) {
        turnRate *= 1.6;
        curVeh.nitro = Math.min(100, curVeh.nitro + 0.35); // Derrapar recarga nitro!

        // Dejar marcas de neumático
        if (world.frameCount % 2 === 0) {
          world.skidMarks.push({
            x: curVeh.x - Math.cos(curVeh.angle) * 16,
            y: curVeh.y - Math.sin(curVeh.angle) * 16,
            angle: curVeh.angle,
            alpha: 0.8,
          });
          // Chispas doradas de drift
          world.particles.push({
            id: nextId(),
            x: curVeh.x - Math.cos(curVeh.angle) * 18,
            y: curVeh.y - Math.sin(curVeh.angle) * 18,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: '#facc15',
            size: 3,
            life: 12,
            maxLife: 12,
            kind: 'spark',
          });
        }
        if (world.frameCount % 12 === 0) {
          events.push({ type: 'sfx', id: 'skid' });
        }
      }

      // Nitro Turbo (A / jump en el aire o suelo)
      if (input.jump && curVeh.nitro > 0) {
        curVeh.nitro = Math.max(0, curVeh.nitro - 0.65);
        maxSpd *= 1.45;
        accel *= 1.8;

        // Fuego azul/cyan de nitro
        world.particles.push({
          id: nextId(),
          x: curVeh.x - Math.cos(curVeh.angle) * 22,
          y: curVeh.y - Math.sin(curVeh.angle) * 22,
          vx: -Math.cos(curVeh.angle) * 4 + (Math.random() - 0.5) * 2,
          vy: -Math.sin(curVeh.angle) * 4 + (Math.random() - 0.5) * 2,
          color: '#38bdf8',
          size: 5,
          life: 14,
          maxLife: 14,
          kind: 'fire',
        });
        if (world.frameCount % 10 === 0) {
          events.push({ type: 'haptic', kind: 'light' });
        }
      } else if (!input.jump && curVeh.nitro < 100) {
        curVeh.nitro = Math.min(100, curVeh.nitro + 0.06); // Recarga pasiva suave
      }

      // Dirección intuitiva por D-Pad: gira suavemente hacia el vector del D-Pad
      if (hasInput) {
        const targetAngle = Math.atan2(inputDy, inputDx);
        let diff = targetAngle - curVeh.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        curVeh.angle += Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
        curVeh.speed = Math.min(maxSpd, curVeh.speed + accel);
      } else {
        curVeh.speed *= 0.94; // Fricción suave
        if (curVeh.speed < 0.08) curVeh.speed = 0;
      }

      curVeh.vx = Math.cos(curVeh.angle) * curVeh.speed;
      curVeh.vy = Math.sin(curVeh.angle) * curVeh.speed;

      // Físicas del eje Z (Vuelo y gravedad al saltar en rampas)
      if (curVeh.z > 0 || curVeh.vz !== 0) {
        curVeh.z += curVeh.vz;
        curVeh.vz -= 0.32; // Gravedad
        if (curVeh.z <= 0) {
          const hadBigJump = curVeh.vz < -3.5;
          curVeh.z = 0;
          curVeh.vz = 0;
          if (hadBigJump) {
            world.cash += 500;
            world.score += 500;
            world.screenShake = 6;
            world.floatTexts.push({
              id: nextId(),
              x: curVeh.x,
              y: curVeh.y - 28,
              text: '¡SALTO ACROBÁTICO! +$500',
              color: '#facc15',
              life: 90,
              maxLife: 90,
            });
            events.push({ type: 'sfx', id: 'stomp' }, { type: 'haptic', kind: 'success' });
          }
        }
      }

      // Interacción con Rampas Acrobáticas
      if (curVeh.z === 0 && curVeh.speed > 3.0) {
        for (const ramp of world.ramps) {
          if (
            curVeh.x >= ramp.x &&
            curVeh.x <= ramp.x + ramp.w &&
            curVeh.y >= ramp.y &&
            curVeh.y <= ramp.y + ramp.h
          ) {
            curVeh.vz = 6.5; // Lanzamiento acrobático
            curVeh.z = 2.0;
            curVeh.speed = Math.max(curVeh.speed, 5.8);
            world.screenShake = 7;
            events.push({ type: 'sfx', id: 'spring' }, { type: 'haptic', kind: 'heavy' });
            break;
          }
        }
      }

      // Desplazamiento y colisiones contra edificios / agua
      const nextVehX = curVeh.x + curVeh.vx;
      const nextVehY = curVeh.y + curVeh.vy;

      // Si está en el aire (z > 0), puede volar sobre agua y obstáculos
      if (curVeh.z > 0) {
        curVeh.x = Math.max(20, Math.min(mapW - 20, nextVehX));
        curVeh.y = Math.max(20, Math.min(mapH - 20, nextVehY));
      } else {
        // En el suelo: choque contra agua -> respawn
        if (isSolidTile(nextVehX, nextVehY, false)) {
          const c = Math.floor(nextVehX / world.tileSize);
          const r = Math.floor(nextVehY / world.tileSize);
          if (world.tiles[r]?.[c] === 'water') {
            curVeh.hp = Math.max(10, curVeh.hp - 35);
            curVeh.x = curVeh.respawnX;
            curVeh.y = curVeh.respawnY;
            curVeh.speed = 0;
            curVeh.vx = 0;
            curVeh.vy = 0;
            world.screenShake = 10;
            world.floatTexts.push({
              id: nextId(),
              x: curVeh.x,
              y: curVeh.y - 20,
              text: '¡AL AGUA! RESPAWN',
              color: '#38bdf8',
              life: 90,
              maxLife: 90,
            });
            events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'error' });
          } else {
            // Choque contra edificio o borde
            curVeh.speed = -curVeh.speed * 0.45;
            curVeh.hp = Math.max(0, curVeh.hp - 4);
            world.screenShake = 6;
            events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'medium' });
          }
        } else if (collidesBuildingAABB(nextVehX, nextVehY, 14)) {
          curVeh.speed = -curVeh.speed * 0.45;
          curVeh.hp = Math.max(0, curVeh.hp - 4);
          world.screenShake = 6;
          events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'medium' });
        } else {
          curVeh.x = nextVehX;
          curVeh.y = nextVehY;
        }
      }

      // Sincronizar jugador con el auto
      p.x = curVeh.x;
      p.y = curVeh.y;
      p.angle = curVeh.angle;
      p.vx = curVeh.vx;
      p.vy = curVeh.vy;

      // Disparo desde vehículo (X / fire)
      if (input.fire && p.fireCooldown <= 0) {
        if (curVeh.kind === 'tanque_plomero') {
          // Cañón de Tanque: explosivo pesado
          world.projectiles.push({
            id: nextId(),
            x: curVeh.x + Math.cos(curVeh.angle) * 26,
            y: curVeh.y + Math.sin(curVeh.angle) * 26,
            vx: Math.cos(curVeh.angle) * 11,
            vy: Math.sin(curVeh.angle) * 11,
            owner: 'player',
            dmg: 5,
            radius: 7,
            color: '#f59e0b',
            life: 48,
          });
          p.fireCooldown = 30;
          world.screenShake = 8;
          events.push({ type: 'sfx', id: 'break_block' }, { type: 'haptic', kind: 'heavy' });
        } else {
          // Blaster de Kart / Moto
          world.projectiles.push({
            id: nextId(),
            x: curVeh.x + Math.cos(curVeh.angle) * 20,
            y: curVeh.y + Math.sin(curVeh.angle) * 20,
            vx: Math.cos(curVeh.angle) * 11,
            vy: Math.sin(curVeh.angle) * 11,
            owner: 'player',
            dmg: 2,
            radius: 4,
            color: '#38bdf8',
            life: 38,
          });
          p.fireCooldown = 11;
          events.push({ type: 'sfx', id: 'fireball' }, { type: 'haptic', kind: 'light' });
        }
      }

      // Bajar del vehículo (Y / spin)
      if (justPressedSpin) {
        p.vehicleId = null;
        curVeh.driver = 'none';
        p.x = curVeh.x - Math.sin(curVeh.angle) * 34;
        p.y = curVeh.y + Math.cos(curVeh.angle) * 34;
        p.vx = 0;
        p.vy = 0;
        events.push({ type: 'sfx', id: 'yoshi_spit' }, { type: 'haptic', kind: 'light' });
      }

      // Atropello / Ramming contra NPCs
      if (curVeh.speed > 2.0) {
        for (const npc of world.npcs) {
          if (npc.alive) {
            const dist = Math.hypot(npc.x - curVeh.x, npc.y - curVeh.y);
            if (dist < 32) {
              const ramDmg = Math.floor(
                curVeh.speed * (curVeh.kind === 'tanque_plomero' ? 6 : 3.5)
              );
              npc.hp -= ramDmg;
              npc.vx = Math.cos(curVeh.angle) * (curVeh.speed + 3);
              npc.vy = Math.sin(curVeh.angle) * (curVeh.speed + 3);
              world.screenShake = 6;
              events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'medium' });

              // Partículas
              for (let k = 0; k < 4; k++) {
                world.particles.push({
                  id: nextId(),
                  x: npc.x,
                  y: npc.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  color: '#ef4444',
                  size: 4,
                  life: 14,
                  maxLife: 14,
                  kind: 'spark',
                });
              }

              if (npc.hp <= 0) {
                npc.alive = false;
                world.cash += 50;
                world.score += 100;
                world.chaosMeter += 15;
              }
            }
          }
        }
      }
    }
  }

  // ==========================================================================
  // 6. TALLERES PAY'N'SPRAY (Reparación 100% y Limpieza de Búsqueda)
  // ==========================================================================
  for (const g of world.garages) {
    if (g.cooldown > 0) g.cooldown--;
    if (
      p.x >= g.x &&
      p.x <= g.x + g.w &&
      p.y >= g.y &&
      p.y <= g.y + g.h &&
      g.cooldown <= 0
    ) {
      p.hp = p.maxHp;
      if (p.vehicleId != null) {
        const v = world.vehicles.find((veh) => veh.id === p.vehicleId);
        if (v) {
          v.hp = v.maxHp;
          v.nitro = 100;
          // Pintura nueva aleatoria
          const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
          v.color = colors[Math.floor(Math.random() * colors.length)];
        }
      }
      world.wantedLevel = 0;
      world.chaosMeter = 0;
      world.wantedDecayTimer = 0;
      g.cooldown = 180; // 3 segundos

      world.floatTexts.push({
        id: nextId(),
        x: g.x + g.w / 2,
        y: g.y - 20,
        text: '¡TALLER! BÚSQUEDA LIMPIA ★0 - HP 100%',
        color: '#22c55e',
        life: 140,
        maxLife: 140,
      });
      events.push({ type: 'sfx', id: 'powerup_collect' }, { type: 'haptic', kind: 'success' });
    }
  }

  // ==========================================================================
  // 7. NIVEL DE BÚSQUEDA (WANTED LEVEL) Y PATRULLAS
  // ==========================================================================
  if (world.chaosMeter >= 100) {
    world.chaosMeter = 0;
    if (world.wantedLevel < 5) {
      world.wantedLevel++;
      world.floatTexts.push({
        id: nextId(),
        x: p.x,
        y: p.y - 32,
        text: `¡NIVEL DE BÚSQUEDA ★${world.wantedLevel}!`,
        color: '#ef4444',
        life: 120,
        maxLife: 120,
      });
      events.push({ type: 'sfx', id: 'boss_roar' }, { type: 'haptic', kind: 'error' });
    }
  }

  // Decaimiento pasivo si no hay caos
  world.wantedDecayTimer++;
  if (world.wantedDecayTimer > 600) {
    world.wantedDecayTimer = 0;
    if (world.wantedLevel > 0) {
      world.wantedLevel--;
    }
  }

  // Comportamiento de patrullas policiales
  const activePoliceLimit = Math.min(4, world.wantedLevel);
  let activePoliceCount = 0;

  for (const veh of world.vehicles) {
    if (veh.kind === 'patrulla') {
      veh.sirenTick = (veh.sirenTick + 1) % 60;
      if (world.wantedLevel >= 1 && activePoliceCount < activePoliceLimit && veh.id !== p.vehicleId) {
        activePoliceCount++;
        veh.driver = 'police';

        // Persecución inteligente
        const targetAngle = Math.atan2(p.y - veh.y, p.x - veh.x);
        let diff = targetAngle - veh.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        veh.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.08);
        veh.speed = Math.min(5.6, 3.6 + world.wantedLevel * 0.4);
        veh.vx = Math.cos(veh.angle) * veh.speed;
        veh.vy = Math.sin(veh.angle) * veh.speed;

        const nextX = veh.x + veh.vx;
        const nextY = veh.y + veh.vy;
        if (!isSolidTile(nextX, nextY) && !collidesBuildingAABB(nextX, nextY, 14)) {
          veh.x = nextX;
          veh.y = nextY;
        } else {
          veh.angle += Math.PI * 0.4; // Esquivar obstáculo
        }

        // Disparo de la policía si está a menos de 220 px
        const distToPlayer = Math.hypot(p.x - veh.x, p.y - veh.y);
        if (distToPlayer < 220 && world.frameCount % 85 === 0) {
          world.projectiles.push({
            id: nextId(),
            x: veh.x + Math.cos(veh.angle) * 18,
            y: veh.y + Math.sin(veh.angle) * 18,
            vx: Math.cos(veh.angle) * 8.5,
            vy: Math.sin(veh.angle) * 8.5,
            owner: 'enemy',
            dmg: 3,
            radius: 4,
            color: '#f87171',
            life: 40,
          });
        }
      } else if (world.wantedLevel === 0 && veh.driver === 'police') {
        veh.driver = 'none';
        veh.speed *= 0.9;
      }
    }
  }

  // ==========================================================================
  // 8. TRÁFICO CIVIL (Autos circulando por la ciudad)
  // ==========================================================================
  for (const veh of world.vehicles) {
    if (veh.driver === 'npc' && veh.id !== p.vehicleId) {
      const nextX = veh.x + veh.vx;
      const nextY = veh.y + veh.vy;
      if (!isSolidTile(nextX, nextY) && !collidesBuildingAABB(nextX, nextY, 12)) {
        veh.x = nextX;
        veh.y = nextY;
      } else {
        // Al chocar contra un final de calle, gira 180° o 90°
        veh.angle += Math.PI;
        veh.vx = Math.cos(veh.angle) * veh.speed;
        veh.vy = Math.sin(veh.angle) * veh.speed;
      }
    }
  }

  // ==========================================================================
  // 9. COMPORTAMIENTO DE NPCS (Peatones, Koopa Gang y Jefe)
  // ==========================================================================
  for (const npc of world.npcs) {
    if (!npc.alive) continue;
    npc.animTick++;

    if (npc.kind === 'civil') {
      // Peatones civiles
      const nX = npc.x + npc.vx;
      const nY = npc.y + npc.vy;
      if (!isSolidTile(nX, nY) && !collidesBuildingAABB(nX, nY, 8)) {
        npc.x = nX;
        npc.y = nY;
      } else {
        npc.angle += Math.PI;
        npc.vx = Math.cos(npc.angle) * 0.6;
        npc.vy = Math.sin(npc.angle) * 0.6;
      }
    } else if (npc.kind === 'koopa_gang') {
      // Guardias Koopa armados en la base
      const distToPlayer = Math.hypot(p.x - npc.x, p.y - npc.y);
      if (distToPlayer < 260) {
        npc.angle = Math.atan2(p.y - npc.y, p.x - npc.x);
        npc.shootTimer--;
        if (npc.shootTimer <= 0) {
          world.projectiles.push({
            id: nextId(),
            x: npc.x + Math.cos(npc.angle) * 14,
            y: npc.y + Math.sin(npc.angle) * 14,
            vx: Math.cos(npc.angle) * 7.5,
            vy: Math.sin(npc.angle) * 7.5,
            owner: 'enemy',
            dmg: 2,
            radius: 4,
            color: '#f43f5e',
            life: 45,
          });
          npc.shootTimer = 75;
        }
      }
    } else if (npc.kind === 'boss_mob') {
      // JEFE DEL CARTEL "DON BOWSER-MOB" (24 HP)
      const distToPlayer = Math.hypot(p.x - npc.x, p.y - npc.y);
      if (distToPlayer < 320) {
        npc.angle = Math.atan2(p.y - npc.y, p.x - npc.x);
        // Desplazamiento lento hacia el jugador
        npc.x += Math.cos(npc.angle) * 0.8;
        npc.y += Math.sin(npc.angle) * 0.8;

        npc.shootTimer--;
        if (npc.shootTimer <= 0) {
          // Ráfaga triple de fuego
          for (let angOffset of [-0.25, 0, 0.25]) {
            world.projectiles.push({
              id: nextId(),
              x: npc.x + Math.cos(npc.angle + angOffset) * 18,
              y: npc.y + Math.sin(npc.angle + angOffset) * 18,
              vx: Math.cos(npc.angle + angOffset) * 8,
              vy: Math.sin(npc.angle + angOffset) * 8,
              owner: 'enemy',
              dmg: 4,
              radius: 6,
              color: '#ea580c',
              life: 50,
            });
          }
          npc.shootTimer = 85;
          events.push({ type: 'sfx', id: 'boss_roar' });
        }
      }
    }
  }

  // ==========================================================================
  // 10. TORRETAS KOOPA (Base Este)
  // ==========================================================================
  for (const t of world.turrets) {
    if (!t.alive) continue;
    const distToPlayer = Math.hypot(p.x - t.x, p.y - t.y);
    if (distToPlayer < 280) {
      t.shootTimer--;
      if (t.shootTimer <= 0) {
        const ang = Math.atan2(p.y - t.y, p.x - t.x);
        world.projectiles.push({
          id: nextId(),
          x: t.x + Math.cos(ang) * 16,
          y: t.y + Math.sin(ang) * 16,
          vx: Math.cos(ang) * 7.5,
          vy: Math.sin(ang) * 7.5,
          owner: 'enemy',
          dmg: 4,
          radius: 6,
          color: '#fb923c',
          life: 45,
        });
        t.shootTimer = 80;
      }
    }
  }

  // ==========================================================================
  // 11. PROYECTILES Y COLISIONES DE COMBATE
  // ==========================================================================
  const remainingProjectiles: CityProjectile[] = [];
  for (const proj of world.projectiles) {
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.life--;

    let hitSomething = false;

    // Colisión contra edificios
    if (collidesBuildingAABB(proj.x, proj.y, proj.radius) || isSolidTile(proj.x, proj.y)) {
      hitSomething = true;
      // Chispas de impacto
      for (let k = 0; k < 3; k++) {
        world.particles.push({
          id: nextId(),
          x: proj.x,
          y: proj.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          color: proj.color,
          size: 3,
          life: 10,
          maxLife: 10,
          kind: 'spark',
        });
      }
    }

    // Proyectil del Jugador
    if (!hitSomething && proj.owner === 'player') {
      // Impacto en Torretas
      for (const t of world.turrets) {
        if (t.alive && Math.hypot(t.x - proj.x, t.y - proj.y) < 24) {
          t.hp -= proj.dmg;
          hitSomething = true;
          world.screenShake = 6;
          events.push({ type: 'sfx', id: 'break_block' }, { type: 'haptic', kind: 'medium' });

          if (t.hp <= 0 && t.alive) {
            t.alive = false;
            world.missions.turretsLeft--;
            world.cash += 500;
            world.score += 1000;
            world.chaosMeter += 35;
            world.floatTexts.push({
              id: nextId(),
              x: t.x,
              y: t.y - 24,
              text: `💥 ¡TORRETA DESTRUIDA! (${4 - world.missions.turretsLeft}/4)`,
              color: '#f97316',
              life: 100,
              maxLife: 100,
            });

            // Comprobar si completó misión Demolición
            if (world.missions.turretsLeft <= 0 && !world.missions.demolitionDone) {
              world.missions.demolitionDone = true;
              world.cash += 3000;
              world.score += 5000;
              world.floatTexts.push({
                id: nextId(),
                x: p.x,
                y: p.y - 40,
                text: '💥 ¡MISIÓN DEMOLICIÓN COMPLETADA! +$3000',
                color: '#22c55e',
                life: 160,
                maxLife: 160,
              });
              events.push({ type: 'sfx', id: 'stage_clear' }, { type: 'haptic', kind: 'success' });
            }
          }
          break;
        }
      }

      // Impacto en NPCs
      if (!hitSomething) {
        for (const npc of world.npcs) {
          if (npc.alive && Math.hypot(npc.x - proj.x, npc.y - proj.y) < 20) {
            npc.hp -= proj.dmg;
            hitSomething = true;
            world.screenShake = 4;
            events.push({ type: 'sfx', id: 'boss_hit' }, { type: 'haptic', kind: 'light' });

            if (npc.hp <= 0 && npc.alive) {
              npc.alive = false;
              if (npc.kind === 'boss_mob') {
                // JEFE DERROTADO
                world.missions.bossDone = true;
                world.cash += 5000;
                world.score += 10000;
                world.floatTexts.push({
                  id: nextId(),
                  x: npc.x,
                  y: npc.y - 40,
                  text: '👑 ¡DON BOWSER-MOB DERROTADO! +$5000',
                  color: '#facc15',
                  life: 180,
                  maxLife: 180,
                });
                events.push({ type: 'sfx', id: 'stage_clear' }, { type: 'haptic', kind: 'success' });
              } else {
                world.cash += npc.kind === 'koopa_gang' ? 100 : 40;
                world.score += 200;
                world.chaosMeter += 12;
              }
            }
            break;
          }
        }
      }

      // Impacto en autos enemigos o patrullas
      if (!hitSomething) {
        for (const v of world.vehicles) {
          if (v.id !== p.vehicleId && Math.hypot(v.x - proj.x, v.y - proj.y) < 24) {
            v.hp -= proj.dmg * 2;
            hitSomething = true;
            world.screenShake = 5;
            events.push({ type: 'sfx', id: 'bump' });
            if (v.driver === 'police') world.chaosMeter += 15;
            break;
          }
        }
      }
    }

    // Proyectil Enemigo -> Impacto en Jugador
    if (!hitSomething && proj.owner === 'enemy') {
      const distToPlayer = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (distToPlayer < 22 && p.invulnTimer <= 0) {
        hitSomething = true;
        p.invulnTimer = 30;
        world.screenShake = 8;
        events.push({ type: 'sfx', id: 'bump' }, { type: 'haptic', kind: 'error' });

        if (p.vehicleId != null) {
          const v = world.vehicles.find((veh) => veh.id === p.vehicleId);
          if (v) v.hp = Math.max(0, v.hp - proj.dmg * 3);
        } else {
          p.hp = Math.max(0, p.hp - proj.dmg * 5);
        }
      }
    }

    if (!hitSomething && proj.life > 0) {
      remainingProjectiles.push(proj);
    }
  }
  world.projectiles = remainingProjectiles;

  // ==========================================================================
  // 12. LAS 4 MISIONES ABIERTAS
  // ==========================================================================

  // 1. 🏁 Carrera Neon (Circuito Norte)
  if (!world.missions.raceDone) {
    const curCp = world.raceCheckpoints[world.missions.raceIndex];
    if (curCp && Math.hypot(p.x - curCp.x, p.y - curCp.y) < curCp.radius) {
      curCp.reached = true;
      world.missions.raceIndex++;
      events.push({ type: 'sfx', id: 'checkpoint' }, { type: 'haptic', kind: 'success' });
      world.floatTexts.push({
        id: nextId(),
        x: curCp.x,
        y: curCp.y - 20,
        text: `🏁 CHECKPOINT ${world.missions.raceIndex}/6!`,
        color: '#06b6d4',
        life: 80,
        maxLife: 80,
      });

      if (world.missions.raceIndex >= 6) {
        world.missions.raceDone = true;
        world.cash += 2500;
        world.score += 5000;
        world.floatTexts.push({
          id: nextId(),
          x: p.x,
          y: p.y - 40,
          text: '🏁 ¡CARRERA NEON GANADA! +$2500',
          color: '#22c55e',
          life: 160,
          maxLife: 160,
        });
        events.push({ type: 'sfx', id: 'stage_clear' }, { type: 'haptic', kind: 'success' });
      }
    }
  }

  // 3. 🚚 Entrega Express (Tubos de Oro: Puerto -> Plaza Central)
  if (world.missions.deliveryState === 'ready') {
    const dPickup = world.missions.deliveryPickup;
    if (Math.hypot(p.x - dPickup.x, p.y - dPickup.y) < 52) {
      world.missions.deliveryState = 'carrying';
      events.push({ type: 'sfx', id: 'key_get' }, { type: 'haptic', kind: 'success' });
      world.floatTexts.push({
        id: nextId(),
        x: p.x,
        y: p.y - 30,
        text: '🚚 ¡TUBOS DE ORO RECOGIDOS! LLÉVALOS A LA PLAZA',
        color: '#facc15',
        life: 140,
        maxLife: 140,
      });
    }
  } else if (world.missions.deliveryState === 'carrying') {
    const dDrop = world.missions.deliveryDropoff;
    if (Math.hypot(p.x - dDrop.x, p.y - dDrop.y) < 56) {
      world.missions.deliveryState = 'done';
      world.cash += 2000;
      world.score += 4000;
      world.floatTexts.push({
        id: nextId(),
        x: p.x,
        y: p.y - 40,
        text: '🚚 ¡ENTREGA COMPLETADA CON ÉXITO! +$2000',
        color: '#22c55e',
        life: 160,
        maxLife: 160,
      });
      events.push({ type: 'sfx', id: 'stage_clear' }, { type: 'haptic', kind: 'success' });
    }
  }

  // ==========================================================================
  // 13. RESPAWN INSTANTÁNEO (Hospital Plaza)
  // ==========================================================================
  if (p.hp <= 0) {
    p.hp = 100;
    p.vehicleId = null;
    p.x = 48 * 32 + 16;
    p.y = 38 * 32 + 16;
    p.vx = 0;
    p.vy = 0;
    p.invulnTimer = 60;
    world.wantedLevel = 0;
    world.chaosMeter = 0;

    world.floatTexts.push({
      id: nextId(),
      x: p.x,
      y: p.y - 28,
      text: '¡HOSPITAL PLAZA! RECUPERADO',
      color: '#ef4444',
      life: 120,
      maxLife: 120,
    });
    events.push({ type: 'sfx', id: 'power_down' }, { type: 'haptic', kind: 'error' });
  }

  // ==========================================================================
  // 14. DECAIMIENTO DE PARTÍCULAS, TEXTOS FLOTANTES Y SKIDMARKS
  // ==========================================================================
  world.particles = world.particles.filter((pt) => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    return pt.life > 0;
  });

  world.floatTexts = world.floatTexts.filter((ft) => {
    ft.y -= 0.45;
    ft.life--;
    return ft.life > 0;
  });

  if (world.skidMarks.length > 120) {
    world.skidMarks.splice(0, world.skidMarks.length - 120);
  }

  // Amortiguación de sacudida de pantalla
  world.screenShake = Math.max(0, world.screenShake * 0.88 - 0.2);

  // ==========================================================================
  // 15. CÁMARA SUAVE 360° CENTRADA
  // ==========================================================================
  const targetCamX = p.x - viewW / 2;
  const targetCamY = p.y - viewH / 2;
  const maxCamX = Math.max(0, mapW - viewW);
  const maxCamY = Math.max(0, mapH - viewH);
  const clampedTargetCamX = Math.max(0, Math.min(maxCamX, targetCamX));
  const clampedTargetCamY = Math.max(0, Math.min(maxCamY, targetCamY));

  world.cameraX += (clampedTargetCamX - world.cameraX) * 0.12;
  world.cameraY += (clampedTargetCamY - world.cameraY) * 0.12;

  // ==========================================================================
  // 16. PISTAS DINÁMICAS (ACTIVE HINT)
  // ==========================================================================
  world.hintTimer--;
  if (world.hintTimer <= 0) {
    world.hintTimer = 240;
    if (world.wantedLevel > 0) {
      world.activeHint = "★ BÚSQUEDA POLICIAL: ¡VE A UN TALLER PAY'N'SPRAY PARA LIMPIARLA!";
    } else if (world.missions.deliveryState === 'carrying') {
      world.activeHint = '🚚 ENTREGA: LLEVA LOS TUBOS DE ORO A LA PLAZA CENTRAL';
    } else if (!world.missions.raceDone) {
      world.activeHint = '🏁 CARRERA NEON: COMPLETA LOS 6 CHECKPOINTS EN EL CIRCUITO NORTE';
    } else if (!world.missions.demolitionDone) {
      world.activeHint = `💥 DEMOLICIÓN: DESTRUYE LAS TORRETAS EN LA BASE KOOPA (${world.missions.turretsLeft} RESTANTES)`;
    } else if (!world.missions.bossDone) {
      world.activeHint = '👑 JEFE DEL CARTEL: ENFRÉNTATE A DON BOWSER-MOB EN EL MUELLE SUR';
    } else {
      world.activeHint = '🏆 ¡CIUDAD CAOS DOMINADA! SALTA EN LAS RAMPAS Y SIEMBRA EL CAOS';
    }
  }

  // Guardar estado de entradas previas
  world.prevJump = input.jump;
  world.prevFire = input.fire;
  world.prevSpin = input.spin;
  world.frameCount++;

  return events;
}
