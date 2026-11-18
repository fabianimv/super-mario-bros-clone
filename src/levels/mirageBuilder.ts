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
// MIRAGE MODE (Mundo 7 — W-1 .. Y-4, 16 Stages)
// Game Theory Core: Zero-Sum Game / Pursuit & Interception of the Thief
// Features U-shaped arenas, ambush overpasses, slide ducts, stolen gem recovery.
// ============================================================================

export type MirageSetpiece =
  | 'magpie_roost_arena'
  | 'heist_catwalk_overpass'
  | 'smuggler_slide_tunnel'
  | 'decoy_gem_courtyard'
  | 'smoke_loom_labyrinth'
  | 'black_market_terraces'
  | 'ash_tunnel_ambush'
  | 'phantom_lift_crossing'
  | 'thief_gauntlet_pen'
  | 'stolen_crown_spire'
  | 'shadow_chimney_bypass'
  | 'spectral_pipe_bastion'
  | 'zero_sum_switchback'
  | 'eclipse_vault_approach';

// ============================================================================
// 14 EXCLUSIVE SETPIECES FOR MIRAGE (0% shared with any other mode)
// ============================================================================

function buildMirageSetpiece(
  ctx: BuilderCtx,
  kind: MirageSetpiece,
  col: number
): number {
  const v = variantOf(ctx, col);

  switch (kind) {
    case 'magpie_roost_arena': {
      // 14 cols: U-shaped basin flanked by retaining stone walls (rows 9..11)
      // keeping the thief trapped in a bowl where Mario can corner or shell-bowl it.
      const width = 14;
      // Retaining wall left
      putBlock(ctx, col + 1, 9, 'hard');
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 1, 11, 'hard');
      // Retaining wall right
      putBlock(ctx, col + 12, 9, 'hard');
      putBlock(ctx, col + 12, 10, 'hard');
      putBlock(ctx, col + 12, 11, 'hard');

      // Koopa on the left wall to provide a bowling projectile
      addEnemy(ctx, col + 1, 8, 'koopa_green');

      // Overhead bridge with coins
      for (let c = col + 3; c <= col + 10; c++) {
        putBlock(ctx, c, 6, 'bridge');
      }
      addCoinArc(ctx, col + 4, 6, 4.0);

      // Trapped thief in the basin
      addEnemy(ctx, col + 7, GROUND_ROW - 1, 'thief');
      putBlock(ctx, col + 7, 3, 'question', v === 0 ? 'powerup' : 'coin');
      return width;
    }

    case 'heist_catwalk_overpass': {
      // 14 cols: High catwalk at row 5 allowing Mario to stalk and ambush-dive
      // onto the thief patrolling the floor below.
      const width = 14;
      for (let c = col + 2; c <= col + 11; c++) {
        if (c !== col + 6) {
          putBlock(ctx, c, 5, 'bridge');
          addCoin(ctx, c, 3.5);
        }
      }
      // Drop aperture at col + 6 allows surprise drop-stomp
      putBlock(ctx, col + 2, 8, 'hard');
      putBlock(ctx, col + 11, 8, 'hard');

      addEnemy(ctx, col + 6, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 9, GROUND_ROW - 1, 'goomba');
      putBlock(ctx, col + 4, 2, 'question', 'powerup');
      return width;
    }

    case 'smuggler_slide_tunnel': {
      // 13 cols: Low slide duct under stone ceiling at row 10.
      // Crouching and sliding (▼) cuts through ahead of the thief.
      const width = 13;
      for (let c = col + 2; c <= col + 8; c++) {
        putBlock(ctx, c, 10, 'hard');
        addCoin(ctx, c, 11.0);
      }
      // Upper bypass ledge
      putBlock(ctx, col + 1, 8, 'hard');
      putBlock(ctx, col + 5, 6, 'hard');
      putBlock(ctx, col + 9, 8, 'hard');
      putBlock(ctx, col + 5, 3, 'question', 'coin');

      addEnemy(ctx, col + 10, GROUND_ROW - 1, 'thief');
      return width;
    }

    case 'decoy_gem_courtyard': {
      // 14 cols: Two-level courtyard with support shelf at row 6 for findSpots gems.
      // Koopa Green ready to kick shell against thief.
      const width = 14;
      // High shelf for gem spawn
      for (let c = col + 5; c <= col + 8; c++) {
        putBlock(ctx, c, 6, 'hard');
      }
      addCoinArc(ctx, col + 5, 4, 4.0);

      putBlock(ctx, col + 2, 9, 'hard');
      addEnemy(ctx, col + 2, 8, 'koopa_green');
      addEnemy(ctx, col + 7, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 11, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'smoke_loom_labyrinth': {
      // 15 cols: Mid-height lattice of pipes & brick blocks with clear sightlines.
      const width = 15;
      addPipe(ctx, col + 2, 2, false);
      addPipe(ctx, col + 7, 3, true);
      addPipe(ctx, col + 12, 2, false);

      for (let c = col + 4; c <= col + 6; c++) {
        putBlock(ctx, c, 8, 'brick');
      }
      for (let c = col + 9; c <= col + 11; c++) {
        putBlock(ctx, c, 8, 'brick');
      }
      addCoinArc(ctx, col + 4, 3, 6.2);
      addCoinArc(ctx, col + 9, 3, 6.2);
      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'thief');
      putBlock(ctx, col + 5, 5, 'question', 'powerup');
      return width;
    }

    case 'black_market_terraces': {
      // 15 cols: 3 stepped terraces connected by a spring to instantly switch floors.
      const width = 15;
      addPlateau(ctx, col + 1, 4, 10, 'hard');
      addPlateau(ctx, col + 5, 4, 8, 'hard');
      addPlateau(ctx, col + 9, 4, 6, 'hard');

      addSpring(ctx, col + 4, 10);
      addCoinArc(ctx, col + 5, 4, 6.0);
      addCoinArc(ctx, col + 9, 4, 4.0);

      addEnemy(ctx, col + 6, 7, 'thief');
      putBlock(ctx, col + 11, 3, 'question', 'one_up');
      return width;
    }

    case 'ash_tunnel_ambush': {
      // 14 cols: Low tunnel with brick ceiling at row 7 and high alcove overhead.
      const width = 14;
      for (let c = col + 2; c <= col + 10; c++) {
        putBlock(ctx, c, 7, 'brick');
      }
      // Upper sanctuary alcove
      putBlock(ctx, col + 6, 4, 'hard');
      putBlock(ctx, col + 6, 2, 'question', 'powerup');
      addCoin(ctx, col + 5, 2.5);
      addCoin(ctx, col + 7, 2.5);

      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 8, GROUND_ROW - 1, 'spiny');
      return width;
    }

    case 'phantom_lift_crossing': {
      // 14 cols: Double pit crossed by moving lift below or high bridge above.
      const width = 14;
      carvePit(ctx, col + 2, 3);
      carvePit(ctx, col + 8, 3);

      addPlatform(ctx, col + 3, 9, 3, 1.5, 0, 0.04, 0);

      // High bridge at row 5
      for (let c = col + 5; c <= col + 9; c++) {
        putBlock(ctx, c, 5, 'bridge');
      }
      addCoinArc(ctx, col + 5, 5, 3.5);
      addEnemy(ctx, col + 7, 4, 'paratroopa');
      addEnemy(ctx, col + 12, GROUND_ROW - 1, 'thief');
      return width;
    }

    case 'thief_gauntlet_pen': {
      // 15 cols: Enclosed pen flanked by pipes (height 3) with two thieves.
      const width = 15;
      addPipe(ctx, col + 2, 3, false);
      addPipe(ctx, col + 12, 3, false);

      // Central prize pedestal
      addPlateau(ctx, col + 6, 3, 9, 'hard');
      putBlock(ctx, col + 7, 6, 'question', 'star');

      addEnemy(ctx, col + 4, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 10, GROUND_ROW - 1, 'thief');
      addCoinArc(ctx, col + 5, 5, 4.5);
      return width;
    }

    case 'stolen_crown_spire': {
      // 13 cols: Central spire rising to row 3 with wall-jump flanks and crown.
      const width = 13;
      for (let r = 3; r <= 9; r++) {
        putBlock(ctx, col + 5, r, 'hard');
        putBlock(ctx, col + 6, r, 'hard');
      }
      putBlock(ctx, col + 2, 7, 'hard');
      putBlock(ctx, col + 9, 7, 'hard');

      putBlock(ctx, col + 5, 1, 'question', 'one_up');
      addCoin(ctx, col + 4, 1.5);
      addCoin(ctx, col + 7, 1.5);

      addEnemy(ctx, col + 10, GROUND_ROW - 1, 'thief');
      return width;
    }

    case 'shadow_chimney_bypass': {
      // 13 cols: Wall-jump chimney at cols +3 and +6 leading to overhead speedway.
      const width = 13;
      for (let r = 4; r <= 9; r++) {
        putBlock(ctx, col + 3, r, 'hard');
        putBlock(ctx, col + 6, r, 'hard');
      }
      addCoin(ctx, col + 4, 8.0);
      addCoin(ctx, col + 5, 5.5);

      // Upper speedway bridge at row 4
      for (let c = col + 7; c <= col + 11; c++) {
        putBlock(ctx, c, 4, 'bridge');
        addCoin(ctx, c, 2.5);
      }
      addEnemy(ctx, col + 9, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 11, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'spectral_pipe_bastion': {
      // 15 cols: 4 pipes with bridge walkways connecting them and patrolling thief.
      const width = 15;
      addPipe(ctx, col + 2, 2, false);
      addPipe(ctx, col + 5, 4, true);
      addPipe(ctx, col + 9, 3, false);
      addPipe(ctx, col + 12, 2, true);

      // Walkways between pipes
      for (let c = col + 6; c <= col + 8; c++) {
        putBlock(ctx, c, 7, 'bridge');
        addCoin(ctx, c, 5.5);
      }
      addEnemy(ctx, col + 7, 6, 'thief');
      putBlock(ctx, col + 7, 3, 'question', 'powerup');
      return width;
    }

    case 'zero_sum_switchback': {
      // 14 cols: Zigzag platforms with spring to invert direction and outpace the thief.
      const width = 14;
      for (let c = col + 2; c <= col + 5; c++) putBlock(ctx, c, 9, 'hard');
      for (let c = col + 5; c <= col + 8; c++) putBlock(ctx, c, 6, 'hard');
      for (let c = col + 8; c <= col + 11; c++) putBlock(ctx, c, 3, 'hard');

      addSpring(ctx, col + 2, 9);
      addCoinArc(ctx, col + 5, 4, 4.0);
      addCoinArc(ctx, col + 8, 4, 1.5);

      addEnemy(ctx, col + 4, 8, 'thief');
      addEnemy(ctx, col + 10, 2, 'koopa_red');
      return width;
    }

    case 'eclipse_vault_approach': {
      // 14 cols: High reward highway at row 6 bypassing ground obstacles.
      const width = 14;
      for (let c = col + 2; c <= col + 10; c++) {
        putBlock(ctx, c, 6, 'bridge');
        addCoin(ctx, c, 4.5);
      }
      putBlock(ctx, col + 6, 3, 'question', 'powerup');

      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'thief');
      addEnemy(ctx, col + 8, GROUND_ROW - 1, 'spiny');
      return width;
    }
  }
}

