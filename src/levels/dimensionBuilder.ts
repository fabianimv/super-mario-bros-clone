import {
  addCoin,
  addCoinArc,
  addEnemy,
  addPlatform,
  addPlateau,
  addSpring,
  ArenaStyle,
  BuilderCtx,
  buildFinaleStyle,
  buildFortressArena,
  buildFortressSection,
  buildMidpointPlaza,
  buildOpeningStyle,
  buildServicePlaza,
  buildTransitionZone,
  carvePit,
  FinaleStyle,
  foe,
  FortressSection,
  MidpointStyle,
  OpeningStyle,
  putBlock,
  TransitionKind,
  variantOf,
} from './builderToolkit';
import { GROUND_ROW } from '../engine/biomes';
import type { FortressBoss } from '../engine/types';

// ============================================================================
// THE 24 EXCLUSIVE 3D DIMENSION SETPIECES
// 3 per world across 8 worlds:
// - World 1: starfield (lowgrav)
// - World 2: toybox (bounce)
// - World 3: aurora (wind)
// - World 4: ember (crumble)
// - World 5: prism (firefly)
// - World 6: snowcap (icicles)
// - World 7: clockcore (mixed: firefly, crumble, lowgrav)
// - World 8: cosmos (mixed: icicles, wind, bounce)
// ============================================================================

export type DimSetpieceKind =
  // Mundo J: starfield
  | 'star_observatory_dome'
  | 'orbital_ring_stepping'
  | 'comet_tail_skyway'
  // Mundo T: toybox
  | 'wooden_block_viaduct'
  | 'windup_train_cars'
  | 'music_box_spring_tiers'
  // Mundo P: aurora
  | 'ice_floe_archipelago'
  | 'aurora_wind_spires'
  | 'polar_beacon_ascent'
  // Mundo F: ember
  | 'lunar_anvil_terraces'
  | 'molten_slag_bridges'
  | 'forge_bellows_lifts'
  // Mundo G: prism
  | 'stained_glass_nave'
  | 'kaleidoscope_blink_lifts'
  | 'prism_refraction_arches'
  // Mundo H: snowcap
  | 'giant_cap_canopy'
  | 'spore_icicle_grotto'
  | 'white_fungus_summit'
  // Mundo R: clockcore
  | 'pendulum_escapement_hall'
  | 'suspended_belfry_gears'
  | 'mainspring_gauntlet'
  // Mundo N: cosmos
  | 'saturn_ring_highway'
  | 'meteor_shower_terrace'
  | 'event_horizon_core';

