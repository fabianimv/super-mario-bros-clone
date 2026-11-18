import { GROUND_ROW, TILE } from '../engine/biomes';
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
  addPlatform,
  addPlateau,
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
  gridKey,
  putBlock,
  variantOf,
} from './builderToolkit';

// ============================================================================
// 24 EXCLUSIVE SETPIECES FOR EXPEDITION & FRONTIER (Phase 4 Abilities & Biomes)
// ============================================================================

export type ExpeditionSetpiece =
  // Arrecife Coral (lowgrav, Phase 4 Slide & Wrench)
  | 'coral_atoll_arch'
  | 'bubble_trench_leap'
  | 'submarine_slide_duct'
  | 'pearl_wrench_cage'
  // Selva Neón (firefly, Phase 4 Wall Jump & Slide)
  | 'neon_firefly_canopy'
  | 'liana_walljump_gorge'
  | 'biolume_double_bridge'
  | 'glowing_root_undercroft'
  // Ciudad Engranaje (crumble, Phase 4 Wrench & Wall Jump)
  | 'clockwork_piston_hall'
  | 'crumble_gear_viaduct'
  | 'wrench_bell_tower'
  | 'steam_pipe_labyrinth'
  // Reino de Algodón (wind, Airborne Boosts & Springs)
  | 'meringue_wind_sails'
  | 'rainbow_tier_cascades'
  | 'cloud_galleon_decks'
  | 'zephyr_spring_citadel'
  // Volcán Cristal (icicles, Phase 4 Wall Jump & Slide)
  | 'crystal_icicle_nave'
  | 'amethyst_wall_chimney'
  | 'geode_slide_gauntlet'
  | 'prismatic_caldera_lifts'
  // Frontera Mundo 5 (Marea Espejo & Valle Vítreo, Phase 4 Abilities)
  | 'mirror_tide_twin_arches'
  | 'surf_mushroom_atoll'
  | 'vitreous_chime_towers'
  | 'glass_canyon_catwalk';

