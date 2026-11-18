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
  gridKey,
  putBlock,
  variantOf,
} from './builderToolkit';

// ============================================================================
// 24 EXCLUSIVE CLASSIC SETPIECES (4 per World: Bounce, Wind, Firefly, Icicles, Crumble, LowGrav)
// Truly vertical layouts (row 2..11), plateaus, double-decks, consecutiveGap <= 4
// ============================================================================

export type ClassicSetpieceName =
  // World 1: Grassland / Bounce (Hongos Trampolín)
  | 'mushroom_valley_hops'
  | 'shell_bowling_classic'
  | 'piranha_garden_terrace'
  | 'twin_bridge_overlook'
  // World 2: Desert / Wind (Dunas del Sol y Ráfagas)
  | 'sand_step_obelisk'
  | 'wind_sail_chasm'
  | 'oasis_pipe_bazaar'
  | 'mirage_brick_archway'
  // World 3: Night / Firefly (Cumbres de Luna y Luciérnagas)
  | 'firefly_lift_constellation'
  | 'starlight_paratroopa_span'
  | 'midnight_double_deck'
  | 'lunar_pillar_crossing'
  // World 4: Glacier / Icicles (Valle Escarchado y Carámbanos)
  | 'icicle_stalactite_gallery'
  | 'glacial_slip_terraces'
  | 'boreal_lift_gorge'
  | 'aurora_ice_fort'
  // World 5: Canyon & Mines / Crumble (Cañón Dorado y Puentes Frágiles)
  | 'crumble_canyon_spans'
  | 'gold_mine_cart_lifts'
  | 'suspended_ore_arches'
  | 'spiny_quarry_run'
  // World 6: Imperial Sky / Low Gravity (Cielo Imperial y Gravedad Baja)
  | 'lowgrav_star_chasms'
  | 'celestial_paratroopa_armada'
  | 'imperial_cloud_citadel'
  | 'astral_vault_gauntlet';

