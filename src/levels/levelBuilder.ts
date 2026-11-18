import {
  BIOMES,
  DIM_TOTAL_LEVELS,
  ECHO_TOTAL_LEVELS,
  EXP_TOTAL_LEVELS,
  FORTUNE_TOTAL_LEVELS,
  FRONTIER_TOTAL_LEVELS,
  GROUND_ROW,
  MIN_CAMERA_WORLD_X,
  MIRAGE_TOTAL_LEVELS,
  STAGES_PER_WORLD,
  TILE,
  TOTAL_LEVELS,
  getStageBiome,
  getWorldLabel,
} from '../engine/biomes';
import type {
  Block,
  Checkpoint,
  CoinEntity,
  Enemy,
  FlagpoleGoal,
  FortressBoss,
  GamePartition,
  MovingPlatform,
  Pipe,
  PowerState,
  SceneryProp,
  Spring,
  WorldState,
} from '../engine/types';
import {
  type BuilderCtx,
  createInitialPlayer,
  gridKey,
  putBlock,
} from './builderToolkit';
import { buildSmwWorldState } from './smwLevelBuilder';
import { buildClassicStage } from './classicBuilder';
import { buildExpeditionOrFrontierStage } from './expeditionBuilder';
import { buildFortuneStage } from './fortuneBuilder';
import { buildMirageStage } from './mirageBuilder';
import { buildEchoStage } from './echoBuilder';
import { buildDimensionStage } from './dimensionBuilder';
import { applyStageMechanic } from '../engine/mechanics';
import { applyStageObjective } from '../engine/objectives';
import { applyStageSecrets } from '../engine/secrets';
import { applyAbilityChallenges } from '../engine/abilities';

export { gridKey, createInitialPlayer };

const STAGE_TITLES: string[] = [
  // World 1
  'Colinas Esmeralda',
  'Gruta de Cristal',
  'Puentes del Viento',
  'Bastión de Magma I',
  // World 2
  'Dunas del Sol',
  'Cámara Subterránea',
  'Oasis Acrobático',
  'Pirámide de Fuego',
  // World 3
  'Sendero Estelar',
  'Abismo Nocturno',
  'Cumbres de Luna',
  'Torreón Sombrío',
  // World 4
  'Valle Escarchado',
  'Caverna Glacial',
  'Cimas Resbaladizas',
  'Ciudadela Polar',
  // World 5
  'Cañón Dorado',
  'Mina Profunda',
  'Arcos Suspendidos',
  'Forja Volcánica',
  // World 6
  'Cielo Imperial',
  'Laberinto Abisal',
  'Asalto Celestial',
  'Trono del Rey Koopa',
];

// Modo Expedición (original): títulos de sus 20 etapas (+ 8 de frontera)
const EXP_STAGE_TITLES: string[] = [
  'Bahía de las Burbujas',
  'Bosque de Coral',
  'Lianas Brillantes',
  'Faro Sumergido',
  'Raíces Fosforescentes',
  'Gruta de Amatista',
  'Copa de los Árboles',
  'Templo de las Luciérnagas',
  'Avenida de Pistones',
  'Torre del Reloj',
  'Puertos Flotantes',
  'Fábrica de Vapor',
  'Colinas de Merengue',
  'Puentes de Arcoíris',
  'Muelle de Engranajes',
  'Palacio de Nubes',
  'Laderas de Cuarzo',
  'Mina de Geodas',
  'Cráter Prismático',
  'Corazón del Volcán',
  'Espejo de la Marea',
  'Grutas del Reflujo',
  'Acantilados de Espuma',
  'Faro del Horizonte',
  'Valle de Vidrio',
  'Galería de Reflejos',
  'Cañón de Campanas',
  'Núcleo Vítreo',
];

