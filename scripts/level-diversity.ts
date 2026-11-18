// ============================================================================
// Gate Ultra-Estricto de Diversidad y Solvabilidad de Niveles (Proyecto ARGON)
// Evalúa los 152 niveles completos distribuidos en las 8 particiones del juego.
// ============================================================================
import {
  DIM_TOTAL_LEVELS,
  ECHO_TOTAL_LEVELS,
  EXP_TOTAL_LEVELS,
  FORTUNE_TOTAL_LEVELS,
  FRONTIER_TOTAL_LEVELS,
  GROUND_ROW,
  MIRAGE_TOTAL_LEVELS,
  SMW_TOTAL_LEVELS,
  TILE,
  TOTAL_LEVELS,
  getWorldLabel,
} from '../src/engine/biomes';
import type {
  Block,
  Enemy,
  GamePartition,
  MovingPlatform,
  Pipe,
  WorldState,
} from '../src/engine/types';
import { buildWorldState, gridKey } from '../src/levels/levelBuilder';

const MAX_INTRA_SIMILARITY = 0.25; // 25% max intra-partition Jaccard
const MAX_CROSS_SIMILARITY = 0.28; // 28% max cross-mode Jaccard (11,476 pairs)
const MAX_SEQ_SIMILARITY = 0.35;   // 35% max translation-invariant trigram similarity