function buildExpSetpiece(
  ctx: BuilderCtx,
  kind: ExpeditionSetpiece,
  col: number
): number {
  const v = variantOf(ctx, col);

  switch (kind) {
    // ------------------------------------------------------------------------
    // ARRECIFE CORAL (lowgrav)
    // ------------------------------------------------------------------------
    case 'coral_atoll_arch': {
      // Ascending coral atoll arch with lowgrav bridged chasm
      putBlock(ctx, col + 1, 11, 'hard');
      putBlock(ctx, col + 2, 10, 'hard');
      putBlock(ctx, col + 3, 9, 'hard');
      putBlock(ctx, col + 4, 8, 'hard');
      putBlock(ctx, col + 5, 8, 'hard');

      // 3-column lowgrav pit bridged at row 9 (consecutiveGap = 0)
      carvePit(ctx, col + 6, 3);
      putBlock(ctx, col + 6, 9, 'bridge');
      putBlock(ctx, col + 7, 9, 'bridge');
      putBlock(ctx, col + 8, 9, 'bridge');

      // High lookout coral canopy at row 5
      for (let c = col + 8; c <= col + 11; c++) {
        putBlock(ctx, c, 5, 'hard');
      }
      putBlock(ctx, col + 9, 2, 'question', v === 0 ? 'powerup' : 'coin');
      addCoinArc(ctx, col + 6, 5, 3.5);

      addEnemy(ctx, col + 12, GROUND_ROW - 1, foe(ctx));
      return 14;
    }

    case 'bubble_trench_leap': {
      // 3-col trench with horizontal moving lift and canopy overhead
      carvePit(ctx, col + 4, 3);
      addPlatform(ctx, col + 4, 9, 3, 1.4, 0, 0.034, 0);

      // Upper coral canopy
      for (let c = col + 3; c <= col + 8; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }

      // Wrench target behind stone stanchion
      putBlock(ctx, col + 10, 8, 'hard');
      putBlock(ctx, col + 10, 7, 'hard');
      putBlock(ctx, col + 11, 8, 'question', 'powerup');

      addEnemy(ctx, col + 2, GROUND_ROW - 1, 'koopa_green');
      addEnemy(ctx, col + 13, GROUND_ROW - 1, foe(ctx));
      return 15;
    }

    case 'submarine_slide_duct': {
      // Phase 4 SLIDE ▼: Low tunnel at row 10 (clearance row 11) with enemies to knock down
      for (let c = col + 3; c <= col + 9; c++) {
        putBlock(ctx, c, 10, 'hard');
        putBlock(ctx, c, 9, 'hard');
      }
      // Inside duct: Galoombas knocked down by sliding
      addEnemy(ctx, col + 5, 10, 'galoomba');
      addEnemy(ctx, col + 7, 10, 'galoomba');
      addCoin(ctx, col + 4, 10.5);
      addCoin(ctx, col + 6, 10.5);
      addCoin(ctx, col + 8, 10.5);

      // Upper deck route
      putBlock(ctx, col + 6, 6, 'question', 'powerup');
      addEnemy(ctx, col + 6, 8, 'koopa_red');

      // Exit wall-jump columns
      putBlock(ctx, col + 11, 10, 'hard');
      putBlock(ctx, col + 11, 9, 'hard');
      putBlock(ctx, col + 13, 8, 'hard');
      putBlock(ctx, col + 13, 7, 'hard');
      addCoin(ctx, col + 12, 8.0);
      return 16;
    }

    case 'pearl_wrench_cage': {
      // Phase 4 WRENCH X: Recessed alcove accessible via boomerang through row 10 slot
      putBlock(ctx, col + 4, 9, 'hard');
      putBlock(ctx, col + 4, 11, 'hard'); // Gap at row 10 for wrench!
      putBlock(ctx, col + 7, 9, 'hard');
      putBlock(ctx, col + 7, 10, 'hard');
      putBlock(ctx, col + 7, 11, 'hard');
      for (let c = col + 4; c <= col + 7; c++) {
        putBlock(ctx, c, 8, 'hard');
      }
      addCoin(ctx, col + 5, 10.5);
      addCoin(ctx, col + 6, 10.5);
      putBlock(ctx, col + 6, 9, 'question', 'powerup');

      // Stepping pillars past the cage
      putBlock(ctx, col + 9, 10, 'hard');
      putBlock(ctx, col + 11, 8, 'hard');
      addCoin(ctx, col + 10, 9.0);
      addEnemy(ctx, col + 2, GROUND_ROW - 1, 'rex');
      return 14;
    }

    // ------------------------------------------------------------------------
    // SELVA NEÓN (firefly)
    // ------------------------------------------------------------------------
    case 'neon_firefly_canopy': {
      // High treetop bioluminescent canopy reachable via launch spring
      addSpring(ctx, col + 2, GROUND_ROW);
      for (let c = col + 3; c <= col + 7; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      for (let c = col + 8; c <= col + 12; c++) {
        putBlock(ctx, c, 7, 'bridge');
        addCoin(ctx, c, 5.5);
      }
      putBlock(ctx, col + 5, 2, 'question', v === 0 ? 'one_up' : 'powerup');

      addEnemy(ctx, col + 6, GROUND_ROW - 1, 'rex');
      addEnemy(ctx, col + 10, GROUND_ROW - 1, 'galoomba');
      return 15;
    }

    case 'liana_walljump_gorge': {
      // Phase 4 WALL JUMP: Parallel vertical stone walls with zig-zag coin ascent
      for (let r = 4; r <= 11; r++) {
        putBlock(ctx, col + 5, r, 'hard');
        putBlock(ctx, col + 8, r, 'hard');
      }
      // Coins climbing the shaft
      addCoin(ctx, col + 6, 10.0);
      addCoin(ctx, col + 7, 8.5);
      addCoin(ctx, col + 6, 7.0);
      addCoin(ctx, col + 7, 5.5);
      addCoin(ctx, col + 6, 4.0);

      // Summit balcony & powerup
      putBlock(ctx, col + 9, 4, 'hard');
      putBlock(ctx, col + 10, 4, 'question', 'powerup');

      // Approach steps
      putBlock(ctx, col + 2, 11, 'hard');
      putBlock(ctx, col + 3, 10, 'hard');
      addEnemy(ctx, col + 13, GROUND_ROW - 1, 'koopa_red');
      return 16;
    }

    case 'biolume_double_bridge': {
      // Two-tier glowing walkway over chasm with moving lift
      carvePit(ctx, col + 4, 3);
      for (let c = col + 3; c <= col + 10; c++) {
        putBlock(ctx, c, 9, 'bridge');
        addCoin(ctx, c, 7.5);
      }
      for (let c = col + 4; c <= col + 9; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      addPlatform(ctx, col + 11, 7, 2, 0, 2.0, 0.035, 0);
      addEnemy(ctx, col + 7, 4, 'paratroopa');
      return 15;
    }

    case 'glowing_root_undercroft': {
      // Phase 4 SLIDE ▼ & WRENCH X: Root canopy with slide tunnel and upper spiny guard
      for (let c = col + 4; c <= col + 9; c++) {
        putBlock(ctx, c, 10, 'hard');
        putBlock(ctx, c, 9, 'brick');
      }
      addCoin(ctx, col + 5, 10.5);
      addCoin(ctx, col + 7, 10.5);
      addEnemy(ctx, col + 6, 10, 'galoomba');

      addEnemy(ctx, col + 6, 8, 'spiny');
      putBlock(ctx, col + 7, 6, 'question', 'powerup');
      return 14;
    }

    // ------------------------------------------------------------------------
    // CIUDAD ENGRANAJE (crumble)
    // ------------------------------------------------------------------------
    case 'clockwork_piston_hall': {
      // Stepped piston terraces interconnected by crumbling bridges & vertical lift
      addPlateau(ctx, col + 2, 3, 10, 'hard');
      addPlateau(ctx, col + 6, 3, 8, 'hard');
      addPlateau(ctx, col + 10, 3, 6, 'hard');

      putBlock(ctx, col + 5, 10, 'bridge');
      putBlock(ctx, col + 9, 8, 'bridge');

      addPlatform(ctx, col + 13, 7, 2, 0, 2.4, 0.04, 0);
      addCoin(ctx, col + 3, 8.5);
      addCoin(ctx, col + 7, 6.5);
      addCoin(ctx, col + 11, 4.5);
      addEnemy(ctx, col + 8, 7, 'koopa_red');
      return 16;
    }

    case 'crumble_gear_viaduct': {
      // Long crumbly viaduct spanning over pit with gear teeth supports
      carvePit(ctx, col + 5, 3);
      for (let c = col + 3; c <= col + 11; c++) {
        putBlock(ctx, c, 8, 'bridge');
        addCoin(ctx, c, 6.5);
      }
      putBlock(ctx, col + 4, 10, 'hard');
      putBlock(ctx, col + 9, 10, 'hard');
      putBlock(ctx, col + 7, 5, 'question', 'powerup');
      return 15;
    }

    case 'wrench_bell_tower': {
      // Phase 4 WRENCH X & WALL JUMP: Bell tower with high ? block and slide bypass
      for (let r = 3; r <= 10; r++) {
        putBlock(ctx, col + 6, r, 'hard');
        putBlock(ctx, col + 9, r, 'hard');
      }
      putBlock(ctx, col + 7, 2, 'question', 'one_up');
      putBlock(ctx, col + 8, 2, 'brick', 'coin');

      putBlock(ctx, col + 2, 11, 'hard');
      putBlock(ctx, col + 3, 10, 'hard');
      putBlock(ctx, col + 4, 9, 'bridge');

      // Slide bypass tunnel
      for (let c = col + 10; c <= col + 12; c++) {
        putBlock(ctx, c, 10, 'hard');
        addCoin(ctx, c, 10.5);
      }
      return 15;
    }

    case 'steam_pipe_labyrinth': {
      // Piping maze with high bridges, piranha plant, and short bridged chasm
      addPipe(ctx, col + 2, 2, false);
      addPipe(ctx, col + 6, 4, true);
      addPipe(ctx, col + 11, 3, false);

      putBlock(ctx, col + 4, 9, 'bridge');
      putBlock(ctx, col + 5, 9, 'bridge');
      for (let c = col + 8; c <= col + 10; c++) {
        putBlock(ctx, c, 7, 'bridge');
      }
      putBlock(ctx, col + 9, 4, 'question', 'powerup');

      carvePit(ctx, col + 13, 2);
      putBlock(ctx, col + 13, 10, 'bridge');
      putBlock(ctx, col + 14, 10, 'bridge');
      return 16;
    }

    // ------------------------------------------------------------------------
    // REINO DE ALGODÓN (wind)
    // ------------------------------------------------------------------------
    case 'meringue_wind_sails': {
      // Stepped wind sails over airy chasm
      for (let c = col + 2; c <= col + 4; c++) {
        putBlock(ctx, c, 9, 'bridge');
        addCoin(ctx, c, 7.5);
      }
      carvePit(ctx, col + 5, 3);
      for (let c = col + 5; c <= col + 8; c++) {
        putBlock(ctx, c, 7, 'bridge');
        addCoin(ctx, c, 5.5);
      }
      for (let c = col + 10; c <= col + 12; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      addEnemy(ctx, col + 7, 6, 'paratroopa');
      putBlock(ctx, col + 11, 2, 'question', 'powerup');
      return 15;
    }

    case 'rainbow_tier_cascades': {
      // Descending tiers from row 5 to 7 + high-speed wind slide tunnel below
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      for (let c = col + 6; c <= col + 9; c++) {
        putBlock(ctx, c, 7, 'bridge');
        addCoin(ctx, c, 5.5);
      }
      for (let c = col + 10; c <= col + 14; c++) {
        putBlock(ctx, c, 10, 'hard');
        addCoin(ctx, c, 10.5);
      }
      addEnemy(ctx, col + 12, 10, 'galoomba');
      putBlock(ctx, col + 4, 2, 'question', 'powerup');
      return 16;
    }

    case 'cloud_galleon_decks': {
      // Two airborne cloud galleon decks with moving shuttle lift and mast
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 7, 'hard');
        addCoin(ctx, c, 5.5);
      }
      carvePit(ctx, col + 6, 3);
      addPlatform(ctx, col + 6, 8, 2, 1.2, 0, 0.04, 0);

      for (let c = col + 9; c <= col + 13; c++) {
        putBlock(ctx, c, 6, 'hard');
        addCoin(ctx, c, 4.5);
      }
      for (let r = 2; r <= 5; r++) {
        putBlock(ctx, col + 11, r, 'hard');
      }
      putBlock(ctx, col + 10, 2, 'question', 'one_up');
      return 16;
    }

    case 'zephyr_spring_citadel': {
      // High wind citadel terrace launched by super spring
      addSpring(ctx, col + 3, GROUND_ROW);
      for (let c = col + 6; c <= col + 11; c++) {
        putBlock(ctx, c, 6, 'hard');
        addCoin(ctx, c, 4.5);
      }
      putBlock(ctx, col + 8, 3, 'question', 'powerup');
      addEnemy(ctx, col + 7, GROUND_ROW - 1, 'koopa_red');
      addCoin(ctx, col + 9, 10.5);
      return 14;
    }

    // ------------------------------------------------------------------------
    // VOLCÁN CRISTAL (icicles)
    // ------------------------------------------------------------------------
    case 'crystal_icicle_nave': {
      // Guaranteed ceiling blocks at row 5 separated >= 5 cols over solid ground!
      putBlock(ctx, col + 3, 5, 'hard');
      putBlock(ctx, col + 8, 5, 'hard');
      putBlock(ctx, col + 13, 5, 'hard');

      for (let c = col + 2; c <= col + 14; c++) {
        if (c % 2 === 0) putBlock(ctx, c, 4, 'bridge');
      }
      addCoin(ctx, col + 3, 7.5);
      addCoin(ctx, col + 8, 7.5);
      addCoin(ctx, col + 13, 7.5);

      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'rex');
      addEnemy(ctx, col + 10, GROUND_ROW - 1, 'spiny');
      return 16;
    }

    case 'amethyst_wall_chimney': {
      // Phase 4 WALL JUMP: Parallel crystal walls + icicle candidate ceiling
      for (let r = 4; r <= 11; r++) {
        putBlock(ctx, col + 4, r, 'hard');
        putBlock(ctx, col + 7, r, 'hard');
      }
      putBlock(ctx, col + 5, 3, 'question', 'powerup');
      addCoinArc(ctx, col + 5, 2, 2.5);

      // Icicle candidate ceiling at col+11
      putBlock(ctx, col + 11, 5, 'hard');
      addCoin(ctx, col + 11, 7.5);
      addEnemy(ctx, col + 12, GROUND_ROW - 1, 'koopa_red');
      return 15;
    }

    case 'geode_slide_gauntlet': {
      // Phase 4 SLIDE ▼: Crystalline geode tunnel with multi-enemy knock down
      for (let c = col + 4; c <= col + 10; c++) {
        putBlock(ctx, c, 10, 'hard');
        putBlock(ctx, c, 9, 'hard');
        addCoin(ctx, c, 10.5);
      }
      addEnemy(ctx, col + 5, 10, 'galoomba');
      addEnemy(ctx, col + 8, 10, 'galoomba');
      putBlock(ctx, col + 7, 5, 'question', 'powerup');

      // Icicle candidate ceiling at col+13
      putBlock(ctx, col + 13, 5, 'hard');
      return 16;
    }

    case 'prismatic_caldera_lifts': {
      // Magma pit with moving lift, crystal pillars, and high icicle ceiling
      carvePit(ctx, col + 5, 3, true);
      addPlatform(ctx, col + 5, 8, 3, 0, 2.0, 0.035, 0);

      putBlock(ctx, col + 3, 9, 'hard');
      putBlock(ctx, col + 9, 9, 'hard');
      putBlock(ctx, col + 12, 5, 'hard');
      putBlock(ctx, col + 12, 2, 'question', 'powerup');
      addEnemy(ctx, col + 11, GROUND_ROW - 1, 'chuck');
      return 16;
    }

    // ------------------------------------------------------------------------
    // FRONTERA MUNDO 5 (Marea Espejo & Valle Vítreo)
    // ------------------------------------------------------------------------
    case 'mirror_tide_twin_arches': {
      // Symmetrical arches with center trampoline spring
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 8, 'hard');
      }
      for (let c = col + 9; c <= col + 12; c++) {
        putBlock(ctx, c, 8, 'hard');
      }
      addSpring(ctx, col + 7, GROUND_ROW);
      addCoinArc(ctx, col + 5, 5, 3.0);
      putBlock(ctx, col + 7, 2, 'question', 'powerup');
      addEnemy(ctx, col + 3, 7, 'galoomba');
      addEnemy(ctx, col + 11, 7, 'galoomba');
      return 16;
    }

    case 'surf_mushroom_atoll': {
      // Giant bouncy mushrooms with spring and moving lift over chasm
      for (let c = col + 2; c <= col + 4; c++) {
        putBlock(ctx, c, 9, 'bridge');
      }
      for (let c = col + 7; c <= col + 9; c++) {
        putBlock(ctx, c, 7, 'bridge');
      }
      addSpring(ctx, col + 3, 9);

      carvePit(ctx, col + 11, 3);
      addPlatform(ctx, col + 11, 9, 3, 1.2, 0, 0.04, 0);
      putBlock(ctx, col + 8, 4, 'question', 'powerup');
      return 15;
    }

    case 'vitreous_chime_towers': {
      // Phase 4 WALL JUMP: Glass chime towers with vertical coin line & terrace
      for (let r = 4; r <= 10; r++) {
        putBlock(ctx, col + 3, r, 'hard');
        putBlock(ctx, col + 6, r, 'hard');
      }
      addCoin(ctx, col + 4, 8.5);
      addCoin(ctx, col + 5, 6.5);
      addCoin(ctx, col + 4, 4.5);
      putBlock(ctx, col + 5, 3, 'question', 'powerup');

      addPlateau(ctx, col + 9, 4, 10, 'hard');
      addEnemy(ctx, col + 10, 9, 'spiny');
      return 15;
    }

    case 'glass_canyon_catwalk': {
      // Phase 4 SLIDE ▼: Catwalk at row 6, slide tunnel at row 10, stepping stone
      for (let c = col + 3; c <= col + 10; c++) {
        putBlock(ctx, c, 6, 'bridge');
        addCoin(ctx, c, 4.5);
      }
      for (let c = col + 5; c <= col + 9; c++) {
        putBlock(ctx, c, 10, 'hard');
        addCoin(ctx, c, 10.5);
      }
      addEnemy(ctx, col + 7, 10, 'rex');

      carvePit(ctx, col + 12, 2);
      putBlock(ctx, col + 12, 10, 'hard');
      addEnemy(ctx, col + 6, 4, 'paratroopa');
      return 16;
    }
  }
}

