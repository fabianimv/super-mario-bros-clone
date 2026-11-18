import { GROUND_ROW } from '../engine/biomes';
import type { FortressBoss } from '../engine/types';
import {
  type ArenaStyle,
  type BuilderCtx,
  type FinaleStyle,
  type FortressSection,
  type MidpointStyle,
  type OpeningStyle,
  type StageBlueprint,
  type TransitionKind,
  addCoin,
  addCoinArc,
  addEnemy,
  addPipe,
  addPlateau,
  addPlatform,
  addSpring,
  buildFinaleStyle,
  buildFortressArena,
  buildFortressSection,
  buildMidpointPlaza,
  buildOpeningStyle,
  buildServicePlaza,
  buildTransitionZone,
  carvePit,
  foe,
  putBlock,
  variantOf,
} from './builderToolkit';

// ============================================================================
// FORTUNE MODE (Mundo 6 — F-1 .. Z-4, 16 Stages)
// Game Theory Core: Decision Under Risk & Asymmetric Payoffs
// Features wager altars, high-risk/high-reward routes, multi-coin vaults.
// ============================================================================

export type FortuneSetpiece =
  | 'high_roller_split'
  | 'wager_sanctuary'
  | 'jackpot_spring_vault'
  | 'double_down_bridge'
  | 'coin_mint_press'
  | 'roulette_lift_wheel'
  | 'banker_gauntlet'
  | 'golden_chimney_climb'
  | 'croupier_shell_alley'
  | 'velvet_rope_terrace'
  | 'all_in_chasm'
  | 'mirror_market_bazaar'
  | 'crystal_dice_pillars'
  | 'treasury_lockbox_run';

// ============================================================================
// 14 EXCLUSIVE SETPIECES FOR FORTUNE (0% shared with any other mode)
// ============================================================================