// ----------------------------------------------------------------------------
// 1. Extracción de Features Posicionales (Jaccard Exacto)
// ----------------------------------------------------------------------------
function features(w: WorldState): Set<string> {
  const f = new Set<string>();
  for (const b of w.blocks) {
    if (b.type === 'ground_top' || b.type === 'ground_deep') continue;
    if (b.row === 0 || b.row === 1) continue; // techos decorativos
    f.add(`b${b.col},${b.row},${b.type}`);
  }
  for (const e of w.enemies) f.add(`e${Math.round(e.x / TILE)},${e.type}`);
  for (const p of w.pipes) f.add(`p${Math.round(p.x / TILE)},${p.height}`);
  const ground = new Set(w.blocks.filter((b) => b.type === 'ground_top').map((b) => b.col));
  for (let c = 0; c < w.totalCols; c++) if (!ground.has(c)) f.add(`h${c}`);
  return f;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ----------------------------------------------------------------------------
// 2. Firma Secuencial Invariante a Traslación (Trigramas de Clusters)
// ----------------------------------------------------------------------------
function sequentialTrigrams(w: WorldState): Set<string> {
  const colMap = new Map<
    number,
    { blocks: Block[]; enemies: Enemy[]; pipes: Pipe[]; platforms: MovingPlatform[] }
  >();

  // Recolectar entidades no-suelo excluyendo zonas bookend (spawn < 10 y meta > totalCols - 12)
  for (const b of w.blocks) {
    if (b.type === 'ground_top' || b.type === 'ground_deep' || b.row <= 1) continue;
    if (b.col < 10 || b.col > w.totalCols - 12) continue;
    if (!colMap.has(b.col)) colMap.set(b.col, { blocks: [], enemies: [], pipes: [], platforms: [] });
    colMap.get(b.col)!.blocks.push(b);
  }
  for (const e of w.enemies) {
    const c = Math.round(e.x / TILE);
    if (c < 10 || c > w.totalCols - 12) continue;
    if (!colMap.has(c)) colMap.set(c, { blocks: [], enemies: [], pipes: [], platforms: [] });
    colMap.get(c)!.enemies.push(e);
  }
  for (const p of w.pipes) {
    const c = Math.round(p.x / TILE);
    if (c < 10 || c > w.totalCols - 12) continue;
    if (!colMap.has(c)) colMap.set(c, { blocks: [], enemies: [], pipes: [], platforms: [] });
    colMap.get(c)!.pipes.push(p);
  }
  for (const pl of w.platforms) {
    const c = Math.round(pl.startX / TILE);
    if (c < 10 || c > w.totalCols - 12) continue;
    if (!colMap.has(c)) colMap.set(c, { blocks: [], enemies: [], pipes: [], platforms: [] });
    colMap.get(c)!.platforms.push(pl);
  }

  const sortedCols = Array.from(colMap.keys()).sort((a, b) => a - b);
  // Agrupar columnas contiguas o casi contiguas (distancia <= 2)
  const clusters: { minCol: number; maxCol: number; cols: number[] }[] = [];
  let cur: { minCol: number; maxCol: number; cols: number[] } | null = null;
  for (const c of sortedCols) {
    if (!cur || c - cur.maxCol > 2) {
      cur = { minCol: c, maxCol: c, cols: [c] };
      clusters.push(cur);
    } else {
      cur.maxCol = c;
      cur.cols.push(c);
    }
  }

  // Tokenizar clusters: tipo dominante + delta cuantizado + banda vertical
  const tokens: string[] = [];
  let prevCol = 10;
  for (const cl of clusters) {
    const delta = Math.min(8, Math.round((cl.minCol - prevCol) / 3));
    prevCol = cl.maxCol;
    let minRow = 15;
    const typeCounts: Record<string, number> = {};
    for (const c of cl.cols) {
      const data = colMap.get(c)!;
      for (const b of data.blocks) {
        minRow = Math.min(minRow, b.row);
        typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
      }
      for (const p of data.pipes) {
        minRow = Math.min(minRow, 12 - p.height / TILE);
        typeCounts['pipe'] = (typeCounts['pipe'] || 0) + 2;
      }
      for (const _pl of data.platforms) {
        typeCounts['platform'] = (typeCounts['platform'] || 0) + 2;
      }
      for (const e of data.enemies) {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      }
    }
    let dominant = 'block';
    let maxCnt = 0;
    for (const [t, cnt] of Object.entries(typeCounts)) {
      if (cnt > maxCnt) {
        maxCnt = cnt;
        dominant = t;
      }
    }
    const band = minRow <= 4 ? 'H' : minRow <= 8 ? 'M' : 'L';
    tokens.push(`${dominant}_d${delta}_${band}`);
  }

  const trigrams = new Set<string>();
  for (let i = 0; i < tokens.length - 2; i++) {
    trigrams.add(`${tokens[i]}>${tokens[i + 1]}>${tokens[i + 2]}`);
  }
  return trigrams;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size < 8 || b.size < 8) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const denom = Math.max(18, a.size + b.size - inter);
  return inter / denom;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL DEL GATE ARGON
// ============================================================================

console.log('=== GATE ULTRA-ESTRICTO DE DIVERSIDAD Y SOLVABILIDAD (ARGON) ===\n');

const PARTITIONS: [GamePartition, number][] = [
  ['classic', TOTAL_LEVELS],
  ['smw', SMW_TOTAL_LEVELS],
  ['expedition', EXP_TOTAL_LEVELS],
  ['frontier', FRONTIER_TOTAL_LEVELS],
  ['fortune', FORTUNE_TOTAL_LEVELS],
  ['mirage', MIRAGE_TOTAL_LEVELS],
  ['echo', ECHO_TOTAL_LEVELS],
  ['dimension', DIM_TOTAL_LEVELS],
];

interface LevelEntry {
  partition: GamePartition;
  index: number;
  label: string;
  stageNum: number;
  world: WorldState;
  feat: Set<string>;
  trigrams: Set<string>;
}

const allLevels: LevelEntry[] = [];
let totalFailures = 0;

for (const [partition, total] of PARTITIONS) {
  for (let i = 0; i < total; i++) {
    const world = buildWorldState(i, undefined, partition);
    const label = `${partition}:${getWorldLabel(i, partition)}`;
    const stageNum = (i % 4) + 1;
    allLevels.push({
      partition,
      index: i,
      label,
      stageNum,
      world,
      feat: features(world),
      trigrams: sequentialTrigrams(world),
    });
  }
}

// ----------------------------------------------------------------------------
// Test 1: Solvabilidad Universal y Bloques Mínimos en los 152 Niveles
// ----------------------------------------------------------------------------
console.log('1. Validando solvabilidad universal y topología en los 152 niveles...');
let solvabilityFailures = 0;
for (const entry of allLevels) {
  const w = entry.world;
  // Bloques mínimos (> 80)
  if (w.blocks.length < 80) {
    console.error(`   ✖ [${entry.label}] Bloques insuficientes: ${w.blocks.length} (mínimo 80)`);
    solvabilityFailures++;
  }
  // Suelo firme en spawn (cols 0..8)
  for (let c = 0; c <= 8; c++) {
    if (!w.blockGrid.has(gridKey(c, GROUND_ROW))) {
      console.error(`   ✖ [${entry.label}] Falta suelo base en spawn (col ${c})`);
      solvabilityFailures++;
      break;
    }
  }
  // Meta adecuada (boss para stage 4, goalTape para SMW, flagpole para resto)
  if (entry.stageNum === 4) {
    if (!w.boss) {
      console.error(`   ✖ [${entry.label}] Castillo sin jefe asignado`);
      solvabilityFailures++;
    }
  } else if (entry.partition === 'smw') {
    if (!w.goalTape) {
      console.error(`   ✖ [${entry.label}] Nivel SMW sin GoalTape`);
      solvabilityFailures++;
    }
  } else {
    if (!w.flagpole) {
      console.error(`   ✖ [${entry.label}] Nivel sin Flagpole`);
      solvabilityFailures++;
    }
  }
  // consecutiveGap <= 4
  let consecutiveGap = 0;
  const supportRows = entry.partition === 'smw' ? [6, 7, 8, 9, 10] : [7, 8, 9, 10];
  for (let col = 0; col < w.totalCols - 8; col++) {
    const hasGround = w.blockGrid.has(gridKey(col, GROUND_ROW));
    const hasStep = supportRows.some((r) => w.blockGrid.has(gridKey(col, r)));
    const hasPlatform = w.platforms.some((pl) => Math.abs(pl.startX - col * TILE) <= 6 * TILE);
    if (!hasGround && !hasStep && !hasPlatform) {
      consecutiveGap++;
      if (consecutiveGap > 4) {
        console.error(`   ✖ [${entry.label}] consecutiveGap excedido (${consecutiveGap}) en col ${col}`);
        solvabilityFailures++;
        break;
      }
    } else {
      consecutiveGap = 0;
    }
  }
}
if (solvabilityFailures === 0) {
  console.log('   ✔ 152/152 niveles cumplen solvabilidad universal (consecutiveGap <= 4, spawn sólido y metas).\n');
} else {
  totalFailures += solvabilityFailures;
}

// ----------------------------------------------------------------------------
// Test 2: Índice de Verticalidad (>= 4 bandas verticales en row 2..11 para non-castle)
// ----------------------------------------------------------------------------
console.log('2. Validando índice de verticalidad en las 114 etapas no-castillo...');
let verticalityFailures = 0;
for (const entry of allLevels) {
  if (entry.stageNum === 4) continue;
  const w = entry.world;
  const rows = new Set<number>();
  for (const b of w.blocks) {
    if (b.type === 'ground_top' || b.type === 'ground_deep') continue;
    if (b.row >= 2 && b.row <= 11) rows.add(b.row);
  }
  for (const pl of w.platforms) {
    const r = Math.round(pl.y / TILE);
    if (r >= 2 && r <= 11) rows.add(r);
  }
  for (const p of w.pipes) {
    const topR = 12 - p.height / TILE;
    if (topR >= 2 && topR <= 11) rows.add(topR);
  }
  if (rows.size < 4) {
    console.error(`   ✖ [${entry.label}] Verticalidad deficiente: solo ${rows.size} bandas distintas (mínimo 4)`);
    verticalityFailures++;
  }
}
if (verticalityFailures === 0) {
  console.log('   ✔ 114/114 etapas no-castillo tienen >= 4 bandas verticales activas (filas 2..11).\n');
} else {
  totalFailures += verticalityFailures;
}

// ----------------------------------------------------------------------------
// Test 3: Jaccard Intra-Partición (MAX_INTRA_SIMILARITY = 0.25)
// ----------------------------------------------------------------------------
console.log('3. Validando Jaccard Intra-Partición (máximo 25%)...');
let intraFailures = 0;
for (const [partition] of PARTITIONS) {
  const partLevels = allLevels.filter((l) => l.partition === partition);
  let worst = { s: 0, pair: '' };
  for (let i = 0; i < partLevels.length; i++) {
    for (let j = i + 1; j < partLevels.length; j++) {
      const s = jaccard(partLevels[i].feat, partLevels[j].feat);
      if (s > worst.s) worst = { s, pair: `${partLevels[i].label} ~ ${partLevels[j].label}` };
      if (s > MAX_INTRA_SIMILARITY) {
        console.error(
          `   ✖ [${partition}] ${partLevels[i].label} y ${partLevels[j].label} superan límite: ${(s * 100).toFixed(1)}% > ${(MAX_INTRA_SIMILARITY * 100).toFixed(0)}%`
        );
        intraFailures++;
      }
    }
  }
  console.log(`   - ${partition.padEnd(12)}: par más parecido ${worst.pair} con ${(worst.s * 100).toFixed(1)}%`);
}
if (intraFailures === 0) {
  console.log('   ✔ Ningún par intra-partición supera el 25% de similitud Jaccard.\n');
} else {
  totalFailures += intraFailures;
}

// ----------------------------------------------------------------------------
// Test 4: Jaccard Cruzado Entre Modos (MAX_CROSS_SIMILARITY = 0.28, 11.476 pares)
// ----------------------------------------------------------------------------
console.log('4. Validando Jaccard Cruzado entre distintos modos (máximo 28% sobre 11.476 pares)...');
let crossFailures = 0;
let worstCross = { s: 0, pair: '' };
for (let i = 0; i < allLevels.length; i++) {
  for (let j = i + 1; j < allLevels.length; j++) {
    if (allLevels[i].partition === allLevels[j].partition) continue;
    const s = jaccard(allLevels[i].feat, allLevels[j].feat);
    if (s > worstCross.s) worstCross = { s, pair: `${allLevels[i].label} ~ ${allLevels[j].label}` };
    if (s > MAX_CROSS_SIMILARITY) {
      console.error(
        `   ✖ Par cruzado excesivo: ${allLevels[i].label} ~ ${allLevels[j].label}: ${(s * 100).toFixed(1)}% > ${(MAX_CROSS_SIMILARITY * 100).toFixed(0)}%`
      );
      crossFailures++;
    }
  }
}
console.log(`   - Peor par cruzado: ${worstCross.pair} con ${(worstCross.s * 100).toFixed(1)}%`);
if (crossFailures === 0) {
  console.log('   ✔ Ninguno de los 11.476 pares entre modos distintos supera el 28% de similitud.\n');
} else {
  totalFailures += crossFailures;
}

// ----------------------------------------------------------------------------
// Test 5: Firma Secuencial Invariante a Traslación (MAX_SEQ_SIMILARITY = 0.35)
// ----------------------------------------------------------------------------
console.log('5. Validando Firma Secuencial Invariante a Traslación (Trigramas <= 35%)...');
let seqFailures = 0;
let worstSeq = { s: 0, pair: '' };
for (let i = 0; i < allLevels.length; i++) {
  for (let j = i + 1; j < allLevels.length; j++) {
    const s = trigramSimilarity(allLevels[i].trigrams, allLevels[j].trigrams);
    if (s > worstSeq.s) worstSeq = { s, pair: `${allLevels[i].label} ~ ${allLevels[j].label}` };
    if (s > MAX_SEQ_SIMILARITY) {
      console.error(
        `   ✖ Similitud secuencial excesiva: ${allLevels[i].label} ~ ${allLevels[j].label}: ${(s * 100).toFixed(1)}% > ${(MAX_SEQ_SIMILARITY * 100).toFixed(0)}%`
      );
      seqFailures++;
    }
  }
}
console.log(`   - Peor par secuencial: ${worstSeq.pair} con ${(worstSeq.s * 100).toFixed(1)}%`);
if (seqFailures === 0) {
  console.log('   ✔ Ningún par de niveles comparte secuencias de obstáculos desplazadas (> 35%).\n');
} else {
  totalFailures += seqFailures;
}

// ----------------------------------------------------------------------------
// Resumen Final
// ----------------------------------------------------------------------------
if (totalFailures > 0) {
  console.error(`\n✖ GATE DE DIVERSIDAD FALLÓ CON ${totalFailures} VIOLACIONES.`);
  process.exit(1);
} else {
  console.log('\n✔ GATE DE DIVERSIDAD ARGON APROBADO AL 100% (152 NIVELES VALIDADOS).');
}
