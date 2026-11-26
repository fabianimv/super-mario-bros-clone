// ============================================================================
// REINOS ABIERTOS - Renderizador Skia
// Cielo con ciclo día/noche, parallax, tiles con detalle, capa de pintura,
// agua translúcida, oscuridad con linterna y HUD con minimapa con niebla.
// ============================================================================

import {
  PaintStyle,
  Skia,
  TileMode,
  type SkCanvas,
  type SkColor,
  type SkFont,
  type SkPicture,
} from '@shopify/react-native-skia';
import { EXPLORE_CELL, REALM_TILE } from './realmBuilder';
import { fragmentsCollected, PAINT_NAMES, returnHoldProgress } from './realmPhysics';
import { T, type RealmEnemy, type RealmPickup, type RealmWorld } from './realmTypes';

const TS = REALM_TILE;

const fill = Skia.Paint();
fill.setStyle(PaintStyle.Fill);
fill.setAntiAlias(true);
const tileFill = Skia.Paint();
tileFill.setStyle(PaintStyle.Fill);
tileFill.setAntiAlias(false);
const stroke = Skia.Paint();
stroke.setStyle(PaintStyle.Stroke);
stroke.setAntiAlias(true);
const textPaint = Skia.Paint();
textPaint.setAntiAlias(true);
const shaderPaint = Skia.Paint();
shaderPaint.setStyle(PaintStyle.Fill);

const colorCache = new Map<string, SkColor>();
function col(hex: string): SkColor {
  let c = colorCache.get(hex);
  if (!c) {
    c = Skia.Color(hex);
    colorCache.set(hex, c);
  }
  return c;
}