// Modo Dimensión 3D (original): títulos de sus 32 etapas
const DIM_STAGE_TITLES: string[] = [
  'Pradera de Constelaciones',
  'Invernadero Orbital',
  'Puente de Cometas',
  'Observatorio del Eclipse',
  'Mesa de Bloques',
  'Tren de Cuerda',
  'Repisa de Peluches',
  'Caja de Música Gigante',
  'Bahía de Témpanos',
  'Cielo de Auroras',
  'Faro del Polo',
  'Ciudadela de Hielo',
  'Yunque Plateado',
  'Ríos de Metal',
  'Cráteres Humeantes',
  'Corazón de la Fragua',
  'Vitral de Arcoíris',
  'Pasillo de Espejos',
  'Cúpula de Prismas',
  'Salón del Caleidoscopio',
  'Bosque de Sombreros',
  'Ladera de Esporas',
  'Cumbre del Hongo Blanco',
  'Cueva de Hielo y Setas',
  'Péndulos del Alba',
  'Engranajes Colgantes',
  'Campanario Suspendido',
  'Maquinaria Central',
  'Anillos de Saturno',
  'Lluvia de Meteoros',
  'Horizonte de Sucesos',
  'Corazón del Cosmos',
];

// Mundo 6 FORTUNA: títulos de sus 16 etapas
const FORTUNE_STAGE_TITLES: string[] = [
  'Vestíbulo de Oro', 'Ruleta de Monedas', 'Bóveda de la Suerte', 'Bastión del Azar',
  'Espejos de Apuesta', 'Galería del Riesgo', 'Cámara de Doble o Nada', 'Torreón de la Banca',
  'Cristal de Apuestas', 'Pasillo de las Fichas', 'Sala del Gran Premio', 'Ciudadela del Casino',
  'Vórtice del Azar', 'Bóveda Final', 'Rueda del Destino', 'Trono de la Fortuna',
];

// Mundo 7 ESPECTRO: títulos de sus 16 etapas
const MIRAGE_STAGE_TITLES: string[] = [
  'Telar de Humo', 'Nido de Urracas', 'Pasillo Espectral', 'Bastión del Robo',
  'Mercado Negro', 'Galería de Sombras', 'Cámara de Gemas', 'Torreón del Ladrón',
  'Nido de Urracas', 'Túnel de Ceniza', 'Sala del Botín', 'Ciudadela Oculta',
  'Corona Robada', 'Vórtice de Humo', 'Bóveda Espectral', 'Trono del Espectro',
];

// Mundo 8 ECO: títulos de sus 16 etapas
const ECHO_STAGE_TITLES: string[] = [
  'Salón de Espejos', 'Doble Eco', 'Portón Gemelo', 'Bastión de Cristal',
  'Ciudad Eco', 'Pasarela del Reflejo', 'Cámara de Ondas', 'Torre de la Resonancia',
  'Nido de Ecos', 'Galería Simétrica', 'Sala del Tiempo', 'Ciudadela del Reflejo',
  'Cúpula Temporal', 'Vórtice de Ecos', 'Bóveda Espejo', 'Trono del Eco',
];