function buildFortuneSetpiece(
  ctx: BuilderCtx,
  kind: FortuneSetpiece,
  col: number
): number {
  const v = variantOf(ctx, col);

  switch (kind) {
    case 'high_roller_split': {
      // 14 cols: Safe low road gives zero loot. High precision stepping stones at row 5
      // provide a multi_coin block, a powerup, and a huge 8-coin airborne arc.
      const width = 14;
      // High stepping stones at row 5
      putBlock(ctx, col + 2, 5, 'hard');
      putBlock(ctx, col + 5, 5, 'hard');
      putBlock(ctx, col + 8, 5, 'hard');
      putBlock(ctx, col + 11, 5, 'hard');
      // High reward blocks overhead
      putBlock(ctx, col + 5, 2, 'question', 'multi_coin');
      putBlock(ctx, col + 8, 2, 'question', v === 0 ? 'powerup' : 'multi_coin');
      addCoinArc(ctx, col + 2, 10, 3.2);

      // Low road has a patrolling foe
      addEnemy(ctx, col + 6, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'wager_sanctuary': {
      // 13 cols: Elevated stone plaza at row 8 with steps, offering clean pedestal
      // for wager altars and quick escape descent.
      const width = 13;
      addPlateau(ctx, col + 3, 7, 8, 'hard');
      // Approach and exit steps
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 2, 9, 'hard');
      putBlock(ctx, col + 10, 9, 'hard');
      putBlock(ctx, col + 11, 10, 'hard');

      // Pedestal prize
      putBlock(ctx, col + 6, 5, 'question', 'multi_coin');
      addCoinArc(ctx, col + 4, 5, 6.2);
      addEnemy(ctx, col + 6, 7, ctx.worldNum >= 3 ? 'chuck' : 'koopa_red');
      return width;
    }

    case 'jackpot_spring_vault': {
      // 14 cols: Low crawl tunnel under brick ceiling (row 10) leading to a hidden
      // super spring launching into an aerial stone jackpot vault (rows 4..5).
      const width = 14;
      // Low tunnel
      for (let c = col + 1; c <= col + 6; c++) {
        putBlock(ctx, c, 10, 'brick');
        addCoin(ctx, c, 11.0);
      }
      // Hidden spring
      addSpring(ctx, col + 7, GROUND_ROW);

      // Airborne Jackpot Vault
      for (let c = col + 8; c <= col + 12; c++) {
        putBlock(ctx, c, 5, 'hard');
        putBlock(ctx, c, 2, 'hard');
      }
      putBlock(ctx, col + 8, 4, 'hard');
      putBlock(ctx, col + 12, 4, 'hard');
      putBlock(ctx, col + 10, 3, 'question', 'star');
      addCoin(ctx, col + 9, 3.5);
      addCoin(ctx, col + 11, 3.5);

      addEnemy(ctx, col + 10, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'double_down_bridge': {
      // 14 cols: Two tiered bridges spanning a 4-col pit (cols +4..+7).
      // Lower bridge at row 9 is broad & safe. Upper bridge at row 5 is narrow & rich.
      const width = 14;
      carvePit(ctx, col + 4, 4);

      // Lower bridge at row 9
      for (let c = col + 3; c <= col + 8; c++) {
        putBlock(ctx, c, 9, 'bridge');
      }
      addCoin(ctx, col + 5, 7.8);
      addCoin(ctx, col + 6, 7.8);

      // Upper risk bridge at row 5
      putBlock(ctx, col + 2, 7, 'hard');
      putBlock(ctx, col + 4, 5, 'hard');
      putBlock(ctx, col + 7, 5, 'hard');
      putBlock(ctx, col + 9, 7, 'hard');
      putBlock(ctx, col + 5, 2, 'question', 'multi_coin');
      putBlock(ctx, col + 6, 2, 'question', 'multi_coin');
      addCoinArc(ctx, col + 3, 6, 3.5);

      addEnemy(ctx, col + 6, 8, 'paratroopa');
      return width;
    }

    case 'coin_mint_press': {
      // 14 cols: Double-deck brick press gallery with Koopa shell bowling trigger.
      const width = 14;
      addPipe(ctx, col + 1, 2, false);
      for (let c = col + 4; c <= col + 11; c++) {
        putBlock(ctx, c, 8, 'brick', c % 2 === 0 ? 'multi_coin' : 'coin');
        putBlock(ctx, c, 4, 'brick', 'coin');
      }
      addEnemy(ctx, col + 3, GROUND_ROW - 1, 'koopa_green');
      addEnemy(ctx, col + 8, GROUND_ROW - 1, 'goomba');
      addCoinArc(ctx, col + 4, 8, 6.2);
      return width;
    }

    case 'roulette_lift_wheel': {
      // 15 cols: 3 moving lifts staggered across height & phase over a safe 4-col pit.
      const width = 15;
      carvePit(ctx, col + 4, 4);
      // Lift 1: low
      addPlatform(ctx, col + 2, 9, 2, 0, 1.8, 0.035, 0);
      // Lift 2: mid
      addPlatform(ctx, col + 5, 7, 2, 0, 2.2, 0.035, 2.1);
      // Lift 3: high
      addPlatform(ctx, col + 9, 5, 2, 0, 2.0, 0.035, 4.2);

      addCoinArc(ctx, col + 2, 4, 6.5);
      addCoinArc(ctx, col + 7, 5, 4.0);
      putBlock(ctx, col + 12, 5, 'hard');
      putBlock(ctx, col + 12, 2, 'question', 'multi_coin');
      return width;
    }

    case 'banker_gauntlet': {
      // 14 cols: Fortified lower counting room with 3 treasure blocks vs safe high bridge.
      const width = 14;
      // High catwalk
      for (let c = col + 2; c <= col + 11; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      // Lower vault floor blocks
      putBlock(ctx, col + 4, 9, 'question', 'multi_coin');
      putBlock(ctx, col + 6, 9, 'question', 'multi_coin');
      putBlock(ctx, col + 8, 9, 'question', 'powerup');
      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'chuck');
      addEnemy(ctx, col + 9, GROUND_ROW - 1, 'spiny');
      addCoinArc(ctx, col + 3, 8, 4.5);
      return width;
    }

    case 'golden_chimney_climb': {
      // 13 cols: Twin stone towers forming a wall-jump shaft to a jackpot roost.
      const width = 13;
      // Shaft walls at col +4 and col +7
      for (let r = 4; r <= 9; r++) {
        putBlock(ctx, col + 4, r, 'hard');
        putBlock(ctx, col + 7, r, 'hard');
      }
      // Coins inside shaft
      addCoin(ctx, col + 5, 8.0);
      addCoin(ctx, col + 6, 6.0);
      addCoin(ctx, col + 5, 4.5);

      // Roost at top
      putBlock(ctx, col + 5, 3, 'hard');
      putBlock(ctx, col + 6, 3, 'hard');
      putBlock(ctx, col + 5, 1, 'question', 'one_up');
      putBlock(ctx, col + 6, 1, 'question', 'multi_coin');

      addEnemy(ctx, col + 10, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'croupier_shell_alley': {
      // 14 cols: Long bowling alley with raised Koopa perch and coin domino.
      const width = 14;
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 9, 'hard');
      addEnemy(ctx, col + 1, 8, 'koopa_red');

      for (let c = col + 4; c <= col + 11; c += 2) {
        addCoin(ctx, c, 10.5);
      }
      addEnemy(ctx, col + 6, GROUND_ROW - 1, 'goomba');
      addEnemy(ctx, col + 9, GROUND_ROW - 1, 'goomba');
      putBlock(ctx, col + 12, 8, 'question', 'multi_coin');
      return width;
    }

    case 'velvet_rope_terrace': {
      // 14 cols: Ascending stepped terraces with high-value coin arches and pipe.
      const width = 14;
      addPlateau(ctx, col + 1, 3, 10, 'hard');
      addPlateau(ctx, col + 4, 4, 8, 'hard');
      addPipe(ctx, col + 5, 2, true);
      addPlateau(ctx, col + 9, 3, 6, 'hard');

      addCoinArc(ctx, col + 1, 4, 8.0);
      addCoinArc(ctx, col + 7, 5, 5.0);
      putBlock(ctx, col + 10, 3, 'question', 'multi_coin');
      return width;
    }

    case 'all_in_chasm': {
      // 14 cols: Chasm crossed via high trampoline spring onto a central oasis dais.
      const width = 14;
      carvePit(ctx, col + 3, 3);
      carvePit(ctx, col + 9, 3);

      addSpring(ctx, col + 1, GROUND_ROW);
      // Central dais at col +6..+8
      addPlateau(ctx, col + 6, 3, 8, 'hard');
      putBlock(ctx, col + 7, 5, 'question', 'multi_coin');
      addCoinArc(ctx, col + 2, 7, 4.0);
      addCoinArc(ctx, col + 7, 5, 6.0);
      addEnemy(ctx, col + 7, 7, 'koopa_red');
      return width;
    }

    case 'mirror_market_bazaar': {
      // 15 cols: Two stacked market corridors (row 9 and row 5) with cross-ladders.
      const width = 15;
      for (let c = col + 2; c <= col + 12; c++) {
        putBlock(ctx, c, 9, 'bridge');
        putBlock(ctx, c, 5, 'bridge');
      }
      putBlock(ctx, col + 7, 6, 'hard');
      putBlock(ctx, col + 7, 7, 'hard');
      putBlock(ctx, col + 7, 8, 'hard');

      putBlock(ctx, col + 4, 2, 'question', 'multi_coin');
      putBlock(ctx, col + 10, 2, 'question', 'powerup');
      addCoinArc(ctx, col + 3, 4, 7.5);
      addCoinArc(ctx, col + 9, 4, 7.5);
      addEnemy(ctx, col + 5, 4, 'paratroopa');
      addEnemy(ctx, col + 10, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'crystal_dice_pillars': {
      // 14 cols: 4 stone columns of alternating dice heights (10, 7, 9, 6) with coins.
      const width = 14;
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 4, 7, 'hard');
      putBlock(ctx, col + 7, 9, 'hard');
      putBlock(ctx, col + 10, 6, 'hard');

      carvePit(ctx, col + 2, 2);
      carvePit(ctx, col + 8, 2);

      addCoin(ctx, col + 1, 8.5);
      addCoin(ctx, col + 4, 5.5);
      addCoin(ctx, col + 7, 7.5);
      addCoin(ctx, col + 10, 4.5);
      putBlock(ctx, col + 4, 4, 'question', 'multi_coin');
      addEnemy(ctx, col + 12, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'treasury_lockbox_run': {
      // 14 cols: Pre-climax challenge: low slide corridor under stone ceiling (row 10),
      // with lockbox vault overhead accessible from high step.
      const width = 14;
      for (let c = col + 3; c <= col + 9; c++) {
        putBlock(ctx, c, 10, 'hard');
        addCoin(ctx, c, 11.0);
      }
      putBlock(ctx, col + 1, 8, 'hard');
      putBlock(ctx, col + 2, 7, 'hard');

      // Lockbox vault above
      for (let c = col + 4; c <= col + 8; c++) {
        putBlock(ctx, c, 6, 'hard');
        addCoin(ctx, c, 4.5);
      }
      putBlock(ctx, col + 6, 3, 'question', 'multi_coin');
      addEnemy(ctx, col + 11, GROUND_ROW - 1, 'chuck');
      return width;
    }
  }
}

// ============================================================================
// THE 4 FORTUNE CASTLES (F-4, Q-4, K-4, Z-4 — 100% Unique Fortress Plans)
// ============================================================================

interface CastleConfig {
  sections: FortressSection[];
  arenaStyle: ArenaStyle;
  entranceLen: number;
}

const FORTUNE_CASTLE_CONFIGS: CastleConfig[] = [
  // F-4 (idx 3, World 1): Tight gilded corridors, ArenaStyle 1, cursor -> 56
  {
    sections: ['cramped_hall', 'lift_chasm', 'chuck_bastion', 'supply_room'],
    arenaStyle: 1,
    entranceLen: 7,
  },
  // Q-4 (idx 7, World 2): Magma staircases and pendulum lifts, ArenaStyle 2, cursor -> 68
  {
    sections: ['lava_staircase', 'twin_tier_gauntlet', 'pendulum_lifts', 'guard_corridor', 'supply_room'],
    arenaStyle: 2,
    entranceLen: 9,
  },
  // K-4 (idx 11, World 3): Catwalks, crushers and rotating vaults, ArenaStyle 3, cursor -> 82
  {
    sections: ['magma_catwalk', 'crusher_drop', 'pillar_hops', 'rotating_maze_hall', 'fire_bar_alley', 'supply_room'],
    arenaStyle: 3,
    entranceLen: 11,
  },
  // Z-4 (idx 15, World 4): Grand Treasury Fortress: dual routes, dais & lifts, ArenaStyle 0, cursor -> 96
  {
    sections: ['dual_route', 'spiny_gauntlet', 'sunken_lava_dais', 'vertical_lift', 'chuck_bastion', 'twin_tier_gauntlet', 'supply_room'],
    arenaStyle: 0,
    entranceLen: 17,
  },
];

function buildFortuneCastle(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  ctx.isFortress = true;
  const config = FORTUNE_CASTLE_CONFIGS[Math.max(0, Math.min(3, ctx.worldNum - 1))];

  // Castle Opening: Fortified portal with gold block crown and unique entrance
  for (let c = 0; c <= 8 + config.entranceLen; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  putBlock(ctx, 8, 8, 'hard');
  putBlock(ctx, 9, 8, 'hard');
  putBlock(ctx, 10, 8, 'hard');
  putBlock(ctx, 9, 5, 'question', 'powerup');

  // Themed entrance hall per castle
  if (ctx.worldNum === 1) {
    putBlock(ctx, 12, 10, 'hard');
    putBlock(ctx, 13, 9, 'hard');
  } else if (ctx.worldNum === 2) {
    putBlock(ctx, 12, 11, 'hard');
    putBlock(ctx, 13, 10, 'hard');
    putBlock(ctx, 14, 9, 'hard');
    addCoin(ctx, 14, 7.5);
  } else if (ctx.worldNum === 3) {
    for (let c = 12; c <= 15; c++) putBlock(ctx, c, 7, 'hard');
    putBlock(ctx, 14, 4, 'question', 'multi_coin');
  } else {
    for (let c = 12; c <= 18; c++) putBlock(ctx, c, 6, 'hard');
    addCoinArc(ctx, 13, 5, 4.0);
  }

  let cursor = 8 + config.entranceLen;
  for (const sec of config.sections) {
    cursor += buildFortressSection(ctx, sec, cursor);
  }

  const { arenaWidth, boss } = buildFortressArena(ctx, cursor, config.arenaStyle);
  const totalCols = cursor + arenaWidth;
  return { totalCols, boss };
}

// ============================================================================
// THE 12 FORTUNE STAGE BLUEPRINTS (0% setpiece repetition within any level)
// ============================================================================

const FORTUNE_STAGE_BLUEPRINTS: Record<number, StageBlueprint<FortuneSetpiece>> = {
  // F-1 (idx 0, objective fortune): Risk debut
  0: {
    opening: 'windmill_runway',
    act1: 'high_roller_split',
    trans1: 'breather_2',
    act2: 'wager_sanctuary',
    midpoint: 'gazebo_lookout',
    act3: 'coin_mint_press',
    trans2: 'elevation_terrace_5',
    act4: ['roulette_lift_wheel', 'treasury_lockbox_run'],
    finale: 'classic_staircase',
  },
  // F-2 (idx 1, objective collect): Gem exploration across bridges and terraces
  1: {
    opening: 'canopy_drop',
    act1: 'double_down_bridge',
    trans1: 'coin_step_3',
    act2: 'velvet_rope_terrace',
    midpoint: 'arch_sanctuary',
    act3: 'crystal_dice_pillars',
    trans2: 'slide_gate_4',
    act4: ['mirror_market_bazaar', 'golden_chimney_climb'],
    finale: 'sky_platform_leap',
  },
  // F-3 (idx 2, objective time_attack): High-speed coin sprint
  2: {
    opening: 'spring_launch_pad',
    act1: 'croupier_shell_alley',
    trans1: 'mini_pipe_4',
    act2: 'all_in_chasm',
    midpoint: 'high_terrace',
    act3: 'high_roller_split',
    trans2: 'arch_split_5',
    act4: ['treasury_lockbox_run', 'jackpot_spring_vault'],
    finale: 'spring_citadel_launch',
  },

  // Q-1 (idx 4, objective fortune): High-stakes wager sanctuary & double down
  4: {
    opening: 'split_tunnel',
    act1: 'wager_sanctuary',
    trans1: 'slide_gate_4',
    act2: 'roulette_lift_wheel',
    midpoint: 'sunken_oasis',
    act3: 'double_down_bridge',
    trans2: 'elevation_terrace_5',
    act4: ['banker_gauntlet', 'velvet_rope_terrace'],
    finale: 'twin_deck_sprint',
  },
  // Q-2 (idx 5, objective chase): Escaping shadow through dice pillars & chasm
  5: {
    opening: 'bridge_arch',
    act1: 'jackpot_spring_vault',
    trans1: 'breather_2',
    act2: 'crystal_dice_pillars',
    midpoint: 'gazebo_lookout',
    act3: 'croupier_shell_alley',
    trans2: 'coin_step_3',
    act4: ['all_in_chasm', 'treasury_lockbox_run'],
    finale: 'stepping_archway',
  },
  // Q-3 (idx 6, objective time_attack): Precision clock race across mint & roulette
  6: {
    opening: 'sunken_courtyard',
    act1: 'coin_mint_press',
    trans1: 'arch_split_5',
    act2: 'golden_chimney_climb',
    midpoint: 'arch_sanctuary',
    act3: 'double_down_bridge',
    trans2: 'mini_pipe_4',
    act4: ['roulette_lift_wheel', 'wager_sanctuary'],
    finale: 'cloud_highway_drop',
  },

  // K-1 (idx 8, objective fortune): Grand Casino Bazaar
  8: {
    opening: 'meadow_plaza',
    act1: 'mirror_market_bazaar',
    trans1: 'elevation_terrace_5',
    act2: ['high_roller_split', 'banker_gauntlet'],
    midpoint: 'high_terrace',
    act3: 'all_in_chasm',
    trans2: 'breather_2',
    act4: ['jackpot_spring_vault', 'wager_sanctuary'],
    finale: 'moving_lift_tower',
  },
  // K-2 (idx 9, objective collect): Crystal dice and golden chimney gems
  9: {
    opening: 'pipe_terrace',
    act1: 'crystal_dice_pillars',
    trans1: 'coin_step_3',
    act2: ['double_down_bridge', 'treasury_lockbox_run'],
    midpoint: 'sunken_oasis',
    act3: 'golden_chimney_climb',
    trans2: 'slide_gate_4',
    act4: ['roulette_lift_wheel', 'velvet_rope_terrace'],
    finale: 'gauntlet_ramp',
  },
  // K-3 (idx 10, objective chase): Fast-moving shadow across banker gauntlet & all-in chasm
  10: {
    opening: 'windmill_runway',
    act1: 'banker_gauntlet',
    trans1: 'mini_pipe_4',
    act2: ['all_in_chasm', 'mirror_market_bazaar'],
    midpoint: 'gazebo_lookout',
    act3: 'high_roller_split',
    trans2: 'elevation_terrace_5',
    act4: ['crystal_dice_pillars', 'jackpot_spring_vault'],
    finale: 'classic_staircase',
  },

  // Z-1 (idx 12, objective time_attack): Climax time sprint through treasury & shell alley
  12: {
    opening: 'canopy_drop',
    act1: 'treasury_lockbox_run',
    trans1: 'arch_split_5',
    act2: ['croupier_shell_alley', 'golden_chimney_climb'],
    midpoint: 'arch_sanctuary',
    act3: 'double_down_bridge',
    trans2: 'breather_2',
    act4: ['all_in_chasm', 'coin_mint_press'],
    finale: 'sky_platform_leap',
  },
  // Z-2 (idx 13, objective chase): Desperate chase through velvet rope & mirror bazaar
  13: {
    opening: 'spring_launch_pad',
    act1: 'velvet_rope_terrace',
    trans1: 'slide_gate_4',
    act2: ['mirror_market_bazaar', 'high_roller_split'],
    midpoint: 'high_terrace',
    act3: 'banker_gauntlet',
    trans2: 'coin_step_3',
    act4: ['crystal_dice_pillars', 'treasury_lockbox_run'],
    finale: 'spring_citadel_launch',
  },
  // Z-3 (idx 14, objective collect): Final gem hunt in royal vault
  14: {
    opening: 'split_tunnel',
    act1: 'all_in_chasm',
    trans1: 'elevation_terrace_5',
    act2: ['golden_chimney_climb', 'jackpot_spring_vault'],
    midpoint: 'sunken_oasis',
    act3: 'croupier_shell_alley',
    trans2: 'mini_pipe_4',
    act4: ['roulette_lift_wheel', 'mirror_market_bazaar'],
    finale: 'twin_deck_sprint',
  },
};

// ============================================================================
// STAGE BUILDER FOR NON-CASTLE FORTUNE STAGES
// ============================================================================

function buildFortuneNormalStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  const bp = FORTUNE_STAGE_BLUEPRINTS[ctx.levelIndex] ?? FORTUNE_STAGE_BLUEPRINTS[0];

  // 1. Act I: Opening Style
  let cursor = buildOpeningStyle(ctx, bp.opening);

  // Setpiece(s) for Act 1
  const act1Pieces = Array.isArray(bp.act1) ? bp.act1 : [bp.act1];
  for (const piece of act1Pieces) {
    cursor += buildFortuneSetpiece(ctx, piece, cursor);
  }

  // 2. Transition 1
  if (bp.trans1) {
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
  }

  // 3. Act II: Setpiece(s) + Guaranteed Shaft Plaza
  const act2Pieces = Array.isArray(bp.act2) ? bp.act2 : [bp.act2];
  for (const piece of act2Pieces) {
    cursor += buildFortuneSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');

  // 4. Midpoint Interlude Plaza
  cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint ?? 'gazebo_lookout');

  // 5. Act III: Setpiece(s) + Guaranteed Vault Plaza
  const act3Pieces = Array.isArray(bp.act3) ? bp.act3 : [bp.act3];
  for (const piece of act3Pieces) {
    cursor += buildFortuneSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');

  // 6. Transition 2
  if (bp.trans2) {
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
  }

  // 7. Act IV: Climax Setpiece(s)
  const act4Pieces = Array.isArray(bp.act4) ? bp.act4 : [bp.act4];
  for (const piece of act4Pieces) {
    cursor += buildFortuneSetpiece(ctx, piece, cursor);
  }

  // 8. Finale Style leading to Flagpole
  cursor += buildFinaleStyle(ctx, bp.finale, cursor);

  // Buffer before final flagpole
  const totalCols = cursor + 10;
  return { totalCols, boss: null };
}

// ============================================================================
// MAIN PUBLIC ENTRY POINT
// ============================================================================

export function buildFortuneStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  if (ctx.stageNum === 4) {
    return buildFortuneCastle(ctx);
  }
  return buildFortuneNormalStage(ctx);
}