function rect(canvas: SkCanvas, x: number, y: number, w: number, h: number, color: string, aa = false): void {
  const p = aa ? fill : tileFill;
  p.setColor(col(color));
  canvas.drawRect(Skia.XYWHRect(x, y, w, h), p);
}
function rrect(canvas: SkCanvas, x: number, y: number, w: number, h: number, r: number, color: string): void {
  fill.setColor(col(color));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), fill);
}
function circle(canvas: SkCanvas, x: number, y: number, r: number, color: string): void {
  fill.setColor(col(color));
  canvas.drawCircle(x, y, r, fill);
}
function ring(canvas: SkCanvas, x: number, y: number, r: number, color: string, width: number): void {
  stroke.setColor(col(color));
  stroke.setStrokeWidth(width);
  canvas.drawCircle(x, y, r, stroke);
}
function text(
  canvas: SkCanvas,
  font: SkFont | null | undefined,
  s: string,
  x: number,
  y: number,
  color: string,
  scale = 0.6,
  shadow = true
): void {
  if (!font) return;
  s = pixelSafe(s);
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(scale, scale);
  if (shadow) {
    textPaint.setColor(col('#000000'));
    canvas.drawText(s, 1.5, 1.5, textPaint, font);
  }
  textPaint.setColor(col(color));
  canvas.drawText(s, 0, 0, textPaint, font);
  canvas.restore();
}
// La fuente pixel no trae mayúsculas acentuadas: se reemplazan por su base
const ACCENT_MAP: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U', '¡': '!', '¿': '?' };
function pixelSafe(s: string): string {
  return s.replace(/[ÁÉÍÓÚÜ¡¿]/g, (ch) => ACCENT_MAP[ch] ?? ch);
}
function textWidth(font: SkFont | null | undefined, s: string, scale: number): number {
  s = pixelSafe(s);
  if (!font) return s.length * 11 * scale;
  return font.getTextWidth(s) * scale;
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

function hash(c: number, r: number): number {
  let h = (c * 374761393 + r * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 0 = pleno día, 1 = plena noche (con transiciones suaves). */
export function nightFactor(w: RealmWorld): number {
  if (!w.hasDayNight) return 0;
  const ph = (w.clock % w.dayLength) / w.dayLength;
  if (ph < 0.52) return ph < 0.06 ? 1 - ph / 0.06 : 0;
  if (ph < 0.62) return (ph - 0.52) / 0.1;
  if (ph > 0.95) return 1 - (ph - 0.95) / 0.05;
  return 1;
}

const unitStar = (() => {
  const path = Skia.PathBuilder.Make();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.45;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  path.close();
  return path.build();
})();
const unitHeart = (() => {
  const p = Skia.PathBuilder.Make();
  p.moveTo(0, 0.35);
  p.cubicTo(-1.1, -0.35, -0.45, -1.1, 0, -0.45);
  p.cubicTo(0.45, -1.1, 1.1, -0.35, 0, 0.35);
  p.close();
  return p.build();
})();
const spikePath = (() => {
  const p = Skia.PathBuilder.Make();
  for (let i = 0; i < 4; i++) {
    p.moveTo(i * 8, 32);
    p.lineTo(i * 8 + 4, 14);
    p.lineTo(i * 8 + 8, 32);
    p.close();
  }
  return p.build();
})();

function star(canvas: SkCanvas, x: number, y: number, r: number, color: string, outline?: string): void {
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(r, r);
  fill.setColor(col(color));
  canvas.drawPath(unitStar, fill);
  if (outline) {
    stroke.setColor(col(outline));
    stroke.setStrokeWidth(0.14);
    canvas.drawPath(unitStar, stroke);
  }
  canvas.restore();
}
function heart(canvas: SkCanvas, x: number, y: number, r: number, color: string): void {
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(r, r);
  fill.setColor(col(color));
  canvas.drawPath(unitHeart, fill);
  canvas.restore();
}

// ---------------------------------------------------------------------------
// Paletas por reino
// ---------------------------------------------------------------------------
interface Palette {
  skyTopDay: string;
  skyBotDay: string;
  skyTopNight: string;
  skyBotNight: string;
  far: string;
  near: string;
  rock: string;
  rockDark: string;
  grass: string;
}
const PALETTES: Record<RealmWorld['realm'], Palette> = {
  roots: {
    skyTopDay: '#4aa3f0',
    skyBotDay: '#c7ecff',
    skyTopNight: '#070b26',
    skyBotNight: '#2b1d5c',
    far: '#5b8f6a',
    near: '#2f6b45',
    rock: '#6b7280',
    rockDark: '#4b5563',
    grass: '#4ade80',
  },
  ink: {
    skyTopDay: '#7c3aed',
    skyBotDay: '#fda4af',
    skyTopNight: '#7c3aed',
    skyBotNight: '#fda4af',
    far: '#c084fc',
    near: '#a855f7',
    rock: '#a8a29e',
    rockDark: '#78716c',
    grass: '#f472b6',
  },
  magnet: {
    skyTopDay: '#0f172a',
    skyBotDay: '#475569',
    skyTopNight: '#0f172a',
    skyBotNight: '#475569',
    far: '#1e293b',
    near: '#334155',
    rock: '#57534e',
    rockDark: '#3f3a36',
    grass: '#94a3b8',
  },
};

const PAINT_COLOR: Record<number, string> = { 1: '#3b82f6', 2: '#f97316', 3: '#22c55e' };
const PAINT_LIGHT: Record<number, string> = { 1: '#93c5fd', 2: '#fdba74', 3: '#86efac' };

// ---------------------------------------------------------------------------
// Fondo
// ---------------------------------------------------------------------------
function drawBackground(canvas: SkCanvas, w: RealmWorld, viewW: number, viewH: number, nf: number): void {
  const pal = PALETTES[w.realm];
  const top = lerpHex(pal.skyTopDay, pal.skyTopNight, nf);
  const bot = lerpHex(pal.skyBotDay, pal.skyBotNight, nf);
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    rect(canvas, 0, (i * viewH) / bands, viewW, viewH / bands + 1, lerpHex(top, bot, i / (bands - 1)));
  }
  // Estrellas de noche (o chispas en la fosa)
  if (nf > 0.05 || w.realm === 'magnet') {
    const alpha = w.realm === 'magnet' ? 0.5 : nf;
    for (let i = 0; i < 40; i++) {
      const sx = ((hash(i, 3) * 4000 - w.cameraX * 0.05) % viewW + viewW) % viewW;
      const sy = hash(i, 9) * viewH * 0.6;
      const tw = 0.5 + 0.5 * Math.sin(w.frame * 0.05 + i);
      fill.setColor(col('#ffffff'));
      fill.setAlphaf(alpha * tw);
      canvas.drawCircle(sx, sy, 1.2 + (i % 3) * 0.5, fill);
      fill.setAlphaf(1);
    }
  }
  if (w.realm === 'roots' && nf < 0.9) {
    // Sol
    const sunY = 70 + nf * 160;
    fill.setColor(col('#fde68a'));
    fill.setAlphaf(1 - nf);
    canvas.drawCircle(viewW * 0.78, sunY, 26, fill);
    fill.setAlphaf(1);
  } else if (w.realm === 'roots') {
    circle(canvas, viewW * 0.62, 66, 18, '#e0e7ff');
    circle(canvas, viewW * 0.62 + 7, 61, 15, lerpHex(pal.skyTopNight, pal.skyBotNight, 0.15));
  }
  if (w.realm === 'ink') {
    circle(canvas, viewW * 0.7, viewH * 0.62, 70, '#fde68a');
  }

  // Siluetas en parallax
  const layers: Array<[number, string, number, number]> =
    w.realm === 'magnet'
      ? [
          [0.15, pal.far, viewH * 0.45, 40],
          [0.3, pal.near, viewH * 0.58, 60],
        ]
      : [
          [0.12, lerpHex(pal.far, '#0b1026', nf * 0.7), viewH * 0.55, 50],
          [0.28, lerpHex(pal.near, '#050816', nf * 0.7), viewH * 0.68, 70],
        ];
  for (const [factor, color, baseY, amp] of layers) {
    const path = Skia.PathBuilder.Make();
    path.moveTo(0, viewH);
    const off = w.cameraX * factor;
    const yOff = -w.cameraY * factor * 0.35;
    for (let x = 0; x <= viewW + 24; x += 24) {
      const wx = x + off;
      let y: number;
      if (w.realm === 'magnet') {
        // Torres industriales escalonadas
        const k = Math.floor(wx / 90);
        y = baseY - (hash(k, 77) * amp + (hash(k, 5) > 0.7 ? amp : 0));
      } else if (w.realm === 'ink') {
        y = baseY + Math.sin(wx * 0.006) * amp * 0.6 + Math.sin(wx * 0.017) * amp * 0.3;
      } else {
        y = baseY - Math.abs(Math.sin(wx * 0.004)) * amp - Math.sin(wx * 0.013) * amp * 0.35;
      }
      path.lineTo(x, y + yOff);
    }
    path.lineTo(viewW, viewH);
    path.close();
    fill.setColor(col(color));
    if (w.realm === 'ink') fill.setAlphaf(0.55);
    canvas.drawPath(path.build(), fill);
    fill.setAlphaf(1);
  }
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------
function drawTile(canvas: SkCanvas, w: RealmWorld, t: number, c: number, r: number, x: number, y: number, nf: number): void {
  const pal = PALETTES[w.realm];
  const h = hash(c, r);
  switch (t) {
    case T.DIRT:
    case T.GRASS: {
      rect(canvas, x, y, TS, TS, r > 40 ? '#5c3a1a' : '#7c4a21');
      rect(canvas, x + 4 + h * 18, y + 6 + h * 14, 4, 3, '#5a3415');
      rect(canvas, x + 20 - h * 10, y + 20, 3, 3, '#956135');
      if (t === T.GRASS) {
        const g = w.realm === 'ink' ? '#f472b6' : '#22c55e';
        rect(canvas, x, y, TS, 9, g);
        rect(canvas, x, y + 9, TS, 3, w.realm === 'ink' ? '#be185d' : '#15803d');
        rect(canvas, x + 3 + h * 6, y - 4, 2, 5, g);
        rect(canvas, x + 18 + h * 6, y - 3, 2, 4, g);
      }
      break;
    }
    case T.STONE:
    case T.ORE: {
      rect(canvas, x, y, TS, TS, pal.rock);
      rect(canvas, x, y, TS, 3, '#9ca3af');
      rect(canvas, x + 6 + h * 10, y + 10, 10, 2, pal.rockDark);
      rect(canvas, x + 14, y + 22 - h * 6, 8, 2, pal.rockDark);
      if (t === T.ORE) {
        rect(canvas, x + 6, y + 8, 6, 6, '#fbbf24');
        rect(canvas, x + 19, y + 17, 7, 6, '#f59e0b');
        rect(canvas, x + 8, y + 21, 4, 4, '#fde68a');
      }
      break;
    }
    case T.CRYSTAL: {
      rect(canvas, x, y, TS, TS, '#6b21a8');
      const path = Skia.PathBuilder.Make();
      path.moveTo(x + 6, y + 28);
      path.lineTo(x + 12, y + 4);
      path.lineTo(x + 18, y + 28);
      path.close();
      path.moveTo(x + 16, y + 28);
      path.lineTo(x + 23, y + 10);
      path.lineTo(x + 29, y + 28);
      path.close();
      fill.setColor(col('#d8b4fe'));
      canvas.drawPath(path.build(), fill);
      rect(canvas, x + 11, y + 8, 2, 10, '#faf5ff');
      break;
    }
    case T.BEDROCK:
      rect(canvas, x, y, TS, TS, '#111827');
      rect(canvas, x + 4 + h * 12, y + 6, 10, 6, '#1f2937');
      rect(canvas, x + 2, y + 20 - h * 6, 14, 5, '#1f2937');
      break;
    case T.ROOT:
      rect(canvas, x, y, TS, TS, '#78350f');
      rect(canvas, x + 6, y, 3, TS, '#92400e');
      rect(canvas, x + 18, y, 2, TS, '#5c2a0b');
      rect(canvas, x + 25, y, 3, TS, '#92400e');
      break;
    case T.NIGHT_PLAT: {
      if (nf > 0.5) {
        const glow = 0.6 + 0.4 * Math.sin(w.frame * 0.1 + c);
        fill.setColor(col('#bef264'));
        fill.setAlphaf(0.25 * glow);
        canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x - 4, y - 6, TS + 8, 20), 8, 8), fill);
        fill.setAlphaf(1);
        rrect(canvas, x + 1, y, TS - 2, 9, 4, '#a3e635');
        circle(canvas, x + 8, y + 4, 2, '#fefce8');
        circle(canvas, x + 22, y + 4, 2, '#fefce8');
      } else {
        stroke.setColor(col('#a3e635'));
        stroke.setAlphaf(0.35);
        stroke.setStrokeWidth(1.5);
        canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 2, y + 1, TS - 4, 7), 3, 3), stroke);
        stroke.setAlphaf(1);
      }
      break;
    }
    case T.VINE: {
      rect(canvas, x + 14, y, 4, TS, '#15803d');
      const sway = Math.sin(w.frame * 0.05 + r) * 2;
      fill.setColor(col('#4ade80'));
      canvas.drawOval(Skia.XYWHRect(x + 4 + sway, y + 4, 10, 7), fill);
      canvas.drawOval(Skia.XYWHRect(x + 18 + sway, y + 18, 10, 7), fill);
      break;
    }
    case T.CLOUD: {
      circle(canvas, x + 8, y + 10, 9, '#fdf4ff');
      circle(canvas, x + 20, y + 7, 11, '#ffffff');
      rect(canvas, x, y + 8, TS, 8, '#fdf4ff', true);
      break;
    }
    case T.ROCK: {
      rect(canvas, x, y, TS, TS, w.realm === 'magnet' ? '#44403c' : '#8b7e99');
      rect(canvas, x + 4 + h * 14, y + 8, 9, 4, w.realm === 'magnet' ? '#57534e' : '#a99bb8');
      rect(canvas, x + 2, y + 22, 12 + h * 8, 3, w.realm === 'magnet' ? '#292524' : '#6d6080');
      break;
    }
    case T.CORAL:
      rect(canvas, x, y, TS, TS, '#44403c');
      circle(canvas, x + 8, y + 8, 7, '#fb7185');
      circle(canvas, x + 22, y + 12, 6, '#fdba74');
      circle(canvas, x + 14, y + 22, 5, '#f472b6');
      break;
    case T.METAL:
      rect(canvas, x, y, TS, TS, '#64748b');
      rect(canvas, x, y, TS, 4, '#94a3b8');
      rect(canvas, x, y + TS - 3, TS, 3, '#334155');
      circle(canvas, x + 6, y + 10, 2, '#cbd5e1');
      circle(canvas, x + 26, y + 10, 2, '#cbd5e1');
      break;
    case T.MAGNET_RED:
    case T.MAGNET_BLUE: {
      const red = t === T.MAGNET_RED;
      const pulse = 0.5 + 0.5 * Math.sin(w.frame * 0.12 + c * 0.6);
      rect(canvas, x, y, TS, TS, red ? '#b91c1c' : '#1d4ed8');
      rect(canvas, x + 2, y + 2, TS - 4, TS - 4, red ? '#ef4444' : '#3b82f6');
      rect(canvas, x + 10, y + 14, 12, 4, '#ffffff');
      if (red) rect(canvas, x + 14, y + 10, 4, 12, '#ffffff');
      stroke.setColor(col(red ? '#fecaca' : '#bfdbfe'));
      stroke.setAlphaf(0.4 + pulse * 0.5);
      stroke.setStrokeWidth(2);
      canvas.drawRect(Skia.XYWHRect(x + 1, y + 1, TS - 2, TS - 2), stroke);
      stroke.setAlphaf(1);
      break;
    }
    case T.SPIKES:
      canvas.save();
      canvas.translate(x, y);
      fill.setColor(col('#e5e7eb'));
      canvas.drawPath(spikePath, fill);
      canvas.restore();
      break;
    case T.PLANK:
      rect(canvas, x, y, TS, 8, '#a16207');
      rect(canvas, x, y + 6, TS, 2, '#713f12');
      rect(canvas, x + 15, y, 2, 8, '#713f12');
      break;
    case T.INK_SEA: {
      rect(canvas, x, y, TS, TS, '#2e1065');
      if (tileAtLocal(w, c, r - 1) !== T.INK_SEA) {
        const wv = Math.sin(w.frame * 0.08 + c * 0.7) * 3;
        rect(canvas, x, y + wv, TS, 6, '#7e22ce');
        rect(canvas, x + 6, y + 2 + wv, 10, 2, '#e9d5ff');
      }
      break;
    }
    default:
      break;
  }
}