// ============================================================================
// STAGE BLUEPRINTS FOR ALL 21 NON-CASTLE STAGES (0% Repeated Setpieces)
// ============================================================================

const EXP_BLUEPRINTS: Record<number, StageBlueprint<ExpeditionSetpiece>> = {
  // --------------------------------------------------------------------------
  // EXPEDITION WORLD 1: A (Arrecife Coral - lowgrav)
  // --------------------------------------------------------------------------
  0: {
    // A-1
    opening: 'meadow_plaza',
    act1: 'coral_atoll_arch',
    trans1: 'coin_step_3',
    act2: 'bubble_trench_leap',
    midpoint: 'gazebo_lookout',
    act3: 'submarine_slide_duct',
    trans2: 'slide_gate_4',
    act4: 'pearl_wrench_cage',
    finale: 'classic_staircase',
  },
  1: {
    // A-2 (Must have question block with powerup/feather)
    opening: 'pipe_terrace',
    act1: 'bubble_trench_leap',
    trans1: 'breather_2',
    act2: 'pearl_wrench_cage',
    midpoint: 'high_terrace',
    act3: 'coral_atoll_arch',
    trans2: 'arch_split_5',
    act4: 'submarine_slide_duct',
    finale: 'sky_platform_leap',
  },
  2: {
    // A-3
    opening: 'canopy_drop',
    act1: 'submarine_slide_duct',
    trans1: 'mini_pipe_4',
    act2: 'neon_firefly_canopy',
    midpoint: 'arch_sanctuary',
    act3: 'pearl_wrench_cage',
    trans2: 'elevation_terrace_5',
    act4: 'coral_atoll_arch',
    finale: 'spring_citadel_launch',
  },

  // --------------------------------------------------------------------------
  // EXPEDITION WORLD 2: S (Selva Neón - firefly)
  // --------------------------------------------------------------------------
  4: {
    // S-1
    opening: 'sunken_courtyard',
    act1: 'neon_firefly_canopy',
    trans1: 'arch_split_5',
    act2: 'liana_walljump_gorge',
    midpoint: 'sunken_oasis',
    act3: 'biolume_double_bridge',
    trans2: 'coin_step_3',
    act4: 'glowing_root_undercroft',
    finale: 'twin_deck_sprint',
  },
  5: {
    // S-2
    opening: 'split_tunnel',
    act1: 'liana_walljump_gorge',
    trans1: 'slide_gate_4',
    act2: 'amethyst_wall_chimney',
    midpoint: 'gazebo_lookout',
    act3: 'glowing_root_undercroft',
    trans2: 'breather_2',
    act4: 'neon_firefly_canopy',
    finale: 'stepping_archway',
  },
  6: {
    // S-3
    opening: 'spring_launch_pad',
    act1: 'biolume_double_bridge',
    trans1: 'elevation_terrace_5',
    act2: 'neon_firefly_canopy',
    midpoint: 'high_terrace',
    act3: 'liana_walljump_gorge',
    trans2: 'mini_pipe_4',
    act4: 'glowing_root_undercroft',
    finale: 'moving_lift_tower',
  },

  // --------------------------------------------------------------------------
  // EXPEDITION WORLD 3: E (Ciudad Engranaje - crumble)
  // --------------------------------------------------------------------------
  8: {
    // E-1
    opening: 'windmill_runway',
    act1: 'clockwork_piston_hall',
    trans1: 'coin_step_3',
    act2: 'crumble_gear_viaduct',
    midpoint: 'arch_sanctuary',
    act3: 'wrench_bell_tower',
    trans2: 'breather_2',
    act4: 'steam_pipe_labyrinth',
    finale: 'gauntlet_ramp',
  },
  9: {
    // E-2
    opening: 'bridge_arch',
    act1: 'crumble_gear_viaduct',
    trans1: 'slide_gate_4',
    act2: 'steam_pipe_labyrinth',
    midpoint: 'gazebo_lookout',
    act3: 'clockwork_piston_hall',
    trans2: 'arch_split_5',
    act4: 'wrench_bell_tower',
    finale: 'classic_staircase',
  },
  10: {
    // E-3
    opening: 'canopy_drop',
    act1: 'wrench_bell_tower',
    trans1: 'mini_pipe_4',
    act2: 'meringue_wind_sails',
    midpoint: 'sunken_oasis',
    act3: 'steam_pipe_labyrinth',
    trans2: 'elevation_terrace_5',
    act4: 'crumble_gear_viaduct',
    finale: 'cloud_highway_drop',
  },

  // --------------------------------------------------------------------------
  // EXPEDITION WORLD 4: N (Reino de Algodón - wind)
  // --------------------------------------------------------------------------
  12: {
    // N-1
    opening: 'spring_launch_pad',
    act1: 'meringue_wind_sails',
    trans1: 'breather_2',
    act2: 'rainbow_tier_cascades',
    midpoint: 'high_terrace',
    act3: 'cloud_galleon_decks',
    trans2: 'slide_gate_4',
    act4: 'zephyr_spring_citadel',
    finale: 'sky_platform_leap',
  },
  13: {
    // N-2
    opening: 'meadow_plaza',
    act1: 'rainbow_tier_cascades',
    trans1: 'arch_split_5',
    act2: 'zephyr_spring_citadel',
    midpoint: 'gazebo_lookout',
    act3: 'meringue_wind_sails',
    trans2: 'coin_step_3',
    act4: 'cloud_galleon_decks',
    finale: 'spring_citadel_launch',
  },
  14: {
    // N-3
    opening: 'pipe_terrace',
    act1: 'cloud_galleon_decks',
    trans1: 'elevation_terrace_5',
    act2: 'clockwork_piston_hall',
    midpoint: 'arch_sanctuary',
    act3: 'zephyr_spring_citadel',
    trans2: 'mini_pipe_4',
    act4: 'rainbow_tier_cascades',
    finale: 'moving_lift_tower',
  },

  // --------------------------------------------------------------------------
  // EXPEDITION WORLD 5: C (Volcán Cristal - icicles)
  // --------------------------------------------------------------------------
  16: {
    // C-1
    opening: 'split_tunnel',
    act1: 'crystal_icicle_nave',
    trans1: 'coin_step_3',
    act2: 'amethyst_wall_chimney',
    midpoint: 'sunken_oasis',
    act3: 'geode_slide_gauntlet',
    trans2: 'breather_2',
    act4: 'prismatic_caldera_lifts',
    finale: 'stepping_archway',
  },
  17: {
    // C-2
    opening: 'sunken_courtyard',
    act1: 'amethyst_wall_chimney',
    trans1: 'slide_gate_4',
    act2: 'prismatic_caldera_lifts',
    midpoint: 'gazebo_lookout',
    act3: 'crystal_icicle_nave',
    trans2: 'elevation_terrace_5',
    act4: 'geode_slide_gauntlet',
    finale: 'twin_deck_sprint',
  },
  18: {
    // C-3
    opening: 'bridge_arch',
    act1: 'geode_slide_gauntlet',
    trans1: 'arch_split_5',
    act2: 'crystal_icicle_nave',
    midpoint: 'high_terrace',
    act3: 'prismatic_caldera_lifts',
    trans2: 'mini_pipe_4',
    act4: 'amethyst_wall_chimney',
    finale: 'gauntlet_ramp',
  },

  // --------------------------------------------------------------------------
  // FRONTIER WORLD 1: M (Marea Espejo - bounce)
  // --------------------------------------------------------------------------
  20: {
    // M-1
    opening: 'windmill_runway',
    act1: 'mirror_tide_twin_arches',
    trans1: 'breather_2',
    act2: 'surf_mushroom_atoll',
    midpoint: 'arch_sanctuary',
    act3: 'meringue_wind_sails',
    trans2: 'slide_gate_4',
    act4: 'rainbow_tier_cascades',
    finale: 'spring_citadel_launch',
  },
  21: {
    // M-2
    opening: 'pipe_terrace',
    act1: 'surf_mushroom_atoll',
    trans1: 'coin_step_3',
    act2: 'coral_atoll_arch',
    midpoint: 'gazebo_lookout',
    act3: 'mirror_tide_twin_arches',
    trans2: 'elevation_terrace_5',
    act4: 'bubble_trench_leap',
    finale: 'classic_staircase',
  },
  22: {
    // M-3
    opening: 'canopy_drop',
    act1: 'mirror_tide_twin_arches',
    trans1: 'arch_split_5',
    act2: 'wrench_bell_tower',
    midpoint: 'sunken_oasis',
    act3: 'surf_mushroom_atoll',
    trans2: 'mini_pipe_4',
    act4: 'clockwork_piston_hall',
    finale: 'sky_platform_leap',
  },

  // --------------------------------------------------------------------------
  // FRONTIER WORLD 2: V (Valle Vítreo - firefly)
  // --------------------------------------------------------------------------
  24: {
    // V-1
    opening: 'split_tunnel',
    act1: 'vitreous_chime_towers',
    trans1: 'slide_gate_4',
    act2: 'glass_canyon_catwalk',
    midpoint: 'high_terrace',
    act3: 'amethyst_wall_chimney',
    trans2: 'breather_2',
    act4: 'crystal_icicle_nave',
    finale: 'twin_deck_sprint',
  },
  25: {
    // V-2
    opening: 'spring_launch_pad',
    act1: 'glass_canyon_catwalk',
    trans1: 'elevation_terrace_5',
    act2: 'cloud_galleon_decks',
    midpoint: 'gazebo_lookout',
    act3: 'vitreous_chime_towers',
    trans2: 'coin_step_3',
    act4: 'biolume_double_bridge',
    finale: 'cloud_highway_drop',
  },
  26: {
    // V-3
    opening: 'sunken_courtyard',
    act1: 'vitreous_chime_towers',
    trans1: 'arch_split_5',
    act2: 'submarine_slide_duct',
    midpoint: 'arch_sanctuary',
    act3: 'glass_canyon_catwalk',
    trans2: 'slide_gate_4',
    act4: 'pearl_wrench_cage',
    finale: 'gauntlet_ramp',
  },
};

