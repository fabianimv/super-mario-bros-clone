// ============================================================================
// Auditoría de diversión de niveles (informe, no bloquea verify)
// Puntaje de "aburrimiento": más alto = más aburrido. Mide tramos vacíos,
// densidad y variedad de enemigos, variedad de bloques, cobertura del nivel,
// plataformas móviles y fosos. Uso: npx tsx scripts/level-fun-audit.ts [N]
// ============================================================================
import { partitionTotalLevels, TILE, GROUND_ROW } from '../src/engine/biomes';
import { buildWorldState } from '../src/levels/levelBuilder';
import type { GamePartition } from '../src/engine/types';
const parts: GamePartition[] = ['classic','smw','expedition','frontier','fortune','mirage','echo','dimension','tower','flip','star_road','odyssey'];
const rows: any[] = [];
for (const part of parts) {
  const n = partitionTotalLevels(part);
  for (let i = 0; i < n; i++) {
    const w = buildWorldState(i, undefined, part);
    const cols = w.totalCols;
    const ground = new Set(w.blocks.filter(b=>b.type==='ground_top').map(b=>b.col));
    const busy = new Uint8Array(cols+10);
    const mark=(c:number)=>{ if(c>=0&&c<cols) busy[c]=1; };
    let gaps=0, inGap=false;
    for (let c=0;c<cols;c++){ const g=!ground.has(c); if(g){mark(c); if(!inGap) gaps++;} inGap=g; }
    const nonGround = w.blocks.filter(b=>b.type!=='ground_top'&&b.type!=='ground_deep'&&b.row>1);
    for (const b of nonGround) mark(b.col);
    for (const e of w.enemies) mark(Math.round(e.x/TILE));
    for (const p of w.pipes) { mark(Math.round(p.x/TILE)); mark(Math.round(p.x/TILE)+1); }
    for (const p of w.platforms) mark(Math.round(p.x/TILE));
    for (const s of w.springs) mark(Math.round(s.x/TILE));
    let longest=0, run=0;
    for (let c=10;c<cols-12;c++){ if(busy[c]){run=0;} else {run++; longest=Math.max(longest,run);} }
    const blockTypes = new Set(nonGround.map(b=>b.type));
    const enemyTypes = new Set(w.enemies.map(e=>e.type));
    const rowsUsed = new Set(nonGround.map(b=>b.row));
    const density = w.enemies.length / (cols/100);
    const coverage = busy.reduce((a,b)=>a+b,0)/cols;
    // puntaje de aburrimiento: más alto = más aburrido
    const score = longest*1.2 + Math.max(0, 6-density)*4 + Math.max(0,5-enemyTypes.size)*5 + Math.max(0,6-blockTypes.size)*3 + Math.max(0,0.45-coverage)*60 + (w.platforms.length===0?4:0) + (gaps===0?6:0);
    rows.push({part, i, label: w.worldLabel, title: w.stageTitle, cols, enemies: w.enemies.length, eTypes: enemyTypes.size, bTypes: blockTypes.size, rows: rowsUsed.size, gaps, plats: w.platforms.length, pipes: w.pipes.length, longest, cov: +coverage.toFixed(2), mech: w.mechanic ?? '-', obj: w.objective ?? '-', boss: w.boss ? (w.boss.puzzleKind ?? 'basic') : '', score: +score.toFixed(1)});
  }
}
rows.sort((a,b)=>b.score-a.score);
console.log('TOTAL', rows.length);
console.log('part\tlabel\tcols\tenem\teT\tbT\tgaps\tplat\tlongest\tcov\tmech\tobj\tboss\tscore');
const topN = Number(process.argv[2] ?? 60);
for (const r of rows.slice(0,topN)) console.log([r.part,r.label,r.cols,r.enemies,r.eTypes,r.bTypes,r.gaps,r.plats,r.longest,r.cov,r.mech,r.obj,r.boss,r.score].join('\t'));
// resumen por partición
const by: Record<string, number[]> = {};
for (const r of rows) (by[r.part] ??= []).push(r.score);
console.log('\nPROMEDIO POR MODO');
for (const [k,v] of Object.entries(by)) console.log(k, (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1), 'max', Math.max(...v).toFixed(1));
console.log('\nJEFES');
for (const r of rows.filter(r=>r.boss)) console.log(r.part, r.label, r.boss);