function tileAtLocal(w: RealmWorld, c: number, r: number): number {
  if (c < 0 || r < 0 || c >= w.cols || r >= w.rows) return T.BEDROCK;
  return w.tiles[r * w.cols + c];
}

function isPaintable(t: number): boolean {
  return t !== T.AIR && t !== T.WATER && t !== T.VINE && t !== T.CLOUD && t !== T.PLANK && t !== T.NIGHT_PLAT && t !== T.SPIKES && t !== T.INK_SEA && t !== T.BEDROCK;
}

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------
function drawPickup(canvas: SkCanvas, w: RealmWorld, it: RealmPickup, font: SkFont | null | undefined): void {
  const bob = Math.sin((w.frame + it.bob) * 0.08) * 3;
  const x = it.x;
  const y = it.y + bob;
  switch (it.kind) {
    case 'orb': {
      const spin = Math.abs(Math.cos((w.frame + it.bob) * 0.07));
      fill.setColor(col('#22d3ee'));
      canvas.drawOval(Skia.XYWHRect(x - 7 * spin, y - 7, 14 * spin + 1, 14), fill);
      fill.setColor(col('#cffafe'));
      canvas.drawOval(Skia.XYWHRect(x - 3 * spin, y - 4, 4 * spin + 1, 5), fill);
      break;
    }
    case 'heart':
      heart(canvas, x, y, 11, '#ef4444');
      break;
    case 'seed':
      fill.setColor(col('#16a34a'));
      canvas.drawOval(Skia.XYWHRect(x - 6, y - 8, 12, 16), fill);
      rect(canvas, x - 1, y - 13, 2, 6, '#4ade80', true);
      circle(canvas, x - 2, y - 3, 2, '#bbf7d0');
      break;
    default: {
      // Mejora: cofre brillante con ícono
      const glow = 0.5 + 0.5 * Math.sin(w.frame * 0.1);
      fill.setColor(col('#fde047'));
      fill.setAlphaf(0.25 + glow * 0.25);
      canvas.drawCircle(x, y, 26, fill);
      fill.setAlphaf(1);
      rrect(canvas, x - 14, y - 12, 28, 24, 5, '#7c2d12');
      rrect(canvas, x - 12, y - 10, 24, 20, 4, '#f59e0b');
      const label =
        it.kind === 'up_double_jump'
          ? '2J'
          : it.kind === 'up_diamond_drill'
          ? 'DM'
          : it.kind === 'up_paint_orange'
          ? 'NA'
          : it.kind === 'up_paint_green'
          ? 'VE'
          : it.kind === 'up_oxygen'
          ? 'O2'
          : 'IM';
      if (it.kind === 'up_paint_orange') rect(canvas, x - 12, y - 10, 24, 6, '#f97316', true);
      if (it.kind === 'up_paint_green') rect(canvas, x - 12, y - 10, 24, 6, '#22c55e', true);
      text(canvas, font, label, x - 9, y + 6, '#fffbeb', 0.7);
      break;
    }
  }
}

