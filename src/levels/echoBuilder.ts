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
// ECHO MODE (Mundo 8 — E-1 .. T-4, 16 Stages)
// Game Theory Core: Temporal Coordination with your own Echo (60 frames delay = 1.0s)
// Features resonance tuning forks, phase rotators, harmonic lifts, delay loops.
// ============================================================================

export type EchoSetpiece =
  | 'resonance_tuning_forks'
  | 'phase_shift_rotators'
  | 'harmonic_sine_lifts'
  | 'mirror_symmetry_hall'
  | 'delay_loop_courtyard'
  | 'twin_pulse_gates'
  | 'echo_cascade_steps'
  | 'chrono_pendulum_chasm'
  | 'prism_refraction_decks'
  | 'wavefront_pipe_organ'
  | 'temporal_wall_shaft'
  | 'standing_wave_bridge'
  | 'doppler_sprint_alley'
  | 'convergence_sanctum';

// ============================================================================
// 14 EXCLUSIVE SETPIECES FOR ECHO (0% shared with any other mode)
// ============================================================================

function buildEchoSetpiece(
  ctx: BuilderCtx,
  kind: EchoSetpiece,
  col: number
): number {
  const v = variantOf(ctx, col);

  switch (kind) {
    case 'resonance_tuning_forks': {
      // 14 cols: Two stone prongs at cols +3 and +9 with coin arcs spaced ~6 cols apart.
      // Jumping through prong 1 sets the trajectory; 1s later the Echo tracks prong 2.
      const width = 14;
      // Prong 1
      for (let r = 5; r <= 11; r++) {
        putBlock(ctx, col + 3, r, 'hard');
      }
      // Prong 2
      for (let r = 5; r <= 11; r++) {
        putBlock(ctx, col + 9, r, 'hard');
      }

      // Coin arcs timed ~60 frames apart
      addCoinArc(ctx, col + 2, 3, 3.5);
      addCoinArc(ctx, col + 8, 3, 3.5);
      putBlock(ctx, col + 6, 3, 'question', v === 0 ? 'powerup' : 'coin');

      addEnemy(ctx, col + 6, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'phase_shift_rotators': {
      // 14 cols: Ceiling of brick blocks at row 8 with coins suspended at row 6.5.
      // Hitting the brick blocks from below opens a trail for the Echo 1s later.
      const width = 14;
      for (let c = col + 3; c <= col + 9; c++) {
        putBlock(ctx, c, 8, 'brick', c % 2 === 0 ? 'coin' : null);
        addCoin(ctx, c, 6.5);
      }
      putBlock(ctx, col + 6, 4, 'question', 'powerup');

      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'koopa_red');
      addEnemy(ctx, col + 11, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'harmonic_sine_lifts': {
      // 15 cols: Two moving lifts in opposite phase (0 and Math.PI) across safe chasms.
      // Coin arc connects the sinusoidal peaks.
      const width = 15;
      carvePit(ctx, col + 2, 3);
      carvePit(ctx, col + 9, 3);

      // Central island
      addPlateau(ctx, col + 6, 2, 8, 'hard');
      putBlock(ctx, col + 6, 5, 'question', 'coin');

      // Lift 1 (phase 0)
      addPlatform(ctx, col + 2, 8, 2, 0, 2.0, 0.038, 0);
      // Lift 2 (phase PI)
      addPlatform(ctx, col + 9, 8, 2, 0, 2.0, 0.038, Math.PI);

      addCoinArc(ctx, col + 2, 5, 5.5);
      addCoinArc(ctx, col + 8, 5, 5.5);
      return width;
    }

    case 'mirror_symmetry_hall': {
      // 15 cols: Symmetrical palace hall with upper & lower bridges and central dividing pillar.
      const width = 15;
      // Upper bridges
      for (let c = col + 2; c <= col + 5; c++) putBlock(ctx, c, 5, 'bridge');
      for (let c = col + 9; c <= col + 12; c++) putBlock(ctx, c, 5, 'bridge');
      // Lower bridges
      for (let c = col + 2; c <= col + 5; c++) putBlock(ctx, c, 9, 'bridge');
      for (let c = col + 9; c <= col + 12; c++) putBlock(ctx, c, 9, 'bridge');

      // Central dividing pillar
      for (let r = 4; r <= 11; r++) {
        putBlock(ctx, col + 7, r, 'hard');
      }
      putBlock(ctx, col + 7, 2, 'question', 'powerup');

      addCoinArc(ctx, col + 2, 4, 3.5);
      addCoinArc(ctx, col + 9, 4, 3.5);
      addEnemy(ctx, col + 4, 8, 'paratroopa');
      addEnemy(ctx, col + 11, 8, 'paratroopa');
      return width;
    }

    case 'delay_loop_courtyard': {
      // 14 cols: Courtyard with return spring at col +9 launching player backwards
      // into a high arc where they cross past their own Echo running along the ground!
      const width = 14;
      addPlateau(ctx, col + 1, 3, 10, 'hard');
      addPlateau(ctx, col + 9, 3, 10, 'hard');

      addSpring(ctx, col + 9, 10);
      addCoinArc(ctx, col + 3, 7, 5.0);
      putBlock(ctx, col + 6, 6, 'question', 'star');

      addEnemy(ctx, col + 5, GROUND_ROW - 1, 'rex');
      return width;
    }

    case 'twin_pulse_gates': {
      // 14 cols: Alternating pulse gates: Gate 1 requires sliding below (lintel at row 9),
      // Gate 2 requires jumping above (barrier at row 8).
      const width = 14;
      // Gate 1: low passage
      for (let c = col + 2; c <= col + 5; c++) {
        putBlock(ctx, c, 9, 'hard');
        addCoin(ctx, c, 10.5);
      }
      // Gate 2: high passage
      for (let c = col + 8; c <= col + 11; c++) {
        putBlock(ctx, c, 8, 'hard');
        putBlock(ctx, c, 5, 'bridge');
        addCoin(ctx, c, 3.5);
      }
      putBlock(ctx, col + 9, 2, 'question', 'powerup');

      addEnemy(ctx, col + 7, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'echo_cascade_steps': {
      // 14 cols: 4 descending stone tiers where the Echo cascades down one tier
      // behind the player like a musical canon.
      const width = 14;
      addPlateau(ctx, col + 1, 3, 5, 'hard');
      addPlateau(ctx, col + 4, 3, 7, 'hard');
      addPlateau(ctx, col + 7, 3, 9, 'hard');
      addPlateau(ctx, col + 10, 3, 11, 'hard');

      addCoin(ctx, col + 2, 3.5);
      addCoin(ctx, col + 5, 5.5);
      addCoin(ctx, col + 8, 7.5);
      addCoin(ctx, col + 11, 9.5);
      putBlock(ctx, col + 2, 2, 'question', 'one_up');

      addEnemy(ctx, col + 8, 8, 'koopa_red');
      return width;
    }

    case 'chrono_pendulum_chasm': {
      // 14 cols: Chasm spanned by horizontal pendulum lift and central stone node.
      const width = 14;
      carvePit(ctx, col + 2, 3);
      carvePit(ctx, col + 8, 3);

      putBlock(ctx, col + 6, 8, 'hard');
      putBlock(ctx, col + 7, 8, 'hard');

      addPlatform(ctx, col + 3, 8, 2, 1.8, 0, 0.04, 0);
      addCoinArc(ctx, col + 2, 5, 5.5);
      addCoinArc(ctx, col + 7, 5, 5.5);
      putBlock(ctx, col + 6, 5, 'question', 'powerup');

      addEnemy(ctx, col + 12, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'prism_refraction_decks': {
      // 14 cols: Three stepped decks at rows 10, 7, 4 for chaining triple jumps.
      const width = 14;
      for (let c = col + 2; c <= col + 5; c++) putBlock(ctx, c, 10, 'bridge');
      for (let c = col + 6; c <= col + 9; c++) putBlock(ctx, c, 7, 'bridge');
      for (let c = col + 10; c <= col + 13; c++) putBlock(ctx, c, 4, 'bridge');

      addCoinArc(ctx, col + 3, 4, 8.5);
      addCoinArc(ctx, col + 7, 4, 5.5);
      addCoinArc(ctx, col + 11, 3, 2.5);
      putBlock(ctx, col + 11, 1, 'question', 'multi_coin');

      addEnemy(ctx, col + 7, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'wavefront_pipe_organ': {
      // 15 cols: 4 pipes in a sinusoidal crest with coin arcs.
      const width = 15;
      addPipe(ctx, col + 1, 2, false);
      addPipe(ctx, col + 5, 4, true);
      addPipe(ctx, col + 9, 3, false);
      addPipe(ctx, col + 13, 2, true);

      addCoinArc(ctx, col + 2, 3, 7.5);
      addCoinArc(ctx, col + 6, 3, 5.5);
      addCoinArc(ctx, col + 10, 3, 6.5);
      putBlock(ctx, col + 7, 3, 'question', 'powerup');

      addEnemy(ctx, col + 7, GROUND_ROW - 1, 'goomba');
      return width;
    }

    case 'temporal_wall_shaft': {
      // 13 cols: Wall-jump shaft between cols +3 and +8. Rebounding off walls
      // leaves the Echo on the opposite wall 1 second later.
      const width = 13;
      for (let r = 4; r <= 9; r++) {
        putBlock(ctx, col + 3, r, 'hard');
        putBlock(ctx, col + 8, r, 'hard');
      }
      addCoin(ctx, col + 4, 8.0);
      addCoin(ctx, col + 7, 6.5);
      addCoin(ctx, col + 4, 5.0);
      addCoin(ctx, col + 7, 3.5);

      putBlock(ctx, col + 5, 2, 'question', 'powerup');
      putBlock(ctx, col + 6, 2, 'question', 'coin');

      addEnemy(ctx, col + 10, GROUND_ROW - 1, foe(ctx));
      return width;
    }

    case 'standing_wave_bridge': {
      // 14 cols: Suspension bridge at row 9 with node pillars and paratroopa oscillation.
      const width = 14;
      carvePit(ctx, col + 3, 3);
      carvePit(ctx, col + 8, 3);

      for (let c = col + 2; c <= col + 12; c++) {
        putBlock(ctx, c, 9, 'bridge');
      }
      putBlock(ctx, col + 4, 7, 'hard');
      putBlock(ctx, col + 7, 7, 'hard');
      putBlock(ctx, col + 10, 7, 'hard');

      addCoinArc(ctx, col + 4, 4, 5.0);
      addEnemy(ctx, col + 5, 6, 'paratroopa');
      addEnemy(ctx, col + 9, 6, 'paratroopa');
      return width;
    }

    case 'doppler_sprint_alley': {
      // 14 cols: Runway with spring launching into long parabolic jump.
      const width = 14;
      for (let c = col + 2; c <= col + 6; c++) {
        putBlock(ctx, c, 8, 'brick');
      }
      addSpring(ctx, col + 7, GROUND_ROW);
      addCoinArc(ctx, col + 8, 6, 4.0);
      putBlock(ctx, col + 11, 3, 'question', 'powerup');

      addEnemy(ctx, col + 4, GROUND_ROW - 1, 'rex');
      return width;
    }

    case 'convergence_sanctum': {
      // 14 cols: Symmetrical pre-climax sanctum: dual ramps towards central apex altar.
      const width = 14;
      putBlock(ctx, col + 1, 10, 'hard');
      putBlock(ctx, col + 2, 9, 'hard');
      putBlock(ctx, col + 3, 8, 'hard');
      putBlock(ctx, col + 4, 7, 'hard');

      putBlock(ctx, col + 6, 5, 'hard');
      putBlock(ctx, col + 7, 5, 'hard');
      putBlock(ctx, col + 6, 2, 'question', 'one_up');
      putBlock(ctx, col + 7, 2, 'question', 'star');

      putBlock(ctx, col + 9, 7, 'hard');
      putBlock(ctx, col + 10, 8, 'hard');
      putBlock(ctx, col + 11, 9, 'hard');
      putBlock(ctx, col + 12, 10, 'hard');

      addCoinArc(ctx, col + 5, 4, 3.5);
      addEnemy(ctx, col + 6, 4, 'koopa_red');
      return width;
    }
  }
}

// ============================================================================
// THE 4 ECHO CASTLES (E-4, P-4, N-4, T-4 — 100% Unique Fortress Plans)
// ============================================================================

interface CastleConfig {
  sections: FortressSection[];
  arenaStyle: ArenaStyle;
  entranceLen: number;
}

const ECHO_CASTLE_CONFIGS: CastleConfig[] = [
  // E-4 (idx 3, World 1): Twin tier gauntlet and rotating maze halls, ArenaStyle 3, cursor -> 74
  {
    sections: ['twin_tier_gauntlet', 'lava_pillar', 'rotating_maze_hall', 'vertical_lift', 'guard_corridor', 'supply_room'],
    arenaStyle: 3,
    entranceLen: 8,
  },
  // P-4 (idx 7, World 2): Pendulum lifts and crusher drops, ArenaStyle 1, cursor -> 80
  {
    sections: ['pendulum_lifts', 'sunken_lava_dais', 'crusher_drop', 'lava_pillar', 'cramped_hall', 'supply_room'],
    arenaStyle: 1,
    entranceLen: 11,
  },
  // N-4 (idx 11, World 3): Fire bar alley, dual route & magma catwalk, ArenaStyle 0, cursor -> 71
  {
    sections: ['fire_bar_alley', 'dual_route', 'magma_catwalk', 'crusher_drop', 'supply_room'],
    arenaStyle: 0,
    entranceLen: 14,
  },
  // T-4 (idx 15, World 4): Grand Resonance Fortress: chuck bastion & catwalks, ArenaStyle 2, cursor -> 103
  {
    sections: ['chuck_bastion', 'magma_catwalk', 'spiny_gauntlet', 'pillar_hops', 'twin_tier_gauntlet', 'fire_bar_alley', 'supply_room'],
    arenaStyle: 2,
    entranceLen: 22,
  },
];

function buildEchoCastle(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  ctx.isFortress = true;
  const config = ECHO_CASTLE_CONFIGS[Math.max(0, Math.min(3, ctx.worldNum - 1))];

  // Castle Opening: Crystalline resonance arch and entrance hall
  for (let c = 0; c <= 8 + config.entranceLen; c++) {
    ctx.pits.delete(c);
    ctx.lavaCols.delete(c);
  }
  putBlock(ctx, 8, 8, 'hard');
  putBlock(ctx, 9, 8, 'hard');
  putBlock(ctx, 10, 8, 'hard');
  putBlock(ctx, 9, 5, 'question', 'powerup');

  // Themed crystalline entrance hall per castle
  if (ctx.worldNum === 1) {
    putBlock(ctx, 12, 9, 'hard');
    putBlock(ctx, 13, 8, 'hard');
    addCoin(ctx, 13, 6.5);
  } else if (ctx.worldNum === 2) {
    putBlock(ctx, 13, 10, 'hard');
    putBlock(ctx, 14, 8, 'hard');
    putBlock(ctx, 15, 6, 'hard');
  } else if (ctx.worldNum === 3) {
    for (let c = 12; c <= 15; c++) putBlock(ctx, c, 7, 'hard');
    addCoinArc(ctx, 13, 3, 5.0);
  } else {
    for (let c = 12; c <= 22; c++) putBlock(ctx, c, 6, 'hard');
    addCoinArc(ctx, 14, 6, 4.0);
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
// THE 12 ECHO STAGE BLUEPRINTS (0% setpiece repetition within any level)
// ============================================================================

const ECHO_STAGE_BLUEPRINTS: Record<number, StageBlueprint<EchoSetpiece>> = {
  // E-1 (idx 0, objective reach): Resonance debut
  0: {
    opening: 'bridge_arch',
    act1: 'resonance_tuning_forks',
    trans1: 'breather_2',
    act2: 'phase_shift_rotators',
    midpoint: 'gazebo_lookout',
    act3: 'harmonic_sine_lifts',
    trans2: 'elevation_terrace_5',
    act4: ['mirror_symmetry_hall', 'delay_loop_courtyard'],
    finale: 'stepping_archway',
  },
  // E-2 (idx 1, objective collect): Gem exploration through cascade steps & organ
  1: {
    opening: 'pipe_terrace',
    act1: 'echo_cascade_steps',
    trans1: 'coin_step_3',
    act2: 'chrono_pendulum_chasm',
    midpoint: 'arch_sanctuary',
    act3: 'prism_refraction_decks',
    trans2: 'slide_gate_4',
    act4: ['wavefront_pipe_organ', 'temporal_wall_shaft'],
    finale: 'sky_platform_leap',
  },
  // E-3 (idx 2, objective time_attack): High-speed Doppler sprint
  2: {
    opening: 'windmill_runway',
    act1: 'doppler_sprint_alley',
    trans1: 'mini_pipe_4',
    act2: 'convergence_sanctum',
    midpoint: 'high_terrace',
    act3: 'phase_shift_rotators',
    trans2: 'arch_split_5',
    act4: ['resonance_tuning_forks', 'delay_loop_courtyard'],
    finale: 'gauntlet_ramp',
  },

  // P-1 (idx 4, objective collect): Gem sanctuary across symmetry hall & pulse gates
  4: {
    opening: 'meadow_plaza',
    act1: 'mirror_symmetry_hall',
    trans1: 'slide_gate_4',
    act2: 'twin_pulse_gates',
    midpoint: 'sunken_oasis',
    act3: 'echo_cascade_steps',
    trans2: 'elevation_terrace_5',
    act4: ['chrono_pendulum_chasm', 'prism_refraction_decks'],
    finale: 'moving_lift_tower',
  },
  // P-2 (idx 5, objective chase): Escaping shadow across temporal shaft & wave bridge
  5: {
    opening: 'canopy_drop',
    act1: 'temporal_wall_shaft',
    trans1: 'breather_2',
    act2: 'standing_wave_bridge',
    midpoint: 'gazebo_lookout',
    act3: 'doppler_sprint_alley',
    trans2: 'coin_step_3',
    act4: ['convergence_sanctum', 'resonance_tuning_forks'],
    finale: 'spring_citadel_launch',
  },
  // P-3 (idx 6, objective collect): Delay loops and harmonic lifts gem hunt
  6: {
    opening: 'sunken_courtyard',
    act1: 'delay_loop_courtyard',
    trans1: 'arch_split_5',
    act2: 'harmonic_sine_lifts',
    midpoint: 'arch_sanctuary',
    act3: 'mirror_symmetry_hall',
    trans2: 'mini_pipe_4',
    act4: ['echo_cascade_steps', 'twin_pulse_gates'],
    finale: 'classic_staircase',
  },

  // N-1 (idx 8, objective time_attack): Rapid clock dash through refraction decks
  8: {
    opening: 'spring_launch_pad',
    act1: 'prism_refraction_decks',
    trans1: 'elevation_terrace_5',
    act2: ['wavefront_pipe_organ', 'temporal_wall_shaft'],
    midpoint: 'high_terrace',
    act3: 'standing_wave_bridge',
    trans2: 'breather_2',
    act4: ['doppler_sprint_alley', 'convergence_sanctum'],
    finale: 'cloud_highway_drop',
  },
  // N-2 (idx 9, objective collect): Rotators & pulse gates symmetry gems
  9: {
    opening: 'split_tunnel',
    act1: 'phase_shift_rotators',
    trans1: 'coin_step_3',
    act2: ['harmonic_sine_lifts', 'mirror_symmetry_hall'],
    midpoint: 'sunken_oasis',
    act3: 'delay_loop_courtyard',
    trans2: 'slide_gate_4',
    act4: ['twin_pulse_gates', 'echo_cascade_steps'],
    finale: 'twin_deck_sprint',
  },
  // N-3 (idx 10, objective chase): Cosmic shadow pursuit across wavefront organ & sanctum
  10: {
    opening: 'bridge_arch',
    act1: 'wavefront_pipe_organ',
    trans1: 'mini_pipe_4',
    act2: ['temporal_wall_shaft', 'doppler_sprint_alley'],
    midpoint: 'gazebo_lookout',
    act3: 'standing_wave_bridge',
    trans2: 'elevation_terrace_5',
    act4: ['convergence_sanctum', 'phase_shift_rotators'],
    finale: 'sky_platform_leap',
  },

  // T-1 (idx 12, objective collect): Resonance crystal gathering
  12: {
    opening: 'windmill_runway',
    act1: 'resonance_tuning_forks',
    trans1: 'arch_split_5',
    act2: ['delay_loop_courtyard', 'harmonic_sine_lifts'],
    midpoint: 'arch_sanctuary',
    act3: 'mirror_symmetry_hall',
    trans2: 'breather_2',
    act4: ['echo_cascade_steps', 'prism_refraction_decks'],
    finale: 'stepping_archway',
  },
  // T-2 (idx 13, objective chase): Final temporal sprint across standing wave & doppler
  13: {
    opening: 'pipe_terrace',
    act1: 'chrono_pendulum_chasm',
    trans1: 'slide_gate_4',
    act2: ['temporal_wall_shaft', 'standing_wave_bridge'],
    midpoint: 'high_terrace',
    act3: 'doppler_sprint_alley',
    trans2: 'coin_step_3',
    act4: ['convergence_sanctum', 'harmonic_sine_lifts'],
    finale: 'gauntlet_ramp',
  },
  // T-3 (idx 14, objective time_attack): Ultimate time attack through pulse gates & tuning forks
  14: {
    opening: 'canopy_drop',
    act1: 'twin_pulse_gates',
    trans1: 'elevation_terrace_5',
    act2: ['mirror_symmetry_hall', 'phase_shift_rotators'],
    midpoint: 'sunken_oasis',
    act3: 'delay_loop_courtyard',
    trans2: 'mini_pipe_4',
    act4: ['temporal_wall_shaft', 'resonance_tuning_forks'],
    finale: 'moving_lift_tower',
  },
};

// ============================================================================
// STAGE BUILDER FOR NON-CASTLE ECHO STAGES
// ============================================================================

function buildEchoNormalStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  const bp = ECHO_STAGE_BLUEPRINTS[ctx.levelIndex] ?? ECHO_STAGE_BLUEPRINTS[0];

  // 1. Act I: Opening Style
  let cursor = buildOpeningStyle(ctx, bp.opening);

  // Setpiece(s) for Act 1
  const act1Pieces = Array.isArray(bp.act1) ? bp.act1 : [bp.act1];
  for (const piece of act1Pieces) {
    cursor += buildEchoSetpiece(ctx, piece, cursor);
  }

  // 2. Transition 1
  if (bp.trans1) {
    cursor += buildTransitionZone(ctx, bp.trans1, cursor);
  }

  // 3. Act II: Setpiece(s) + Guaranteed Shaft Plaza
  const act2Pieces = Array.isArray(bp.act2) ? bp.act2 : [bp.act2];
  for (const piece of act2Pieces) {
    cursor += buildEchoSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'shaft_plaza');

  // 4. Midpoint Interlude Plaza
  cursor += buildMidpointPlaza(ctx, cursor, bp.midpoint ?? 'gazebo_lookout');

  // 5. Act III: Setpiece(s) + Guaranteed Vault Plaza
  const act3Pieces = Array.isArray(bp.act3) ? bp.act3 : [bp.act3];
  for (const piece of act3Pieces) {
    cursor += buildEchoSetpiece(ctx, piece, cursor);
  }
  cursor += buildServicePlaza(ctx, cursor, 'vault_plaza');

  // 6. Transition 2
  if (bp.trans2) {
    cursor += buildTransitionZone(ctx, bp.trans2, cursor);
  }

  // 7. Act IV: Climax Setpiece(s)
  const act4Pieces = Array.isArray(bp.act4) ? bp.act4 : [bp.act4];
  for (const piece of act4Pieces) {
    cursor += buildEchoSetpiece(ctx, piece, cursor);
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

export function buildEchoStage(
  ctx: BuilderCtx
): { totalCols: number; boss: FortressBoss | null } {
  if (ctx.stageNum === 4) {
    return buildEchoCastle(ctx);
  }
  return buildEchoNormalStage(ctx);
}
