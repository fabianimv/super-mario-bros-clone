// ============================================================================
// CIUDAD CAOS - Creador de Mundo Abierto Top-Down 360° GTA 2D
// 100 × 76 tiles (3200 × 2432 px) - 6 Distritos Vivos
// ============================================================================

import {
  CityWorld,
  CityTileKind,
  CityVehicle,
  CityNpc,
  CityTurret,
  CityGarage,
  CityRamp,
  CityCheckpoint,
  CityBuilding,
} from './cityTypes';

export function buildCityWorld(): CityWorld {
  const cols = 100;
  const rows = 76;
  const tileSize = 32;

  // 1. Inicializar matriz de tiles con césped por defecto
  const tiles: CityTileKind[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowTiles: CityTileKind[] = [];
    for (let c = 0; c < cols; c++) {
      if (r >= 64) {
        rowTiles.push('water');
      } else if (r >= 58) {
        rowTiles.push('sand');
      } else if (c >= 66 && c <= 94 && r >= 24 && r <= 52) {
        rowTiles.push('base_floor');
      } else {
        rowTiles.push('grass');
      }
    }
    tiles.push(rowTiles);
  }

  // 2. Circuito Neon (Norte, rows 6..24)
  // Pista ovalada con asfalto neón
  for (let c = 14; c <= 86; c++) {
    for (let r = 7; r <= 23; r++) {
      // Borde exterior
      const isTopTrack = (r === 8 || r === 9) && c >= 18 && c <= 82;
      const isBottomTrack = (r === 21 || r === 22) && c >= 18 && c <= 82;
      const isLeftCurve = (c === 16 || c === 17) && r >= 9 && r <= 21;
      const isRightCurve = (c === 83 || c === 84) && r >= 9 && r <= 21;
      if (isTopTrack || isBottomTrack || isLeftCurve || isRightCurve) {
        tiles[r][c] = 'neon_track';
      }
    }
  }

  // 3. Avenidas y Calles Principales
  const hRoads = [15, 27, 34, 44, 52, 57];
  const vRoads = [14, 28, 38, 59, 70, 86];

  for (const hr of hRoads) {
    for (let c = 2; c < cols - 2; c++) {
      for (let offset = 0; offset < 2; offset++) {
        const r = hr + offset;
        if (r < rows && tiles[r][c] !== 'water' && tiles[r][c] !== 'neon_track') {
          tiles[r][c] = 'road_h';
        }
      }
    }
  }

  for (const vr of vRoads) {
    for (let r = 4; r < 58; r++) {
      for (let offset = 0; offset < 2; offset++) {
        const c = vr + offset;
        if (c < cols && tiles[r][c] !== 'water' && tiles[r][c] !== 'neon_track') {
          if (tiles[r][c] === 'road_h') {
            tiles[r][c] = 'road_cross';
          } else {
            tiles[r][c] = 'road_v';
          }
        }
      }
    }
  }

  // 4. Aceras adyacentes a calles
  for (let r = 1; r < 58; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (tiles[r][c] === 'grass') {
        const hasRoadNeighbor =
          tiles[r - 1]?.[c]?.startsWith('road') ||
          tiles[r + 1]?.[c]?.startsWith('road') ||
          tiles[r]?.[c - 1]?.startsWith('road') ||
          tiles[r]?.[c + 1]?.startsWith('road');
        if (hasRoadNeighbor) {
          tiles[r][c] = 'sidewalk';
        }
      }
    }
  }

  // 5. Plaza Central (cols 40..58, rows 32..46)
  for (let r = 32; r <= 46; r++) {
    for (let c = 40; c <= 58; c++) {
      tiles[r][c] = 'sidewalk';
    }
  }
  // Césped ornamental y fuentes en las esquinas de la plaza
  for (let r = 34; r <= 36; r++) {
    for (let c = 42; c <= 44; c++) tiles[r][c] = 'grass';
    for (let c = 54; c <= 56; c++) tiles[r][c] = 'grass';
  }
  for (let r = 42; r <= 44; r++) {
    for (let c = 42; c <= 44; c++) tiles[r][c] = 'grass';
    for (let c = 54; c <= 56; c++) tiles[r][c] = 'grass';
  }

  // 6. Muelles del Puerto (Sur, rows 63..74)
  const dockCols = [
    { start: 20, end: 24, rEnd: 72 }, // Muelle Oeste
    { start: 48, end: 54, rEnd: 74 }, // Muelle Central (Jefe)
    { start: 76, end: 80, rEnd: 72 }, // Muelle Este
  ];
  for (const dock of dockCols) {
    for (let r = 63; r <= dock.rEnd; r++) {
      for (let c = dock.start; c <= dock.end; c++) {
        tiles[r][c] = 'dock';
      }
    }
  }

  // 7. Edificios 2.5D con etiquetas
  const buildings: CityBuilding[] = [
    // Distrito Centro / Plaza
    { x: 44 * 32, y: 32 * 32, w: 10 * 32, h: 3 * 32, color: '#334155', roofColor: '#64748b', label: 'AYUNTAMIENTO' },
    { x: 31 * 32, y: 36 * 32, w: 5 * 32, h: 4 * 32, color: '#1e3a8a', roofColor: '#3b82f6', label: 'COMISARÍA' },
    { x: 43 * 32, y: 44 * 32, w: 6 * 32, h: 2 * 32, color: '#991b1b', roofColor: '#ef4444', label: 'HOSPITAL PLAZA' },
    { x: 51 * 32, y: 44 * 32, w: 6 * 32, h: 2 * 32, color: '#854d0e', roofColor: '#eab308', label: 'BANCO CENTRAL' },

    // Distrito Oeste (Comercio & Residencias)
    { x: 6 * 32, y: 29 * 32, w: 6 * 32, h: 4 * 32, color: '#374151', roofColor: '#4b5563', label: 'CENTRO COMERCIAL' },
    { x: 18 * 32, y: 30 * 32, w: 7 * 32, h: 3 * 32, color: '#1f2937', roofColor: '#374151', label: 'CONDOMINIO OESTE' },
    { x: 18 * 32, y: 38 * 32, w: 7 * 32, h: 4 * 32, color: '#0f766e', roofColor: '#14b8a6', label: 'HOTEL PALMS' },
    { x: 6 * 32, y: 46 * 32, w: 6 * 32, h: 4 * 32, color: '#374151', roofColor: '#6b7280', label: 'TEATRO ARCADE' },
    { x: 18 * 32, y: 46 * 32, w: 7 * 32, h: 4 * 32, color: '#4c1d95', roofColor: '#8b5cf6', label: 'DISCO CLUB' },

    // Distrito Norte (Neon / Circuito)
    { x: 44 * 32, y: 12 * 32, w: 12 * 32, h: 6 * 32, color: '#581c87', roofColor: '#a855f7', label: 'CASINO GRAND NEON' },
    { x: 26 * 32, y: 12 * 32, w: 6 * 32, h: 5 * 32, color: '#1e293b', roofColor: '#06b6d4', label: 'PIT STOP RACING' },
    { x: 68 * 32, y: 12 * 32, w: 6 * 32, h: 5 * 32, color: '#1e293b', roofColor: '#f43f5e', label: 'TRIBUNA NEON' },

    // Distrito Este (Base Koopa)
    { x: 74 * 32, y: 32 * 32, w: 14 * 32, h: 8 * 32, color: '#450a0a', roofColor: '#7f1d1d', label: 'BÚNKER KOOPA HQ' },
    { x: 74 * 32, y: 43 * 32, w: 6 * 32, h: 4 * 32, color: '#1c1917', roofColor: '#44403c', label: 'DEPÓSITO MUNICIONES' },
    { x: 82 * 32, y: 43 * 32, w: 6 * 32, h: 4 * 32, color: '#1c1917', roofColor: '#44403c', label: 'BARRACAS KOOPA' },

    // Distrito Sur (Puerto y Aduana)
    { x: 30 * 32, y: 54 * 32, w: 6 * 32, h: 3 * 32, color: '#075985', roofColor: '#0284c7', label: 'ADUANA MARÍTIMA' },
    { x: 62 * 32, y: 54 * 32, w: 6 * 32, h: 3 * 32, color: '#064e3b', roofColor: '#059669', label: 'ALMACÉN PORTUARIO' },
  ];

  // Marcar tiles debajo de edificios como 'building'
  for (const b of buildings) {
    const startC = Math.floor(b.x / tileSize);
    const endC = Math.floor((b.x + b.w) / tileSize);
    const startR = Math.floor(b.y / tileSize);
    const endR = Math.floor((b.y + b.h) / tileSize);
    for (let r = startR; r < endR; r++) {
      for (let c = startC; c < endC; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          tiles[r][c] = 'building';
        }
      }
    }
  }

  // 8. Talleres Pay'n'Spray (2 talleres estratégicos)
  const garages: CityGarage[] = [
    {
      id: 1,
      x: 8 * 32,
      y: 36 * 32,
      w: 4 * 32,
      h: 3 * 32,
      name: "PAY 'N' SPRAY OESTE",
      cooldown: 0,
    },
    {
      id: 2,
      x: 63 * 32,
      y: 20 * 32,
      w: 4 * 32,
      h: 3 * 32,
      name: "PAY 'N' SPRAY ESTE",
      cooldown: 0,
    },
  ];

  // 9. Rampas de Salto Acrobático (en el sur sobre la playa/muelles)
  const ramps: CityRamp[] = [
    { id: 1, x: 22 * 32, y: 61 * 32, w: 2 * 32, h: 2 * 32, dirX: 0, dirY: 1 },
    { id: 2, x: 38 * 32, y: 61 * 32, w: 2 * 32, h: 2 * 32, dirX: 0, dirY: 1 },
    { id: 3, x: 50 * 32, y: 61 * 32, w: 2 * 32, h: 2 * 32, dirX: 0, dirY: 1 },
    { id: 4, x: 78 * 32, y: 61 * 32, w: 2 * 32, h: 2 * 32, dirX: 0, dirY: 1 },
  ];

  // 10. Checkpoints de la Carrera Callejera Neon (6 arcos)
  const raceCheckpoints: CityCheckpoint[] = [
    { id: 1, x: 20 * 32 + 16, y: 9 * 32, radius: 56, order: 0, reached: false },
    { id: 2, x: 50 * 32, y: 9 * 32, radius: 56, order: 1, reached: false },
    { id: 3, x: 83 * 32 + 16, y: 12 * 32, radius: 56, order: 2, reached: false },
    { id: 4, x: 83 * 32 + 16, y: 21 * 32 + 16, radius: 56, order: 3, reached: false },
    { id: 5, x: 50 * 32, y: 21 * 32 + 16, radius: 56, order: 4, reached: false },
    { id: 6, x: 17 * 32, y: 15 * 32, radius: 56, order: 5, reached: false },
  ];

  // 11. Torretas de la Base Koopa (4 torretas destructibles, 6 HP)
  const turrets: CityTurret[] = [
    { id: 1, x: 70 * 32 + 16, y: 27 * 32 + 16, hp: 6, maxHp: 6, alive: true, shootTimer: 45, district: 'Torreta Alfa' },
    { id: 2, x: 88 * 32 + 16, y: 27 * 32 + 16, hp: 6, maxHp: 6, alive: true, shootTimer: 75, district: 'Torreta Beta' },
    { id: 3, x: 70 * 32 + 16, y: 48 * 32 + 16, hp: 6, maxHp: 6, alive: true, shootTimer: 105, district: 'Torreta Gamma' },
    { id: 4, x: 88 * 32 + 16, y: 48 * 32 + 16, hp: 6, maxHp: 6, alive: true, shootTimer: 135, district: 'Torreta Delta' },
  ];

  // 12. Vehículos del Mundo:
  // 3 Iniciales en Plaza Central (Kart Turbo, Moto Plasma, Tanque Plomero)
  // + 6 civiles en avenidas + 2 patrullas de policía
  const vehicles: CityVehicle[] = [
    // Starter 1: Kart Turbo (rojo / dorado)
    {
      id: 1,
      kind: 'kart_turbo',
      x: 45 * 32 + 16,
      y: 38 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      hp: 120,
      maxHp: 120,
      color: '#ef4444',
      accent: '#facc15',
      driver: 'none',
      nitro: 100,
      drifting: false,
      sirenTick: 0,
      respawnX: 45 * 32 + 16,
      respawnY: 38 * 32 + 16,
    },
    // Starter 2: Moto Plasma (cyan / neón)
    {
      id: 2,
      kind: 'moto_plasma',
      x: 51 * 32 + 16,
      y: 38 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      hp: 85,
      maxHp: 85,
      color: '#06b6d4',
      accent: '#3b82f6',
      driver: 'none',
      nitro: 100,
      drifting: false,
      sirenTick: 0,
      respawnX: 51 * 32 + 16,
      respawnY: 38 * 32 + 16,
    },
    // Starter 3: Tanque Plomero (verde militar / blindado)
    {
      id: 3,
      kind: 'tanque_plomero',
      x: 48 * 32 + 16,
      y: 42 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      speed: 0,
      hp: 220,
      maxHp: 220,
      color: '#22c55e',
      accent: '#14532d',
      driver: 'none',
      nitro: 60,
      drifting: false,
      sirenTick: 0,
      respawnX: 48 * 32 + 16,
      respawnY: 42 * 32 + 16,
    },
    // Tráfico Civil (6 autos en movimiento)
    {
      id: 4,
      kind: 'civil',
      x: 14 * 32 + 16,
      y: 20 * 32,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 2.2,
      angle: Math.PI / 2,
      speed: 2.2,
      hp: 100,
      maxHp: 100,
      color: '#f97316',
      accent: '#fed7aa',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 14 * 32 + 16,
      respawnY: 20 * 32,
    },
    {
      id: 5,
      kind: 'civil',
      x: 20 * 32,
      y: 27 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 2.5,
      vy: 0,
      angle: 0,
      speed: 2.5,
      hp: 100,
      maxHp: 100,
      color: '#8b5cf6',
      accent: '#ddd6fe',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 20 * 32,
      respawnY: 27 * 32 + 16,
    },
    {
      id: 6,
      kind: 'civil',
      x: 70 * 32 + 16,
      y: 18 * 32,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 2.4,
      angle: Math.PI / 2,
      speed: 2.4,
      hp: 100,
      maxHp: 100,
      color: '#e11d48',
      accent: '#fecdd3',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 70 * 32 + 16,
      respawnY: 18 * 32,
    },
    {
      id: 7,
      kind: 'civil',
      x: 48 * 32,
      y: 52 * 32 + 16,
      z: 0,
      vz: 0,
      vx: -2.3,
      vy: 0,
      angle: Math.PI,
      speed: 2.3,
      hp: 100,
      maxHp: 100,
      color: '#0284c7',
      accent: '#bae6fd',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 48 * 32,
      respawnY: 52 * 32 + 16,
    },
    {
      id: 8,
      kind: 'civil',
      x: 86 * 32 + 16,
      y: 38 * 32,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 2.2,
      angle: Math.PI / 2,
      speed: 2.2,
      hp: 100,
      maxHp: 100,
      color: '#10b981',
      accent: '#a7f3d0',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 86 * 32 + 16,
      respawnY: 38 * 32,
    },
    {
      id: 9,
      kind: 'civil',
      x: 32 * 32,
      y: 57 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 2.6,
      vy: 0,
      angle: 0,
      speed: 2.6,
      hp: 100,
      maxHp: 100,
      color: '#eab308',
      accent: '#fef08a',
      driver: 'npc',
      nitro: 20,
      drifting: false,
      sirenTick: 0,
      respawnX: 32 * 32,
      respawnY: 57 * 32 + 16,
    },
    // Patrullas de Policía
    {
      id: 10,
      kind: 'patrulla',
      x: 33 * 32 + 16,
      y: 40 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
      hp: 140,
      maxHp: 140,
      color: '#0f172a',
      accent: '#ffffff',
      driver: 'none',
      nitro: 80,
      drifting: false,
      sirenTick: 0,
      respawnX: 33 * 32 + 16,
      respawnY: 40 * 32 + 16,
    },
    {
      id: 11,
      kind: 'patrulla',
      x: 60 * 32 + 16,
      y: 36 * 32 + 16,
      z: 0,
      vz: 0,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      speed: 0,
      hp: 140,
      maxHp: 140,
      color: '#0f172a',
      accent: '#ffffff',
      driver: 'none',
      nitro: 80,
      drifting: false,
      sirenTick: 0,
      respawnX: 60 * 32 + 16,
      respawnY: 36 * 32 + 16,
    },
  ];

  // 13. NPCs:
  // - Peatones civiles (Plaza & Aceras)
  // - Guardias Koopa Gang en Base Koopa
  // - Policías
  // - JEFE DEL CARTEL: "DON BOWSER-MOB" (24 HP) en el Muelle Central Sur
  const npcs: CityNpc[] = [
    // JEFE DEL CARTEL "DON BOWSER-MOB"
    {
      id: 100,
      kind: 'boss_mob',
      x: 51 * 32 + 16,
      y: 71 * 32 + 16,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: 24,
      maxHp: 24,
      alive: true,
      shootTimer: 60,
      animTick: 0,
    },
    // Guardias Koopa Gang en la Base Este
    {
      id: 101,
      kind: 'koopa_gang',
      x: 72 * 32,
      y: 30 * 32,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 50,
      animTick: 0,
    },
    {
      id: 102,
      kind: 'koopa_gang',
      x: 84 * 32,
      y: 30 * 32,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 80,
      animTick: 0,
    },
    {
      id: 103,
      kind: 'koopa_gang',
      x: 72 * 32,
      y: 45 * 32,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 65,
      animTick: 0,
    },
    {
      id: 104,
      kind: 'koopa_gang',
      x: 84 * 32,
      y: 45 * 32,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 95,
      animTick: 0,
    },
    {
      id: 105,
      kind: 'koopa_gang',
      x: 78 * 32,
      y: 28 * 32,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 110,
      animTick: 0,
    },
    {
      id: 106,
      kind: 'koopa_gang',
      x: 78 * 32,
      y: 50 * 32,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: 8,
      maxHp: 8,
      alive: true,
      shootTimer: 70,
      animTick: 0,
    },
    // Policías patrullando comisarías y avenidas
    {
      id: 107,
      kind: 'policia',
      x: 34 * 32,
      y: 37 * 32,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 10,
      maxHp: 10,
      alive: true,
      shootTimer: 90,
      animTick: 0,
    },
    {
      id: 108,
      kind: 'policia',
      x: 60 * 32,
      y: 38 * 32,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      hp: 10,
      maxHp: 10,
      alive: true,
      shootTimer: 85,
      animTick: 0,
    },
    // Peatones civiles paseando
    {
      id: 109,
      kind: 'civil',
      x: 43 * 32,
      y: 37 * 32,
      vx: 0.6,
      vy: 0,
      angle: 0,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 110,
      kind: 'civil',
      x: 53 * 32,
      y: 37 * 32,
      vx: -0.5,
      vy: 0,
      angle: Math.PI,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 111,
      kind: 'civil',
      x: 46 * 32,
      y: 41 * 32,
      vx: 0,
      vy: 0.5,
      angle: Math.PI / 2,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 112,
      kind: 'civil',
      x: 50 * 32,
      y: 43 * 32,
      vx: 0,
      vy: -0.6,
      angle: -Math.PI / 2,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 113,
      kind: 'civil',
      x: 10 * 32,
      y: 33 * 32,
      vx: 0.7,
      vy: 0,
      angle: 0,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 114,
      kind: 'civil',
      x: 24 * 32,
      y: 42 * 32,
      vx: -0.6,
      vy: 0,
      angle: Math.PI,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
    {
      id: 115,
      kind: 'civil',
      x: 35 * 32,
      y: 56 * 32,
      vx: 0.8,
      vy: 0,
      angle: 0,
      hp: 4,
      maxHp: 4,
      alive: true,
      shootTimer: 0,
      animTick: 0,
    },
  ];

  // 14. Spawn del Jugador (Plaza Central)
  const playerSpawnX = 48 * 32 + 16;
  const playerSpawnY = 38 * 32 + 16;

  return {
    tileSize,
    cols,
    rows,
    tiles,
    buildings,
    player: {
      x: playerSpawnX,
      y: playerSpawnY,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 100,
      maxHp: 100,
      vehicleId: null,
      fireCooldown: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnTimer: 0,
      animTick: 0,
    },
    vehicles,
    npcs,
    turrets,
    projectiles: [],
    garages,
    ramps,
    raceCheckpoints,
    missions: {
      raceDone: false,
      raceIndex: 0,
      demolitionDone: false,
      turretsLeft: 4,
      deliveryState: 'ready',
      deliveryPickup: { x: 22 * 32 + 16, y: 70 * 32 + 16 }, // Muelle Oeste
      deliveryDropoff: { x: 48 * 32 + 16, y: 37 * 32 + 16 }, // Plaza Central
      bossDone: false,
    },
    cash: 1000,
    score: 0,
    wantedLevel: 0,
    wantedDecayTimer: 0,
    chaosMeter: 0,
    cameraX: Math.max(0, playerSpawnX - 400),
    cameraY: Math.max(0, playerSpawnY - 240),
    screenShake: 0,
    frameCount: 0,
    particles: [],
    floatTexts: [
      {
        id: 1,
        x: playerSpawnX,
        y: playerSpawnY - 30,
        text: '¡BIENVENIDO A CIUDAD CAOS!',
        color: '#facc15',
        life: 180,
        maxLife: 180,
      },
    ],
    skidMarks: [],
    prevFire: false,
    prevSpin: false,
    prevJump: false,
    activeHint: '¡SUBE A UN VEHÍCULO CON [Y] Y EXPLORA CIUDAD CAOS!',
    hintTimer: 280,
    nextEntityId: 200,
  };
}