export function buildWorldState(
  levelIndex: number,
  carryState?: {
    score: number;
    highScore: number;
    coins: number;
    lives: number;
    powerState: PowerState;
    mountedYoshi?: boolean;
    checkpointX?: number | null;
    checkpointY?: number | null;
    doubleJumpAssist?: boolean;
  },
  partition: GamePartition = 'classic'
): WorldState {
  if (partition === 'smw') {
    return applyStageObjective(
      applyAbilityChallenges(
        applyStageSecrets(applyStageMechanic(buildSmwWorldState(levelIndex, carryState)))
      )
    );
  }

  const isGenerated =
    partition === 'expedition' ||
    partition === 'frontier' ||
    partition === 'fortune' ||
    partition === 'mirage' ||
    partition === 'echo' ||
    partition === 'dimension';
  const ownPartition: GamePartition = isGenerated ? partition : 'classic';
  const totalStages =
    partition === 'expedition'
      ? EXP_TOTAL_LEVELS
      : partition === 'frontier'
      ? FRONTIER_TOTAL_LEVELS
      : partition === 'fortune'
      ? FORTUNE_TOTAL_LEVELS
      : partition === 'mirage'
      ? MIRAGE_TOTAL_LEVELS
      : partition === 'echo'
      ? ECHO_TOTAL_LEVELS
      : partition === 'dimension'
      ? DIM_TOTAL_LEVELS
      : TOTAL_LEVELS;
  const clampedIdx = Math.max(0, Math.min(levelIndex, totalStages - 1));
  const worldNum = Math.floor(clampedIdx / STAGES_PER_WORLD) + 1;
  const stageNum = (clampedIdx % STAGES_PER_WORLD) + 1;
  const biomeId = getStageBiome(clampedIdx, ownPartition);
  const biome = BIOMES[biomeId];

  const ctx: BuilderCtx = {
    levelIndex: clampedIdx,
    designIndex: partition === 'frontier' ? clampedIdx + 20 : clampedIdx,
    worldNum,
    stageNum,
    difficulty: 1 + clampedIdx * 0.055,
    nextId: 1,
    blocks: [],
    blockGrid: new Map<number, Block>(),
    pipes: [],
    platforms: [],
    springs: [],
    enemies: [],
    coins: [],
    pits: new Set<number>(),
    lavaCols: new Set<number>(),
    isFortress: biomeId === 'fortress',
    isUnderground: biome.underground,
    enemySeq: 0,
    partition: ownPartition,
  };

  let totalCols = 132;
  let boss: FortressBoss | null = null;

  if (partition === 'classic') {
    const built = buildClassicStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (partition === 'expedition' || partition === 'frontier') {
    const built = buildExpeditionOrFrontierStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (partition === 'fortune') {
    const built = buildFortuneStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (partition === 'mirage') {
    const built = buildMirageStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (partition === 'echo') {
    const built = buildEchoStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  } else if (partition === 'dimension') {
    const built = buildDimensionStage(ctx);
    totalCols = built.totalCols;
    boss = built.boss;
  }

  // Never allow pits in spawn zone (cols 0..8) or goal castle zone (last 10 cols)
  for (let c = 0; c <= 8; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  for (let c = totalCols - 10; c < totalCols; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }

  // Build ground rows (row 12 = ground_top, row 13 = ground_deep)
  for (let col = 0; col < totalCols; col++) {
    if (!ctx.pits.has(col)) {
      putBlock(ctx, col, GROUND_ROW, 'ground_top');
      putBlock(ctx, col, GROUND_ROW + 1, 'ground_deep');
    }
  }

  // Sanitize enemy spawns: ensure ground-walking enemies never start directly over a pit or inside a block
  ctx.enemies = ctx.enemies.filter((en) => {
    if (en.type === 'piranha' || en.type === 'bullet_bill') return true;
    const col = Math.floor(en.x / TILE);
    const row = Math.floor((en.y + en.height - 2) / TILE);
    if (ctx.blockGrid.has(gridKey(col, row))) return false;
    if (row === GROUND_ROW - 1 && ctx.pits.has(col)) return false;
    return true;
  });

  // Place Mid-Stage Checkpoint Pennant on solid ground around 50% of stage!
  let checkpointCol = Math.floor(totalCols * 0.5);
  for (let offset = 0; offset < 24; offset++) {
    const tryCol = checkpointCol + (offset % 2 === 0 ? offset >> 1 : -(offset >> 1));
    const pipeBlocked = ctx.pipes.some(
      (p) => Math.abs(p.x - tryCol * TILE) < TILE * 2
    );
    if (
      !ctx.pits.has(tryCol) &&
      !ctx.blockGrid.has(gridKey(tryCol, GROUND_ROW - 1)) &&
      !ctx.blockGrid.has(gridKey(tryCol, GROUND_ROW - 2)) &&
      !pipeBlocked
    ) {
      checkpointCol = tryCol;
      break;
    }
  }

  const alreadyAtCheckpoint =
    carryState?.checkpointX != null && carryState.checkpointX > 0;
  const checkpoint: Checkpoint = {
    x: checkpointCol * TILE + 6,
    y: (GROUND_ROW - 2) * TILE,
    width: 20,
    height: 2 * TILE,
    activated: alreadyAtCheckpoint,
  };

  // Parallax Scenery Props (start at i=-1 so negative left camera has seamless hills & clouds!)
  const sceneries: SceneryProp[] = [];
  for (let i = -1; i < Math.ceil(totalCols / 6); i++) {
    if (biome.underground) {
      sceneries.push({
        kind: ctx.isFortress ? 'banner' : 'pillar',
        x: i * 240 + 60,
        y: TILE,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.55,
      });
    } else {
      sceneries.push({
        kind: 'cloud',
        x: i * 220 + 40,
        y: 36 + (Math.abs(i) % 3) * 26,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.35,
      });
      sceneries.push({
        kind: biomeId === 'desert' ? 'dune' : biomeId === 'glacier' ? 'pine' : 'hill',
        x: i * 260 + 20,
        y: GROUND_ROW * TILE,
        scale: (Math.abs(i) % 2) + 1,
        parallax: 0.65,
      });
      sceneries.push({
        kind: 'bush',
        x: i * 260 + 165,
        y: GROUND_ROW * TILE,
        scale: (Math.abs(i) % 3) + 1,
        parallax: 1.0,
      });
    }
  }

  // Flagpole Goal (Stages 1-3 of each world; Stage 4 ends with Rey Koopa's Golden Axe & Castle!)
  let flagpole: FlagpoleGoal | null = null;
  if (stageNum !== 4) {
    const flagCol = totalCols - 9;
    flagpole = {
      x: flagCol * TILE + 10,
      y: 3 * TILE,
      width: 12,
      height: 9 * TILE,
      flagY: 3 * TILE + 10,
      castleX: (flagCol + 3.5) * TILE,
      castleY: GROUND_ROW * TILE - 128,
    };
  }

  const player = createInitialPlayer(carryState?.powerState ?? 0, false);
  if (alreadyAtCheckpoint && carryState?.checkpointX != null) {
    player.x = carryState.checkpointX;
    player.y = GROUND_ROW * TILE - player.height;
  }

  // Start camera with generous left safe zone so Plomero NEVER sits behind the left D-Pad!
  const startCameraX = Math.max(MIN_CAMERA_WORLD_X, player.x - 304);

  return applyStageObjective(
    applyAbilityChallenges(
      applyStageSecrets(
        applyStageMechanic({
          partition: ownPartition,
          totalStagesInPartition: totalStages,
          status: 'playing',
          levelIndex: clampedIdx,
          worldLabel: getWorldLabel(clampedIdx, ctx.partition),
          stageTitle:
            (partition === 'dimension'
              ? DIM_STAGE_TITLES
              : partition === 'frontier'
              ? EXP_STAGE_TITLES.slice(20)
              : partition === 'fortune'
              ? FORTUNE_STAGE_TITLES
              : partition === 'mirage'
              ? MIRAGE_STAGE_TITLES
              : partition === 'echo'
              ? ECHO_STAGE_TITLES
              : isGenerated
              ? EXP_STAGE_TITLES
              : STAGE_TITLES)[clampedIdx] ??
            `Etapa ${getWorldLabel(clampedIdx, ctx.partition)}`,
          biomeId,
          totalCols,
          score: carryState?.score ?? 0,
          highScore: carryState?.highScore ?? 0,
          coins: carryState?.coins ?? 0,
          lives: carryState?.lives ?? 3,
          timeLeft: 400,
          timeTick: 0,
          frameCount: 0,
          statusTimer: 0,
          cameraX: startCameraX,
          screenShake: 0,
          checkpointX: carryState?.checkpointX ?? null,
          checkpointY: carryState?.checkpointY ?? null,
          player,
          blocks: ctx.blocks,
          blockGrid: ctx.blockGrid,
          pipes: ctx.pipes,
          platforms: ctx.platforms,
          springs: ctx.springs,
          checkpoint,
          enemies: ctx.enemies,
          boss,
          bossFires: [],
          powerups: [],
          yoshis: [],
          dragonCoins: [],
          dragonCoinsCollected: 0,
          berries: [],
          fireballs: [],
          coinsList: ctx.coins,
          particles: [],
          floatingTexts: [],
          sceneries,
          lavaCols: ctx.lavaCols,
          flagpole,
          goalTape: null,
          prevJumpHeld: false,
          prevFireHeld: false,
          prevSpinHeld: false,
          doubleJumpAssist: carryState?.doubleJumpAssist ?? false,
          nextEntityId: ctx.nextId,
        })
      )
    )
  );
}
