// ============================================================================
// CIUDAD CAOS - Renderizador Skia 60fps Top-Down 2D Sandbox GTA Moderno
// Alto rendimiento: Skia.Paint() reutilizables a nivel de módulo, cero GC
// ============================================================================

import {
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia';
import type {
  CityWorld,
  CityTileKind,
  CityVehicle,
  CityNpc,
  CityTurret,
  CityGarage,
  CityRamp,
  CityCheckpoint,
  CityBuilding,
  CityProjectile,
  CityParticle,
  CityFloatText,
  CitySkidMark,
  VehicleKind,
} from './cityTypes';

// ----------------------------------------------------------------------------
// 1. Paints Reutilizables a Nivel de Módulo (60fps Estables Sin GC)
// ----------------------------------------------------------------------------

const tilePaint = Skia.Paint();
tilePaint.setStyle(PaintStyle.Fill);
tilePaint.setAntiAlias(false);

const fillPaint = Skia.Paint();
fillPaint.setStyle(PaintStyle.Fill);
fillPaint.setAntiAlias(true);

const strokePaint = Skia.Paint();
strokePaint.setStyle(PaintStyle.Stroke);
strokePaint.setAntiAlias(true);

const shadowPaint = Skia.Paint();
shadowPaint.setStyle(PaintStyle.Fill);
shadowPaint.setAntiAlias(true);

const textPaint = Skia.Paint();
textPaint.setStyle(PaintStyle.Fill);
textPaint.setAntiAlias(true);

// ----------------------------------------------------------------------------
// 2. Colores Skia Pre-Compilados (Cero Parsing en Bucle de Render)
// ----------------------------------------------------------------------------

const C_SHADOW = Skia.Color('rgba(0, 0, 0, 0.35)');
const C_SHADOW_LIGHT = Skia.Color('rgba(0, 0, 0, 0.20)');
const C_SHADOW_DEEP = Skia.Color('rgba(0, 0, 0, 0.55)');

// Terreno
const C_ROAD = Skia.Color('#1e293b');
const C_ROAD_CURB = Skia.Color('#334155');
const C_YELLOW_LINE = Skia.Color('#facc15');
const C_ZEBRA = Skia.Color('#f8fafc');
const C_NEON_TRACK = Skia.Color('#090d16');
const C_NEON_CYAN = Skia.Color('#22d3ee');
const C_NEON_MAGENTA = Skia.Color('#f472b6');
const C_SIDEWALK = Skia.Color('#94a3b8');
const C_SIDEWALK_LINE = Skia.Color('#64748b');
const C_GRASS = Skia.Color('#16a34a');
const C_GRASS_TUFT = Skia.Color('#22c55e');
const C_SAND = Skia.Color('#fde047');
const C_SAND_DOT = Skia.Color('#eab308');
const C_WATER_DEEP = Skia.Color('#0369a1');
const C_WATER = Skia.Color('#0284c7');
const C_WATER_FOAM = Skia.Color('#e0f2fe');
const C_DOCK = Skia.Color('#92400e');
const C_DOCK_LINE = Skia.Color('#b45309');
const C_DOCK_BOLLARD = Skia.Color('#451a03');
const C_BASE_FLOOR = Skia.Color('#334155');
const C_BASE_HAZARD = Skia.Color('#0f172a');

// Vehículos & Efectos
const C_TIRE = Skia.Color('#0f172a');
const C_RIM = Skia.Color('#94a3b8');
const C_NITRO_BLUE = Skia.Color('#06b6d4');
const C_NITRO_LIGHT = Skia.Color('#38bdf8');
const C_GOLD_SPARK = Skia.Color('#fbbf24');
const C_ORANGE_SPARK = Skia.Color('#f59e0b');
const C_WHITE = Skia.Color('#ffffff');
const C_BLACK = Skia.Color('#000000');
const C_RED = Skia.Color('#ef4444');
const C_RED_DARK = Skia.Color('#991b1b');
const C_BLUE = Skia.Color('#3b82f6');
const C_GREEN = Skia.Color('#22c55e');
const C_GOLD = Skia.Color('#fbbf24');
const C_ORANGE = Skia.Color('#f97316');
const C_PURPLE = Skia.Color('#a855f7');
const C_HEADLIGHT = Skia.Color('#fef08a');
const C_TAILLIGHT = Skia.Color('#ef4444');

// Jugador
const C_PLUMBER_RED = Skia.Color('#dc2626');
const C_PLUMBER_CAP = Skia.Color('#ef4444');
const C_PLUMBER_BLUE = Skia.Color('#1d4ed8');
const C_PLUMBER_GLOVE = Skia.Color('#f8fafc');
const C_PLUMBER_BOOT = Skia.Color('#78350f');
const C_PLUMBER_BUTTON = Skia.Color('#facc15');

// HUD & Radar
const C_RADAR_BG = Skia.Color('rgba(11, 17, 32, 0.92)');
const C_RADAR_BORDER = Skia.Color('#0284c7');
const C_RADAR_GRID = Skia.Color('#1e293b');
const C_RADAR_SWEEP = Skia.Color('rgba(56, 189, 248, 0.25)');
const C_HUD_BG = Skia.Color('rgba(9, 13, 22, 0.88)');
const C_HUD_BORDER = Skia.Color('#334155');
const C_CASH_BG = Skia.Color('rgba(6, 78, 59, 0.88)');
const C_CASH_BORDER = Skia.Color('#10b981');
const C_CASH_TEXT = Skia.Color('#34d399');

// Cache dinámico para colores arbitrarios de vehículos, edificios y partículas
const dynamicColorCache = new Map<string, ReturnType<typeof Skia.Color>>();
function getSkiaColor(colorHex: string) {
  let c = dynamicColorCache.get(colorHex);
  if (!c) {
    try {
      c = Skia.Color(colorHex);
    } catch {
      c = C_WHITE;
    }
    dynamicColorCache.set(colorHex, c);
  }
  return c;
}

// ----------------------------------------------------------------------------
// 3. Formas Geométricas Unitarias Pre-Alocadas (Zero GC en cada Frame)
// ----------------------------------------------------------------------------

function buildStarSvg(outerR: number, innerR: number): string {
  const step = Math.PI / 5;
  let angle = -Math.PI / 2;
  let d = `M ${(Math.cos(angle) * outerR).toFixed(4)} ${(Math.sin(angle) * outerR).toFixed(4)}`;
  for (let i = 0; i < 5; i++) {
    angle += step;
    d += ` L ${(Math.cos(angle) * innerR).toFixed(4)} ${(Math.sin(angle) * innerR).toFixed(4)}`;
    angle += step;
    d += ` L ${(Math.cos(angle) * outerR).toFixed(4)} ${(Math.sin(angle) * outerR).toFixed(4)}`;
  }
  return d + ' Z';
}

const unitStarPath = Skia.Path.MakeFromSVGString(buildStarSvg(1.0, 0.44));
const unitArrowPath = Skia.Path.MakeFromSVGString(
  'M 1 0 L -0.6 -0.65 L -0.2 0 L -0.6 0.65 Z'
);

// ----------------------------------------------------------------------------
// 4. Utilidades de Dibujo de Alto Rendimiento
// ----------------------------------------------------------------------------

function drawStar(
  canvas: SkCanvas,
  cx: number,
  cy: number,
  r: number,
  fillCol: ReturnType<typeof Skia.Color>,
  strokeCol?: ReturnType<typeof Skia.Color>
) {
  if (!unitStarPath) return;
  canvas.save();
  canvas.translate(cx, cy);
  canvas.scale(r, r);
  fillPaint.setColor(fillCol);
  canvas.drawPath(unitStarPath, fillPaint);
  if (strokeCol) {
    strokePaint.setColor(strokeCol);
    strokePaint.setStrokeWidth(1.2 / r);
    canvas.drawPath(unitStarPath, strokePaint);
  }
  canvas.restore();
}

function drawSafeText(
  canvas: SkCanvas,
  text: string,
  x: number,
  y: number,
  color: ReturnType<typeof Skia.Color>,
  pixelFont?: SkFont | null,
  scale = 1.0,
  shadow = true
) {
  if (!pixelFont) return;
  canvas.save();
  canvas.translate(x, y);
  if (scale !== 1.0) {
    canvas.scale(scale, scale);
  }
  if (shadow) {
    textPaint.setColor(C_BLACK);
    canvas.drawText(text, 1, 1, textPaint, pixelFont);
  }
  textPaint.setColor(color);
  canvas.drawText(text, 0, 0, textPaint, pixelFont);
  canvas.restore();
}

function drawHealthBar(
  canvas: SkCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  cur: number,
  max: number,
  fillColor?: ReturnType<typeof Skia.Color>,
  label?: string,
  pixelFont?: SkFont | null
) {
  const pct = Math.max(0, Math.min(1, cur / Math.max(1, max)));
  // Fondo oscuro
  fillPaint.setColor(C_SHADOW_DEEP);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 2, 2), fillPaint);

  // Barra de progreso
  const fillW = Math.max(2, (w - 2) * pct);
  const color =
    fillColor ??
    (pct > 0.5 ? C_GREEN : pct > 0.25 ? C_GOLD : C_RED);
  fillPaint.setColor(color);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1, y + 1, fillW, h - 2), 1, 1), fillPaint);

  // Borde
  strokePaint.setColor(C_BLACK);
  strokePaint.setStrokeWidth(1);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 2, 2), strokePaint);

  if (label && pixelFont) {
    drawSafeText(canvas, label, x, y - 3, C_WHITE, pixelFont, 0.55, true);
  }
}