function drawEnemy(canvas: SkCanvas, w: RealmWorld, en: RealmEnemy): void {
  const x = en.x;
  const y = en.y;
  const flash = en.hurtTimer > 0 && en.hurtTimer % 4 < 2;
  const step = Math.floor(en.tick / 8) % 2;
  switch (en.kind) {
    case 'mole':
      rrect(canvas, x, y + 2, en.w, en.h - 2, 9, flash ? '#ffffff' : '#57534e');
      circle(canvas, x + (en.dir > 0 ? en.w - 4 : 4), y + 10, 5, '#fda4af');
      circle(canvas, x + (en.dir > 0 ? en.w - 9 : 9), y + 7, 2, '#000000');
      rect(canvas, x + 3, y + en.h - 3 + step, 6, 3, '#292524');
      rect(canvas, x + en.w - 9, y + en.h - 3 - step + 1, 6, 3, '#292524');
      break;
    case 'shade': {
      fill.setColor(col(flash ? '#ffffff' : '#4c1d95'));
      fill.setAlphaf(0.85);
      canvas.drawCircle(x + en.w / 2, y + en.h / 2, en.w / 2 + Math.sin(en.tick * 0.2) * 2, fill);
      fill.setAlphaf(1);
      circle(canvas, x + 7, y + 9, 3, '#f0abfc');
      circle(canvas, x + 15, y + 9, 3, '#f0abfc');
      break;
    }
    case 'gull': {
      const flap = Math.sin(en.tick * 0.3) * 7;
      rrect(canvas, x + 4, y + 4, en.w - 8, en.h - 6, 6, flash ? '#ffffff' : '#f5f3ff');
      const path = Skia.PathBuilder.Make();
      path.moveTo(x + 6, y + 8);
      path.lineTo(x + en.w / 2, y + 2 - flap);
      path.lineTo(x + en.w - 6, y + 8);
      path.close();
      fill.setColor(col('#a78bfa'));
      canvas.drawPath(path.build(), fill);
      circle(canvas, x + (en.dir > 0 ? en.w - 7 : 7), y + 8, 2, '#1e1b4b');
      rect(canvas, x + (en.dir > 0 ? en.w - 3 : -1), y + 9, 4, 2, '#f59e0b');
      break;
    }
    case 'eraser':
      rrect(canvas, x, y + 4, en.w, en.h - 4, 5, flash ? '#ffffff' : '#fda4af');
      rect(canvas, x, y + en.h - 7, en.w, 7, '#e879f9');
      circle(canvas, x + 8, y + 11, 2.5, '#111827');
      circle(canvas, x + en.w - 8, y + 11, 2.5, '#111827');
      break;
    case 'jelly': {
      fill.setColor(col(flash ? '#ffffff' : '#f0abfc'));
      fill.setAlphaf(0.8);
      canvas.drawOval(Skia.XYWHRect(x, y, en.w, en.h * 0.6), fill);
      fill.setAlphaf(1);
      for (let i = 0; i < 4; i++) {
        const wav = Math.sin(en.tick * 0.15 + i) * 2;
        rect(canvas, x + 3 + i * 5 + wav, y + en.h * 0.55, 2, en.h * 0.45, '#e879f9');
      }
      break;
    }
    case 'crab':
      rrect(canvas, x + 2, y + 4, en.w - 4, en.h - 6, 6, flash ? '#ffffff' : '#ea580c');
      circle(canvas, x + 3, y + 5 - step * 2, 5, '#c2410c');
      circle(canvas, x + en.w - 3, y + 5 - (1 - step) * 2, 5, '#c2410c');
      circle(canvas, x + 10, y + 7, 2, '#000000');
      circle(canvas, x + en.w - 10, y + 7, 2, '#000000');
      break;
    case 'drone':
      rrect(canvas, x, y + 4, en.w, en.h - 6, 4, flash ? '#ffffff' : '#475569');
      rect(canvas, x - 4, y + 1, en.w + 8, 3, '#94a3b8');
      circle(canvas, x + en.w / 2, y + 10, 4, en.tick % 20 < 10 ? '#ef4444' : '#7f1d1d');
      break;
  }
}

function drawPlayer(canvas: SkCanvas, w: RealmWorld): void {
  const p = w.player;
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0 && p.deathTimer <= 0) return;
  const cx = p.x + p.w / 2;
  canvas.save();
  canvas.translate(cx, p.y);
  if (p.deathTimer > 0) canvas.rotate(p.deathTimer * 9, 0, p.h / 2);
  let flipX = p.facing;
  if (p.stuck === 'wall_left') flipX = -1;
  if (p.stuck === 'wall_right') flipX = 1;
  const upsideDown = p.stuck === 'ceiling' || (p.magnetCling && touchingCeiling(w));
  canvas.scale(flipX, upsideDown ? -1 : 1);
  if (upsideDown) canvas.translate(0, -p.h);

  // Aura de polaridad
  if (w.realm === 'magnet') {
    fill.setColor(col(p.polarity === 1 ? '#ef4444' : '#3b82f6'));
    fill.setAlphaf(0.22 + 0.1 * Math.sin(w.frame * 0.2));
    canvas.drawCircle(0, p.h / 2, 24, fill);
    fill.setAlphaf(1);
  }
  // Parapente
  if (p.gliding) {
    const path = Skia.PathBuilder.Make();
    path.moveTo(-22, -10);
    path.quadTo(0, -30, 22, -10);
    path.close();
    fill.setColor(col('#f472b6'));
    canvas.drawPath(path.build(), fill);
    stroke.setColor(col('#fdf2f8'));
    stroke.setStrokeWidth(1);
    canvas.drawLine(-20, -10, -6, 6, stroke);
    canvas.drawLine(20, -10, 6, 6, stroke);
  }

  const running = Math.abs(p.vx) > 0.5 && p.onGround;
  const legPhase = running ? Math.floor(p.anim / 5) % 2 : 0;
  // Piernas
  rect(canvas, -8, p.h - 8 + (legPhase ? -2 : 0), 7, 8, '#1d4ed8');
  rect(canvas, 1, p.h - 8 + (legPhase ? 0 : -2), 7, 8, '#1d4ed8');
  rect(canvas, -9, p.h - 3, 8, 3, '#78350f');
  rect(canvas, 1, p.h - 3, 8, 3, '#78350f');
  // Cuerpo
  rect(canvas, -9, 12, 18, 11, '#dc2626');
  rect(canvas, -7, 15, 14, 9, '#1d4ed8');
  rect(canvas, -5, 16, 2, 2, '#facc15');
  rect(canvas, 3, 16, 2, 2, '#facc15');
  // Cabeza
  rect(canvas, -7, 2, 14, 11, '#fcd9b6');
  rect(canvas, 2, 6, 2, 3, '#1f2937');
  rect(canvas, 1, 10, 7, 2, '#3f1d0b');
  // Gorra
  rect(canvas, -8, -1, 16, 5, '#ef4444');
  rect(canvas, 2, 2, 9, 3, '#b91c1c');
  rect(canvas, -2, 0, 4, 3, '#fef2f2');
  // Brazo / herramienta
  if (w.realm === 'roots') {
    const drilling = p.drilling > 0;
    const spin = drilling ? (w.frame % 4) * 1.5 : 0;
    rect(canvas, 6, 15, 8, 5, '#9ca3af');
    const path = Skia.PathBuilder.Make();
    path.moveTo(14, 13 - spin * 0.3);
    path.lineTo(24 + (drilling ? 3 : 0), 17.5);
    path.lineTo(14, 22 + spin * 0.3);
    path.close();
    fill.setColor(col(w.upgrades.diamondDrill ? '#67e8f9' : '#d1d5db'));
    canvas.drawPath(path.build(), fill);
  } else if (w.realm === 'ink') {
    rect(canvas, 6, 15, 10, 6, '#e5e7eb');
    rect(canvas, 14, 16, 6, 4, PAINT_COLOR[p.paintColor]);
  } else {
    rrect(canvas, 6, 14, 10, 8, 2, p.polarity === 1 ? '#ef4444' : '#3b82f6');
  }
  canvas.restore();

  // Burbujas al nadar
  if (p.swimming && w.frame % 24 === 0) {
    w.particles.push({ x: cx + p.facing * 6, y: p.y + 4, vx: 0, vy: -1.2, life: 40, maxLife: 40, color: '#e0f2fe', size: 3, gravity: -0.01 });
  }
}