// ============================================================================
// THE 4 MIRAGE CASTLES (W-4, X-4, U-4, Y-4 — 100% Unique Fortress Plans)
// ============================================================================

interface CastleConfig {
  sections: FortressSection[];
  arenaStyle: ArenaStyle;
  entranceLen: number;
}

const MIRAGE_CASTLE_CONFIGS: CastleConfig[] = [
  // W-4 (idx 3, World 1): Guarded dais and spiny gauntlets, ArenaStyle 2, cursor -> 62
  {
    sections: ['guard_corridor', 'sunken_lava_dais', 'lift_chasm', 'spiny_gauntlet', 'supply_room'],
    arenaStyle: 2,
    entranceLen: 6,
  },
  // X-4 (idx 7, World 2): Crusher drop and magma catwalks, ArenaStyle 0, cursor -> 78
  {
    sections: ['crusher_drop', 'dual_route', 'fire_bar_alley', 'magma_catwalk', 'cramped_hall', 'supply_room'],
    arenaStyle: 0,
    entranceLen: 8,
  },
  // U-4 (idx 11, World 3): Pendulum lifts and twin-tier gauntlet, ArenaStyle 1, cursor -> 85
  {
    sections: ['pendulum_lifts', 'cramped_hall', 'lava_staircase', 'twin_tier_gauntlet', 'chuck_bastion', 'supply_room'],
    arenaStyle: 1,
    entranceLen: 12,
  },
  // Y-4 (idx 15, World 4): Grand Shadow Bastion: rotating halls & pillars, ArenaStyle 3, cursor -> 99
  {
    sections: ['rotating_maze_hall', 'pillar_hops', 'vertical_lift', 'chuck_bastion', 'dual_route', 'spiny_gauntlet', 'supply_room'],
    arenaStyle: 3,
    entranceLen: 18,
  },
];