// ----------------------------------------------------------------------------
// 5. Renderizado Principal: drawCityWorld
// ----------------------------------------------------------------------------

export function drawCityWorld(
  canvas: SkCanvas,
  world: CityWorld,
  viewW: number,
  viewH: number,
  pixelFont?: SkFont | null
): void {
  // Pass 0: Screen Shake y Transformación de Cámara
  const shakeX =
    world.screenShake > 0
      ? Math.sin(world.frameCount * 0.8) * Math.min(world.screenShake, 8)
      : 0;
  const shakeY =
    world.screenShake > 0
      ? Math.cos(world.frameCount * 0.9) * Math.min(world.screenShake, 8)
      : 0;

  canvas.save();
  canvas.translate(-world.cameraX + shakeX, -world.cameraY + shakeY);

  // --------------------------------------------------------------------------
  // Pass 1: Terreno por Tiles Visibles (Culling Estricto de Alto Rendimiento)
  // --------------------------------------------------------------------------
  const tileSize = world.tileSize;
  const minCol = Math.max(0, Math.floor((world.cameraX - tileSize) / tileSize));
  const maxCol = Math.min(
    world.cols - 1,
    Math.ceil((world.cameraX + viewW + tileSize) / tileSize)
  );
  const minRow = Math.max(0, Math.floor((world.cameraY - tileSize) / tileSize));
  const maxRow = Math.min(
    world.rows - 1,
    Math.ceil((world.cameraY + viewH + tileSize) / tileSize)
  );

  for (let r = minRow; r <= maxRow; r++) {
    const rowTiles = world.tiles[r];
    if (!rowTiles) continue;
    const ty = r * tileSize;

    for (let c = minCol; c <= maxCol; c++) {
      const tile = rowTiles[c];
      const tx = c * tileSize;

      switch (tile) {
        case 'road_h': {
          // Asfalto
          tilePaint.setColor(C_ROAD);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          // Bordillos
          tilePaint.setColor(C_ROAD_CURB);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, 2), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx, ty + tileSize - 2, tileSize, 2), tilePaint);
          // Línea discontinua amarilla
          if (c % 2 === 0) {
            tilePaint.setColor(C_YELLOW_LINE);
            canvas.drawRect(Skia.XYWHRect(tx + 4, ty + 15, tileSize - 8, 2), tilePaint);
          }
          break;
        }

        case 'road_v': {
          // Asfalto
          tilePaint.setColor(C_ROAD);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          // Bordillos
          tilePaint.setColor(C_ROAD_CURB);
          canvas.drawRect(Skia.XYWHRect(tx, ty, 2, tileSize), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx + tileSize - 2, ty, 2, tileSize), tilePaint);
          // Línea discontinua amarilla
          if (r % 2 === 0) {
            tilePaint.setColor(C_YELLOW_LINE);
            canvas.drawRect(Skia.XYWHRect(tx + 15, ty + 4, 2, tileSize - 8), tilePaint);
          }
          break;
        }

        case 'road_cross': {
          // Asfalto de cruce
          tilePaint.setColor(C_ROAD);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          // Pasos de cebra en bordes
          tilePaint.setColor(C_ZEBRA);
          for (let z = 0; z < 4; z++) {
            canvas.drawRect(Skia.XYWHRect(tx + z * 8 + 2, ty + 2, 4, 6), tilePaint);
            canvas.drawRect(Skia.XYWHRect(tx + z * 8 + 2, ty + tileSize - 8, 4, 6), tilePaint);
          }
          break;
        }

        case 'neon_track': {
          // Pista oscura
          tilePaint.setColor(C_NEON_TRACK);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          // Bordes neón
          tilePaint.setColor(C_NEON_CYAN);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, 2), tilePaint);
          tilePaint.setColor(C_NEON_MAGENTA);
          canvas.drawRect(Skia.XYWHRect(tx, ty + tileSize - 2, tileSize, 2), tilePaint);
          // Flechas de velocidad
          if ((c + r) % 3 === 0 && unitArrowPath) {
            fillPaint.setColor(C_NEON_CYAN);
            canvas.save();
            canvas.translate(tx + 16, ty + 16);
            canvas.scale(7, 7);
            canvas.drawPath(unitArrowPath, fillPaint);
            canvas.restore();
          }
          break;
        }

        case 'sidewalk': {
          tilePaint.setColor(C_SIDEWALK);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          tilePaint.setColor(C_SIDEWALK_LINE);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, 1), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx, ty, 1, tileSize), tilePaint);
          break;
        }

        case 'grass': {
          tilePaint.setColor(C_GRASS);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          // Toques de césped ornamental
          if ((c * 7 + r * 13) % 5 === 0) {
            tilePaint.setColor(C_GRASS_TUFT);
            canvas.drawRect(Skia.XYWHRect(tx + 8, ty + 10, 4, 3), tilePaint);
            canvas.drawRect(Skia.XYWHRect(tx + 20, ty + 20, 3, 4), tilePaint);
          }
          break;
        }

        case 'sand': {
          tilePaint.setColor(C_SAND);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          if ((c + r) % 4 === 0) {
            tilePaint.setColor(C_SAND_DOT);
            canvas.drawRect(Skia.XYWHRect(tx + 6, ty + 8, 2, 2), tilePaint);
            canvas.drawRect(Skia.XYWHRect(tx + 22, ty + 18, 2, 2), tilePaint);
          }
          break;
        }

        case 'water': {
          // Mar azul animado con ondas
          tilePaint.setColor(C_WATER);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          const wave = Math.sin(c * 1.4 + r * 2.2 + world.frameCount * 0.08);
          tilePaint.setColor(C_WATER_DEEP);
          canvas.drawRect(Skia.XYWHRect(tx, ty + 12 + wave * 3, tileSize, 4), tilePaint);
          tilePaint.setColor(C_WATER_FOAM);
          canvas.drawRect(Skia.XYWHRect(tx + 4, ty + 18 + wave * 3, tileSize - 8, 1.5), tilePaint);
          break;
        }

        case 'dock': {
          // Muelles de madera
          tilePaint.setColor(C_DOCK);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          tilePaint.setColor(C_DOCK_LINE);
          canvas.drawRect(Skia.XYWHRect(tx, ty + 8, tileSize, 1.5), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx, ty + 16, tileSize, 1.5), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx, ty + 24, tileSize, 1.5), tilePaint);
          // Bolardos en esquinas
          if (c % 2 === 0) {
            fillPaint.setColor(C_DOCK_BOLLARD);
            canvas.drawCircle(tx + 4, ty + 4, 3, fillPaint);
          }
          break;
        }

        case 'base_floor': {
          // Hormigón industrial con franjas diagonales de peligro
          tilePaint.setColor(C_BASE_FLOOR);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          tilePaint.setColor(C_YELLOW_LINE);
          canvas.drawRect(Skia.XYWHRect(tx + 2, ty + 2, 6, tileSize - 4), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx + 18, ty + 2, 6, tileSize - 4), tilePaint);
          tilePaint.setColor(C_BASE_HAZARD);
          canvas.drawRect(Skia.XYWHRect(tx + 10, ty + 2, 6, tileSize - 4), tilePaint);
          canvas.drawRect(Skia.XYWHRect(tx + 26, ty + 2, 6, tileSize - 4), tilePaint);
          break;
        }

        case 'building':
        default: {
          tilePaint.setColor(C_ROAD);
          canvas.drawRect(Skia.XYWHRect(tx, ty, tileSize, tileSize), tilePaint);
          break;
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Pass 2: Marcas de Drift en el Suelo (Skid Marks)
  // --------------------------------------------------------------------------
  for (const sm of world.skidMarks) {
    if (
      sm.x < world.cameraX - 32 ||
      sm.x > world.cameraX + viewW + 32 ||
      sm.y < world.cameraY - 32 ||
      sm.y > world.cameraY + viewH + 32
    ) {
      continue;
    }
    canvas.save();
    canvas.translate(sm.x, sm.y);
    canvas.rotate((sm.angle * 180) / Math.PI, 0, 0);
    fillPaint.setColor(
      getSkiaColor(`rgba(15, 23, 42, ${(sm.alpha * 0.55).toFixed(2)})`)
    );
    canvas.drawRect(Skia.XYWHRect(-6, -5, 12, 3), fillPaint);
    canvas.drawRect(Skia.XYWHRect(-6, 2, 12, 3), fillPaint);
    canvas.restore();
  }

  // --------------------------------------------------------------------------
  // Pass 3: Rampas de Salto Acrobático
  // --------------------------------------------------------------------------
  for (const ramp of world.ramps) {
    if (
      ramp.x + ramp.w < world.cameraX ||
      ramp.x > world.cameraX + viewW ||
      ramp.y + ramp.h < world.cameraY ||
      ramp.y > world.cameraY + viewH
    ) {
      continue;
    }
    // Base de la rampa
    fillPaint.setColor(C_ORANGE);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(ramp.x, ramp.y, ramp.w, ramp.h), 4, 4), fillPaint);
    strokePaint.setColor(C_GOLD);
    strokePaint.setStrokeWidth(2);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(ramp.x, ramp.y, ramp.w, ramp.h), 4, 4), strokePaint);

    // Chevrones apuntando en (dirX, dirY)
    if (unitArrowPath) {
      const rampAngle = Math.atan2(ramp.dirY, ramp.dirX);
      fillPaint.setColor(C_GOLD);
      canvas.save();
      canvas.translate(ramp.x + ramp.w / 2, ramp.y + ramp.h / 2);
      canvas.rotate((rampAngle * 180) / Math.PI, 0, 0);
      canvas.scale(12, 12);
      canvas.drawPath(unitArrowPath, fillPaint);
      canvas.restore();
    }

    if (pixelFont) {
      drawSafeText(canvas, 'RAMPA', ramp.x + 8, ramp.y - 4, C_GOLD, pixelFont, 0.6, true);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 4: Talleres Pay'n'Spray
  // --------------------------------------------------------------------------
  for (const g of world.garages) {
    if (
      g.x + g.w < world.cameraX ||
      g.x > world.cameraX + viewW ||
      g.y + g.h < world.cameraY ||
      g.y > world.cameraY + viewH
    ) {
      continue;
    }
    // Bahía verde/dorada pulsante
    const pulse = 0.75 + 0.25 * Math.sin(world.frameCount * 0.12);
    fillPaint.setColor(getSkiaColor(`rgba(34, 197, 94, ${(0.35 * pulse).toFixed(2)})`));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(g.x, g.y, g.w, g.h), 6, 6), fillPaint);

    // Contorno neón
    strokePaint.setColor(C_GREEN);
    strokePaint.setStrokeWidth(3 * pulse);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(g.x, g.y, g.w, g.h), 6, 6), strokePaint);

    // Techo / Cartel "PAY & SPRAY"
    const signW = Math.min(110, g.w - 12);
    const signX = g.x + (g.w - signW) / 2;
    fillPaint.setColor(C_HUD_BG);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(signX, g.y + 4, signW, 18), 4, 4), fillPaint);
    strokePaint.setColor(C_GOLD);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(signX, g.y + 4, signW, 18), 4, 4), strokePaint);

    if (pixelFont) {
      drawSafeText(canvas, "PAY 'N' SPRAY", signX + 6, g.y + 16, C_GOLD, pixelFont, 0.65, true);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 5: Checkpoints de Carrera Callejera Neon
  // --------------------------------------------------------------------------
  for (const cp of world.raceCheckpoints) {
    if (
      cp.x + cp.radius < world.cameraX ||
      cp.x - cp.radius > world.cameraX + viewW ||
      cp.y + cp.radius < world.cameraY ||
      cp.y - cp.radius > world.cameraY + viewH
    ) {
      continue;
    }
    const isActive =
      !world.missions.raceDone && world.missions.raceIndex === cp.order;
    const pulse = 0.8 + 0.2 * Math.sin(world.frameCount * 0.15 + cp.order);

    // Anillo exterior
    strokePaint.setColor(isActive ? C_GOLD : C_NEON_CYAN);
    strokePaint.setStrokeWidth(isActive ? 4 : 2);
    canvas.drawCircle(cp.x, cp.y, cp.radius * pulse, strokePaint);

    // Halo interior pulsante
    fillPaint.setColor(
      isActive
        ? getSkiaColor(`rgba(250, 204, 21, ${(0.25 * pulse).toFixed(2)})`)
        : getSkiaColor(`rgba(34, 211, 238, ${(0.15 * pulse).toFixed(2)})`)
    );
    canvas.drawCircle(cp.x, cp.y, cp.radius * 0.75, fillPaint);

    // Número de checkpoint
    if (pixelFont) {
      const label = `🏁 ${cp.order + 1}/6`;
      drawSafeText(canvas, label, cp.x - 18, cp.y + 4, isActive ? C_GOLD : C_WHITE, pixelFont, 0.7, true);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 6: Marcadores de Entrega Express (🚚 Paquete de Oro y Dropoff)
  // --------------------------------------------------------------------------
  if (world.missions.deliveryState === 'ready') {
    const pX = world.missions.deliveryPickup.x;
    const pY = world.missions.deliveryPickup.y;
    // Anillo dorado pulsante
    const pulse = 0.8 + 0.2 * Math.sin(world.frameCount * 0.18);
    strokePaint.setColor(C_GOLD);
    strokePaint.setStrokeWidth(3);
    canvas.drawCircle(pX, pY, 26 * pulse, strokePaint);

    // Caja de Tubos de Oro
    fillPaint.setColor(C_GOLD);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(pX - 10, pY - 10, 20, 20), 4, 4), fillPaint);
    strokePaint.setColor(C_ROAD_CURB);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(pX - 10, pY - 10, 20, 20), 4, 4), strokePaint);

    // Chispas doradas brillantes
    drawStar(canvas, pX + 12, pY - 12, 5, C_WHITE, C_GOLD);
    if (pixelFont) {
      drawSafeText(canvas, '🚚 TUBOS DE ORO', pX - 44, pY - 16, C_GOLD, pixelFont, 0.65, true);
    }
  } else if (world.missions.deliveryState === 'carrying') {
    const dX = world.missions.deliveryDropoff.x;
    const dY = world.missions.deliveryDropoff.y;
    // Zona de entrega en Plaza
    const pulse = 0.8 + 0.2 * Math.sin(world.frameCount * 0.2);
    fillPaint.setColor(getSkiaColor(`rgba(34, 197, 94, ${(0.25 * pulse).toFixed(2)})`));
    canvas.drawCircle(dX, dY, 32 * pulse, fillPaint);
    strokePaint.setColor(C_GREEN);
    strokePaint.setStrokeWidth(3);
    canvas.drawCircle(dX, dY, 32 * pulse, strokePaint);

    if (pixelFont) {
      drawSafeText(canvas, '🎯 ENTREGA AQUÍ', dX - 42, dY - 16, C_GREEN, pixelFont, 0.65, true);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 7: Edificios 2.5D (Sombra + Paredes Frontales + Techo Desplazado)
  // --------------------------------------------------------------------------
  const wallH = 16;
  for (const b of world.buildings) {
    if (
      b.x + b.w < world.cameraX - 64 ||
      b.x > world.cameraX + viewW + 64 ||
      b.y + b.h < world.cameraY - 64 ||
      b.y > world.cameraY + viewH + 64
    ) {
      continue;
    }

    // 1. Sombra en el suelo desplazada hacia el sureste
    shadowPaint.setColor(C_SHADOW);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(b.x + 8, b.y + 8, b.w, b.h + wallH), 6, 6),
      shadowPaint
    );

    // 2. Pared Frontal (Sur)
    const baseColor = getSkiaColor(b.color);
    fillPaint.setColor(baseColor);
    canvas.drawRect(
      Skia.XYWHRect(b.x, b.y + b.h - wallH, b.w, wallH),
      fillPaint
    );
    // Ventanas en la pared frontal
    const winCols = Math.floor(b.w / 18);
    fillPaint.setColor(C_HEADLIGHT);
    for (let i = 0; i < winCols; i++) {
      if ((i + b.x) % 3 !== 0) {
        canvas.drawRect(
          Skia.XYWHRect(b.x + 6 + i * 18, b.y + b.h - wallH + 4, 8, 8),
          fillPaint
        );
      }
    }

    // 3. Techo Desplazado hacia Arriba
    const roofColor = getSkiaColor(b.roofColor);
    fillPaint.setColor(roofColor);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(b.x, b.y - wallH, b.w, b.h), 4, 4),
      fillPaint
    );
    // Borde de azotea
    strokePaint.setColor(C_BLACK);
    strokePaint.setStrokeWidth(2);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(b.x, b.y - wallH, b.w, b.h), 4, 4),
      strokePaint
    );

    // 4. Detalles de Azotea (Unidades HVAC, Claraboyas, Antenas)
    fillPaint.setColor(C_SIDEWALK_LINE);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(b.x + 8, b.y - wallH + 8, 14, 12), 2, 2),
      fillPaint
    );
    // Luz roja parpadeante en antena
    const blink = world.frameCount % 40 < 20;
    fillPaint.setColor(blink ? C_RED : C_RED_DARK);
    canvas.drawCircle(b.x + b.w - 12, b.y - wallH + 12, 3, fillPaint);

    // 5. Rótulo / Cartel de Azotea si tiene etiqueta
    if (b.label && pixelFont) {
      const badgeW = Math.min(b.w - 8, b.label.length * 8 + 14);
      const badgeH = 16;
      const bx = b.x + (b.w - badgeW) / 2;
      const by = b.y - wallH + (b.h - badgeH) / 2;

      fillPaint.setColor(C_HUD_BG);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bx, by, badgeW, badgeH), 3, 3), fillPaint);
      strokePaint.setColor(C_GOLD);
      strokePaint.setStrokeWidth(1);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bx, by, badgeW, badgeH), 3, 3), strokePaint);

      drawSafeText(canvas, b.label, bx + 5, by + 11, C_WHITE, pixelFont, 0.6, true);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 8: Vehículos Rotados (Sombras + Nitro + Chispas + Carrocería Estilizada)
  // --------------------------------------------------------------------------
  for (const v of world.vehicles) {
    if (
      v.x < world.cameraX - 64 ||
      v.x > world.cameraX + viewW + 64 ||
      v.y < world.cameraY - 64 ||
      v.y > world.cameraY + viewH + 64
    ) {
      continue;
    }

    const isKart = v.kind === 'kart_turbo';
    const isMoto = v.kind === 'moto_plasma';
    const isTank = v.kind === 'tanque_plomero';
    const isPolice = v.kind === 'patrulla';

    const vLength = isTank ? 44 : isMoto ? 32 : isKart ? 36 : 40;
    const vWidth = isTank ? 28 : isMoto ? 14 : isKart ? 24 : 22;

    // 1. Sombra en el suelo desplazada según altura de salto v.z
    canvas.save();
    canvas.translate(v.x + v.z * 1.5, v.y + v.z * 2.5);
    canvas.rotate((v.angle * 180) / Math.PI, 0, 0);
    const shadowScale = Math.max(0.65, 1 - v.z * 0.015);
    shadowPaint.setColor(C_SHADOW);
    canvas.drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          (-vLength / 2) * shadowScale,
          (-vWidth / 2) * shadowScale,
          vLength * shadowScale,
          vWidth * shadowScale
        ),
        4,
        4
      ),
      shadowPaint
    );
    canvas.restore();

    // 2. Chasis del Vehículo Elevado en v.z * 2 y Rotado por v.angle
    canvas.save();
    canvas.translate(v.x, v.y - v.z * 2);
    canvas.rotate((v.angle * 180) / Math.PI, 0, 0);

    // Chispas de Derrape en ruedas traseras
    if (v.drifting) {
      const sparkCol = world.frameCount % 2 === 0 ? C_GOLD_SPARK : C_ORANGE_SPARK;
      fillPaint.setColor(sparkCol);
      for (let s = 0; s < 3; s++) {
        const offX = -vLength / 2 - Math.random() * 8;
        const offY = (Math.random() - 0.5) * vWidth;
        canvas.drawCircle(offX, offY, 2 + Math.random() * 2, fillPaint);
      }
    }

    // Llamas de Nitro Turbo detrás
    if (v.nitro > 0 && (v.driver === 'player' || v.speed > 5.5)) {
      const flameLen = 14 + Math.sin(world.frameCount * 0.6) * 6;
      fillPaint.setColor(C_NITRO_BLUE);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 - flameLen, -4, flameLen, 3), fillPaint);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 - flameLen, 1, flameLen, 3), fillPaint);
      fillPaint.setColor(C_NITRO_LIGHT);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 - flameLen * 0.6, -3, flameLen * 0.6, 2), fillPaint);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 - flameLen * 0.6, 1.5, flameLen * 0.6, 2), fillPaint);
    }

    // Ruedas / Orugas
    if (isTank) {
      // Orugas militares
      fillPaint.setColor(C_TIRE);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2, -vWidth / 2 - 2, vLength, 7), 2, 2), fillPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2, vWidth / 2 - 5, vLength, 7), 2, 2), fillPaint);
    } else if (isMoto) {
      // 2 ruedas estrechas / runners
      fillPaint.setColor(C_NEON_CYAN);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 2, -2, 8, 4), 1, 1), fillPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(vLength / 2 - 10, -2, 8, 4), 1, 1), fillPaint);
    } else {
      // 4 ruedas con llantas
      fillPaint.setColor(C_TIRE);
      const tireW = isKart ? 9 : 8;
      const tireH = isKart ? 6 : 5;
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 2, -vWidth / 2 - 1, tireW, tireH), 2, 2), fillPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 2, vWidth / 2 - tireH + 1, tireW, tireH), 2, 2), fillPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(vLength / 2 - tireW - 2, -vWidth / 2 - 1, tireW, tireH), 2, 2), fillPaint);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(vLength / 2 - tireW - 2, vWidth / 2 - tireH + 1, tireW, tireH), 2, 2), fillPaint);
    }

    // Carrocería según Tipo
    const carColor = getSkiaColor(v.color);
    const accentColor = getSkiaColor(v.accent);

    if (isKart) {
      // Kart Turbo deportivo con alerón
      fillPaint.setColor(carColor);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 4, -vWidth / 2 + 3, vLength - 8, vWidth - 6), 5, 5), fillPaint);
      // Rayas de competición doradas
      fillPaint.setColor(accentColor);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 + 4, -2, vLength - 8, 4), fillPaint);
      // Alerón trasero
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 - 2, -vWidth / 2 + 1, 4, vWidth - 2), fillPaint);
      // Cockpit
      fillPaint.setColor(C_ROAD);
      canvas.drawCircle(0, 0, 5, fillPaint);
    } else if (isMoto) {
      // Moto Plasma afilada
      fillPaint.setColor(carColor);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 4, -vWidth / 2 + 2, vLength - 8, vWidth - 4), 4, 4), fillPaint);
      // Tira neón cyan central
      fillPaint.setColor(accentColor);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2 + 6, -1.5, vLength - 12, 3), fillPaint);
    } else if (isTank) {
      // Casco blindado
      fillPaint.setColor(carColor);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2 + 2, -vWidth / 2 + 4, vLength - 4, vWidth - 8), 3, 3), fillPaint);
      // Cúpula giratoria
      fillPaint.setColor(accentColor);
      canvas.drawCircle(0, 0, 9, fillPaint);
      // Cañón frontal largo
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(2, -2.5, 22, 5), fillPaint);
      fillPaint.setColor(C_TIRE);
      canvas.drawRect(Skia.XYWHRect(22, -3.5, 4, 7), fillPaint);
    } else if (isPolice) {
      // Patrulla blanco y negro
      fillPaint.setColor(C_BLACK);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2, -vWidth / 2, vLength, vWidth), 4, 4), fillPaint);
      // Puertas y capó blancos
      fillPaint.setColor(C_WHITE);
      canvas.drawRect(Skia.XYWHRect(-vLength / 4, -vWidth / 2 + 1, vLength / 2, vWidth - 2), fillPaint);
      // Sirenas parpadeando alternadamente roja y azul
      const sirenTick = Math.floor(v.sirenTick / 8) % 2 === 0;
      fillPaint.setColor(sirenTick ? C_RED : C_BLUE);
      canvas.drawCircle(-2, -4, 3, fillPaint);
      fillPaint.setColor(sirenTick ? C_BLUE : C_RED);
      canvas.drawCircle(-2, 4, 3, fillPaint);
      // Parachoques reforzado delantero
      fillPaint.setColor(C_TIRE);
      canvas.drawRect(Skia.XYWHRect(vLength / 2 - 2, -vWidth / 2 + 2, 3, vWidth - 4), fillPaint);
    } else {
      // Sedán Civil colorido
      fillPaint.setColor(carColor);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-vLength / 2, -vWidth / 2, vLength, vWidth), 4, 4), fillPaint);
      // Parabrisas y ventanillas oscuras
      fillPaint.setColor(C_ROAD);
      canvas.drawRect(Skia.XYWHRect(-vLength / 4, -vWidth / 2 + 2, vLength / 2, vWidth - 4), fillPaint);
      // Luces delanteras y traseras
      fillPaint.setColor(C_HEADLIGHT);
      canvas.drawRect(Skia.XYWHRect(vLength / 2 - 2, -vWidth / 2 + 2, 2, 4), fillPaint);
      canvas.drawRect(Skia.XYWHRect(vLength / 2 - 2, vWidth / 2 - 6, 2, 4), fillPaint);
      fillPaint.setColor(C_TAILLIGHT);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2, -vWidth / 2 + 2, 2, 4), fillPaint);
      canvas.drawRect(Skia.XYWHRect(-vLength / 2, vWidth / 2 - 6, 2, 4), fillPaint);
    }

    // Conductor visible si es el jugador
    if (v.driver === 'player') {
      fillPaint.setColor(C_PLUMBER_CAP);
      canvas.drawCircle(-1, 0, 4.5, fillPaint);
    }

    canvas.restore();

    // Barra de Vida flotante si está dañado
    if (v.hp < v.maxHp) {
      drawHealthBar(canvas, v.x - 16, v.y - 20 - v.z * 2, 32, 4, v.hp, v.maxHp);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 9: Torretas Koopa Destructibles
  // --------------------------------------------------------------------------
  for (const t of world.turrets) {
    if (
      t.x < world.cameraX - 64 ||
      t.x > world.cameraX + viewW + 64 ||
      t.y < world.cameraY - 64 ||
      t.y > world.cameraY + viewH + 64
    ) {
      continue;
    }

    if (!t.alive) {
      // Torreta destruida (escombros humeantes)
      fillPaint.setColor(C_BLACK);
      canvas.drawCircle(t.x, t.y, 14, fillPaint);
      fillPaint.setColor(C_ROAD_CURB);
      canvas.drawCircle(t.x + 3, t.y - 2, 8, fillPaint);
      continue;
    }

    // Base del búnker octogonal
    fillPaint.setColor(C_BASE_FLOOR);
    canvas.drawCircle(t.x, t.y, 18, fillPaint);
    strokePaint.setColor(C_YELLOW_LINE);
    strokePaint.setStrokeWidth(2);
    canvas.drawCircle(t.x, t.y, 18, strokePaint);

    // Cúpula blindada Koopa
    fillPaint.setColor(C_GRASS);
    canvas.drawCircle(t.x, t.y, 11, fillPaint);
    strokePaint.setColor(C_GOLD);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawCircle(t.x, t.y, 11, strokePaint);

    // Cañones gemelos apuntando hacia el jugador
    const aimAngle = Math.atan2(world.player.y - t.y, world.player.x - t.x);
    canvas.save();
    canvas.translate(t.x, t.y);
    canvas.rotate((aimAngle * 180) / Math.PI, 0, 0);
    fillPaint.setColor(C_BLACK);
    canvas.drawRect(Skia.XYWHRect(0, -4, 18, 3), fillPaint);
    canvas.drawRect(Skia.XYWHRect(0, 1, 18, 3), fillPaint);
    canvas.restore();

    // Barra de vida flotante
    drawHealthBar(canvas, t.x - 20, t.y - 24, 40, 5, t.hp, t.maxHp, C_RED, 'TORRETA', pixelFont);
  }

  // --------------------------------------------------------------------------
  // Pass 10: NPCs (Civiles, Pandilla Koopa, Policías y Don Bowser-Mob)
  // --------------------------------------------------------------------------
  for (const npc of world.npcs) {
    if (!npc.alive) continue;
    if (
      npc.x < world.cameraX - 48 ||
      npc.x > world.cameraX + viewW + 48 ||
      npc.y < world.cameraY - 48 ||
      npc.y > world.cameraY + viewH + 48
    ) {
      continue;
    }

    // Sombra
    shadowPaint.setColor(C_SHADOW);
    canvas.drawCircle(npc.x + 2, npc.y + 3, npc.kind === 'boss_mob' ? 14 : 7, shadowPaint);

    canvas.save();
    canvas.translate(npc.x, npc.y);
    canvas.rotate((npc.angle * 180) / Math.PI, 0, 0);

    if (npc.kind === 'boss_mob') {
      // Jefe del Cartel: "DON BOWSER-MOB"
      fillPaint.setColor(C_DOCK_LINE); // Caparazón pinchos
      canvas.drawCircle(0, 0, 16, fillPaint);
      strokePaint.setColor(C_GOLD);
      strokePaint.setStrokeWidth(2.5);
      canvas.drawCircle(0, 0, 16, strokePaint);
      // Corona / Sombrero de mafioso
      fillPaint.setColor(C_BLACK);
      canvas.drawCircle(2, 0, 9, fillPaint);
      fillPaint.setColor(C_GOLD);
      canvas.drawCircle(4, 0, 4, fillPaint);
      // Armas pesadas frontales
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(8, -8, 14, 4), fillPaint);
      canvas.drawRect(Skia.XYWHRect(8, 4, 14, 4), fillPaint);
    } else if (npc.kind === 'koopa_gang') {
      // Guardia Koopa
      fillPaint.setColor(C_GRASS);
      canvas.drawCircle(0, 0, 8, fillPaint);
      strokePaint.setColor(C_GOLD);
      strokePaint.setStrokeWidth(1.5);
      canvas.drawCircle(0, 0, 8, strokePaint);
      // Pistola frontal
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(4, 2, 7, 2.5), fillPaint);
    } else if (npc.kind === 'policia') {
      // Policía
      fillPaint.setColor(C_BLUE);
      canvas.drawCircle(0, 0, 7.5, fillPaint);
      fillPaint.setColor(C_WHITE);
      canvas.drawCircle(3, 0, 3, fillPaint);
      // Porra / Pistola
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(4, 2, 6, 2), fillPaint);
    } else {
      // Civil peatón
      fillPaint.setColor(C_PURPLE);
      canvas.drawCircle(0, 0, 6.5, fillPaint);
      fillPaint.setColor(C_SAND_DOT);
      canvas.drawCircle(2, 0, 3, fillPaint);
    }

    canvas.restore();

    // Barra de Vida flotante
    if (npc.kind === 'boss_mob') {
      drawHealthBar(
        canvas,
        npc.x - 36,
        npc.y - 32,
        72,
        8,
        npc.hp,
        npc.maxHp,
        C_RED,
        '👑 DON BOWSER-MOB',
        pixelFont
      );
    } else if (npc.hp < npc.maxHp) {
      drawHealthBar(canvas, npc.x - 14, npc.y - 14, 28, 3.5, npc.hp, npc.maxHp);
    }
  }

  // --------------------------------------------------------------------------
  // Pass 11: Jugador a Pie (Sombrero Rojo Visto Desde Arriba, Guantes, Mira)
  // --------------------------------------------------------------------------
  if (world.player.vehicleId == null) {
    const p = world.player;
    const invulnFlash = p.invulnTimer > 0 && Math.floor(world.frameCount / 3) % 2 === 0;

    if (!invulnFlash) {
      // Sombra
      shadowPaint.setColor(C_SHADOW);
      canvas.drawCircle(p.x + 2, p.y + 4, 8, shadowPaint);

      // Dash trail si está en dash
      if (p.dashTimer > 0) {
        fillPaint.setColor(getSkiaColor('rgba(239, 68, 68, 0.4)'));
        canvas.drawCircle(p.x - p.vx * 3, p.y - p.vy * 3, 7, fillPaint);
      }

      canvas.save();
      canvas.translate(p.x, p.y);
      canvas.rotate((p.angle * 180) / Math.PI, 0, 0);

      // Hombros azules / Peto de fontanero
      fillPaint.setColor(C_PLUMBER_BLUE);
      canvas.drawCircle(-2, 0, 7.5, fillPaint);
      // Botones dorados
      fillPaint.setColor(C_PLUMBER_BUTTON);
      canvas.drawCircle(0, -3.5, 1.2, fillPaint);
      canvas.drawCircle(0, 3.5, 1.2, fillPaint);

      // Guantes blancos con Blaster
      fillPaint.setColor(C_PLUMBER_GLOVE);
      canvas.drawCircle(5, -4, 2.5, fillPaint);
      canvas.drawCircle(5, 4, 2.5, fillPaint);
      fillPaint.setColor(C_BLACK);
      canvas.drawRect(Skia.XYWHRect(5, -1.5, 8, 3), fillPaint);
      fillPaint.setColor(C_NEON_CYAN);
      canvas.drawCircle(13, 0, 1.5, fillPaint); // Muzzle plasma

      // Sombrero rojo icónico visto desde arriba con visera frontal
      fillPaint.setColor(C_PLUMBER_RED);
      canvas.drawCircle(0, 0, 6, fillPaint);
      fillPaint.setColor(C_PLUMBER_CAP);
      canvas.drawRect(Skia.XYWHRect(2, -4, 4, 8), fillPaint);

      canvas.restore();

      // Barra de vida si está dañado
      if (p.hp < p.maxHp) {
        drawHealthBar(canvas, p.x - 16, p.y - 20, 32, 4, p.hp, p.maxHp, C_GREEN);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Pass 12: Proyectiles
  // --------------------------------------------------------------------------
  for (const proj of world.projectiles) {
    if (
      proj.x < world.cameraX ||
      proj.x > world.cameraX + viewW ||
      proj.y < world.cameraY ||
      proj.y > world.cameraY + viewH
    ) {
      continue;
    }
    const color = getSkiaColor(proj.color);
    fillPaint.setColor(color);
    canvas.drawCircle(proj.x, proj.y, proj.radius, fillPaint);
    // Destello blanco en el núcleo
    fillPaint.setColor(C_WHITE);
    canvas.drawCircle(proj.x, proj.y, Math.max(1, proj.radius * 0.4), fillPaint);
  }

  // --------------------------------------------------------------------------
  // Pass 13: Partículas (Explosiones, Chispas, Humo)
  // --------------------------------------------------------------------------
  for (const pt of world.particles) {
    if (
      pt.x < world.cameraX ||
      pt.x > world.cameraX + viewW ||
      pt.y < world.cameraY ||
      pt.y > world.cameraY + viewH
    ) {
      continue;
    }
    const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    fillPaint.setColor(getSkiaColor(pt.color));
    canvas.drawCircle(pt.x, pt.y, pt.size * alpha, fillPaint);
  }

  // --------------------------------------------------------------------------
  // Pass 14: Textos Flotantes
  // --------------------------------------------------------------------------
  if (pixelFont) {
    for (const ft of world.floatTexts) {
      drawSafeText(
        canvas,
        ft.text,
        ft.x - ft.text.length * 3,
        ft.y,
        getSkiaColor(ft.color),
        pixelFont,
        0.75,
        true
      );
    }
  }

  // --------------------------------------------------------------------------
  // Pass 15: Flecha GPS Alrededor del Jugador Apuntando al Objetivo Activo
  // --------------------------------------------------------------------------
  let targetPos: { x: number; y: number } | null = null;
  let targetColor = C_NEON_CYAN;

  if (!world.missions.raceDone) {
    const cp = world.raceCheckpoints[world.missions.raceIndex];
    if (cp) {
      targetPos = { x: cp.x, y: cp.y };
      targetColor = C_NEON_CYAN;
    }
  } else if (world.missions.deliveryState === 'ready') {
    targetPos = world.missions.deliveryPickup;
    targetColor = C_GOLD;
  } else if (world.missions.deliveryState === 'carrying') {
    targetPos = world.missions.deliveryDropoff;
    targetColor = C_GREEN;
  } else if (!world.missions.bossDone) {
    const boss = world.npcs.find((n) => n.kind === 'boss_mob' && n.alive);
    if (boss) {
      targetPos = { x: boss.x, y: boss.y };
      targetColor = C_RED;
    }
  } else if (!world.missions.demolitionDone) {
    const turret = world.turrets.find((t) => t.alive);
    if (turret) {
      targetPos = { x: turret.x, y: turret.y };
      targetColor = C_ORANGE;
    }
  }

  if (targetPos && unitArrowPath) {
    const pX = world.player.x;
    const pY = world.player.y;
    const angleToTarget = Math.atan2(targetPos.y - pY, targetPos.x - pX);
    const orbitR = 34 + Math.sin(world.frameCount * 0.12) * 3;
    const arrowX = pX + Math.cos(angleToTarget) * orbitR;
    const arrowY = pY + Math.sin(angleToTarget) * orbitR;

    canvas.save();
    canvas.translate(arrowX, arrowY);
    canvas.rotate((angleToTarget * 180) / Math.PI, 0, 0);
    fillPaint.setColor(targetColor);
    canvas.scale(9, 9);
    canvas.drawPath(unitArrowPath, fillPaint);
    canvas.restore();
  }

  canvas.restore(); // Fin del espacio del mundo

  // ==========================================================================
  // Pass 16: HUD Integrado en Canvas (Pantalla / Screen Space)
  // ==========================================================================

  // 1. Mini-Mapa Radar GPS (Esquina Superior Derecha, w = 104, h = 78)
  const mapW = 104;
  const mapH = 78;
  const mapX = viewW - mapW - 10;
  const mapY = 8;

  // Fondo del radar y borde neón
  fillPaint.setColor(C_RADAR_BG);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(mapX, mapY, mapW, mapH), 6, 6), fillPaint);
  strokePaint.setColor(C_RADAR_BORDER);
  strokePaint.setStrokeWidth(1.5);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(mapX, mapY, mapW, mapH), 6, 6), strokePaint);

  // Cuadrícula y calles en miniatura
  fillPaint.setColor(C_RADAR_GRID);
  canvas.drawRect(Skia.XYWHRect(mapX + 6, mapY + 28, mapW - 12, 2), fillPaint);
  canvas.drawRect(Skia.XYWHRect(mapX + 6, mapY + 50, mapW - 12, 2), fillPaint);
  canvas.drawRect(Skia.XYWHRect(mapX + 38, mapY + 16, 2, mapH - 22), fillPaint);
  canvas.drawRect(Skia.XYWHRect(mapX + 70, mapY + 16, 2, mapH - 22), fillPaint);

  // Mar al sur en el radar
  fillPaint.setColor(getSkiaColor('rgba(2, 132, 199, 0.45)'));
  canvas.drawRect(Skia.XYWHRect(mapX + 4, mapY + mapH - 12, mapW - 8, 8), fillPaint);

  // Barrido giratorio del radar
  const sweepAngle = (world.frameCount * 0.05) % (Math.PI * 2);
  const radarCx = mapX + mapW / 2;
  const radarCy = mapY + mapH / 2 + 6;
  strokePaint.setColor(C_RADAR_SWEEP);
  strokePaint.setStrokeWidth(1.5);
  canvas.drawLine(
    radarCx,
    radarCy,
    radarCx + Math.cos(sweepAngle) * 36,
    radarCy + Math.sin(sweepAngle) * 36,
    strokePaint
  );

  // Conversión de coordenadas de mundo a radar
  const innerW = mapW - 12;
  const innerH = mapH - 24;
  const toRadarX = (wx: number) => mapX + 6 + (wx / (world.cols * 32)) * innerW;
  const toRadarY = (wy: number) => mapY + 16 + (wy / (world.rows * 32)) * innerH;

  // Blips de Talleres Pay'n'Spray (Verde)
  fillPaint.setColor(C_GREEN);
  for (const g of world.garages) {
    canvas.drawRect(Skia.XYWHRect(toRadarX(g.x) - 2, toRadarY(g.y) - 2, 4, 4), fillPaint);
  }

  // Blips de Autos Especiales (Amarillos)
  fillPaint.setColor(C_GOLD);
  for (const v of world.vehicles) {
    if (v.id <= 3 && v.driver !== 'player') {
      canvas.drawCircle(toRadarX(v.x), toRadarY(v.y), 2.2, fillPaint);
    }
  }

  // Blips de Patrullas (Rojo/Azul Parpadeante)
  const policeBlink = world.frameCount % 16 < 8;
  fillPaint.setColor(policeBlink ? C_RED : C_BLUE);
  for (const v of world.vehicles) {
    if (v.kind === 'patrulla') {
      canvas.drawCircle(toRadarX(v.x), toRadarY(v.y), 2.5, fillPaint);
    }
  }

  // Blip de Objetivo Activo (Magenta / Dorado Pulsante)
  if (targetPos) {
    const pulseTarget = 2.5 + Math.sin(world.frameCount * 0.2) * 1.5;
    fillPaint.setColor(targetColor);
    canvas.drawCircle(toRadarX(targetPos.x), toRadarY(targetPos.y), pulseTarget, fillPaint);
  }

  // Blip del Jugador (Punto Verde Brillante con Ping Radar)
  const pRx = toRadarX(world.player.x);
  const pRy = toRadarY(world.player.y);
  fillPaint.setColor(C_GREEN);
  canvas.drawCircle(pRx, pRy, 3.2, fillPaint);
  const pingR = 3 + (world.frameCount % 20) * 0.35;
  strokePaint.setColor(getSkiaColor('rgba(34, 197, 94, 0.45)'));
  strokePaint.setStrokeWidth(1);
  canvas.drawCircle(pRx, pRy, pingR, strokePaint);

  // Etiqueta del Radar
  if (pixelFont) {
    drawSafeText(canvas, 'GPS RADAR', mapX + 8, mapY + 12, C_NEON_CYAN, pixelFont, 0.55, false);
  }

  // 2. Estrellas de Búsqueda Policial (★ 1..5)
  if (world.wantedLevel > 0) {
    const starY = 14;
    for (let i = 0; i < 5; i++) {
      const starX = 14 + i * 16;
      const isWanted = i < world.wantedLevel;
      const starBlink = (world.frameCount + i * 4) % 16 < 8;
      const starColor = isWanted ? (starBlink ? C_RED : C_GOLD) : C_HUD_BORDER;

      drawStar(canvas, starX, starY, isWanted ? 6.5 : 5, starColor, isWanted ? C_BLACK : undefined);
    }

    if (world.wantedLevel >= 3 && pixelFont) {
      drawSafeText(canvas, '¡ALERTA POLICIAL!', 14, 30, C_RED, pixelFont, 0.65, true);
    }
  }

  // 3. Indicador de Dinero ($)
  const cashY = world.wantedLevel > 0 ? (world.wantedLevel >= 3 ? 38 : 28) : 10;
  fillPaint.setColor(C_CASH_BG);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(10, cashY, 84, 20), 4, 4), fillPaint);
  strokePaint.setColor(C_CASH_BORDER);
  strokePaint.setStrokeWidth(1.2);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(10, cashY, 84, 20), 4, 4), strokePaint);

  if (pixelFont) {
    drawSafeText(canvas, `$${world.cash}`, 18, cashY + 14, C_CASH_TEXT, pixelFont, 0.75, true);
  }

  // 4. Panel de Vehículo: Velocímetro / Nitro / HP si está conduciendo
  if (world.player.vehicleId != null) {
    const activeVeh = world.vehicles.find((v) => v.id === world.player.vehicleId);
    if (activeVeh) {
      const panelW = 138;
      const panelH = 46;
      const panelX = 10;
      const panelY = viewH - panelH - 8;

      fillPaint.setColor(C_HUD_BG);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(panelX, panelY, panelW, panelH), 6, 6), fillPaint);
      strokePaint.setColor(C_RADAR_BORDER);
      strokePaint.setStrokeWidth(1.5);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(panelX, panelY, panelW, panelH), 6, 6), strokePaint);

      // Velocidad Digital
      const kmh = Math.round(activeVeh.speed * 18);
      if (pixelFont) {
        drawSafeText(canvas, `${kmh} KM/H`, panelX + 8, panelY + 14, C_WHITE, pixelFont, 0.75, true);
      }

      // Barra de Nitro
      const nitroPct = Math.max(0, Math.min(1, activeVeh.nitro / 100));
      fillPaint.setColor(C_BLACK);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(panelX + 8, panelY + 18, panelW - 16, 8), 2, 2), fillPaint);
      fillPaint.setColor(C_NITRO_BLUE);
      canvas.drawRRect(
        Skia.RRectXY(Skia.XYWHRect(panelX + 9, panelY + 19, (panelW - 18) * nitroPct, 6), 1, 1),
        fillPaint
      );
      if (pixelFont) {
        drawSafeText(canvas, 'NITRO', panelX + panelW - 44, panelY + 25, C_WHITE, pixelFont, 0.5, true);
      }

      // Barra de Vida del Auto
      const vehHpPct = Math.max(0, Math.min(1, activeVeh.hp / activeVeh.maxHp));
      fillPaint.setColor(C_BLACK);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(panelX + 8, panelY + 30, panelW - 16, 8), 2, 2), fillPaint);
      fillPaint.setColor(vehHpPct > 0.4 ? C_GREEN : C_RED);
      canvas.drawRRect(
        Skia.RRectXY(Skia.XYWHRect(panelX + 9, panelY + 31, (panelW - 18) * vehHpPct, 6), 1, 1),
        fillPaint
      );
      if (pixelFont) {
        drawSafeText(canvas, 'BLINDAJE', panelX + panelW - 54, panelY + 37, C_WHITE, pixelFont, 0.5, true);
      }
    }
  }

  // 5. Aviso Flotante de Pista (world.activeHint)
  if (world.hintTimer > 0 && world.activeHint && pixelFont) {
    const hintText = world.activeHint;
    const bannerW = Math.min(viewW - 40, hintText.length * 7 + 24);
    const bannerX = (viewW - bannerW) / 2;
    const bannerY = viewH - 24;

    fillPaint.setColor(C_HUD_BG);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bannerX, bannerY - 14, bannerW, 20), 5, 5), fillPaint);
    strokePaint.setColor(C_GOLD);
    strokePaint.setStrokeWidth(1.2);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bannerX, bannerY - 14, bannerW, 20), 5, 5), strokePaint);

    drawSafeText(canvas, hintText, bannerX + 12, bannerY, C_GOLD, pixelFont, 0.65, true);
  }
}
