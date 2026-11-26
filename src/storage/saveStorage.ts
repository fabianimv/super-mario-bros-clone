import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStageClear } from '../engine/partitions';
import type { GamePartition, GameSettings, SaveProgress } from '../engine/types';

const PROGRESS_KEY = '@super_plomero_progress_v1';
const SETTINGS_KEY = '@super_plomero_settings_v1';

export const DEFAULT_PROGRESS: SaveProgress = {
  highScore: 0,
  unlockedLevel: 23,
  clearedLevels: [],
  bestStageScores: {},
  totalCoins: 0,
  smwHighScore: 0,
  smwUnlockedLevel: 19,
  smwClearedLevels: [],
  smwBestStageScores: {},
  expHighScore: 0,
  expUnlockedLevel: 19,
  expClearedLevels: [],
  expBestStageScores: {},
  frontierHighScore: 0,
  frontierUnlockedLevel: 7,
  frontierClearedLevels: [],
  frontierBestStageScores: {},
  fortuneHighScore: 0,
  fortuneUnlockedLevel: 15,
  fortuneClearedLevels: [],
  fortuneBestStageScores: {},
  mirageHighScore: 0,
  mirageUnlockedLevel: 15,
  mirageClearedLevels: [],
  mirageBestStageScores: {},
  echoHighScore: 0,
  echoUnlockedLevel: 15,
  echoClearedLevels: [],
  echoBestStageScores: {},
  dimHighScore: 0,
  dimUnlockedLevel: 31,
  dimClearedLevels: [],
  dimBestStageScores: {},
  towerHighScore: 0,
  towerUnlockedLevel: 7,
  towerClearedLevels: [],
  towerBestStageScores: {},
  flipHighScore: 0,
  flipUnlockedLevel: 7,
  flipClearedLevels: [],
  flipBestStageScores: {},
  starRoadHighScore: 0,
  starRoadUnlockedLevel: 7,
  starRoadClearedLevels: [],
  starRoadBestStageScores: {},
  odysseyHighScore: 0,
  odysseyUnlockedLevel: 2,
  odysseyClearedLevels: [],
  odysseyBestStageScores: {},
  odysseyUnlocked: 3,
  cityChaosHighScore: 0,
  cityChaosUnlockedLevel: 0,
  cityChaosClearedLevels: [],
  cityChaosBestStageScores: {},
  realmsHighScore: 0,
  realmsUnlockedLevel: 2,
  realmsClearedLevels: [],
  realmsBestStageScores: {},
  secretUnlocked: true,
  allUnlocked: true,
  lastPartition: 'realms',
};

export const defaultProgress = DEFAULT_PROGRESS;

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  crtScanlines: false,
  doubleJumpAssist: false,
  controlScale: 1.0,
};