// ============================================================================
// GUARANTEED ICICLE CEILINGS (C-1..C-3 and icicle stages)
// ============================================================================

function ensureIcicleCeilingsIfApplicable(ctx: BuilderCtx, totalCols: number): void {
  // Expedition World 5 (C-1..C-3) uses the icicles mechanic
  const isIcicleStage =
    ctx.partition === 'expedition' && ctx.worldNum === 5 && ctx.stageNum < 4;
  if (!isIcicleStage) return;

  // Place icicle ceiling blocks at row 4 (valid for icicles rows 2..8, but row 4 < 5 so it never blocks findVaultCol!)
  for (let c = 20; c <= 65; c += 7) {
    if (
      !ctx.pits.has(c) &&
      !ctx.blockGrid.has(gridKey(c, 4)) &&
      !ctx.blockGrid.has(gridKey(c, 5))
    ) {
      putBlock(ctx, c, 4, 'hard');
    }
  }
}

// ============================================================================
// CURATED 5-ACT STAGE BUILDER
// ============================================================================

function buildCuratedExpeditionStage(
  ctx: BuilderCtx,
  blueprint: StageBlueprint<ExpeditionSetpiece>
): number {
  // Act I Entrance
  let cursor = buildOpeningStyle(ctx, blueprint.opening);

  // In A-2 (Expedition idx 1): Guarantee question block with powerup
  if (ctx.partition === 'expedition' && ctx.levelIndex === 1) {
    putBlock(ctx, 10, 8, 'question', 'powerup');
  }

  // Act I Setpiece
  const act1 = Array.isArray(blueprint.act1) ? blueprint.act1 : [blueprint.act1];
  for (const sp of act1) {
    cursor += buildExpSetpiece(ctx, sp, cursor);
  }

  // Transition 1
  if (blueprint.trans1) {
    cursor += buildTransitionZone(ctx, blueprint.trans1, cursor);
  }

  // First-half Service Plaza: shaft_plaza (100% guarantee for findShaftCol at ~20-30% of stage)
  cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');

  // Act II Setpiece
  const act2 = Array.isArray(blueprint.act2) ? blueprint.act2 : [blueprint.act2];
  for (const sp of act2) {
    cursor += buildExpSetpiece(ctx, sp, cursor);
  }

  // Interlude: Checkpoint Plaza
  cursor += buildMidpointPlaza(ctx, cursor, blueprint.midpoint ?? 'gazebo_lookout');

  // Transition 2
  if (blueprint.trans2) {
    cursor += buildTransitionZone(ctx, blueprint.trans2, cursor);
  }

  // Act III Setpiece
  const act3 = Array.isArray(blueprint.act3) ? blueprint.act3 : [blueprint.act3];
  for (const sp of act3) {
    cursor += buildExpSetpiece(ctx, sp, cursor);
  }

  // Second-half Service Plaza: vault_plaza (100% guarantee for findVaultCol & findKeySpot at ~60-70% of stage)
  cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');

  // Plateau contour (adds elevation variety while maintaining consecutiveGap <= 4)
  const plateauWidth = 4 + variantOf(ctx, cursor);
  addPlateau(ctx, cursor, plateauWidth, 10, 'hard');
  cursor += plateauWidth;

  // Act IV Setpiece
  const act4 = Array.isArray(blueprint.act4) ? blueprint.act4 : [blueprint.act4];
  for (const sp of act4) {
    cursor += buildExpSetpiece(ctx, sp, cursor);
  }

  // Finale Style
  cursor += buildFinaleStyle(ctx, blueprint.finale, cursor);

  // Pre-flagpole run
  const totalCols = cursor + 18;

  // Ensure icicles have plenty of qualifying ceiling blocks
  ensureIcicleCeilingsIfApplicable(ctx, totalCols);

  return totalCols;
}