function buildMirageCastle(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  ctx.isFortress = true;
  const config = MIRAGE_CASTLE_CONFIGS[Math.max(0, Math.min(3, ctx.worldNum - 1))];

  // Castle Opening: Smoky spectral portal and entrance hall
  for (let c = 0; c <= 8 + config.entranceLen; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  putBlock(ctx, 8, 8, 'hard');
  putBlock(ctx, 9, 8, 'hard');
  putBlock(ctx, 10, 8, 'hard');
  putBlock(ctx, 9, 5, 'question', 'powerup');

  // Themed smoky entrance hall per castle
  if (ctx.worldNum === 1) {
    putBlock(ctx, 11, 10, 'hard');
    putBlock(ctx, 12, 9, 'hard');
  } else if (ctx.worldNum === 2) {
    putBlock(ctx, 12, 10, 'hard');
    putBlock(ctx, 13, 9, 'hard');
    putBlock(ctx, 14, 8, 'hard');
  } else if (ctx.worldNum === 3) {
    for (let c = 12; c <= 16; c++) putBlock(ctx, c, 8, 'hard');
    addCoin(ctx, 14, 6.5);
  } else {
    for (let c = 12; c <= 19; c++) putBlock(ctx, c, 7, 'hard');
    addCoinArc(ctx, 14, 5, 5.0);
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
// THE 12 MIRAGE STAGE BLUEPRINTS (0% setpiece repetition within any level)
// ============================================================================

const MIRAGE_STAGE_BLUEPRINTS: Record<number, StageBlueprint<MirageSetpiece>> = {
  // W-1 (idx 0, objective recover): Debut of the magpie thief
  0: {
    opening: 'split_tunnel',
    act1: 'magpie_roost_arena',
    trans1: 'breather_2',
    act2: 'heist_catwalk_overpass',
    midpoint: 'high_terrace',
    act3: 'smuggler_slide_tunnel',
    trans2: 'elevation_terrace_5',
    act4: ['decoy_gem_courtyard', 'black_market_terraces'],
    finale: 'twin_deck_sprint',
  },
  // W-2 (idx 1, objective collect): Gem exploration through ash tunnel & pens
  1: {
    opening: 'sunken_courtyard',
    act1: 'ash_tunnel_ambush',
    trans1: 'coin_step_3',
    act2: 'phantom_lift_crossing',
    midpoint: 'sunken_oasis',
    act3: 'thief_gauntlet_pen',
    trans2: 'slide_gate_4',
    act4: ['stolen_crown_spire', 'spectral_pipe_bastion'],
    finale: 'stepping_archway',
  },
  // W-3 (idx 2, objective time_attack): Rapid pursuit across switchbacks & overpasses
  2: {
    opening: 'spring_launch_pad',
    act1: 'zero_sum_switchback',
    trans1: 'mini_pipe_4',
    act2: 'eclipse_vault_approach',
    midpoint: 'gazebo_lookout',
    act3: 'smuggler_slide_tunnel',
    trans2: 'arch_split_5',
    act4: ['heist_catwalk_overpass', 'smoke_loom_labyrinth'],
    finale: 'spring_citadel_launch',
  },

  // X-1 (idx 4, objective recover): Stolen gems in black market & phantom lifts
  4: {
    opening: 'canopy_drop',
    act1: 'decoy_gem_courtyard',
    trans1: 'slide_gate_4',
    act2: 'black_market_terraces',
    midpoint: 'arch_sanctuary',
    act3: 'ash_tunnel_ambush',
    trans2: 'elevation_terrace_5',
    act4: ['thief_gauntlet_pen', 'zero_sum_switchback'],
    finale: 'sky_platform_leap',
  },
  // X-2 (idx 5, objective chase): Escaping shadow through spectral pipes & chimney
  5: {
    opening: 'bridge_arch',
    act1: 'shadow_chimney_bypass',
    trans1: 'breather_2',
    act2: 'spectral_pipe_bastion',
    midpoint: 'high_terrace',
    act3: 'stolen_crown_spire',
    trans2: 'coin_step_3',
    act4: ['smuggler_slide_tunnel', 'magpie_roost_arena'],
    finale: 'classic_staircase',
  },
  // X-3 (idx 6, objective time_attack): Clock race across smoke loom & switchbacks
  6: {
    opening: 'windmill_runway',
    act1: 'heist_catwalk_overpass',
    trans1: 'arch_split_5',
    act2: 'smoke_loom_labyrinth',
    midpoint: 'sunken_oasis',
    act3: 'zero_sum_switchback',
    trans2: 'mini_pipe_4',
    act4: ['black_market_terraces', 'decoy_gem_courtyard'],
    finale: 'cloud_highway_drop',
  },

  // U-1 (idx 8, objective recover): High-stakes recovery in thief pen & spire
  8: {
    opening: 'meadow_plaza',
    act1: 'thief_gauntlet_pen',
    trans1: 'elevation_terrace_5',
    act2: ['phantom_lift_crossing', 'stolen_crown_spire'],
    midpoint: 'gazebo_lookout',
    act3: 'spectral_pipe_bastion',
    trans2: 'breather_2',
    act4: ['magpie_roost_arena', 'black_market_terraces'],
    finale: 'moving_lift_tower',
  },
  // U-2 (idx 9, objective collect): Gem labyrinth through eclipse approach
  9: {
    opening: 'pipe_terrace',
    act1: 'eclipse_vault_approach',
    trans1: 'coin_step_3',
    act2: ['shadow_chimney_bypass', 'decoy_gem_courtyard'],
    midpoint: 'arch_sanctuary',
    act3: 'smoke_loom_labyrinth',
    trans2: 'slide_gate_4',
    act4: ['zero_sum_switchback', 'ash_tunnel_ambush'],
    finale: 'gauntlet_ramp',
  },
  // U-3 (idx 10, objective chase): Dark shadow pursuit across terraces & pens
  10: {
    opening: 'split_tunnel',
    act1: 'black_market_terraces',
    trans1: 'mini_pipe_4',
    act2: ['spectral_pipe_bastion', 'thief_gauntlet_pen'],
    midpoint: 'high_terrace',
    act3: 'stolen_crown_spire',
    trans2: 'elevation_terrace_5',
    act4: ['phantom_lift_crossing', 'smuggler_slide_tunnel'],
    finale: 'spring_citadel_launch',
  },

  // Y-1 (idx 12, objective time_attack): Climax sprint through switchbacks & chimney
  12: {
    opening: 'spring_launch_pad',
    act1: 'zero_sum_switchback',
    trans1: 'arch_split_5',
    act2: ['heist_catwalk_overpass', 'eclipse_vault_approach'],
    midpoint: 'sunken_oasis',
    act3: 'shadow_chimney_bypass',
    trans2: 'breather_2',
    act4: ['smoke_loom_labyrinth', 'spectral_pipe_bastion'],
    finale: 'twin_deck_sprint',
  },
  // Y-2 (idx 13, objective chase): Desperate chase through ash tunnel & crown spire
  13: {
    opening: 'canopy_drop',
    act1: 'ash_tunnel_ambush',
    trans1: 'slide_gate_4',
    act2: ['thief_gauntlet_pen', 'stolen_crown_spire'],
    midpoint: 'gazebo_lookout',
    act3: 'black_market_terraces',
    trans2: 'coin_step_3',
    act4: ['phantom_lift_crossing', 'eclipse_vault_approach'],
    finale: 'stepping_archway',
  },
  // Y-3 (idx 14, objective collect): Final jewel sanctuary recovery
  14: {
    opening: 'sunken_courtyard',
    act1: 'smuggler_slide_tunnel',
    trans1: 'elevation_terrace_5',
    act2: ['spectral_pipe_bastion', 'decoy_gem_courtyard'],
    midpoint: 'arch_sanctuary',
    act3: 'zero_sum_switchback',
    trans2: 'mini_pipe_4',
    act4: ['shadow_chimney_bypass', 'smoke_loom_labyrinth'],
    finale: 'sky_platform_leap',
  },
};

// ============================================================================
// STAGE BUILDER FOR NON-CASTLE MIRAGE STAGES
// ============================================================================

function buildMirageNormalStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  const bp = MIRAGE_STAGE_BLUEPRINTS[ctx.levelIndex] ?? MIRAGE_STAGE_BLUEPRINTS[0];

  // 1. Act I: Opening Style
  let cursor = buildOpeningStyle(ctx, bp.opening);

  // Setpiece(s) for Act 1
  const act1Pieces = Array.isArray(bp.act1) ? bp.act1 : [bp.act1];
  for (const piece of act1Pieces) {
    cursor += buildMirageSetpiece(ctx, piece, cursor);
  }

  // 2. Transition 1
  if (bp.trans1) {
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
  }

  // 3. Act II: Setpiece(s) + Guaranteed Shaft Plaza
  const act2Pieces = Array.isArray(bp.act2) ? bp.act2 : [bp.act2];
  for (const piece of act2Pieces) {
    cursor += buildMirageSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');

  // 4. Midpoint Interlude Plaza
  cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint ?? 'gazebo_lookout');

  // 5. Act III: Setpiece(s) + Guaranteed Vault Plaza
  const act3Pieces = Array.isArray(bp.act3) ? bp.act3 : [bp.act3];
  for (const piece of act3Pieces) {
    cursor += buildMirageSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');

  // 6. Transition 2
  if (bp.trans2) {
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
  }

  // 7. Act IV: Climax Setpiece(s)
  const act4Pieces = Array.isArray(bp.act4) ? bp.act4 : [bp.act4];
  for (const piece of act4Pieces) {
    cursor += buildMirageSetpiece(ctx, piece, cursor);
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

export function buildMirageStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  if (ctx.stageNum === 4) {
    return buildMirageCastle(ctx);
  }
  return buildMirageNormalStage(ctx);
}