function touchingCeiling(w: RealmWorld): boolean {
  const p = w.player;
  const c = Math.floor((p.x + p.w / 2) / TS);
  const r = Math.floor((p.y - 2) / TS);
  const t = tileAtLocal(w, c, r);
  return t === T.MAGNET_RED || t === T.MAGNET_BLUE;
}

// ---------------------------------------------------------------------------
// Minimapa (cacheado como SkPicture)
// ---------------------------------------------------------------------------
let miniPic: SkPicture | null = null;
let miniWorld: RealmWorld | null = null;
let miniVersion = -1;
let miniFrame = -999;

function miniColor(w: RealmWorld, t: number): string | null {
  switch (t) {
    case T.AIR:
    case T.VINE:
      return null;
    case T.WATER:
      return '#1d4ed8';
    case T.INK_SEA:
      return '#581c87';
    case T.GRASS:
      return w.realm === 'ink' ? '#f472b6' : '#22c55e';
    case T.DIRT:
    case T.ROOT:
      return '#92400e';
    case T.MAGNET_RED:
      return '#ef4444';
    case T.MAGNET_BLUE:
      return '#3b82f6';
    case T.CLOUD:
    case T.PLANK:
    case T.NIGHT_PLAT:
      return '#e2e8f0';
    case T.CRYSTAL:
      return '#c084fc';
    default:
      return '#a8a29e';
  }
}

function rebuildMinimap(w: RealmWorld, mw: number, mh: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const cv = rec.beginRecording(Skia.XYWHRect(0, 0, mw, mh));
  const cw = mw / w.exploredCols;
  const chh = mh / w.exploredRows;
  for (let ey = 0; ey < w.exploredRows; ey++) {
    for (let ex = 0; ex < w.exploredCols; ex++) {
      if (!w.explored[ey * w.exploredCols + ex]) continue;
      // Fondo explorado
      tileFill.setColor(col('#1e293b'));
      cv.drawRect(Skia.XYWHRect(ex * cw, ey * chh, cw + 0.5, chh + 0.5), tileFill);
      // Muestra 2×2 tiles del bloque para dar forma al terreno
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const c = ex * EXPLORE_CELL + sx * 2 + 1;
          const r = ey * EXPLORE_CELL + sy * 2 + 1;
          const color = miniColor(w, tileAtLocal(w, c, r));
          if (!color) continue;
          tileFill.setColor(col(color));
          cv.drawRect(Skia.XYWHRect(ex * cw + (sx * cw) / 2, ey * chh + (sy * chh) / 2, cw / 2 + 0.4, chh / 2 + 0.4), tileFill);
        }
      }
    }
  }
  return rec.finishRecordingAsPicture();
}