// ============================================================================
// 7 UNIQUE CASTLE PLANS (5 Expedition + 2 Frontier)
// ============================================================================

const EXP_CASTLE_PLANS: FortressSection[][] = [
  // 0: A-4 Arrecife Coral (Magma Cavern & Pendulum Lifts)
  ['lava_pillar', 'pendulum_lifts', 'guard_corridor', 'sunken_lava_dais', 'supply_room'],
  // 1: S-4 Selva Neón (Citadel & Chuck Bastion)
  ['cramped_hall', 'chuck_bastion', 'vertical_lift', 'lava_staircase', 'twin_tier_gauntlet', 'supply_room'],
  // 2: E-4 Ciudad Engranaje (Clockwork Fortress & Rotating Maze)
  ['rotating_maze_hall', 'lift_chasm', 'crusher_drop', 'guard_corridor', 'dual_route', 'supply_room'],
  // 3: N-4 Reino de Algodón (Cloud Citadel & Crusher Drop)
  ['crusher_drop', 'magma_catwalk', 'vertical_lift', 'pillar_hops', 'lava_pillar', 'supply_room'],
  // 4: C-4 Volcán Cristal (Grand Caldera Gauntlet)
  ['spiny_gauntlet', 'lava_pillar', 'chuck_bastion', 'crusher_drop', 'pendulum_lifts', 'guard_corridor', 'lava_staircase', 'supply_room'],
  // 5: M-4 Marea Espejo (Mirror Tide Bastion & Rotating Maze)
  ['sunken_lava_dais', 'pendulum_lifts', 'chuck_bastion', 'rotating_maze_hall', 'fire_bar_alley', 'supply_room'],
  // 6: V-4 Valle Vítreo (Vitreous Final Fortress)
  ['twin_tier_gauntlet', 'rotating_maze_hall', 'lift_chasm', 'chuck_bastion', 'spiny_gauntlet', 'lava_staircase', 'supply_room'],
];