export function buildDimSetpiece(
  ctx: BuilderCtx,
  kind: DimSetpieceKind,
  c: number
): number {
  const v = variantOf(ctx, c);

  switch (kind) {
    // ------------------------------------------------------------------------
    // MUNDO J: STARFIELD (Baja Gravedad, Siluetas Estelares, Cúpulas y Órbitas)
    // ------------------------------------------------------------------------
    case 'star_observatory_dome': {
      // Width: 18 cols.
      // Elevated stone dais with broad arch dome overhead (rows 3..6).
      // Strong verticality: rows 3, 5, 8, 10, 12.
      addPlateau(ctx, c + 5, 8, 10, 'hard');
      // Flanking steps
      putBlock(ctx, c + 3, 11, 'hard');
      putBlock(ctx, c + 4, 10, 'hard');
      putBlock(ctx, c + 13, 10, 'hard');
      putBlock(ctx, c + 14, 11, 'hard');

      // Dome canopy (brick arch)
      for (let k = c + 4; k <= c + 13; k++) {
        putBlock(ctx, k, 4, 'brick');
      }
      putBlock(ctx, c + 5, 5, 'brick');
      putBlock(ctx, c + 12, 5, 'brick');
      putBlock(ctx, c + 8, 2, 'question', v === 0 ? 'powerup' : 'coin');
      putBlock(ctx, c + 9, 2, 'question', 'coin');

      // Paratroopa hovering in the dome aperture
      addEnemy(ctx, c + 8, 5, 'paratroopa');
      addEnemy(ctx, c + 6, 9, foe(ctx));
      addCoinArc(ctx, c + 6, 6, 7.5);
      return 18;
    }

    case 'orbital_ring_stepping': {
      // Width: 17 cols.
      // Two chasms of 3 cols each with stepping stone rings and moving orbital platform.
      carvePit(ctx, c + 2, 3);
      carvePit(ctx, c + 11, 3);

      // Central planetary pillar at rows 9..11
      addPlateau(ctx, c + 6, 4, 9, 'hard');

      // Stepping stones over first chasm
      putBlock(ctx, c + 3, 8, 'hard');
      putBlock(ctx, c + 4, 6, 'hard');
      addCoin(ctx, c + 3, 6.5);
      addCoin(ctx, c + 4, 4.5);

      // Moving platform shuttling in central zone
      addPlatform(ctx, c + 7, 7, 3, 2.2, 0, 0.034, 0);

      // Stepping stones over second chasm
      putBlock(ctx, c + 12, 6, 'hard');
      putBlock(ctx, c + 13, 8, 'hard');
      addCoin(ctx, c + 12, 4.5);
      addCoin(ctx, c + 13, 6.5);

      // High orbital ring of coins
      addCoinArc(ctx, c + 6, 5, 3.5);
      putBlock(ctx, c + 8, 4, 'question', 'powerup');
      addEnemy(ctx, c + 7, 8, foe(ctx));
      return 17;
    }

    case 'comet_tail_skyway': {
      // Width: 17 cols.
      // Long bridge skyway at row 5 across an undulating valley (consecutiveGap = 0).
      addPlateau(ctx, c + 1, 4, 10, 'hard');
      addPlateau(ctx, c + 11, 5, 10, 'hard');

      // Skyway bridge
      for (let k = c + 4; k <= c + 13; k++) {
        putBlock(ctx, k, 5, 'bridge');
        addCoin(ctx, k, 3.5);
      }

      // Spring to reach skyway easily
      addSpring(ctx, c + 3, 10);
      putBlock(ctx, c + 8, 2, 'question', v === 1 ? 'one_up' : 'powerup');
      addEnemy(ctx, c + 7, 4, 'paratroopa');
      addEnemy(ctx, c + 12, 9, foe(ctx));
      return 17;
    }

    // ------------------------------------------------------------------------
    // MUNDO T: TOYBOX (Juguetes, Bloques de Madera, Trenes y Resortes Rítmicos)
    // ------------------------------------------------------------------------
    case 'wooden_block_viaduct': {
      // Width: 18 cols.
      // Large toy block viaduct at row 8 with archways for Goombas to patrol below.
      addPlateau(ctx, c + 2, 14, 10, 'hard');
      for (let k = c + 4; k <= c + 13; k++) {
        putBlock(ctx, k, 7, 'brick');
      }
      // Upper lookout towers
      putBlock(ctx, c + 3, 5, 'hard');
      putBlock(ctx, c + 4, 5, 'question', 'coin');
      putBlock(ctx, c + 13, 5, 'question', 'powerup');
      putBlock(ctx, c + 14, 5, 'hard');

      // Spring on ground to leap directly onto towers
      addSpring(ctx, c + 1, GROUND_ROW);
      addCoinArc(ctx, c + 5, 8, 5.0);
      addEnemy(ctx, c + 6, 6, foe(ctx));
      addEnemy(ctx, c + 10, 6, foe(ctx));
      return 18;
    }

    case 'windup_train_cars': {
      // Width: 19 cols.
      // 3 elevated train cars at rows 9, 8, and 7, separated by 1-col gaps.
      // Car 1 (cols 2..5, row 9)
      addPlateau(ctx, c + 2, 4, 9, 'hard');
      putBlock(ctx, c + 3, 6, 'brick');
      putBlock(ctx, c + 4, 6, 'question', 'coin');
      // Gap 1 (consecutiveGap = 1)
      carvePit(ctx, c + 6, 1);
      // Car 2 (cols 7..10, row 8)
      addPlateau(ctx, c + 7, 4, 8, 'hard');
      putBlock(ctx, c + 8, 5, 'brick');
      putBlock(ctx, c + 9, 5, 'question', 'powerup');
      // Gap 2 (consecutiveGap = 1)
      carvePit(ctx, c + 11, 1);
      // Car 3 (cols 12..15, row 7)
      addPlateau(ctx, c + 12, 4, 7, 'hard');
      putBlock(ctx, c + 13, 4, 'hard');
      putBlock(ctx, c + 14, 4, 'brick', 'one_up');

      addCoinArc(ctx, c + 7, 5, 3.5);
      addEnemy(ctx, c + 4, 8, foe(ctx));
      addEnemy(ctx, c + 9, 7, foe(ctx));
      return 19;
    }

    case 'music_box_spring_tiers': {
      // Width: 17 cols.
      // Tiered keys with springs that trigger consecutive melodic bounces.
      addPlateau(ctx, c + 2, 4, 10, 'hard');
      addPlateau(ctx, c + 7, 4, 8, 'hard');
      addPlateau(ctx, c + 12, 4, 6, 'hard');

      addSpring(ctx, c + 5, 10);
      addSpring(ctx, c + 10, 8);
      addSpring(ctx, c + 15, 6);

      // High airborne reward row at row 3
      for (let k = c + 6; k <= c + 13; k++) {
        addCoin(ctx, k, 3.0);
      }
      putBlock(ctx, c + 9, 3, 'question', 'powerup');
      addEnemy(ctx, c + 3, 9, foe(ctx));
      addEnemy(ctx, c + 8, 7, foe(ctx));
      return 17;
    }

    // ------------------------------------------------------------------------
    // MUNDO P: AURORA (Glaciar con Viento, Témpanos, Agujas y Faros Polares)
    // ------------------------------------------------------------------------
    case 'ice_floe_archipelago': {
      // Width: 18 cols.
      // Glacial archipelago over frozen chasm: gaps bridged with stepping floes.
      carvePit(ctx, c + 2, 4);
      carvePit(ctx, c + 10, 4);

      // Stepping floes (rows 8..9)
      putBlock(ctx, c + 3, 9, 'hard');
      putBlock(ctx, c + 4, 8, 'hard');
      addCoin(ctx, c + 3, 7.5);
      addCoin(ctx, c + 4, 6.5);

      // Central island dais
      addPlateau(ctx, c + 6, 4, 9, 'hard');
      putBlock(ctx, c + 7, 6, 'question', 'powerup');
      putBlock(ctx, c + 8, 6, 'brick');

      // Second floe crossing
      putBlock(ctx, c + 11, 8, 'hard');
      putBlock(ctx, c + 12, 9, 'hard');
      addCoin(ctx, c + 11, 6.5);
      addCoin(ctx, c + 12, 7.5);

      // High aurora bridge for wind sprints
      for (let k = c + 5; k <= c + 13; k++) {
        putBlock(ctx, k, 4, 'bridge');
      }
      addEnemy(ctx, c + 7, 8, foe(ctx));
      addEnemy(ctx, c + 9, 3, 'paratroopa');
      return 18;
    }

    case 'aurora_wind_spires': {
      // Width: 17 cols.
      // Two high vertical spires with moving platform between them.
      addPlateau(ctx, c + 2, 3, 7, 'hard');
      carvePit(ctx, c + 5, 4);
      addPlatform(ctx, c + 6, 8, 3, 2.0, 0, 0.036, 0);
      addPlateau(ctx, c + 9, 3, 6, 'hard');

      // Overhead aurora canopy at row 3
      for (let k = c + 4; k <= c + 12; k++) {
        putBlock(ctx, k, 3, 'bridge');
        addCoin(ctx, k, 1.8);
      }
      putBlock(ctx, c + 10, 3, 'question', 'powerup');
      addEnemy(ctx, c + 3, 6, 'koopa_red');
      addEnemy(ctx, c + 10, 5, foe(ctx));
      return 17;
    }

    case 'polar_beacon_ascent': {
      // Width: 18 cols.
      // Grand lighthouse beacon: stairs climbing to a glowing tower at row 5.
      putBlock(ctx, c + 2, 11, 'hard');
      putBlock(ctx, c + 3, 10, 'hard');
      putBlock(ctx, c + 4, 9, 'hard');
      addPlateau(ctx, c + 5, 8, 8, 'hard');

      // Central beacon lantern tower
      for (let r = 4; r <= 7; r++) {
        putBlock(ctx, c + 8, r, 'hard');
        putBlock(ctx, c + 9, r, 'hard');
      }
      putBlock(ctx, c + 7, 4, 'question', 'powerup');
      putBlock(ctx, c + 10, 4, 'question', 'coin');

      // Descending eastern slope
      putBlock(ctx, c + 13, 9, 'hard');
      putBlock(ctx, c + 14, 10, 'hard');
      putBlock(ctx, c + 15, 11, 'hard');

      addCoinArc(ctx, c + 6, 6, 2.5);
      addEnemy(ctx, c + 6, 7, foe(ctx));
      addEnemy(ctx, c + 11, 7, foe(ctx));
      return 18;
    }

    // ------------------------------------------------------------------------
    // MUNDO F: EMBER (Fragua Lunar, Puentes Frágiles, Yunque y Escoria)
    // ------------------------------------------------------------------------
    case 'lunar_anvil_terraces': {
      // Width: 18 cols.
      // Large stone anvil terrace at row 9 with crumble bridge approaches.
      addPlateau(ctx, c + 3, 11, 9, 'hard');
      // Horn of the anvil overhangs
      putBlock(ctx, c + 2, 8, 'hard');
      putBlock(ctx, c + 14, 8, 'hard');

      // Upper forge deck at row 5
      for (let k = c + 5; k <= c + 11; k++) {
        putBlock(ctx, k, 5, 'bridge');
      }
      putBlock(ctx, c + 7, 2, 'question', 'powerup');
      putBlock(ctx, c + 9, 2, 'brick', 'coin');

      carvePit(ctx, c + 1, 1, true);
      carvePit(ctx, c + 15, 1, true);

      addEnemy(ctx, c + 6, 8, foe(ctx));
      addEnemy(ctx, c + 10, 8, foe(ctx));
      addCoinArc(ctx, c + 5, 7, 3.8);
      return 18;
    }

    case 'molten_slag_bridges': {
      // Width: 19 cols.
      // Dual lava chasms crossed by fragile crumble bridges.
      carvePit(ctx, c + 2, 4, true);
      for (let k = c + 2; k <= c + 5; k++) {
        putBlock(ctx, k, 10, 'bridge');
      }
      // Central basalt pillar
      addPlateau(ctx, c + 7, 4, 8, 'hard');
      putBlock(ctx, c + 8, 5, 'question', 'powerup');
      putBlock(ctx, c + 9, 5, 'brick');

      carvePit(ctx, c + 12, 4, true);
      for (let k = c + 12; k <= c + 15; k++) {
        putBlock(ctx, k, 10, 'bridge');
      }

      // Overhead slag crane rail
      for (let k = c + 4; k <= c + 14; k++) {
        putBlock(ctx, k, 4, 'bridge');
        addCoin(ctx, k, 2.5);
      }
      addSpring(ctx, c + 8, 8);
      addEnemy(ctx, c + 8, 7, foe(ctx));
      return 19;
    }

    case 'forge_bellows_lifts': {
      // Width: 17 cols.
      // Two vertical bellows lifts in deep fiery shafts.
      addPlateau(ctx, c + 1, 3, 8, 'hard');
      carvePit(ctx, c + 4, 3, true);
      addPlatform(ctx, c + 5, 8.5, 2, 0, 2.2, 0.04, 0);

      addPlateau(ctx, c + 7, 3, 7, 'hard');
      carvePit(ctx, c + 10, 3, true);
      addPlatform(ctx, c + 11, 8.5, 2, 0, 2.2, 0.04, Math.PI);

      addPlateau(ctx, c + 13, 3, 8, 'hard');

      // High forge chimney roof
      for (let k = c + 3; k <= c + 13; k++) {
        putBlock(ctx, k, 3, 'hard');
      }
      putBlock(ctx, c + 8, 5, 'question', 'powerup');
      addCoinArc(ctx, c + 4, 9, 5.0);
      addEnemy(ctx, c + 8, 6, foe(ctx));
      return 17;
    }

    // ------------------------------------------------------------------------
    // MUNDO G: PRISM (Galería Prisma, Vitrales, Luces Caleidoscópicas)
    // ------------------------------------------------------------------------
    case 'stained_glass_nave': {
      // Width: 18 cols.
      // Grand cathedral nave with crystalline pillars and high clerestory.
      for (const colOff of [3, 7, 11, 14]) {
        for (let r = 6; r <= 11; r++) {
          putBlock(ctx, c + colOff, r, 'hard');
        }
      }
      // Upper refractive nave roof
      for (let k = c + 4; k <= c + 13; k++) {
        putBlock(ctx, k, 4, 'brick');
        addCoin(ctx, k, 2.5);
      }
      putBlock(ctx, c + 8, 2, 'question', 'powerup');
      putBlock(ctx, c + 10, 2, 'question', 'coin');

      addCoinArc(ctx, c + 4, 9, 8.0);
      addEnemy(ctx, c + 5, GROUND_ROW - 1, foe(ctx));
      addEnemy(ctx, c + 9, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'kaleidoscope_blink_lifts': {
      // Width: 18 cols.
      // Two chasms crossed by blinking platforms in optical phase.
      carvePit(ctx, c + 2, 4);
      addPlatform(ctx, c + 3, 9, 3, 0, 0, 0, 0);

      // Central crystal pylon
      addPlateau(ctx, c + 7, 4, 7, 'hard');
      putBlock(ctx, c + 8, 4, 'question', 'powerup');
      putBlock(ctx, c + 9, 4, 'hard');

      carvePit(ctx, c + 12, 4);
      addPlatform(ctx, c + 13, 8, 3, 0, 0, 0, Math.PI);

      // Overhead crystal chandelier
      for (let k = c + 4; k <= c + 13; k++) {
        putBlock(ctx, k, 3, 'bridge');
        addCoin(ctx, k, 1.8);
      }
      addEnemy(ctx, c + 8, 6, foe(ctx));
      return 18;
    }

    case 'prism_refraction_arches': {
      // Width: 17 cols.
      // Tiered arches ascending like light beams: rows 9, 7, 5.
      for (let k = c + 2; k <= c + 5; k++) {
        putBlock(ctx, k, 9, 'hard');
      }
      for (let k = c + 6; k <= c + 10; k++) {
        putBlock(ctx, k, 7, 'hard');
      }
      for (let k = c + 11; k <= c + 15; k++) {
        putBlock(ctx, k, 5, 'hard');
      }
      putBlock(ctx, c + 8, 4, 'question', 'powerup');
      putBlock(ctx, c + 13, 2, 'question', 'one_up');

      addCoinArc(ctx, c + 4, 8, 5.0);
      addEnemy(ctx, c + 4, 8, foe(ctx));
      addEnemy(ctx, c + 8, 6, foe(ctx));
      addEnemy(ctx, c + 13, 4, 'paratroopa');
      return 17;
    }

    // ------------------------------------------------------------------------
    // MUNDO H: SNOWCAP (Hongar Nevado, Carámbanos, Techos en Filas 4..7)
    // ------------------------------------------------------------------------
    case 'giant_cap_canopy': {
      // Width: 19 cols.
      // Two giant mushroom caps that provide solid roofs at row 5..6 over ground at row 12.
      for (let k = c + 2; k <= c + 6; k++) {
        putBlock(ctx, k, 6, 'hard'); // valid icicle ceiling!
      }
      for (let r = 7; r <= 11; r++) {
        putBlock(ctx, c + 4, r, 'hard');
      }
      putBlock(ctx, c + 3, 3, 'question', 'powerup');

      for (let k = c + 11; k <= c + 16; k++) {
        putBlock(ctx, k, 5, 'brick'); // valid icicle ceiling!
      }
      for (let r = 6; r <= 11; r++) {
        putBlock(ctx, c + 13, r, 'hard');
      }
      putBlock(ctx, c + 14, 2, 'question', 'coin');

      addSpring(ctx, c + 8, GROUND_ROW);
      addCoinArc(ctx, c + 5, 6, 3.5);
      addEnemy(ctx, c + 5, GROUND_ROW - 1, foe(ctx));
      addEnemy(ctx, c + 14, 4, foe(ctx));
      return 19;
    }

    case 'spore_icicle_grotto': {
      // Width: 18 cols.
      // Continuous cavern ceiling at rows 4..5 over solid ground at row 12.
      // Guaranteed >= 6 valid icicle candidate locations!
      for (let k = c + 2; k <= c + 15; k++) {
        putBlock(ctx, k, 4, k % 2 === 0 ? 'brick' : 'hard');
      }
      addPlateau(ctx, c + 4, 3, 10, 'hard');
      addPlateau(ctx, c + 11, 3, 10, 'hard');

      putBlock(ctx, c + 7, 7, 'question', 'powerup');
      putBlock(ctx, c + 9, 7, 'question', 'coin');

      addCoin(ctx, c + 5, 8.5);
      addCoin(ctx, c + 8, 9.0);
      addCoin(ctx, c + 12, 8.5);
      addEnemy(ctx, c + 6, GROUND_ROW - 1, foe(ctx));
      addEnemy(ctx, c + 10, GROUND_ROW - 1, foe(ctx));
      return 18;
    }

    case 'white_fungus_summit': {
      // Width: 18 cols.
      // High fungal plateau at row 8 with overhang roof at row 4 over solid ground.
      addPlateau(ctx, c + 4, 9, 8, 'hard');
      for (let k = c + 5; k <= c + 12; k++) {
        putBlock(ctx, k, 4, 'hard');
      }
      putBlock(ctx, c + 7, 1, 'question', 'powerup');

      putBlock(ctx, c + 2, 11, 'hard');
      putBlock(ctx, c + 3, 10, 'hard');
      putBlock(ctx, c + 14, 10, 'hard');
      putBlock(ctx, c + 15, 11, 'hard');

      addCoinArc(ctx, c + 6, 6, 6.0);
      addEnemy(ctx, c + 6, 7, foe(ctx));
      addEnemy(ctx, c + 10, 7, foe(ctx));
      return 18;
    }

    // ------------------------------------------------------------------------
    // MUNDO R: CLOCKCORE (Relojería Flotante, Péndulos, Engranajes y Resortes)
    // ------------------------------------------------------------------------
    case 'pendulum_escapement_hall': {
      // Width: 18 cols.
      // Two pendulum lifts in swinging opposition over void chasms.
      carvePit(ctx, c + 2, 4);
      addPlatform(ctx, c + 3, 8.5, 2, 2.2, 0, 0.045, 0);

      addPlateau(ctx, c + 7, 4, 8, 'hard');
      putBlock(ctx, c + 8, 5, 'brick');
      putBlock(ctx, c + 9, 5, 'question', 'powerup');

      carvePit(ctx, c + 12, 4);
      addPlatform(ctx, c + 13, 8.5, 2, 2.2, 0, 0.045, Math.PI);

      for (let k = c + 3; k <= c + 14; k++) {
        putBlock(ctx, k, 3, 'hard');
        addCoin(ctx, k, 1.8);
      }
      addEnemy(ctx, c + 8, 7, foe(ctx));
      return 18;
    }

    case 'suspended_belfry_gears': {
      // Width: 19 cols.
      // 3 suspended gear platforms at rows 9, 7, 5 with chasm between them.
      addPlateau(ctx, c + 2, 4, 9, 'hard');
      carvePit(ctx, c + 6, 3);
      addPlateau(ctx, c + 9, 4, 7, 'hard');
      carvePit(ctx, c + 13, 3);
      addPlateau(ctx, c + 16, 3, 5, 'hard');

      putBlock(ctx, c + 7, 8, 'bridge');
      putBlock(ctx, c + 14, 6, 'bridge');

      putBlock(ctx, c + 10, 4, 'question', 'powerup');
      putBlock(ctx, c + 17, 2, 'question', 'one_up');
      addCoinArc(ctx, c + 4, 10, 4.0);
      addEnemy(ctx, c + 4, 8, foe(ctx));
      addEnemy(ctx, c + 11, 6, foe(ctx));
      return 19;
    }

    case 'mainspring_gauntlet': {
      // Width: 17 cols.
      // Compressed mainspring corridor with raised barriers and spring vaults.
      putBlock(ctx, c + 4, 11, 'hard');
      putBlock(ctx, c + 4, 10, 'hard');
      putBlock(ctx, c + 4, 9, 'hard');

      putBlock(ctx, c + 12, 11, 'hard');
      putBlock(ctx, c + 12, 10, 'hard');
      putBlock(ctx, c + 12, 9, 'hard');

      addSpring(ctx, c + 2, GROUND_ROW);
      addSpring(ctx, c + 14, GROUND_ROW);

      for (let k = c + 5; k <= c + 11; k++) {
        putBlock(ctx, k, 5, 'hard');
        addCoin(ctx, k, 3.5);
      }
      putBlock(ctx, c + 8, 2, 'question', 'powerup');
      addEnemy(ctx, c + 8, 4, foe(ctx));
      return 17;
    }

    // ------------------------------------------------------------------------
    // MUNDO N: COSMOS (Núcleo Cósmico, Anillos Planetarios, Lluvia de Meteoros)
    // ------------------------------------------------------------------------
    case 'saturn_ring_highway': {
      // Width: 19 cols.
      // Continuous planetary ring bridge at row 6 over solid ground at row 12.
      // Provides valid icicle ceilings in stage N-1!
      for (let k = c + 3; k <= c + 15; k++) {
        putBlock(ctx, k, 6, 'bridge');
      }
      for (let k = c + 5; k <= c + 8; k++) {
        putBlock(ctx, k, 3, 'hard');
      }
      for (let k = c + 11; k <= c + 14; k++) {
        putBlock(ctx, k, 3, 'brick');
      }
      putBlock(ctx, c + 6, 1, 'question', 'powerup');

      addPlatform(ctx, c + 7, 9, 3, 2.0, 0, 0.035, 0);
      addCoinArc(ctx, c + 4, 11, 4.5);
      addEnemy(ctx, c + 6, 5, 'paratroopa');
      addEnemy(ctx, c + 12, 5, foe(ctx));
      return 19;
    }

    case 'meteor_shower_terrace': {
      // Width: 18 cols.
      // Terraced impact crater: stepped plateaus at rows 10, 8, 9 with chasms.
      addPlateau(ctx, c + 2, 4, 10, 'hard');
      carvePit(ctx, c + 6, 2);
      addPlateau(ctx, c + 8, 4, 8, 'hard');
      carvePit(ctx, c + 12, 2);
      addPlateau(ctx, c + 14, 4, 9, 'hard');

      for (let k = c + 3; k <= c + 5; k++) {
        putBlock(ctx, k, 4, 'hard');
      }
      for (let k = c + 9; k <= c + 11; k++) {
        putBlock(ctx, k, 4, 'brick');
      }
      putBlock(ctx, c + 10, 2, 'question', 'powerup');

      addSpring(ctx, c + 4, 10);
      addCoinArc(ctx, c + 4, 10, 5.5);
      addEnemy(ctx, c + 9, 7, foe(ctx));
      addEnemy(ctx, c + 15, 8, foe(ctx));
      return 18;
    }

    case 'event_horizon_core': {
      // Width: 19 cols.
      // Gravitational lens core: two void chasms with synchronized lifts.
      carvePit(ctx, c + 2, 4);
      addPlatform(ctx, c + 3, 8.5, 2, 1.8, 1.2, 0.038, 0);

      addPlateau(ctx, c + 7, 4, 7, 'hard');
      putBlock(ctx, c + 8, 4, 'question', 'powerup');
      putBlock(ctx, c + 9, 4, 'hard');

      carvePit(ctx, c + 12, 4);
      addPlatform(ctx, c + 13, 8.5, 2, 1.8, 1.2, 0.038, Math.PI);

      for (let k = c + 4; k <= c + 14; k++) {
        putBlock(ctx, k, 3, 'bridge');
        addCoin(ctx, k, 1.5);
      }
      addEnemy(ctx, c + 8, 6, foe(ctx));
      return 19;
    }
  }
}

// ============================================================================
// STAGE BLUEPRINTS FOR ALL 24 NON-CASTLE STAGES OF DIMENSION
// Every blueprint uses 4 distinct setpieces (0 repetition within the level!),
// with varied OpeningStyle, TransitionKind, MidpointStyle, FinaleStyle, and
// Service Plazas ('vault_plaza' and 'shaft_plaza') in alternating positions.
// Slot variation patterns shift column offsets between stages to minimize Jaccard.
// ============================================================================

export interface DimStageBlueprint {
  opening: OpeningStyle;
  act1: DimSetpieceKind;
  trans1: TransitionKind;
  plaza1: 'vault_plaza' | 'shaft_plaza';
  act2: DimSetpieceKind;
  midpoint: MidpointStyle;
  act3: DimSetpieceKind;
  trans2: TransitionKind;
  plaza2: 'vault_plaza' | 'shaft_plaza';
  act4: DimSetpieceKind;
  finale: FinaleStyle;
  slotPattern: 0 | 1 | 2;
}

const DIM_BLUEPRINTS: Record<number, DimStageBlueprint> = {
  // --------------------------------------------------------------------------
  // MUNDO J: JARDÍN ESTELAR (starfield, lowgrav)
  // --------------------------------------------------------------------------
  // J-1 (idx 0): Pradera de Constelaciones
  0: {
    opening: 'meadow_plaza',
    act1: 'star_observatory_dome',
    trans1: 'breather_2',
    plaza1: 'vault_plaza',
    act2: 'wooden_block_viaduct',
    midpoint: 'gazebo_lookout',
    act3: 'lunar_anvil_terraces',
    trans2: 'elevation_terrace_5',
    plaza2: 'shaft_plaza',
    act4: 'meteor_shower_terrace',
    finale: 'classic_staircase',
    slotPattern: 0,
  },
  // J-2 (idx 1): Invernadero Orbital
  1: {
    opening: 'canopy_drop',
    act1: 'orbital_ring_stepping',
    trans1: 'coin_step_3',
    plaza1: 'shaft_plaza',
    act2: 'windup_train_cars',
    midpoint: 'arch_sanctuary',
    act3: 'molten_slag_bridges',
    trans2: 'arch_split_5',
    plaza2: 'vault_plaza',
    act4: 'saturn_ring_highway',
    finale: 'sky_platform_leap',
    slotPattern: 1,
  },
  // J-3 (idx 2): Puente de Cometas
  2: {
    opening: 'spring_launch_pad',
    act1: 'comet_tail_skyway',
    trans1: 'mini_pipe_4',
    plaza1: 'vault_plaza',
    act2: 'music_box_spring_tiers',
    midpoint: 'high_terrace',
    act3: 'forge_bellows_lifts',
    trans2: 'slide_gate_4',
    plaza2: 'shaft_plaza',
    act4: 'event_horizon_core',
    finale: 'stepping_archway',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO T: TALLER DE JUGUETES (toybox, bounce)
  // --------------------------------------------------------------------------
  // T-1 (idx 4): Mesa de Bloques
  4: {
    opening: 'sunken_courtyard',
    act1: 'wooden_block_viaduct',
    trans1: 'arch_split_5',
    plaza1: 'shaft_plaza',
    act2: 'ice_floe_archipelago',
    midpoint: 'sunken_oasis',
    act3: 'stained_glass_nave',
    trans2: 'breather_2',
    plaza2: 'vault_plaza',
    act4: 'pendulum_escapement_hall',
    finale: 'spring_citadel_launch',
    slotPattern: 0,
  },
  // T-2 (idx 5): Tren de Cuerda
  5: {
    opening: 'windmill_runway',
    act1: 'windup_train_cars',
    trans1: 'slide_gate_4',
    plaza1: 'vault_plaza',
    act2: 'aurora_wind_spires',
    midpoint: 'gazebo_lookout',
    act3: 'kaleidoscope_blink_lifts',
    trans2: 'coin_step_3',
    plaza2: 'shaft_plaza',
    act4: 'suspended_belfry_gears',
    finale: 'twin_deck_sprint',
    slotPattern: 1,
  },
  // T-3 (idx 6): Repisa de Peluches
  6: {
    opening: 'pipe_terrace',
    act1: 'music_box_spring_tiers',
    trans1: 'elevation_terrace_5',
    plaza1: 'shaft_plaza',
    act2: 'polar_beacon_ascent',
    midpoint: 'arch_sanctuary',
    act3: 'prism_refraction_arches',
    trans2: 'mini_pipe_4',
    plaza2: 'vault_plaza',
    act4: 'mainspring_gauntlet',
    finale: 'gauntlet_ramp',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO P: POLO AURORA (aurora, wind)
  // --------------------------------------------------------------------------
  // P-1 (idx 8): Bahía de Témpanos
  8: {
    opening: 'bridge_arch',
    act1: 'ice_floe_archipelago',
    trans1: 'breather_2',
    plaza1: 'vault_plaza',
    act2: 'lunar_anvil_terraces',
    midpoint: 'high_terrace',
    act3: 'giant_cap_canopy',
    trans2: 'coin_step_3',
    plaza2: 'shaft_plaza',
    act4: 'saturn_ring_highway',
    finale: 'cloud_highway_drop',
    slotPattern: 0,
  },
  // P-2 (idx 9): Cielo de Auroras
  9: {
    opening: 'split_tunnel',
    act1: 'aurora_wind_spires',
    trans1: 'mini_pipe_4',
    plaza1: 'shaft_plaza',
    act2: 'molten_slag_bridges',
    midpoint: 'sunken_oasis',
    act3: 'spore_icicle_grotto',
    trans2: 'elevation_terrace_5',
    plaza2: 'vault_plaza',
    act4: 'meteor_shower_terrace',
    finale: 'moving_lift_tower',
    slotPattern: 1,
  },
  // P-3 (idx 10): Faro del Polo
  10: {
    opening: 'meadow_plaza',
    act1: 'polar_beacon_ascent',
    trans1: 'arch_split_5',
    plaza1: 'vault_plaza',
    act2: 'forge_bellows_lifts',
    midpoint: 'gazebo_lookout',
    act3: 'white_fungus_summit',
    trans2: 'slide_gate_4',
    plaza2: 'shaft_plaza',
    act4: 'event_horizon_core',
    finale: 'classic_staircase',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO F: FRAGUA LUNAR (ember, crumble)
  // --------------------------------------------------------------------------
  // F-1 (idx 12): Yunque Plateado
  12: {
    opening: 'canopy_drop',
    act1: 'lunar_anvil_terraces',
    trans1: 'coin_step_3',
    plaza1: 'shaft_plaza',
    act2: 'stained_glass_nave',
    midpoint: 'arch_sanctuary',
    act3: 'pendulum_escapement_hall',
    trans2: 'breather_2',
    plaza2: 'vault_plaza',
    act4: 'star_observatory_dome',
    finale: 'sky_platform_leap',
    slotPattern: 0,
  },
  // F-2 (idx 13): Ríos de Metal
  13: {
    opening: 'sunken_courtyard',
    act1: 'molten_slag_bridges',
    trans1: 'slide_gate_4',
    plaza1: 'vault_plaza',
    act2: 'kaleidoscope_blink_lifts',
    midpoint: 'high_terrace',
    act3: 'suspended_belfry_gears',
    trans2: 'mini_pipe_4',
    plaza2: 'shaft_plaza',
    act4: 'orbital_ring_stepping',
    finale: 'spring_citadel_launch',
    slotPattern: 1,
  },
  // F-3 (idx 14): Cráteres Humeantes
  14: {
    opening: 'windmill_runway',
    act1: 'forge_bellows_lifts',
    trans1: 'elevation_terrace_5',
    plaza1: 'shaft_plaza',
    act2: 'prism_refraction_arches',
    midpoint: 'sunken_oasis',
    act3: 'mainspring_gauntlet',
    trans2: 'arch_split_5',
    plaza2: 'vault_plaza',
    act4: 'comet_tail_skyway',
    finale: 'twin_deck_sprint',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO G: GALERÍA PRISMA (prism, firefly)
  // --------------------------------------------------------------------------
  // G-1 (idx 16): Vitral de Arcoíris
  16: {
    opening: 'spring_launch_pad',
    act1: 'stained_glass_nave',
    trans1: 'breather_2',
    plaza1: 'vault_plaza',
    act2: 'giant_cap_canopy',
    midpoint: 'gazebo_lookout',
    act3: 'saturn_ring_highway',
    trans2: 'coin_step_3',
    plaza2: 'shaft_plaza',
    act4: 'wooden_block_viaduct',
    finale: 'stepping_archway',
    slotPattern: 0,
  },
  // G-2 (idx 17): Pasillo de Espejos
  17: {
    opening: 'pipe_terrace',
    act1: 'kaleidoscope_blink_lifts',
    trans1: 'mini_pipe_4',
    plaza1: 'shaft_plaza',
    act2: 'spore_icicle_grotto',
    midpoint: 'arch_sanctuary',
    act3: 'meteor_shower_terrace',
    trans2: 'slide_gate_4',
    plaza2: 'vault_plaza',
    act4: 'windup_train_cars',
    finale: 'gauntlet_ramp',
    slotPattern: 1,
  },
  // G-3 (idx 18): Cúpula de Prismas
  18: {
    opening: 'bridge_arch',
    act1: 'prism_refraction_arches',
    trans1: 'arch_split_5',
    plaza1: 'vault_plaza',
    act2: 'white_fungus_summit',
    midpoint: 'high_terrace',
    act3: 'event_horizon_core',
    trans2: 'elevation_terrace_5',
    plaza2: 'shaft_plaza',
    act4: 'music_box_spring_tiers',
    finale: 'cloud_highway_drop',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO H: HONGAR NEVADO (snowcap, icicles)
  // --------------------------------------------------------------------------
  // H-1 (idx 20): Bosque de Sombreros
  20: {
    opening: 'split_tunnel',
    act1: 'giant_cap_canopy',
    trans1: 'coin_step_3',
    plaza1: 'shaft_plaza',
    act2: 'pendulum_escapement_hall',
    midpoint: 'sunken_oasis',
    act3: 'star_observatory_dome',
    trans2: 'breather_2',
    plaza2: 'vault_plaza',
    act4: 'ice_floe_archipelago',
    finale: 'moving_lift_tower',
    slotPattern: 0,
  },
  // H-2 (idx 21): Ladera de Esporas
  21: {
    opening: 'meadow_plaza',
    act1: 'spore_icicle_grotto',
    trans1: 'elevation_terrace_5',
    plaza1: 'vault_plaza',
    act2: 'suspended_belfry_gears',
    midpoint: 'gazebo_lookout',
    act3: 'orbital_ring_stepping',
    trans2: 'mini_pipe_4',
    plaza2: 'shaft_plaza',
    act4: 'aurora_wind_spires',
    finale: 'classic_staircase',
    slotPattern: 1,
  },
  // H-3 (idx 22): Cumbre del Hongo Blanco
  22: {
    opening: 'canopy_drop',
    act1: 'white_fungus_summit',
    trans1: 'slide_gate_4',
    plaza1: 'shaft_plaza',
    act2: 'mainspring_gauntlet',
    midpoint: 'arch_sanctuary',
    act3: 'comet_tail_skyway',
    trans2: 'arch_split_5',
    plaza2: 'vault_plaza',
    act4: 'polar_beacon_ascent',
    finale: 'sky_platform_leap',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO R: RELOJERÍA FLOTANTE (clockcore, Mixto: firefly/crumble/lowgrav)
  // --------------------------------------------------------------------------
  // R-1 (idx 24, firefly): Péndulos del Alba
  24: {
    opening: 'sunken_courtyard',
    act1: 'pendulum_escapement_hall',
    trans1: 'breather_2',
    plaza1: 'vault_plaza',
    act2: 'kaleidoscope_blink_lifts',
    midpoint: 'high_terrace',
    act3: 'wooden_block_viaduct',
    trans2: 'coin_step_3',
    plaza2: 'shaft_plaza',
    act4: 'meteor_shower_terrace',
    finale: 'spring_citadel_launch',
    slotPattern: 0,
  },
  // R-2 (idx 25, crumble): Engranajes Colgantes
  25: {
    opening: 'windmill_runway',
    act1: 'suspended_belfry_gears',
    trans1: 'mini_pipe_4',
    plaza1: 'shaft_plaza',
    act2: 'molten_slag_bridges',
    midpoint: 'sunken_oasis',
    act3: 'windup_train_cars',
    trans2: 'elevation_terrace_5',
    plaza2: 'vault_plaza',
    act4: 'event_horizon_core',
    finale: 'twin_deck_sprint',
    slotPattern: 1,
  },
  // R-3 (idx 26, lowgrav): Campanario Suspendido
  26: {
    opening: 'spring_launch_pad',
    act1: 'mainspring_gauntlet',
    trans1: 'arch_split_5',
    plaza1: 'vault_plaza',
    act2: 'orbital_ring_stepping',
    midpoint: 'gazebo_lookout',
    act3: 'music_box_spring_tiers',
    trans2: 'slide_gate_4',
    plaza2: 'shaft_plaza',
    act4: 'saturn_ring_highway',
    finale: 'stepping_archway',
    slotPattern: 2,
  },

  // --------------------------------------------------------------------------
  // MUNDO N: NÚCLEO CÓSMICO (cosmos, Mixto: icicles/wind/bounce)
  // --------------------------------------------------------------------------
  // N-1 (idx 28, icicles): Anillos de Saturno
  28: {
    opening: 'pipe_terrace',
    act1: 'saturn_ring_highway',
    trans1: 'coin_step_3',
    plaza1: 'shaft_plaza',
    act2: 'spore_icicle_grotto',
    midpoint: 'arch_sanctuary',
    act3: 'lunar_anvil_terraces',
    trans2: 'breather_2',
    plaza2: 'vault_plaza',
    act4: 'star_observatory_dome',
    finale: 'gauntlet_ramp',
    slotPattern: 0,
  },
  // N-2 (idx 29, wind): Lluvia de Meteoros
  29: {
    opening: 'bridge_arch',
    act1: 'meteor_shower_terrace',
    trans1: 'slide_gate_4',
    plaza1: 'vault_plaza',
    act2: 'aurora_wind_spires',
    midpoint: 'high_terrace',
    act3: 'forge_bellows_lifts',
    trans2: 'mini_pipe_4',
    plaza2: 'shaft_plaza',
    act4: 'ice_floe_archipelago',
    finale: 'cloud_highway_drop',
    slotPattern: 1,
  },
  // N-3 (idx 30, bounce): Horizonte de Sucesos
  30: {
    opening: 'split_tunnel',
    act1: 'event_horizon_core',
    trans1: 'elevation_terrace_5',
    plaza1: 'shaft_plaza',
    act2: 'music_box_spring_tiers',
    midpoint: 'sunken_oasis',
    act3: 'stained_glass_nave',
    trans2: 'arch_split_5',
    plaza2: 'vault_plaza',
    act4: 'comet_tail_skyway',
    finale: 'moving_lift_tower',
    slotPattern: 2,
  },
};

// ============================================================================
// THE 8 UNIQUE CASTLE PLANS FOR DIMENSION (J-4 .. N-4)
// Distinct section sequences, varied lengths (101..117 cols), and all 4 ArenaStyles.
// Every castle has a completely unique entrance gate to prevent coordinate overlap.
// ============================================================================

interface DimCastleConfig {
  sections: FortressSection[];
  arenaStyle: ArenaStyle;
}

const DIM_CASTLE_CONFIGS: Record<number, DimCastleConfig> = {
  // J-4 (idx 3, world 1): Observatorio del Eclipse (Starfield Keep, arenaStyle 0)
  1: {
    sections: ['dual_route', 'guard_corridor', 'vertical_lift', 'supply_room'],
    arenaStyle: 0,
  },
  // T-4 (idx 7, world 2): Caja de Música Gigante (Toybox Citadel, arenaStyle 1)
  2: {
    sections: ['cramped_hall', 'pendulum_lifts', 'chuck_bastion', 'rotating_maze_hall'],
    arenaStyle: 1,
  },
  // P-4 (idx 11, world 3): Ciudadela de Hielo (Aurora Frost Keep, arenaStyle 3)
  3: {
    sections: ['lift_chasm', 'spiny_gauntlet', 'sunken_lava_dais', 'magma_catwalk', 'fire_bar_alley', 'lava_pillar'],
    arenaStyle: 3,
  },
  // F-4 (idx 15, world 4): Corazón de la Fragua (Lunar Foundry, arenaStyle 2)
  4: {
    sections: ['fire_bar_alley', 'lava_pillar', 'crusher_drop', 'chuck_bastion', 'lava_staircase', 'supply_room'],
    arenaStyle: 2,
  },
  // G-4 (idx 19, world 5): Salón del Caleidoscopio (Prism Bastion, arenaStyle 0)
  5: {
    sections: ['lift_chasm', 'rotating_maze_hall', 'spiny_gauntlet', 'magma_catwalk'],
    arenaStyle: 0,
  },
  // H-4 (idx 23, world 6): Cueva de Hielo y Setas (Snowcap Spire, arenaStyle 1)
  6: {
    sections: ['crusher_drop', 'guard_corridor', 'lava_staircase', 'pillar_hops', 'supply_room'],
    arenaStyle: 1,
  },
  // R-4 (idx 27, world 7): Maquinaria Central (Clockcore Grand Citadel, arenaStyle 2)
  7: {
    sections: ['sunken_lava_dais', 'magma_catwalk', 'pillar_hops', 'twin_tier_gauntlet', 'pendulum_lifts', 'cramped_hall'],
    arenaStyle: 2,
  },
  // N-4 (idx 31, world 8): Corazón del Cosmos (Event Horizon Keep, arenaStyle 3)
  8: {
    sections: ['vertical_lift', 'crusher_drop', 'dual_route', 'fire_bar_alley', 'sunken_lava_dais', 'chuck_bastion', 'supply_room'],
    arenaStyle: 3,
  },
};

function buildCastleEntrance(ctx: BuilderCtx): number {
  switch (ctx.worldNum) {
    case 1: {
      // World 1: J-4 (Starfield) - Starlight Observatory Gate
      for (let k = 7; k <= 14; k++) putBlock(ctx, k, 4, 'bridge');
      putBlock(ctx, 7, 7, 'hard');
      putBlock(ctx, 7, 8, 'hard');
      putBlock(ctx, 14, 7, 'hard');
      putBlock(ctx, 14, 8, 'hard');
      putBlock(ctx, 10, 7, 'question', 'powerup');
      addCoinArc(ctx, 8, 5, 2.5);
      addEnemy(ctx, 11, GROUND_ROW - 1, 'koopa_red');
      return 16;
    }
    case 2: {
      // World 2: T-4 (Toybox) - Stepped toy battlements with launcher spring
      putBlock(ctx, 6, 10, 'hard');
      putBlock(ctx, 7, 9, 'hard');
      putBlock(ctx, 8, 8, 'hard');
      for (let k = 9; k <= 15; k++) putBlock(ctx, k, 6, 'hard');
      addSpring(ctx, 9, 6);
      putBlock(ctx, 12, 3, 'question', 'powerup');
      addEnemy(ctx, 13, 5, 'goomba');
      return 18;
    }
    case 3: {
      // World 3: P-4 (Aurora) - Glacial ice cavern mouth with suspended ice arch
      for (let r = 6; r <= 10; r++) putBlock(ctx, 6, r, 'hard');
      for (let r = 5; r <= 10; r++) putBlock(ctx, 15, r, 'hard');
      for (let k = 7; k <= 14; k++) putBlock(ctx, k, 5, 'brick');
      putBlock(ctx, 10, 8, 'question', 'powerup');
      addCoinArc(ctx, 8, 6, 3.5);
      addEnemy(ctx, 11, GROUND_ROW - 1, 'paratroopa');
      return 17;
    }
    case 4: {
      // World 4: F-4 (Ember) - Basalt foundry entrance with elevated anvil dais
      addPlateau(ctx, 7, 6, 9, 'hard');
      for (let k = 8; k <= 14; k++) putBlock(ctx, k, 4, 'hard');
      putBlock(ctx, 9, 7, 'question', 'powerup');
      addEnemy(ctx, 10, 8, 'spiny');
      return 16;
    }
    case 5: {
      // World 5: G-4 (Prism) - Slender prism columns and crystal frieze
      for (const col of [6, 10, 15]) {
        putBlock(ctx, col, 8, 'hard');
        putBlock(ctx, col, 9, 'hard');
        putBlock(ctx, col, 10, 'hard');
      }
      for (let k = 6; k <= 15; k++) putBlock(ctx, k, 4, 'brick');
      putBlock(ctx, 11, 2, 'question', 'powerup');
      addCoinArc(ctx, 7, 7, 6.5);
      addEnemy(ctx, 8, GROUND_ROW - 1, 'galoomba');
      return 17;
    }
    case 6: {
      // World 6: H-4 (Snowcap) - Giant frost mushroom overhang with icicle roof
      for (let k = 7; k <= 13; k++) putBlock(ctx, k, 5, 'hard');
      for (let r = 6; r <= 11; r++) putBlock(ctx, 10, r, 'hard');
      putBlock(ctx, 8, 8, 'question', 'powerup');
      putBlock(ctx, 12, 8, 'brick', 'coin');
      addEnemy(ctx, 7, GROUND_ROW - 1, 'spiny');
      return 16;
    }
    case 7: {
      // World 7: R-4 (Clockcore) - Clockwork gear rafters and pendulum shaft
      for (let k = 7; k <= 16; k++) {
        if (k % 2 === 0) putBlock(ctx, k, 7, 'hard');
        else putBlock(ctx, k, 5, 'brick');
      }
      putBlock(ctx, 11, 3, 'question', 'powerup');
      addEnemy(ctx, 12, GROUND_ROW - 1, 'chuck');
      return 18;
    }
    case 8:
    default: {
      // World 8: N-4 (Cosmos) - Singularity portal gate with dual concentric rings
      for (let k = 6; k <= 10; k++) putBlock(ctx, k, 6, 'bridge');
      for (let k = 12; k <= 16; k++) putBlock(ctx, k, 4, 'bridge');
      putBlock(ctx, 11, 2, 'question', 'powerup');
      addCoinArc(ctx, 7, 8, 1.8);
      addEnemy(ctx, 14, 3, 'paratroopa');
      return 18;
    }
  }
}

function buildDimensionCastle(ctx: BuilderCtx): { totalCols: number; boss: FortressBoss } {
  let cursor = buildCastleEntrance(ctx);

  const config = DIM_CASTLE_CONFIGS[ctx.worldNum] ?? DIM_CASTLE_CONFIGS[1];

  for (const section of config.sections) {
    cursor += buildFortressSection(ctx, section, cursor) + 2;
  }

  const { arenaWidth, boss } = buildFortressArena(ctx, cursor, config.arenaStyle);
  const totalCols = cursor + arenaWidth;
  return { totalCols, boss };
}

// ============================================================================
// PUBLIC EXPORT: buildDimensionStage
// Handles all 32 stages of Dimension (J-1 .. N-4).
// Returns { totalCols, boss: null } for stages 1..3,
// and { totalCols, boss: FortressBoss } for stage 4.
// ============================================================================

export function buildDimensionStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  if (ctx.stageNum === 4) {
    return buildDimensionCastle(ctx);
  }

  const bp = DIM_BLUEPRINTS[ctx.levelIndex] ?? DIM_BLUEPRINTS[0];

  let cursor = buildOpeningStyle(ctx, bp.opening);

  if (bp.slotPattern === 0) {
    // Pattern 0: opening -> act1 -> trans1 -> plaza1 -> act2 -> midpoint -> act3 -> trans2 -> plaza2 -> act4 -> finale
    cursor += buildDimSetpiece(ctx, bp.act1, cursor);
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
    cursor += buildServicePlaza(ctx, cursor, bp.plaza1);
    cursor += buildDimSetpiece(ctx, bp.act2, cursor);
    cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint);
    cursor += buildDimSetpiece(ctx, bp.act3, cursor);
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
    cursor += buildServicePlaza(ctx, cursor, bp.plaza2);
    cursor += buildDimSetpiece(ctx, bp.act4, cursor);
  } else if (bp.slotPattern === 1) {
    // Pattern 1: opening -> plaza1 -> act1 -> trans1 -> act2 -> midpoint -> trans2 -> act3 -> plaza2 -> act4 -> finale
    cursor += buildServicePlaza(ctx, cursor, bp.plaza1);
    cursor += buildDimSetpiece(ctx, bp.act1, cursor);
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
    cursor += buildDimSetpiece(ctx, bp.act2, cursor);
    cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint);
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
    cursor += buildDimSetpiece(ctx, bp.act3, cursor);
    cursor += buildServicePlaza(ctx, cursor, bp.plaza2);
    cursor += buildDimSetpiece(ctx, bp.act4, cursor);
  } else {
    // Pattern 2: opening -> trans1 -> act1 -> act2 -> plaza1 -> midpoint -> plaza2 -> trans2 -> act3 -> act4 -> finale
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
    cursor += buildDimSetpiece(ctx, bp.act1, cursor);
    cursor += buildDimSetpiece(ctx, bp.act2, cursor);
    cursor += buildServicePlaza(ctx, cursor, bp.plaza1);
    cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint);
    cursor += buildServicePlaza(ctx, cursor, bp.plaza2);
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
    cursor += buildDimSetpiece(ctx, bp.act3, cursor);
    cursor += buildDimSetpiece(ctx, bp.act4, cursor);
  }

  // Finale Style
  const finaleAdvance = buildFinaleStyle(ctx, bp.finale, cursor);
  cursor += finaleAdvance;

  const totalCols = cursor + 14;
  return { totalCols, boss: null };
}