export function buildClassicSetpiece(
  ctx: BuilderCtx,
  name: ClassicSetpieceName,
  c: number
): number {
  const v = variantOf(ctx, c);

  switch (name) {
    // ------------------------------------------------------------------------
    // WORLD 1: BOUNCE (Hongos Trampolín)
    // ------------------------------------------------------------------------
    case 'mushroom_valley_hops': {
      // Spring trampoline into elevated mushroom terrace + small chasm
      addSpring(ctx, c + 2, GROUND_ROW);
      // High mushroom canopy at row 5-6 (supports gems before checkpoint!)
      for (let k = c + 4; k <= c + 9; k++) {
        putBlock(ctx, k, 6, 'bridge');
      }
      putBlock(ctx, c + 6, 3, 'question', v === 0 ? 'powerup' : 'coin');
      addCoinArc(ctx, c + 4, 5, 4.0);

      // Chasm of 2 cols (consecutiveGap = 0 because bridged at row 6)
      carvePit(ctx, c + 10, 2);
      putBlock(ctx, c + 10, 9, 'hard');
      putBlock(ctx, c + 11, 9, 'hard');

      addEnemy(ctx, c + 7, 5, 'koopa_green');
      addEnemy(ctx, c + 13, GROUND_ROW - 1, 'goomba');
      return 16;
    }

    case 'shell_bowling_classic': {
      // Bowling alley: Koopa on overpass/ground + line of Goombas to sweep
      for (let k = c + 3; k <= c + 8; k++) {
        const isQ = k === c + 5;
        putBlock(ctx, k, 8, isQ ? 'question' : 'brick', isQ ? (v === 1 ? 'multi_coin' : 'powerup') : null);
      }
      // Upper tier secret
      putBlock(ctx, c + 5, 4, 'brick', 'coin');
      putBlock(ctx, c + 6, 4, 'brick');
      addCoin(ctx, c + 5, 2.5);
      addCoin(ctx, c + 6, 2.5);

      addEnemy(ctx, c + 4, GROUND_ROW - 1, 'koopa_green');
      addEnemy(ctx, c + 8, GROUND_ROW - 1, 'goomba');
      addEnemy(ctx, c + 10, GROUND_ROW - 1, 'goomba');
      addEnemy(ctx, c + 12, GROUND_ROW - 1, 'goomba');
      return 15;
    }

    case 'piranha_garden_terrace': {
      // Stepped terrace via addPlateau + dual pipes with Piranha Plants
      addPipe(ctx, c + 1, 2, false);
      addPlateau(ctx, c + 4, 6, 10, 'hard');
      for (let k = c + 5; k <= c + 8; k++) {
        putBlock(ctx, k, 7, 'brick');
      }
      putBlock(ctx, c + 6, 4, 'question', v === 2 ? 'one_up' : 'coin');
      addCoinArc(ctx, c + 4, 5, 8.5);

      addPipe(ctx, c + 12, 3, true);
      addEnemy(ctx, c + 7, 9, 'goomba');
      return 17;
    }

    case 'twin_bridge_overlook': {
      // Dual suspension bridges spanning small gap
      carvePit(ctx, c + 4, 3);
      for (let k = c + 3; k <= c + 8; k++) {
        putBlock(ctx, k, 9, 'bridge'); // Low bridge satisfies gap check
        if (k >= c + 4 && k <= c + 7) {
          putBlock(ctx, k, 5, 'bridge'); // High bridge
        }
      }
      addSpring(ctx, c + 2, GROUND_ROW);
      addCoinArc(ctx, c + 4, 4, 3.5);
      addEnemy(ctx, c + 6, 8, 'paratroopa');
      addEnemy(ctx, c + 12, GROUND_ROW - 1, foe(ctx));
      return 16;
    }

    // ------------------------------------------------------------------------
    // WORLD 2: WIND (Dunas del Sol y Ráfagas)
    // ------------------------------------------------------------------------
    case 'sand_step_obelisk': {
      // Stepped sandstone monoliths with high wind obelisk
      addPlateau(ctx, c + 2, 4, 10, 'hard');
      addPlateau(ctx, c + 4, 3, 9, 'hard');
      putBlock(ctx, c + 6, 8, 'hard');
      putBlock(ctx, c + 6, 7, 'hard');
      putBlock(ctx, c + 6, 6, 'hard');
      putBlock(ctx, c + 6, 5, 'hard');

      for (let k = c + 7; k <= c + 10; k++) {
        putBlock(ctx, k, 5, 'brick');
        addCoin(ctx, k, 3.5);
      }
      putBlock(ctx, c + 8, 2, 'question', 'powerup');

      addEnemy(ctx, c + 4, 8, 'koopa_red');
      addEnemy(ctx, c + 12, GROUND_ROW - 1, 'goomba');
      return 16;
    }

    case 'wind_sail_chasm': {
      // Chasm spanned by horizontal lift and high brick sails
      carvePit(ctx, c + 3, 4);
      addPlatform(ctx, c + 4, 8, 3, 2.5, 0, 0.035, 0);
      putBlock(ctx, c + 4, 9, 'hard');
      putBlock(ctx, c + 6, 9, 'hard');

      // High brick sail catching wind coins
      for (let k = c + 3; k <= c + 7; k++) {
        putBlock(ctx, k, 4, 'brick');
      }
      addCoinArc(ctx, c + 3, 5, 2.5);
      addEnemy(ctx, c + 5, 7, 'paratroopa');
      addEnemy(ctx, c + 12, GROUND_ROW - 1, foe(ctx));
      return 17;
    }

    case 'oasis_pipe_bazaar': {
      // Low oasis depression flanked by twin pipes and palm canopy
      addPipe(ctx, c + 2, 3, false);
      addPlateau(ctx, c + 5, 6, 11, 'hard');
      for (let k = c + 6; k <= c + 9; k++) {
        putBlock(ctx, k, 7, 'bridge');
      }
      putBlock(ctx, c + 7, 4, 'question', 'powerup');
      addCoinArc(ctx, c + 5, 6, 5.0);

      addPipe(ctx, c + 13, 3, true);
      addEnemy(ctx, c + 7, 10, 'goomba');
      addEnemy(ctx, c + 8, 10, 'koopa_green');
      return 18;
    }

    case 'mirage_brick_archway': {
      // Colonnade with double stone arches
      putBlock(ctx, c + 2, 11, 'hard');
      putBlock(ctx, c + 2, 10, 'hard');
      putBlock(ctx, c + 2, 9, 'hard');
      putBlock(ctx, c + 2, 8, 'hard');

      putBlock(ctx, c + 11, 11, 'hard');
      putBlock(ctx, c + 11, 10, 'hard');
      putBlock(ctx, c + 11, 9, 'hard');
      putBlock(ctx, c + 11, 8, 'hard');

      for (let k = c + 2; k <= c + 11; k++) {
        putBlock(ctx, k, 7, 'brick');
        if (k >= c + 5 && k <= c + 8) {
          putBlock(ctx, k, 4, 'question', k === c + 6 ? 'star' : 'coin');
        }
      }
      addCoinArc(ctx, c + 4, 6, 5.5);
      addEnemy(ctx, c + 6, GROUND_ROW - 1, 'koopa_red');
      return 15;
    }

    // ------------------------------------------------------------------------
    // WORLD 3: FIREFLY (Cumbres de Luna y Luciérnagas)
    // ------------------------------------------------------------------------
    case 'firefly_lift_constellation': {
      // Firefly platform crossing chasm + lunar ledges (guarantees platforms.length > 0)
      carvePit(ctx, c + 4, 3);
      addPlatform(ctx, c + 4, 8, 3, 2.0, 0, 0.032, 0);
      putBlock(ctx, c + 5, 9, 'hard');

      // High starlight ledge
      for (let k = c + 8; k <= c + 12; k++) {
        putBlock(ctx, k, 5, 'brick');
      }
      putBlock(ctx, c + 10, 2, 'question', 'powerup');
      addCoinArc(ctx, c + 8, 5, 3.5);

      addEnemy(ctx, c + 10, 4, 'koopa_green');
      addEnemy(ctx, c + 14, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'starlight_paratroopa_span': {
      // Starlight bridge + synchronised Paratroopas
      carvePit(ctx, c + 3, 3);
      for (let k = c + 2; k <= c + 7; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      for (let k = c + 4; k <= c + 8; k++) {
        putBlock(ctx, k, 5, 'bridge');
      }
      addCoinArc(ctx, c + 3, 5, 3.5);
      addEnemy(ctx, c + 4, 8, 'paratroopa');
      addEnemy(ctx, c + 7, 4, 'paratroopa');
      addEnemy(ctx, c + 11, GROUND_ROW - 1, foe(ctx));
      return 16;
    }

    case 'midnight_double_deck': {
      // Two-floor tunnel: lower ground route vs upper illuminated terrace
      for (let k = c + 2; k <= c + 10; k++) {
        putBlock(ctx, k, 9, 'hard');
        if (k >= c + 4 && k <= c + 8) {
          putBlock(ctx, k, 6, 'question', k === c + 6 ? 'powerup' : 'coin');
        }
      }
      addPipe(ctx, c + 13, 3, false);
      addEnemy(ctx, c + 5, GROUND_ROW - 1, 'spiny');
      addEnemy(ctx, c + 7, 8, 'koopa_red');
      return 17;
    }

    case 'lunar_pillar_crossing': {
      // Stepping pillars + vertical lift
      carvePit(ctx, c + 3, 3);
      carvePit(ctx, c + 8, 2);
      putBlock(ctx, c + 4, 9, 'hard');
      putBlock(ctx, c + 8, 9, 'hard');
      addPlatform(ctx, c + 6, 7, 2, 0, 2.0, 0.035, 0);

      putBlock(ctx, c + 6, 3, 'hard');
      putBlock(ctx, c + 7, 3, 'question', 'one_up');
      addCoinArc(ctx, c + 3, 6, 5.0);

      addEnemy(ctx, c + 12, GROUND_ROW - 1, foe(ctx));
      return 16;
    }

    // ------------------------------------------------------------------------
    // WORLD 4: ICICLES (Valle Escarchado y Carámbanos)
    // ------------------------------------------------------------------------
    case 'icicle_stalactite_gallery': {
      // Guaranteed ceiling blocks in row 2..8 over solid ground separated by >= 5 cols
      // Solid ground row 12 is fully preserved!
      putBlock(ctx, c + 2, 6, 'brick');
      putBlock(ctx, c + 8, 5, 'hard');
      putBlock(ctx, c + 14, 6, 'question', 'coin');

      // Mid-height steps
      putBlock(ctx, c + 5, 9, 'hard');
      putBlock(ctx, c + 11, 9, 'hard');
      addCoin(ctx, c + 5, 7.5);
      addCoin(ctx, c + 11, 7.5);

      addEnemy(ctx, c + 4, GROUND_ROW - 1, 'spiny');
      addEnemy(ctx, c + 10, GROUND_ROW - 1, 'spiny');
      return 18;
    }

    case 'glacial_slip_terraces': {
      // Multi-tier ice terraces via addPlateau + ceiling blocks
      addPlateau(ctx, c + 2, 4, 10, 'hard');
      addPlateau(ctx, c + 7, 4, 8, 'hard');
      putBlock(ctx, c + 4, 5, 'brick'); // Icicle candidate
      putBlock(ctx, c + 12, 4, 'hard'); // Icicle candidate
      putBlock(ctx, c + 9, 5, 'question', 'powerup');

      addPipe(ctx, c + 13, 2, false);
      addEnemy(ctx, c + 4, 9, 'koopa_red');
      addEnemy(ctx, c + 9, 7, 'goomba');
      return 17;
    }

    case 'boreal_lift_gorge': {
      // Ice crevasse with moving lift + overhanging icicle ledges
      carvePit(ctx, c + 4, 4);
      addPlatform(ctx, c + 4, 9, 3, 2.2, 0, 0.034, 0);
      putBlock(ctx, c + 5, 9, 'hard');

      putBlock(ctx, c + 2, 5, 'hard'); // Icicle candidate
      putBlock(ctx, c + 10, 5, 'hard'); // Icicle candidate
      addCoinArc(ctx, c + 3, 5, 4.0);

      addEnemy(ctx, c + 13, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'aurora_ice_fort': {
      // Ice battlements over solid ground
      putBlock(ctx, c + 2, 11, 'hard');
      putBlock(ctx, c + 2, 10, 'hard');
      putBlock(ctx, c + 2, 9, 'hard');
      putBlock(ctx, c + 2, 8, 'hard');

      putBlock(ctx, c + 11, 11, 'hard');
      putBlock(ctx, c + 11, 10, 'hard');
      putBlock(ctx, c + 11, 9, 'hard');
      putBlock(ctx, c + 11, 8, 'hard');

      for (let k = c + 3; k <= c + 10; k++) {
        putBlock(ctx, k, 8, 'hard');
      }
      putBlock(ctx, c + 6, 4, 'question', 'powerup'); // Icicle candidate
      addCoinArc(ctx, c + 4, 5, 6.0);

      addEnemy(ctx, c + 6, 7, 'koopa_red');
      addEnemy(ctx, c + 13, GROUND_ROW - 1, 'spiny');
      return 16;
    }

    // ------------------------------------------------------------------------
    // WORLD 5: CRUMBLE (Cañón Dorado y Puentes Frágiles)
    // ------------------------------------------------------------------------
    case 'crumble_canyon_spans': {
      // Canyon pit bridged by 'bridge' blocks that crumble on contact
      carvePit(ctx, c + 3, 4);
      for (let k = c + 3; k <= c + 6; k++) {
        putBlock(ctx, k, 10, 'bridge'); // Low crumble bridge
      }
      for (let k = c + 2; k <= c + 7; k++) {
        putBlock(ctx, k, 6, 'bridge'); // High ore conveyor
      }
      putBlock(ctx, c + 5, 3, 'question', 'powerup');
      addCoinArc(ctx, c + 3, 4, 4.5);

      addEnemy(ctx, c + 9, GROUND_ROW - 1, 'koopa_red');
      addEnemy(ctx, c + 13, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'gold_mine_cart_lifts': {
      // Mine shaft with vertical lift and timber scaffolding
      carvePit(ctx, c + 3, 3);
      addPlatform(ctx, c + 3, 8, 3, 0, 2.5, 0.038, 0);
      putBlock(ctx, c + 4, 9, 'bridge');

      addPlateau(ctx, c + 8, 5, 9, 'hard');
      for (let k = c + 9; k <= c + 12; k++) {
        putBlock(ctx, k, 6, 'bridge');
      }
      putBlock(ctx, c + 10, 3, 'question', 'coin');
      addCoinArc(ctx, c + 8, 5, 7.5);

      addEnemy(ctx, c + 10, 8, 'spiny');
      addEnemy(ctx, c + 14, GROUND_ROW - 1, foe(ctx));
      return 17;
    }

    case 'suspended_ore_arches': {
      // Suspended wooden arches over pit
      carvePit(ctx, c + 4, 3);
      for (let k = c + 3; k <= c + 7; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      putBlock(ctx, c + 2, 7, 'hard');
      putBlock(ctx, c + 11, 7, 'hard');
      for (let k = c + 2; k <= c + 11; k++) {
        putBlock(ctx, k, 6, 'bridge');
      }
      addCoinArc(ctx, c + 4, 5, 4.5);
      addEnemy(ctx, c + 6, 5, 'paratroopa');
      addEnemy(ctx, c + 12, GROUND_ROW - 1, 'spiny');
      return 16;
    }

    case 'spiny_quarry_run': {
      // Quarry terraces connected by fragile wooden ramps
      addPlateau(ctx, c + 2, 4, 10, 'hard');
      addPlateau(ctx, c + 8, 4, 8, 'hard');
      for (let k = c + 6; k <= c + 8; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      putBlock(ctx, c + 10, 4, 'hidden', 'one_up');
      addCoinArc(ctx, c + 3, 4, 8.5);

      addEnemy(ctx, c + 4, 9, 'spiny');
      addEnemy(ctx, c + 10, 7, 'spiny');
      return 16;
    }

    // ------------------------------------------------------------------------
    // WORLD 6: LOW GRAVITY (Cielo Imperial y Gravedad Baja)
    // ------------------------------------------------------------------------
    case 'lowgrav_star_chasms': {
      // Star chasm pit in [8, safeEnd] to generate lowGravZones!
      carvePit(ctx, c + 3, 4);
      // Floating cloud stepping stones ensure consecutiveGap <= 1
      putBlock(ctx, c + 4, 9, 'hard');
      putBlock(ctx, c + 6, 8, 'hard');

      // High low-grav coin arc
      addCoinArc(ctx, c + 2, 6, 4.0);
      putBlock(ctx, c + 5, 3, 'question', 'powerup');

      addEnemy(ctx, c + 9, GROUND_ROW - 1, foe(ctx));
      addEnemy(ctx, c + 13, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'celestial_paratroopa_armada': {
      // Skyway fleet with airborne paratroopas
      carvePit(ctx, c + 6, 3);
      for (let k = c + 5; k <= c + 9; k++) {
        putBlock(ctx, k, 9, 'bridge');
      }
      for (let k = c + 2; k <= c + 10; k++) {
        putBlock(ctx, k, 5, 'bridge');
      }
      putBlock(ctx, c + 6, 2, 'question', 'star');
      addCoinArc(ctx, c + 3, 6, 3.5);

      addEnemy(ctx, c + 4, 4, 'paratroopa');
      addEnemy(ctx, c + 7, 7, 'paratroopa');
      addEnemy(ctx, c + 13, GROUND_ROW - 1, foe(ctx));
      return 17;
    }

    case 'imperial_cloud_citadel': {
      // Massive imperial battlements
      addPlateau(ctx, c + 2, 5, 9, 'hard');
      putBlock(ctx, c + 3, 5, 'hard');
      putBlock(ctx, c + 5, 5, 'hard');
      putBlock(ctx, c + 4, 2, 'question', 'powerup');

      addPipe(ctx, c + 10, 3, false);
      addCoinArc(ctx, c + 2, 5, 7.5);

      addEnemy(ctx, c + 4, 8, 'koopa_red');
      addEnemy(ctx, c + 13, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'astral_vault_gauntlet': {
      // Moving platform gliding across the astral void
      carvePit(ctx, c + 3, 4);
      addPlatform(ctx, c + 3, 8, 3, 2.5, 0, 0.035, 0);
      putBlock(ctx, c + 4, 9, 'hard');

      // High colonnade
      for (let k = c + 8; k <= c + 12; k++) {
        const isQ = k === c + 10;
        putBlock(ctx, k, 6, isQ ? 'question' : 'brick', isQ ? 'powerup' : null);
      }
      addSpring(ctx, c + 13, GROUND_ROW);
      addCoinArc(ctx, c + 8, 5, 4.0);

      addEnemy(ctx, c + 10, 5, 'koopa_red');
      return 17;
    }
  }
}

// ============================================================================
// 16 STAGE BLUEPRINTS (5 Acts, Service Plazas decoupled, zero coordinate collisions)
// ============================================================================

export interface ClassicStageConfig {
  blueprint: StageBlueprint<ClassicSetpieceName>;
  vaultSlot: 'after_act1' | 'after_act2' | 'after_act3';
  shaftSlot: 'after_act1' | 'after_act2' | 'after_act3' | 'after_act4';
}

export const CLASSIC_STAGE_CONFIGS: Record<number, ClassicStageConfig> = {
  // --- WORLD 1 ---
  // 1-3 (idx 2): Bounce mechanic + gem spots before checkpoint + spring
  2: {
    blueprint: {
      opening: 'spring_launch_pad',
      act1: 'mushroom_valley_hops',
      trans1: 'arch_split_5',
      act2: 'piranha_garden_terrace',
      midpoint: 'gazebo_lookout',
      act3: 'twin_bridge_overlook',
      trans2: 'coin_step_3',
      act4: 'shell_bowling_classic',
      finale: 'spring_citadel_launch',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act3',
  },

  // --- WORLD 2 ---
  // 2-1 (idx 4): Wind mechanic start
  4: {
    blueprint: {
      opening: 'windmill_runway',
      act1: 'sand_step_obelisk',
      trans1: 'breather_2',
      act2: 'wind_sail_chasm',
      midpoint: 'arch_sanctuary',
      act3: 'oasis_pipe_bazaar',
      trans2: 'slide_gate_4',
      act4: 'mirage_brick_archway',
      finale: 'cloud_highway_drop',
    },
    vaultSlot: 'after_act3',
    shaftSlot: 'after_act1',
  },
  // 2-2 (idx 5): Subterranean Desert Chamber
  5: {
    blueprint: {
      opening: 'split_tunnel',
      act1: 'oasis_pipe_bazaar',
      trans1: 'mini_pipe_4',
      act2: 'sand_step_obelisk',
      midpoint: 'sunken_oasis',
      act3: 'mirage_brick_archway',
      trans2: 'elevation_terrace_5',
      act4: 'wind_sail_chasm',
      finale: 'twin_deck_sprint',
    },
    vaultSlot: 'after_act2',
    shaftSlot: 'after_act4',
  },
  // 2-3 (idx 6): Acrobatic Desert Dunes
  6: {
    blueprint: {
      opening: 'bridge_arch',
      act1: 'wind_sail_chasm',
      trans1: 'arch_split_5',
      act2: 'mirage_brick_archway',
      midpoint: 'high_terrace',
      act3: 'sand_step_obelisk',
      trans2: 'coin_step_3',
      act4: 'oasis_pipe_bazaar',
      finale: 'stepping_archway',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act2',
  },

  // --- WORLD 3 ---
  // 3-1 (idx 8): Firefly mechanic (platforms.length > 0 guaranteed)
  8: {
    blueprint: {
      opening: 'canopy_drop',
      act1: 'firefly_lift_constellation',
      trans1: 'slide_gate_4',
      act2: 'starlight_paratroopa_span',
      midpoint: 'gazebo_lookout',
      act3: 'midnight_double_deck',
      trans2: 'breather_2',
      act4: 'lunar_pillar_crossing',
      finale: 'sky_platform_leap',
    },
    vaultSlot: 'after_act2',
    shaftSlot: 'after_act3',
  },
  // 3-2 (idx 9): Night Cavern
  9: {
    blueprint: {
      opening: 'sunken_courtyard',
      act1: 'midnight_double_deck',
      trans1: 'elevation_terrace_5',
      act2: 'lunar_pillar_crossing',
      midpoint: 'arch_sanctuary',
      act3: 'firefly_lift_constellation',
      trans2: 'mini_pipe_4',
      act4: 'starlight_paratroopa_span',
      finale: 'gauntlet_ramp',
    },
    vaultSlot: 'after_act3',
    shaftSlot: 'after_act1',
  },
  // 3-3 (idx 10): Lunar Summits
  10: {
    blueprint: {
      opening: 'spring_launch_pad',
      act1: 'starlight_paratroopa_span',
      trans1: 'coin_step_3',
      act2: 'lunar_pillar_crossing',
      midpoint: 'high_terrace',
      act3: 'midnight_double_deck',
      trans2: 'arch_split_5',
      act4: 'firefly_lift_constellation',
      finale: 'moving_lift_tower',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act4',
  },

  // --- WORLD 4 ---
  // 4-1 (idx 12): Icicles mechanic (>= 3 icicles guaranteed)
  12: {
    blueprint: {
      opening: 'meadow_plaza',
      act1: 'icicle_stalactite_gallery',
      trans1: 'breather_2',
      act2: 'glacial_slip_terraces',
      midpoint: 'sunken_oasis',
      act3: 'boreal_lift_gorge',
      trans2: 'elevation_terrace_5',
      act4: 'aurora_ice_fort',
      finale: 'classic_staircase',
    },
    vaultSlot: 'after_act2',
    shaftSlot: 'after_act1',
  },
  // 4-2 (idx 13): Glacial Cavern
  13: {
    blueprint: {
      opening: 'pipe_terrace',
      act1: 'glacial_slip_terraces',
      trans1: 'mini_pipe_4',
      act2: 'aurora_ice_fort',
      midpoint: 'gazebo_lookout',
      act3: 'icicle_stalactite_gallery',
      trans2: 'slide_gate_4',
      act4: 'boreal_lift_gorge',
      finale: 'twin_deck_sprint',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act3',
  },
  // 4-3 (idx 14): Slippery Crests
  14: {
    blueprint: {
      opening: 'canopy_drop',
      act1: 'boreal_lift_gorge',
      trans1: 'arch_split_5',
      act2: 'icicle_stalactite_gallery',
      midpoint: 'high_terrace',
      act3: 'aurora_ice_fort',
      trans2: 'coin_step_3',
      act4: 'glacial_slip_terraces',
      finale: 'stepping_archway',
    },
    vaultSlot: 'after_act3',
    shaftSlot: 'after_act2',
  },

  // --- WORLD 5 ---
  // 5-1 (idx 16): Crumble mechanic (bridge blocks crumble guaranteed)
  16: {
    blueprint: {
      opening: 'bridge_arch',
      act1: 'crumble_canyon_spans',
      trans1: 'elevation_terrace_5',
      act2: 'gold_mine_cart_lifts',
      midpoint: 'arch_sanctuary',
      act3: 'suspended_ore_arches',
      trans2: 'breather_2',
      act4: 'spiny_quarry_run',
      finale: 'gauntlet_ramp',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act2',
  },
  // 5-2 (idx 17): Deep Mine
  17: {
    blueprint: {
      opening: 'split_tunnel',
      act1: 'gold_mine_cart_lifts',
      trans1: 'slide_gate_4',
      act2: 'spiny_quarry_run',
      midpoint: 'sunken_oasis',
      act3: 'crumble_canyon_spans',
      trans2: 'mini_pipe_4',
      act4: 'suspended_ore_arches',
      finale: 'moving_lift_tower',
    },
    vaultSlot: 'after_act2',
    shaftSlot: 'after_act3',
  },
  // 5-3 (idx 18): Suspended Arches
  18: {
    blueprint: {
      opening: 'windmill_runway',
      act1: 'suspended_ore_arches',
      trans1: 'coin_step_3',
      act2: 'crumble_canyon_spans',
      midpoint: 'gazebo_lookout',
      act3: 'spiny_quarry_run',
      trans2: 'arch_split_5',
      act4: 'gold_mine_cart_lifts',
      finale: 'sky_platform_leap',
    },
    vaultSlot: 'after_act3',
    shaftSlot: 'after_act1',
  },

  // --- WORLD 6 ---
  // 6-1 (idx 20): Low Gravity mechanic (pit in [8, totalCols-12] guaranteed)
  20: {
    blueprint: {
      opening: 'spring_launch_pad',
      act1: 'lowgrav_star_chasms',
      trans1: 'breather_2',
      act2: 'celestial_paratroopa_armada',
      midpoint: 'high_terrace',
      act3: 'imperial_cloud_citadel',
      trans2: 'slide_gate_4',
      act4: 'astral_vault_gauntlet',
      finale: 'cloud_highway_drop',
    },
    vaultSlot: 'after_act1',
    shaftSlot: 'after_act3',
  },
  // 6-2 (idx 21): Abyssal Labyrinth
  21: {
    blueprint: {
      opening: 'sunken_courtyard',
      act1: 'imperial_cloud_citadel',
      trans1: 'mini_pipe_4',
      act2: 'astral_vault_gauntlet',
      midpoint: 'arch_sanctuary',
      act3: 'lowgrav_star_chasms',
      trans2: 'elevation_terrace_5',
      act4: 'celestial_paratroopa_armada',
      finale: 'spring_citadel_launch',
    },
    vaultSlot: 'after_act2',
    shaftSlot: 'after_act1',
  },
  // 6-3 (idx 22): Celestial Assault
  22: {
    blueprint: {
      opening: 'pipe_terrace',
      act1: 'celestial_paratroopa_armada',
      trans1: 'arch_split_5',
      act2: 'imperial_cloud_citadel',
      midpoint: 'gazebo_lookout',
      act3: 'astral_vault_gauntlet',
      trans2: 'coin_step_3',
      act4: 'lowgrav_star_chasms',
      finale: 'gauntlet_ramp',
    },
    vaultSlot: 'after_act3',
    shaftSlot: 'after_act2',
  },
};

function buildBlueprintStage(ctx: BuilderCtx, config: ClassicStageConfig): number {
  const bp = config.blueprint;
  let cursor = buildOpeningStyle(ctx, bp.opening);

  // Act 1
  cursor += buildClassicSetpiece(ctx, bp.act1 as ClassicSetpieceName, cursor);

  if (config.vaultSlot === 'after_act1') {
    cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');
  } else if (config.shaftSlot === 'after_act1') {
    cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');
  }

  // Trans 1
  if (bp.trans1) {
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
  }

  // Act 2
  cursor += buildClassicSetpiece(ctx, bp.act2 as ClassicSetpieceName, cursor);

  if (config.vaultSlot === 'after_act2') {
    cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');
  } else if (config.shaftSlot === 'after_act2') {
    cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');
  }

  // Midpoint Plaza
  cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint);

  // Act 3
  cursor += buildClassicSetpiece(ctx, bp.act3 as ClassicSetpieceName, cursor);

  if (config.vaultSlot === 'after_act3') {
    cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');
  } else if (config.shaftSlot === 'after_act3') {
    cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');
  }

  // Trans 2
  if (bp.trans2) {
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
  }

  // Act 4
  cursor += buildClassicSetpiece(ctx, bp.act4 as ClassicSetpieceName, cursor);

  if (config.shaftSlot === 'after_act4') {
    cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');
  }

  // Finale
  cursor += buildFinaleStyle(ctx, bp.finale, cursor);

  const totalCols = cursor + 18;

  // Underground stages get brick roof (with skylights)
  if (ctx.isUnderground) {
    for (let col = 5; col < cursor - 2; col++) {
      if (col % 23 > 3 && !ctx.blockGrid.has(gridKey(col, 1))) {
        putBlock(ctx, col, 1, 'brick');
      }
    }
  }

  return totalCols;
}

// ============================================================================
// 6 UNIQUE FORTRESS PLANS (1-4 .. 6-4)
// Distinct lengths, foyer entrances, 4 ArenaStyles, lava outside bridge
// ============================================================================

export interface ClassicFortressPlan {
  openingFoyer: (ctx: BuilderCtx) => number;
  sections: FortressSection[];
  arenaStyle: ArenaStyle;
}

export const CLASSIC_FORTRESS_PLANS: ClassicFortressPlan[] = [
  // 1-4: Bastión de Magma I (6 sections, ArenaStyle 0, lava outside bridge)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      putBlock(ctx, 9, 8, 'question', 'powerup');
      putBlock(ctx, 11, 10, 'hard');
      putBlock(ctx, 11, 11, 'hard');
      putBlock(ctx, 14, 8, 'brick', 'coin');
      return 16;
    },
    sections: [
      'guard_corridor',
      'lava_pillar',
      'dual_route',
      'cramped_hall',
      'pillar_hops',
      'supply_room',
    ],
    arenaStyle: 0,
  },

  // 2-4: Pirámide de Fuego (7 sections, ArenaStyle 1)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      putBlock(ctx, 9, 10, 'hard');
      putBlock(ctx, 9, 11, 'hard');
      putBlock(ctx, 10, 9, 'hard');
      putBlock(ctx, 10, 10, 'hard');
      putBlock(ctx, 10, 11, 'hard');
      putBlock(ctx, 12, 6, 'question', 'powerup');
      putBlock(ctx, 15, 8, 'brick');
      return 17;
    },
    sections: [
      'lava_staircase',
      'cramped_hall',
      'lift_chasm',
      'fire_bar_alley',
      'vertical_lift',
      'guard_corridor',
      'supply_room',
    ],
    arenaStyle: 1,
  },

  // 3-4: Torreón Sombrío (7 sections, ArenaStyle 2)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      for (let k = 8; k <= 11; k++) putBlock(ctx, k, 8, 'bridge');
      putBlock(ctx, 13, 6, 'question', 'powerup');
      return 16;
    },
    sections: [
      'pendulum_lifts',
      'guard_corridor',
      'sunken_lava_dais',
      'pillar_hops',
      'dual_route',
      'chuck_bastion',
      'supply_room',
    ],
    arenaStyle: 2,
  },

  // 4-4: Ciudadela Polar (7 sections, ArenaStyle 3)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      putBlock(ctx, 10, 10, 'hard');
      putBlock(ctx, 10, 11, 'hard');
      putBlock(ctx, 13, 8, 'hard');
      putBlock(ctx, 13, 9, 'hard');
      putBlock(ctx, 15, 6, 'question', 'powerup');
      return 17;
    },
    sections: [
      'vertical_lift',
      'magma_catwalk',
      'cramped_hall',
      'crusher_drop',
      'lift_chasm',
      'spiny_gauntlet',
      'supply_room',
    ],
    arenaStyle: 3,
  },

  // 5-4: Forja Volcánica (8 sections, ArenaStyle 1)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      for (let k = 9; k <= 14; k++) putBlock(ctx, k, 9, 'brick');
      putBlock(ctx, 11, 5, 'question', 'powerup');
      addEnemy(ctx, 13, 8, 'koopa_red');
      return 17;
    },
    sections: [
      'magma_catwalk',
      'rotating_maze_hall',
      'lava_pillar',
      'twin_tier_gauntlet',
      'pendulum_lifts',
      'chuck_bastion',
      'fire_bar_alley',
      'supply_room',
    ],
    arenaStyle: 1,
  },

  // 6-4: Trono del Rey Koopa (8 sections, ArenaStyle 3)
  {
    openingFoyer: (ctx: BuilderCtx): number => {
      for (let s = 0; s < 4; s++) {
        for (let h = 0; h <= s; h++) {
          putBlock(ctx, 8 + s, GROUND_ROW - 1 - h, 'hard');
        }
      }
      putBlock(ctx, 13, 5, 'question', 'powerup');
      putBlock(ctx, 15, 8, 'hard');
      addEnemy(ctx, 15, 7, 'spiny');
      return 18;
    },
    sections: [
      'fire_bar_alley',
      'twin_tier_gauntlet',
      'sunken_lava_dais',
      'crusher_drop',
      'spiny_gauntlet',
      'lava_staircase',
      'rotating_maze_hall',
      'supply_room',
    ],
    arenaStyle: 3,
  },
];

function buildClassicFortressStage(ctx: BuilderCtx): { totalCols: number; boss: FortressBoss } {
  const planIndex = Math.max(0, Math.min(CLASSIC_FORTRESS_PLANS.length - 1, ctx.worldNum - 1));
  const plan = CLASSIC_FORTRESS_PLANS[planIndex];
  let cursor = plan.openingFoyer(ctx);

  for (const sec of plan.sections) {
    const adv = buildFortressSection(ctx, sec, cursor);
    cursor += adv + 2;
  }

  const arena = buildFortressArena(ctx, cursor, plan.arenaStyle);
  const totalCols = cursor + arena.arenaWidth;

  // Fortress ceiling
  for (let col = 5; col < cursor - 2; col++) {
    if (col % 19 > 2 && !ctx.blockGrid.has(gridKey(col, 1))) {
      putBlock(ctx, col, 1, 'hard');
    }
  }

  return { totalCols, boss: arena.boss };
}

// ============================================================================
// HANDCRAFTED STAGES (1-1 & 1-2 preserved intact for Coyote Time & tests)
// ============================================================================

export function buildStage1_1(ctx: BuilderCtx): number {
  const totalCols = 132;
  carvePit(ctx, 42, 2);
  carvePit(ctx, 74, 3);

  // Classic opening: [?] coin, brick/powerup cluster, hidden 1-UP!
  putBlock(ctx, 11, 8, 'question', 'coin');
  putBlock(ctx, 15, 8, 'brick');
  putBlock(ctx, 16, 8, 'question', 'powerup');
  putBlock(ctx, 17, 8, 'brick');
  putBlock(ctx, 18, 8, 'question', 'coin');
  putBlock(ctx, 19, 8, 'brick');
  putBlock(ctx, 17, 4, 'question', 'coin');
  addEnemy(ctx, 17, GROUND_ROW - 1, 'goomba');

  // Escalating Pipes + Piranha introduction
  addPipe(ctx, 23, 2, false);
  addEnemy(ctx, 27, GROUND_ROW - 1, 'goomba');
  addPipe(ctx, 30, 3, false);
  addEnemy(ctx, 34, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 36, GROUND_ROW - 1, 'goomba');
  addPipe(ctx, 38, 4, true);

  // Secret 1-UP block right before first gap!
  putBlock(ctx, 40, 7, 'hidden', 'one_up');
  addCoinArc(ctx, 41, 4, 6.2);

  // Shell Bowling Alley
  putBlock(ctx, 48, 8, 'brick');
  putBlock(ctx, 49, 8, 'question', 'powerup');
  putBlock(ctx, 50, 8, 'brick', 'multi_coin');
  addEnemy(ctx, 52, GROUND_ROW - 1, 'koopa_green');
  addEnemy(ctx, 56, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 58, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 60, GROUND_ROW - 1, 'goomba');

  // Skyway over second pit + Starman block!
  for (let c = 63; c <= 69; c++) {
    putBlock(ctx, c, 4, 'brick');
    addCoin(ctx, c, 2.5);
  }
  putBlock(ctx, 65, 8, 'brick');
  putBlock(ctx, 66, 8, 'question', 'star');
  putBlock(ctx, 67, 8, 'brick');

  // Checkpoint sits around col 70; after pit 74..76:
  addSpring(ctx, 79, GROUND_ROW);
  for (let c = 82; c <= 86; c++) {
    putBlock(ctx, c, 6, c === 84 ? 'question' : 'brick', c === 84 ? 'powerup' : null);
    addCoin(ctx, c, 4.4);
  }
  addEnemy(ctx, 84, GROUND_ROW - 1, 'koopa_red');
  addEnemy(ctx, 89, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 91, GROUND_ROW - 1, 'goomba');

  // Twin Staircases
  for (let s = 0; s < 4; s++) {
    for (let h = 0; h <= s; h++) putBlock(ctx, 95 + s, GROUND_ROW - 1 - h, 'hard');
    for (let h = 0; h <= 3 - s; h++) putBlock(ctx, 101 + s, GROUND_ROW - 1 - h, 'hard');
  }
  addPipe(ctx, 107, 2, true);
  addEnemy(ctx, 111, GROUND_ROW - 1, 'koopa_green');

  // Final Flagpole Staircase
  for (let s = 0; s < 8; s++) {
    for (let h = 0; h <= s; h++) {
      putBlock(ctx, 114 + s, GROUND_ROW - 1 - h, 'hard');
    }
  }
  return totalCols;
}

export function buildStage1_2(ctx: BuilderCtx): number {
  const totalCols = 136;
  // Underground Cavern Roof with skylight gaps for upper secret run!
  for (let col = 5; col < totalCols - 20; col++) {
    if (col < 32 || col > 36) {
      putBlock(ctx, col, 1, 'brick');
    }
  }

  carvePit(ctx, 22, 3);
  carvePit(ctx, 52, 4);
  carvePit(ctx, 86, 3);

  putBlock(ctx, 10, 8, 'question', 'powerup');
  putBlock(ctx, 11, 8, 'brick');
  putBlock(ctx, 12, 8, 'question', 'coin');
  putBlock(ctx, 13, 8, 'brick', 'multi_coin');
  addEnemy(ctx, 16, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 18, GROUND_ROW - 1, 'koopa_green');

  // Stepping islands over chasm 1
  putBlock(ctx, 22, 9, 'hard');
  putBlock(ctx, 24, 7, 'hard');
  addCoinArc(ctx, 21, 5, 5.0);

  // Underground Pipe Gallery + Secret Roof Elevator!
  addPipe(ctx, 28, 3, true);
  addSpring(ctx, 33, GROUND_ROW); // Launches player through roof opening 32..36!
  for (let c = 38; c <= 45; c++) {
    addCoin(ctx, c, 0); // Secret roof coin stash!
  }
  addPipe(ctx, 38, 4, true);
  addEnemy(ctx, 42, GROUND_ROW - 1, 'koopa_red');
  addPipe(ctx, 45, 2, false);

  // Moving Lift over Chasm 2
  addPlatform(ctx, 52, 9, 3, 2.5, 0, 0.038, 0);
  addCoinArc(ctx, 52, 4, 6.2);

  // Three-tier Underground Brick Labyrinth
  for (let c = 60; c <= 68; c++) {
    putBlock(ctx, c, 9, c === 64 ? 'question' : 'brick', c === 64 ? 'powerup' : null);
    if (c >= 61 && c <= 67) {
      putBlock(ctx, c, 5, c === 66 ? 'question' : 'brick', c === 66 ? 'star' : null);
    }
  }
  addEnemy(ctx, 63, 8, 'goomba');
  addEnemy(ctx, 66, GROUND_ROW - 1, 'koopa_green');
  addEnemy(ctx, 73, GROUND_ROW - 1, 'goomba');
  addEnemy(ctx, 75, GROUND_ROW - 1, 'goomba');

  // Paratroopa & Chasm 3
  putBlock(ctx, 86, 8, 'bridge');
  putBlock(ctx, 87, 8, 'bridge');
  putBlock(ctx, 88, 8, 'bridge');
  addEnemy(ctx, 88, 7, 'paratroopa');
  addPipe(ctx, 94, 3, true);
  addEnemy(ctx, 99, GROUND_ROW - 1, 'koopa_red');
  addEnemy(ctx, 103, GROUND_ROW - 1, 'goomba');

  // Exit Ramp
  for (let s = 0; s < 8; s++) {
    for (let h = 0; h <= s; h++) {
      putBlock(ctx, 116 + s, GROUND_ROW - 1 - h, 'hard');
    }
  }
  return totalCols;
}

// ============================================================================
// MAIN DISPATCHER
// ============================================================================

export function buildClassicStage(ctx: BuilderCtx): {
  totalCols: number;
  boss: FortressBoss | null;
} {
  if (ctx.stageNum === 4) {
    return buildClassicFortressStage(ctx);
  }
  if (ctx.levelIndex === 0) {
    return { totalCols: buildStage1_1(ctx), boss: null };
  }
  if (ctx.levelIndex === 1) {
    return { totalCols: buildStage1_2(ctx), boss: null };
  }

  const config = CLASSIC_STAGE_CONFIGS[ctx.levelIndex] ?? CLASSIC_STAGE_CONFIGS[2];
  const totalCols = buildBlueprintStage(ctx, config);
  return { totalCols, boss: null };
}