const EXP_ARENA_STYLES: ArenaStyle[] = [0, 1, 2, 3, 1, 2, 3];

function buildExpeditionCastle(
  ctx: BuilderCtx,
  castleIdx: number
): { totalCols: number; boss: FortressBoss } {
  // Opening hall with powerup
  putBlock(ctx, 9, 8, 'brick');
  putBlock(ctx, 10, 8, 'question', 'powerup');
  putBlock(ctx, 11, 8, 'brick');
  addEnemy(ctx, 15, GROUND_ROW - 1, foe(ctx));

  const plan = EXP_CASTLE_PLANS[castleIdx % EXP_CASTLE_PLANS.length];
  const arenaStyle = EXP_ARENA_STYLES[castleIdx % EXP_ARENA_STYLES.length];

  let cursor = 18;
  for (const section of plan) {
    cursor += buildFortressSection(ctx, section, cursor) + 2;
  }

  const arenaStart = cursor + 2;
  const { arenaWidth, boss } = buildFortressArena(ctx, arenaStart, arenaStyle);
  const totalCols = arenaStart + arenaWidth + 2;

  // Ceiling masonry (row 0)
  for (let col = 0; col < totalCols; col++) {
    if (!ctx.blockGrid.has(gridKey(col, 0))) {
      putBlock(ctx, col, 0, 'hard');
    }
  }

  return { totalCols, boss };
}

// ============================================================================
// MAIN EXPORT: buildExpeditionOrFrontierStage (28 Stages)
// ============================================================================

export function buildExpeditionOrFrontierStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  const isFrontier = ctx.partition === 'frontier';
  const stageId = isFrontier ? ctx.levelIndex + 20 : ctx.levelIndex;

  if (ctx.stageNum === 4) {
    // Castle stages
    const castleIdx = isFrontier ? 5 + (ctx.worldNum - 1) : ctx.worldNum - 1;
    const { totalCols, boss } = buildExpeditionCastle(ctx, castleIdx);
    return { totalCols, boss };
  }

  // Non-castle curated 5-act stage
  const blueprint = EXP_BLUEPRINTS[stageId] ?? EXP_BLUEPRINTS[0];
  const totalCols = buildCuratedExpeditionStage(ctx, blueprint);
  return { totalCols, boss: null };
}