function drawMinimap(canvas: SkCanvas, w: RealmWorld, viewW: number, viewH: number, font: SkFont | null | undefined): void {
  const mw = 168;
  const mh = Math.round((mw * w.rows) / w.cols);
  const mx = viewW - mw - 10;
  const my = 8;
  const ver = w.exploredVersion * 100000 + Math.floor(w.tileVersion / 40);
  if (!miniPic || miniWorld !== w || (ver !== miniVersion && w.frame - miniFrame > 20)) {
    miniPic = rebuildMinimap(w, mw, mh);
    miniWorld = w;
    miniVersion = ver;
    miniFrame = w.frame;
  }
  rrect(canvas, mx - 4, my - 4, mw + 8, mh + 8, 6, '#020617');
  stroke.setColor(col('#334155'));
  stroke.setStrokeWidth(1.5);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(mx - 4, my - 4, mw + 8, mh + 8), 6, 6), stroke);
  canvas.save();
  canvas.translate(mx, my);
  canvas.drawPicture(miniPic);
  const sx = mw / (w.cols * TS);
  const sy = mh / (w.rows * TS);
  const exploredAt = (x: number, y: number) => {
    const ex = Math.floor(x / TS / EXPLORE_CELL);
    const ey = Math.floor(y / TS / EXPLORE_CELL);
    return w.explored[ey * w.exploredCols + ex] === 1;
  };
  for (const s of w.shrines) {
    if (!s.active && !exploredAt(s.x, s.y - 10)) continue;
    rect(canvas, s.x * sx - 2, s.y * sy - 4, 4, 4, s.active ? '#fde68a' : '#78716c', true);
  }
  for (const f of w.fragments) {
    if (f.taken || !exploredAt(f.x, f.y)) continue;
    star(canvas, f.x * sx, f.y * sy, 3.5, '#facc15');
  }
  for (const b of w.beacons) {
    if (!exploredAt(b.x, b.y)) continue;
    circle(canvas, b.x * sx, b.y * sy, 2.5, b.lit ? '#ffffff' : PAINT_COLOR[b.color]);
  }
  if (w.portal.open) ring(canvas, w.portal.x * sx, w.portal.y * sy - 3, 3.5, '#f0abfc', 1.5);
  const blink = w.frame % 30 < 20;
  if (blink) circle(canvas, (w.player.x + w.player.w / 2) * sx, (w.player.y + w.player.h / 2) * sy, 2.6, '#ffffff');
  // Marco de la vista
  stroke.setColor(col('#ffffff'));
  stroke.setAlphaf(0.35);
  stroke.setStrokeWidth(1);
  canvas.drawRect(Skia.XYWHRect(w.cameraX * sx, w.cameraY * sy, viewW * sx, viewH * sy), stroke);
  stroke.setAlphaf(1);
  canvas.restore();
  text(canvas, font, w.code, mx, my + mh + 16, '#94a3b8', 0.5);
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------
export function drawRealmWorld(
  canvas: SkCanvas,
  w: RealmWorld,
  viewW: number,
  viewH: number,
  font?: SkFont | null,
  opts?: { hud?: boolean }
): void {
  const nf = nightFactor(w);
  drawBackground(canvas, w, viewW, viewH, nf);

  const shakeX = w.shake > 0 ? Math.sin(w.frame * 1.3) * w.shake : 0;
  const shakeY = w.shake > 0 ? Math.cos(w.frame * 1.7) * w.shake * 0.6 : 0;
  const camX = Math.round(w.cameraX - shakeX);
  const camY = Math.round(w.cameraY - shakeY);
  canvas.save();
  canvas.translate(-camX, -camY);

  const c0 = Math.max(0, Math.floor(camX / TS) - 1);
  const c1 = Math.min(w.cols - 1, Math.ceil((camX + viewW) / TS));
  const r0 = Math.max(0, Math.floor(camY / TS) - 1);
  const r1 = Math.min(w.rows - 1, Math.ceil((camY + viewH) / TS));
  const inView = (x: number, y: number, m = 64) => x > camX - m && x < camX + viewW + m && y > camY - m && y < camY + viewH + m;

  // Zonas de viento/burbujas (detrás)
  for (const z of w.zones) {
    if (z.x > camX + viewW || z.x + z.w < camX || z.y > camY + viewH || z.y + z.h < camY) continue;
    if (z.kind === 'updraft') {
      fill.setColor(col('#ffffff'));
      fill.setAlphaf(0.08);
      canvas.drawRect(Skia.XYWHRect(z.x, Math.max(z.y, camY - 10), z.w, Math.min(z.h, viewH + 20)), fill);
      fill.setAlphaf(0.5);
      for (let i = 0; i < 10; i++) {
        const sy = z.y + z.h - (((w.frame * 4 + i * 97) % z.h) + 0);
        if (sy < camY - 20 || sy > camY + viewH + 20) continue;
        canvas.drawRect(Skia.XYWHRect(z.x + 8 + ((i * 29) % (z.w - 16)), sy, 2, 18), fill);
      }
      fill.setAlphaf(1);
    } else {
      fill.setColor(col('#e0f2fe'));
      fill.setAlphaf(0.6);
      for (let i = 0; i < 12; i++) {
        const sy = z.y + z.h - ((w.frame * 2 + i * 71) % z.h);
        if (sy < camY - 20 || sy > camY + viewH + 20) continue;
        canvas.drawCircle(z.x + 10 + ((i * 23) % (z.w - 20)) + Math.sin(w.frame * 0.1 + i) * 4, sy, 2 + (i % 3), fill);
      }
      fill.setAlphaf(1);
    }
  }

  // Fondo de caverna bajo la superficie original (túneles y cuevas)
  if (w.backdropRow) {
    const bd = w.backdropRow;
    for (let c = c0; c <= c1; c++) {
      const startR = Math.max(r0, bd[c]);
      if (startR > r1) continue;
      let runStart = -1;
      for (let r = startR; r <= r1 + 1; r++) {
        const t = r <= r1 ? w.tiles[r * w.cols + c] : T.DIRT;
        const open = t === T.AIR || t === T.VINE || t === T.PLANK;
        if (open && runStart < 0) runStart = r;
        if (!open && runStart >= 0) {
          rect(canvas, c * TS, runStart * TS, TS, (r - runStart) * TS, r > 40 ? '#1c140d' : '#2b1d12');
          runStart = -1;
        }
      }
    }
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r > bd[c] && w.tiles[r * w.cols + c] === T.AIR && hash(c, r) > 0.82) {
          rect(canvas, c * TS + hash(r, c) * 20, r * TS + 10, 6, 4, '#3a2817');
        }
      }
    }
  }

  // Tiles
  for (let r = r0; r <= r1; r++) {
    const row = r * w.cols;
    for (let c = c0; c <= c1; c++) {
      const t = w.tiles[row + c];
      if (t === T.AIR || t === T.WATER) continue;
      const x = c * TS;
      const y = r * TS;
      drawTile(canvas, w, t, c, r, x, y, nf);
      const pc = w.paint[row + c];
      if (pc && isPaintable(t)) {
        fill.setColor(col(PAINT_COLOR[pc]));
        fill.setAlphaf(0.85);
        canvas.drawRect(Skia.XYWHRect(x, y, TS, TS), fill);
        fill.setAlphaf(1);
        rect(canvas, x + 3, y + 3, TS - 14, 3, PAINT_LIGHT[pc]);
        if (tileAtLocal(w, c, r + 1) === T.AIR && (c + r) % 3 === 0) {
          circle(canvas, x + 16, y + TS + 2 + ((w.frame / 6 + c) % 4), 2.5, PAINT_COLOR[pc]);
        }
      }
      const dmg = w.damage.get(row + c);
      if (dmg) {
        stroke.setColor(col('#111827'));
        stroke.setStrokeWidth(2);
        canvas.drawLine(x + 6, y + 6, x + 16, y + 16, stroke);
        if (dmg > 1) canvas.drawLine(x + 26, y + 8, x + 16, y + 18, stroke);
        if (dmg > 2) canvas.drawLine(x + 10, y + 26, x + 18, y + 16, stroke);
      }
    }
  }

  // Girasoles
  for (const sf of w.sunflowers) {
    if (!inView(sf.x, sf.y)) continue;
    rect(canvas, sf.x - 2, sf.y - 22, 4, 22, '#15803d', true);
    if (nf < 0.5) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + w.frame * 0.01;
        circle(canvas, sf.x + Math.cos(a) * 9, sf.y - 28 + Math.sin(a) * 9, 5, '#facc15');
      }
      circle(canvas, sf.x, sf.y - 28, 7, '#92400e');
    } else {
      fill.setColor(col('#65a30d'));
      canvas.drawOval(Skia.XYWHRect(sf.x - 6, sf.y - 36, 12, 16), fill);
    }
  }

  // Portal
  {
    const px = w.portal.x;
    const py = w.portal.y - 44;
    if (inView(px, py, 120)) {
      rect(canvas, px - 30, w.portal.y - 4, 60, 4, '#44403c', true);
      if (w.portal.open) {
        for (let i = 0; i < 4; i++) {
          ring(canvas, px, py, 30 - i * 6 + Math.sin(w.frame * 0.1 + i) * 2, ['#f472b6', '#60a5fa', '#a78bfa', '#fde047'][i], 3);
        }
        fill.setColor(col('#ffffff'));
        fill.setAlphaf(0.5 + 0.3 * Math.sin(w.frame * 0.2));
        canvas.drawCircle(px, py, 8, fill);
        fill.setAlphaf(1);
      } else {
        ring(canvas, px, py, 30, '#57534e', 5);
        text(canvas, font, `${fragmentsCollected(w)}/${w.fragmentsNeeded}`, px - 20, py + 6, '#d6d3d1', 0.6);
      }
    }
  }

  // Santuarios
  for (const s of w.shrines) {
    if (!inView(s.x, s.y - 40, 100)) continue;
    rect(canvas, s.x - 14, s.y - 10, 28, 10, '#78716c', true);
    rect(canvas, s.x - 9, s.y - 36, 18, 26, '#a8a29e', true);
    rect(canvas, s.x - 12, s.y - 40, 24, 5, '#d6d3d1', true);
    if (s.active) {
      const fl = Math.sin(w.frame * 0.3) * 2;
      fill.setColor(col('#fde047'));
      fill.setAlphaf(0.3);
      canvas.drawCircle(s.x, s.y - 50, 18, fill);
      fill.setAlphaf(1);
      fill.setColor(col('#f59e0b'));
      canvas.drawOval(Skia.XYWHRect(s.x - 6, s.y - 58 + fl, 12, 18), fill);
      fill.setColor(col('#fef3c7'));
      canvas.drawOval(Skia.XYWHRect(s.x - 3, s.y - 50 + fl, 6, 9), fill);
    } else {
      circle(canvas, s.x, s.y - 46, 5, '#57534e');
    }
    const p = w.player;
    if (Math.abs(p.x + p.w / 2 - s.x) < 120 && Math.abs(p.y + p.h - s.y) < 80) {
      const label = s.name;
      text(canvas, font, label, s.x - textWidth(font, label, 0.5) / 2, s.y - 70, '#fef3c7', 0.5);
    }
  }

  // Faros (Archipiélago Tinta)
  for (const b of w.beacons) {
    if (!inView(b.x, b.y, 200)) continue;
    rect(canvas, b.x - 3, b.y + 6, 6, 26, '#57534e', true);
    if (b.lit) {
      fill.setColor(col(PAINT_LIGHT[b.color]));
      fill.setAlphaf(0.22);
      const beam = Skia.PathBuilder.Make();
      beam.moveTo(b.x - 8, b.y);
      beam.lineTo(b.x - 40, b.y - 400);
      beam.lineTo(b.x + 40, b.y - 400);
      beam.lineTo(b.x + 8, b.y);
      beam.close();
      canvas.drawPath(beam.build(), fill);
      fill.setAlphaf(1);
      circle(canvas, b.x, b.y, 12, PAINT_COLOR[b.color]);
      circle(canvas, b.x, b.y, 6, '#ffffff');
    } else {
      circle(canvas, b.x, b.y, 12, '#44403c');
      ring(canvas, b.x, b.y, 15 + Math.sin(w.frame * 0.12) * 2, PAINT_COLOR[b.color], 3);
    }
  }

  // Objetos y fragmentos
  for (const it of w.pickups) {
    if (it.taken || !inView(it.x, it.y)) continue;
    drawPickup(canvas, w, it, font);
  }
  for (const f of w.fragments) {
    if (f.taken || !inView(f.x, f.y)) continue;
    const bob = Math.sin(w.frame * 0.07 + f.id) * 4;
    fill.setColor(col('#fde047'));
    fill.setAlphaf(0.3 + 0.15 * Math.sin(w.frame * 0.15));
    canvas.drawCircle(f.x, f.y + bob, 22, fill);
    fill.setAlphaf(1);
    star(canvas, f.x, f.y + bob, 14, '#facc15', '#78350f');
    circle(canvas, f.x - 3, f.y + bob - 4, 2.5, '#fffbeb');
  }

  // Enemigos
  for (const en of w.enemies) {
    if (!en.alive || !inView(en.x, en.y)) continue;
    drawEnemy(canvas, w, en);
  }

  // Jugador
  drawPlayer(canvas, w);

  // Proyectiles
  for (const pr of w.projectiles) {
    if (pr.kind === 'paint') {
      circle(canvas, pr.x, pr.y, 6, PAINT_COLOR[pr.color]);
      circle(canvas, pr.x - 2, pr.y - 2, 2, '#ffffff');
    } else if (pr.kind === 'pulse') {
      const k = 1 - pr.life / 20;
      stroke.setColor(col(w.player.polarity === 1 ? '#fca5a5' : '#93c5fd'));
      stroke.setAlphaf(1 - k);
      stroke.setStrokeWidth(4);
      canvas.drawCircle(pr.x, pr.y, 20 + k * 90, stroke);
      stroke.setAlphaf(1);
    }
  }

  // Agua translúcida encima de todo lo sumergido
  fill.setColor(col('#0ea5e9'));
  fill.setAlphaf(0.38);
  for (let r = r0; r <= r1; r++) {
    const row = r * w.cols;
    let runStart = -1;
    for (let c = c0; c <= c1 + 1; c++) {
      const isW = c <= c1 && w.tiles[row + c] === T.WATER;
      if (isW && runStart < 0) runStart = c;
      if (!isW && runStart >= 0) {
        canvas.drawRect(Skia.XYWHRect(runStart * TS, r * TS, (c - runStart) * TS, TS), fill);
        runStart = -1;
      }
    }
  }
  fill.setAlphaf(1);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (w.tiles[r * w.cols + c] === T.WATER && tileAtLocal(w, c, r - 1) === T.AIR) {
        const wv = Math.sin(w.frame * 0.07 + c * 0.8) * 2;
        rect(canvas, c * TS, r * TS + wv, TS, 3, '#bae6fd');
      }
    }
  }

  // Partículas y textos
  for (const pa of w.particles) {
    if (pa.life <= 0) continue;
    fill.setColor(col(pa.color));
    fill.setAlphaf(Math.max(0, Math.min(1, pa.life / pa.maxLife)));
    canvas.drawRect(Skia.XYWHRect(pa.x - pa.size / 2, pa.y - pa.size / 2, pa.size, pa.size), fill);
  }
  fill.setAlphaf(1);
  for (const ft of w.floatTexts) {
    if (ft.life <= 0) continue;
    text(canvas, font, ft.text, ft.x - textWidth(font, ft.text, 0.55) / 2, ft.y, ft.color, 0.55);
  }

  canvas.restore();

  // Oscuridad: noche y profundidad (con linterna alrededor del jugador)
  let dark = 0;
  if (w.realm === 'roots') {
    const depth = Math.max(0, Math.min(1, (w.player.y / TS - 30) / 25));
    dark = Math.max(nf * 0.62, depth * 0.72);
  } else if (w.realm === 'magnet') {
    dark = Math.max(0, Math.min(0.7, (w.player.y / TS - 30) / 50));
  }
  if (dark > 0.02) {
    const pcx = w.player.x + w.player.w / 2 - camX;
    const pcy = w.player.y + w.player.h / 2 - camY;
    const shader = Skia.Shader.MakeRadialGradient(
      { x: pcx, y: pcy },
      260,
      [Skia.Color('rgba(0,0,0,0)'), Skia.Color(`rgba(2,4,18,${dark.toFixed(3)})`)],
      [0.35, 1],
      TileMode.Clamp
    );
    shaderPaint.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(0, 0, viewW, viewH), shaderPaint);
  }

  if (opts?.hud !== false) drawHud(canvas, w, viewW, viewH, font, nf);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function drawHud(canvas: SkCanvas, w: RealmWorld, viewW: number, viewH: number, font: SkFont | null | undefined, nf: number): void {
  const p = w.player;
  // Panel principal (deja libre la esquina del botón de pausa)
  const px = 54;
  const py = 8;
  rrect(canvas, px, py, 268, 58, 8, 'rgba(2,6,23,0.78)');
  text(canvas, font, `${w.code} ${w.name}`, px + 10, py + 16, '#a7f3d0', 0.55);
  for (let i = 0; i < p.maxHp; i++) {
    heart(canvas, px + 18 + i * 19, py + 33, 9, i < p.hp ? '#ef4444' : '#334155');
  }
  // Fragmentos y orbes
  star(canvas, px + 16, py + 48, 7, '#facc15');
  text(canvas, font, `${fragmentsCollected(w)}/${w.fragmentsNeeded}`, px + 28, py + 53, '#fef08a', 0.55);
  circle(canvas, px + 98, py + 48, 6, '#22d3ee');
  text(canvas, font, `${w.orbs}`, px + 110, py + 53, '#cffafe', 0.55);
  text(canvas, font, `${String(w.score).padStart(7, '0')}`, px + 170, py + 53, '#e2e8f0', 0.5);

  // Herramientas
  const tx = px;
  const ty = py + 64;
  rrect(canvas, tx, ty, 268, 24, 8, 'rgba(2,6,23,0.7)');
  if (w.realm === 'roots') {
    text(canvas, font, w.upgrades.diamondDrill ? 'X TALADRO DIAMANTE' : 'X TALADRO', tx + 10, ty + 16, w.upgrades.diamondDrill ? '#67e8f9' : '#e5e7eb', 0.45);
    text(canvas, font, `Y SEMILLAS ${p.seeds}`, tx + 168, ty + 16, '#86efac', 0.45);
    // Reloj día/noche
    const ph = (w.clock % w.dayLength) / w.dayLength;
    const cx = px + 290;
    const cy = py + 22;
    circle(canvas, cx, cy, 14, '#0f172a');
    fill.setColor(col(nf > 0.5 ? '#e0e7ff' : '#fde047'));
    canvas.drawCircle(cx + Math.cos(ph * Math.PI * 2 - Math.PI / 2) * 9, cy + Math.sin(ph * Math.PI * 2 - Math.PI / 2) * 9, 4, fill);
    ring(canvas, cx, cy, 14, nf > 0.5 ? '#6366f1' : '#f59e0b', 2);
    if (w.upgrades.doubleJump) text(canvas, font, '2J', cx - 8, cy + 30, '#bae6fd', 0.45);
  } else if (w.realm === 'ink') {
    text(canvas, font, 'X PINTAR', tx + 10, ty + 16, '#e5e7eb', 0.45);
    const colors: Array<[number, boolean]> = [
      [1, true],
      [2, w.upgrades.paintOrange],
      [3, w.upgrades.paintGreen],
    ];
    colors.forEach(([cId, ok], i) => {
      const bx = tx + 110 + i * 28;
      rrect(canvas, bx, ty + 4, 22, 16, 4, ok ? PAINT_COLOR[cId] : '#1e293b');
      if (p.paintColor === cId) {
        stroke.setColor(col('#ffffff'));
        stroke.setStrokeWidth(2);
        canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bx - 2, ty + 2, 26, 20), 5, 5), stroke);
      }
    });
    text(canvas, font, PAINT_NAMES[p.paintColor], tx + 200, ty + 16, PAINT_LIGHT[p.paintColor], 0.42);
  } else {
    text(canvas, font, 'X PULSO', tx + 10, ty + 16, '#e5e7eb', 0.45);
    rrect(canvas, tx + 100, ty + 4, 60, 16, 5, p.polarity === 1 ? '#dc2626' : '#2563eb');
    text(canvas, font, p.polarity === 1 ? 'ROJO +' : 'AZUL -', tx + 106, ty + 16, '#ffffff', 0.42);
    if (w.upgrades.magnetBoots) text(canvas, font, 'IMAN+', tx + 170, ty + 16, '#fde68a', 0.42);
    if (w.upgrades.oxygenTank) text(canvas, font, 'O2+', tx + 228, ty + 16, '#bae6fd', 0.42);
  }

  // Oxígeno
  if (p.oxygen < p.maxOxygen) {
    const ox = viewW / 2 - 80;
    const oy = 12;
    rrect(canvas, ox, oy, 160, 14, 6, 'rgba(2,6,23,0.8)');
    const k = p.oxygen / p.maxOxygen;
    rrect(canvas, ox + 2, oy + 2, 156 * k, 10, 5, k > 0.3 ? '#38bdf8' : w.frame % 20 < 10 ? '#ef4444' : '#f97316');
    text(canvas, font, 'O2', ox - 24, oy + 12, '#bae6fd', 0.5);
  }

  // Regreso manteniendo Y
  const hold = returnHoldProgress(w);
  if (hold > 0) {
    const hx = p.x + p.w / 2 - w.cameraX;
    const hy = p.y - w.cameraY - 26;
    stroke.setColor(col('#fde68a'));
    stroke.setStrokeWidth(4);
    const arc = Skia.PathBuilder.Make();
    arc.addArc(Skia.XYWHRect(hx - 14, hy - 14, 28, 28), -90, 360 * hold);
    canvas.drawPath(arc.build(), stroke);
  }

  drawMinimap(canvas, w, viewW, viewH, font);

  // Aviso / pista: franja superior entre el panel y el minimapa
  if (w.hintTimer > 0 && w.hint) {
    const left = 380;
    const right = viewW - 190;
    const avail = Math.max(120, right - left);
    let scale = 0.5;
    let tw = textWidth(font, w.hint, scale);
    if (tw + 28 > avail) {
      scale = Math.max(0.34, (scale * (avail - 28)) / tw);
      tw = textWidth(font, w.hint, scale);
    }
    const bw = Math.min(avail, tw + 28);
    const bx = left + (avail - bw) / 2;
    const by = p.oxygen < p.maxOxygen ? 34 : 12;
    const a = Math.min(1, w.hintTimer / 20);
    fill.setColor(col('#020617'));
    fill.setAlphaf(0.78 * a);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(bx, by, bw, 26), 10, 10), fill);
    fill.setAlphaf(1);
    text(canvas, font, w.hint, bx + 14, by + 13 + scale * 8, '#fde68a', scale);
  }

  // Indicación de santuario
  for (const s of w.shrines) {
    if (s.active && Math.abs(p.x + p.w / 2 - s.x) < 34 && Math.abs(p.y + p.h - s.y) < 40) {
      const nActive = w.shrines.filter((sh) => sh.active).length;
      if (nActive > 1) {
        const msg = 'ARRIBA: VIAJE RAPIDO';
        const mx = p.x + p.w / 2 - w.cameraX - textWidth(font, msg, 0.45) / 2;
        text(canvas, font, msg, mx, p.y - w.cameraY - 30, '#a7f3d0', 0.45);
      }
    }
  }

  // Victoria
  if (w.cleared) {
    fill.setColor(col('#020617'));
    fill.setAlphaf(Math.min(0.7, w.clearTimer / 60));
    canvas.drawRect(Skia.XYWHRect(0, 0, viewW, viewH), fill);
    fill.setAlphaf(1);
    const t1 = '¡REINO RESTAURADO!';
    text(canvas, font, t1, viewW / 2 - textWidth(font, t1, 1.3) / 2, viewH / 2 - 30, '#fde047', 1.3);
    const t2 = `${w.name} • PUNTOS ${w.score}`;
    text(canvas, font, t2, viewW / 2 - textWidth(font, t2, 0.6) / 2, viewH / 2 + 4, '#e0f2fe', 0.6);
    const t3 = w.levelIndex < 2 ? 'Abriendo el siguiente reino...' : 'Has restaurado los tres reinos';
    text(canvas, font, t3, viewW / 2 - textWidth(font, t3, 0.55) / 2, viewH / 2 + 30, '#a7f3d0', 0.55);
  }
}