export function sanitizeProgress(parsed: Partial<SaveProgress> = {}): SaveProgress {
  return {
    highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
    unlockedLevel: Math.max(23, typeof parsed.unlockedLevel === 'number' ? parsed.unlockedLevel : 23),
    clearedLevels: Array.isArray(parsed.clearedLevels) ? parsed.clearedLevels : [],
    bestStageScores: parsed.bestStageScores ?? {},
    totalCoins: typeof parsed.totalCoins === 'number' ? parsed.totalCoins : 0,
    smwHighScore: typeof parsed.smwHighScore === 'number' ? parsed.smwHighScore : 0,
    smwUnlockedLevel: Math.max(19, typeof parsed.smwUnlockedLevel === 'number' ? parsed.smwUnlockedLevel : 19),
    smwClearedLevels: Array.isArray(parsed.smwClearedLevels) ? parsed.smwClearedLevels : [],
    smwBestStageScores: parsed.smwBestStageScores ?? {},
    expHighScore: typeof parsed.expHighScore === 'number' ? parsed.expHighScore : 0,
    expUnlockedLevel: Math.max(19, typeof parsed.expUnlockedLevel === 'number' ? parsed.expUnlockedLevel : 19),
    expClearedLevels: Array.isArray(parsed.expClearedLevels) ? parsed.expClearedLevels : [],
    expBestStageScores: parsed.expBestStageScores ?? {},
    frontierHighScore: typeof parsed.frontierHighScore === 'number' ? parsed.frontierHighScore : 0,
    frontierUnlockedLevel: Math.max(7, typeof parsed.frontierUnlockedLevel === 'number' ? parsed.frontierUnlockedLevel : 7),
    frontierClearedLevels: Array.isArray(parsed.frontierClearedLevels) ? parsed.frontierClearedLevels : [],
    frontierBestStageScores: parsed.frontierBestStageScores ?? {},
    fortuneHighScore: typeof parsed.fortuneHighScore === 'number' ? parsed.fortuneHighScore : 0,
    fortuneUnlockedLevel: Math.max(15, typeof parsed.fortuneUnlockedLevel === 'number' ? parsed.fortuneUnlockedLevel : 15),
    fortuneClearedLevels: Array.isArray(parsed.fortuneClearedLevels) ? parsed.fortuneClearedLevels : [],
    fortuneBestStageScores: parsed.fortuneBestStageScores ?? {},
    mirageHighScore: typeof parsed.mirageHighScore === 'number' ? parsed.mirageHighScore : 0,
    mirageUnlockedLevel: Math.max(15, typeof parsed.mirageUnlockedLevel === 'number' ? parsed.mirageUnlockedLevel : 15),
    mirageClearedLevels: Array.isArray(parsed.mirageClearedLevels) ? parsed.mirageClearedLevels : [],
    mirageBestStageScores: parsed.mirageBestStageScores ?? {},
    echoHighScore: typeof parsed.echoHighScore === 'number' ? parsed.echoHighScore : 0,
    echoUnlockedLevel: Math.max(15, typeof parsed.echoUnlockedLevel === 'number' ? parsed.echoUnlockedLevel : 15),
    echoClearedLevels: Array.isArray(parsed.echoClearedLevels) ? parsed.echoClearedLevels : [],
    echoBestStageScores: parsed.echoBestStageScores ?? {},
    dimHighScore: typeof parsed.dimHighScore === 'number' ? parsed.dimHighScore : 0,
    dimUnlockedLevel: Math.max(31, typeof parsed.dimUnlockedLevel === 'number' ? parsed.dimUnlockedLevel : 31),
    dimClearedLevels: Array.isArray(parsed.dimClearedLevels) ? parsed.dimClearedLevels : [],
    dimBestStageScores: parsed.dimBestStageScores ?? {},
    towerHighScore: typeof parsed.towerHighScore === 'number' ? parsed.towerHighScore : 0,
    towerUnlockedLevel: Math.max(7, typeof parsed.towerUnlockedLevel === 'number' ? parsed.towerUnlockedLevel : 7),
    towerClearedLevels: Array.isArray(parsed.towerClearedLevels) ? parsed.towerClearedLevels : [],
    towerBestStageScores: parsed.towerBestStageScores ?? {},
    flipHighScore: typeof parsed.flipHighScore === 'number' ? parsed.flipHighScore : 0,
    flipUnlockedLevel: Math.max(7, typeof parsed.flipUnlockedLevel === 'number' ? parsed.flipUnlockedLevel : 7),
    flipClearedLevels: Array.isArray(parsed.flipClearedLevels) ? parsed.flipClearedLevels : [],
    flipBestStageScores: parsed.flipBestStageScores ?? {},
    starRoadHighScore: typeof parsed.starRoadHighScore === 'number' ? parsed.starRoadHighScore : 0,
    starRoadUnlockedLevel: Math.max(7, typeof parsed.starRoadUnlockedLevel === 'number' ? parsed.starRoadUnlockedLevel : 7),
    starRoadClearedLevels: Array.isArray(parsed.starRoadClearedLevels) ? parsed.starRoadClearedLevels : [],
    starRoadBestStageScores: parsed.starRoadBestStageScores ?? {},
    odysseyHighScore: typeof parsed.odysseyHighScore === 'number' ? parsed.odysseyHighScore : 0,
    odysseyUnlockedLevel: Math.max(2, typeof parsed.odysseyUnlockedLevel === 'number' ? parsed.odysseyUnlockedLevel : 2),
    odysseyClearedLevels: Array.isArray(parsed.odysseyClearedLevels) ? parsed.odysseyClearedLevels : [],
    odysseyBestStageScores: parsed.odysseyBestStageScores ?? {},
    odysseyUnlocked: typeof parsed.odysseyUnlocked === 'number' ? Math.max(3, parsed.odysseyUnlocked) : 3,
    cityChaosHighScore: typeof parsed.cityChaosHighScore === 'number' ? parsed.cityChaosHighScore : 0,
    cityChaosUnlockedLevel: typeof parsed.cityChaosUnlockedLevel === 'number' ? parsed.cityChaosUnlockedLevel : 0,
    cityChaosClearedLevels: Array.isArray(parsed.cityChaosClearedLevels) ? parsed.cityChaosClearedLevels : [],
    cityChaosBestStageScores: parsed.cityChaosBestStageScores ?? {},
    realmsHighScore: typeof parsed.realmsHighScore === 'number' ? parsed.realmsHighScore : 0,
    realmsUnlockedLevel: Math.max(2, typeof parsed.realmsUnlockedLevel === 'number' ? parsed.realmsUnlockedLevel : 2),
    realmsClearedLevels: Array.isArray(parsed.realmsClearedLevels) ? parsed.realmsClearedLevels : [],
    realmsBestStageScores: parsed.realmsBestStageScores ?? {},
    secretUnlocked: true,
    allUnlocked: true,
    lastPartition:
      parsed.lastPartition === 'classic' ||
      parsed.lastPartition === 'smw' ||
      parsed.lastPartition === 'expedition' ||
      parsed.lastPartition === 'frontier' ||
      parsed.lastPartition === 'fortune' ||
      parsed.lastPartition === 'mirage' ||
      parsed.lastPartition === 'echo' ||
      parsed.lastPartition === 'dimension' ||
      parsed.lastPartition === 'tower' ||
      parsed.lastPartition === 'flip' ||
      parsed.lastPartition === 'star_road' ||
      parsed.lastPartition === 'odyssey' ||
      parsed.lastPartition === 'city_chaos' ||
      parsed.lastPartition === 'realms'
        ? parsed.lastPartition
        : 'realms',
  };
}

export function markStageCleared(
  prog: SaveProgress,
  partition: GamePartition,
  levelIndex: number,
  score: number
): SaveProgress {
  return recordStageClear(prog, partition, levelIndex, score);
}

export async function loadProgress(): Promise<SaveProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    return sanitizeProgress(parsed);
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveProgress(progress: SaveProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export async function loadSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}
