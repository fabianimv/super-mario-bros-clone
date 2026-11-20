import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GamePartition, PowerState } from '../engine/types';

export interface HudSnapshot {
  partition: GamePartition;
  score: number;
  coins: number;
  worldLabel: string;
  stageTitle: string;
  timeLeft: number;
  lives: number;
  powerState: PowerState;
  starActive: boolean;
  pMeter: number;
  mountedYoshi: boolean;
  yoshiFireReady: boolean;
  dragonCoins: number;
  bossHp: number | null;
  bossMaxHp: number | null;
  /** Objetivo del nivel ("💎 2/5", "⏱ CONTRARRELOJ"...) o null si es llegar a la meta. */
  objective?: string | null;
  timeAttack?: boolean;
  keyHeld?: boolean;
  cameraMode?: 'side' | 'corridor3d';
  gravityDir?: 1 | -1;
  onOffState?: 'on' | 'off';
  subArea?: 'subroom' | 'warp_zone' | null;
  arenaWave?: { current: number; total: number } | null;
  furyMeter?: number;
  furyTimer?: number;
  odysseyMode?: 'citadel_grapple' | 'chrono_canyon' | 'titan_crater';
  jetpackFuel?: number;
  chronoTimer?: number;
  mechaSuit?: boolean;
}

interface Props {
  hud: HudSnapshot;
  pixelFontLoaded: boolean;
  onPausePress: () => void;
}

const P_THRESHOLDS = [20, 42, 64, 86, 102];

export const HudOverlay: React.FC<Props> = ({ hud, pixelFontLoaded, onPausePress }) => {
  const insets = useSafeAreaInsets();
  const fontFamily = pixelFontLoaded ? 'PressStart2P_400Regular' : undefined;
  const isSmw = hud.partition === 'smw';
  const isFrontier = hud.partition === 'frontier';
  const pFull = hud.pMeter >= 108;

  const powerBadge = hud.starActive
    ? { label: '★ ESTRELLA', bg: '#eab308', text: '#1c1917' }
    : hud.powerState === 3
    ? { label: '🪶 CAPA', bg: '#d97706', text: '#fef9c3' }
    : hud.powerState === 2
    ? { label: '♦ FUEGO', bg: '#ea580c', text: '#ffffff' }
    : hud.powerState === 1
    ? { label: '▲ SUPER', bg: '#16a34a', text: '#ffffff' }
    : null;

  const yoshiBadge = hud.mountedYoshi
    ? hud.yoshiFireReady
      ? { label: '🔥 YOSHI', bg: '#dc2626', text: '#fef08a' }
      : { label: '🦕 YOSHI', bg: '#15803d', text: '#dcfce7' }
    : null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingLeft: Math.max(insets.left, 14) + 4,
          paddingRight: Math.max(insets.right, 14) + 4,
          paddingTop: Math.max(insets.top, 6),
        },
      ]}
    >
      <View pointerEvents="none" style={styles.statsBar}>
        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { fontFamily, color: '#f87171' }]}>PLOMERO</Text>
          <Text style={[styles.statValue, { fontFamily }]}>
            {String(hud.score).padStart(6, '0')}
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { fontFamily, color: '#fde047' }]}>MONEDAS</Text>
          <View style={styles.coinRow}>
            <View style={styles.coinIcon} />
            <Text style={[styles.statValue, { fontFamily }]}>
              x{String(hud.coins).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {isSmw && (
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { fontFamily, color: '#38bdf8' }]}>DRAGÓN</Text>
            <Text
              style={[
                styles.statValue,
                { fontFamily, color: hud.dragonCoins >= 5 ? '#fde047' : '#bae6fd' },
              ]}
            >
              ◆{hud.dragonCoins}/5
            </Text>
          </View>
        )}

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { fontFamily, color: '#4ade80' }]}>
            {isSmw
              ? 'ISLA'
              : hud.partition === 'frontier'
              ? 'REGIÓN'
              : hud.partition === 'expedition' || hud.partition === 'dimension'
              ? 'ZONA'
              : hud.partition === 'tower'
              ? 'TORRE'
              : hud.partition === 'flip'
              ? 'TEMPLO'
              : hud.partition === 'star_road'
              ? 'SENDA'
              : hud.partition === 'odyssey'
              ? 'ODISEA'
              : 'MUNDO'}
          </Text>
          <Text style={[styles.statValue, { fontFamily }]}>{hud.worldLabel}</Text>
        </View>

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { fontFamily, color: '#fbbf24' }]}>TIEMPO</Text>
          <Text
            style={[
              styles.statValue,
              { fontFamily },
              hud.timeLeft <= (hud.timeAttack ? 20 : 60) && { color: '#ef4444' },
            ]}
          >
            {String(hud.timeLeft).padStart(3, '0')}
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={[styles.statLabel, { fontFamily, color: '#f472b6' }]}>VIDAS</Text>
          <Text style={[styles.statValue, { fontFamily }]}>
            ♥x{Math.max(0, hud.lives)}
          </Text>
        </View>

        {isSmw && (
          <View style={styles.pMeterWrap}>
            <View style={styles.pArrowsRow}>
              {P_THRESHOLDS.map((th, idx) => {
                const lit = hud.pMeter >= th;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.pTick,
                      lit && (pFull ? styles.pTickGold : styles.pTickLit),
                    ]}
                  />
                );
              })}
            </View>
            <View style={[styles.pBadge, pFull && styles.pBadgeFull]}>
              <Text
                style={[
                  styles.pBadgeText,
                  { fontFamily, color: pFull ? '#1c1917' : '#94a3b8' },
                ]}
              >
                P
              </Text>
            </View>
          </View>
        )}

        {powerBadge && (
          <View style={[styles.powerPill, { backgroundColor: powerBadge.bg }]}>
            <Text style={[styles.powerPillText, { fontFamily, color: powerBadge.text }]}>
              {powerBadge.label}
            </Text>
          </View>
        )}

        {((hud.furyTimer ?? 0) > 0 || (hud.furyMeter ?? 0) > 0) && (
          <View
            style={[
              styles.furyPill,
              (hud.furyTimer ?? 0) > 0 && styles.furyPillActive,
            ]}
          >
            <Text
              style={[
                styles.powerPillText,
                { fontFamily, color: (hud.furyTimer ?? 0) > 0 ? '#fef08a' : '#fca5a5' },
              ]}
            >
              {(hud.furyTimer ?? 0) > 0
                ? '🔥 ¡FURIA!'
                : `🔥 FURIA ${Math.round(hud.furyMeter ?? 0)}%`}
            </Text>
            <View style={styles.furyTrack}>
              <View
                style={[
                  styles.furyFill,
                  {
                    width:
                      (hud.furyTimer ?? 0) > 0
                        ? '100%'
                        : `${Math.max(0, Math.min(100, hud.furyMeter ?? 0))}%`,
                    backgroundColor: (hud.furyTimer ?? 0) > 0 ? '#facc15' : '#ef4444',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {hud.objective && (() => {
          const isSprintOrMeta =
            hud.objective.startsWith('⚡ SPRINT') ||
            hud.objective.startsWith('⚡ META') ||
            hud.objective.startsWith('⚔ ¡META LIBRE!');
          const isCaptain = hud.objective.startsWith('⚔');
          const isBounty = hud.objective.startsWith('🎯');
          const isCore = hud.objective.startsWith('💥');
          const isEcho = hud.objective.startsWith('🪞');
          const isTime = hud.objective.startsWith('⏱');
          const isChase = hud.objective.startsWith('👁');
          const isFortune = hud.objective.startsWith('🪙');

          const pillBg = isSprintOrMeta
            ? '#eab308'
            : isCaptain
            ? '#b91c1c'
            : isBounty
            ? '#7e22ce'
            : isCore
            ? '#0369a1'
            : isEcho
            ? '#6d28d9'
            : isTime
            ? '#ca8a04'
            : isChase
            ? '#9333ea'
            : isFortune
            ? '#d97706'
            : '#581c87';

          const pillBorder = isSprintOrMeta
            ? '#fef08a'
            : isCaptain
            ? '#f87171'
            : isBounty
            ? '#c084fc'
            : isCore
            ? '#38bdf8'
            : isEcho
            ? '#a78bfa'
            : isTime
            ? '#fde047'
            : isChase
            ? '#f0abfc'
            : isFortune
            ? '#fde68a'
            : '#ffffff';

          const textColor = isSprintOrMeta ? '#1c1917' : '#ffffff';

          return (
            <View
              style={[
                styles.powerPill,
                { backgroundColor: pillBg, borderColor: pillBorder },
              ]}
            >
              <Text style={[styles.powerPillText, { fontFamily, color: textColor }]}>
                {hud.objective}
              </Text>
            </View>
          );
        })()}

        {hud.keyHeld && (
          <View style={[styles.powerPill, { backgroundColor: '#a16207' }]}>
            <Text style={[styles.powerPillText, { fontFamily, color: '#fef9c3' }]}>🔑 LLAVE</Text>
          </View>
        )}

        {yoshiBadge && (
          <View style={[styles.powerPill, { backgroundColor: yoshiBadge.bg }]}>
            <Text style={[styles.powerPillText, { fontFamily, color: yoshiBadge.text }]}>
              {yoshiBadge.label}
            </Text>
          </View>
        )}

        {hud.gravityDir === -1 && (
          <View style={[styles.powerPill, { backgroundColor: '#7e22ce', borderColor: '#d8b4fe' }]}>
            <Text style={[styles.powerPillText, { fontFamily, color: '#f3e8ff' }]}>↕ INVERTIDO</Text>
          </View>
        )}

        {hud.onOffState != null && (
          <View
            style={[
              styles.powerPill,
              hud.onOffState === 'on'
                ? { backgroundColor: '#dc2626', borderColor: '#fca5a5' }
                : { backgroundColor: '#2563eb', borderColor: '#93c5fd' },
            ]}
          >
            <Text style={[styles.powerPillText, { fontFamily, color: '#ffffff' }]}>
              {hud.onOffState === 'on' ? '🔴 ON' : '🔵 OFF'}
            </Text>
          </View>
        )}

        {hud.subArea != null && (
          <View
            style={[
              styles.powerPill,
              hud.subArea === 'warp_zone'
                ? { backgroundColor: '#7c3aed', borderColor: '#c4b5fd' }
                : { backgroundColor: '#059669', borderColor: '#6ee7b7' },
            ]}
          >
            <Text style={[styles.powerPillText, { fontFamily, color: '#ffffff' }]}>
              {hud.subArea === 'warp_zone' ? '🌀 ZONA WARP' : '🕳 SUB-ZONA'}
            </Text>
          </View>
        )}

        {hud.arenaWave != null && (
          <View style={[styles.powerPill, { backgroundColor: '#ea580c', borderColor: '#fdba74' }]}>
            <Text style={[styles.powerPillText, { fontFamily, color: '#fff7ed' }]}>
              {`⚔ OLEADA ${hud.arenaWave.current}/${hud.arenaWave.total}`}
            </Text>
          </View>
        )}

        {(hud.odysseyMode === 'chrono_canyon' || hud.odysseyMode === 'titan_crater') &&
          hud.jetpackFuel != null && (
            <View
              style={[
                styles.jetpackPill,
                hud.jetpackFuel < 20 && styles.jetpackPillLow,
              ]}
            >
              <Text
                style={[
                  styles.powerPillText,
                  {
                    fontFamily,
                    color: hud.jetpackFuel < 20 ? '#fca5a5' : '#a5f3fc',
                  },
                ]}
              >
                {`🚀 ${Math.round(hud.jetpackFuel)}%`}
              </Text>
              <View style={styles.jetpackTrack}>
                <View
                  style={[
                    styles.jetpackFill,
                    {
                      width: `${Math.max(0, Math.min(100, hud.jetpackFuel))}%`,
                      backgroundColor: hud.jetpackFuel < 20 ? '#ef4444' : '#06b6d4',
                    },
                  ]}
                />
              </View>
            </View>
          )}

        {(hud.chronoTimer ?? 0) > 0 && (
          <View style={[styles.powerPill, styles.chronoPill]}>
            <Text style={[styles.powerPillText, { fontFamily, color: '#f5d0fe' }]}>
              ⏳ ¡CRONO!
            </Text>
          </View>
        )}

        {hud.mechaSuit && (
          <View style={[styles.powerPill, styles.mechaPill]}>
            <Text style={[styles.powerPillText, { fontFamily, color: '#fef08a' }]}>
              🤖 MECHA
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightCluster} pointerEvents="box-none">
        {hud.bossHp !== null && hud.bossMaxHp !== null && hud.bossHp > 0 && (
          <View pointerEvents="none" style={styles.bossBarBox}>
            <Text style={[styles.bossLabel, { fontFamily }]}>
              {hud.odysseyMode === 'titan_crater' ? 'MECHA-TITÁN REX' : 'REY KOOPA'}
            </Text>
            <View style={styles.bossTrack}>
              <View
                style={[
                  styles.bossFill,
                  { width: `${Math.max(0, (hud.bossHp / hud.bossMaxHp) * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        <Pressable
          onPress={onPausePress}
          hitSlop={12}
          style={({ pressed }) => [styles.pauseBtn, pressed && styles.pauseBtnPressed]}
        >
          <Text style={[styles.pauseText, { fontFamily }]}>II</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(9, 13, 22, 0.68)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  coinIcon: {
    width: 7,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#facc15',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  pMeterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pArrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pTick: {
    width: 5,
    height: 9,
    borderRadius: 1.5,
    backgroundColor: '#1e293b',
  },
  pTickLit: {
    backgroundColor: '#38bdf8',
  },
  pTickGold: {
    backgroundColor: '#fde047',
  },
  pBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  pBadgeFull: {
    backgroundColor: '#facc15',
    borderColor: '#fef9c3',
  },
  pBadgeText: {
    fontSize: 7,
    fontWeight: '900',
  },
  powerPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  powerPillText: {
    fontSize: 7,
    fontWeight: '900',
  },
  furyPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(69, 10, 10, 0.88)',
    alignItems: 'center',
    gap: 2,
    minWidth: 64,
  },
  furyPillActive: {
    borderColor: '#facc15',
    backgroundColor: 'rgba(153, 27, 27, 0.95)',
  },
  furyTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#1f0404',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  furyFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  jetpackPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(8, 51, 68, 0.9)',
    alignItems: 'center',
    gap: 2,
    minWidth: 58,
  },
  jetpackPillLow: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(69, 10, 10, 0.9)',
  },
  jetpackTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  jetpackFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  chronoPill: {
    backgroundColor: 'rgba(88, 28, 135, 0.92)',
    borderColor: '#d8b4fe',
  },
  mechaPill: {
    backgroundColor: 'rgba(153, 27, 27, 0.92)',
    borderColor: '#facc15',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bossBarBox: {
    backgroundColor: 'rgba(24, 5, 5, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ef4444',
    width: 104,
  },
  bossLabel: {
    color: '#fca5a5',
    fontSize: 7,
    fontWeight: '900',
    marginBottom: 3,
    textAlign: 'center',
  },
  bossTrack: {
    height: 6,
    backgroundColor: '#450a0a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bossFill: {
    height: '100%',
    backgroundColor: '#ef4444',
  },
  pauseBtn: {
    width: 36,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: '#334155',
  },
  pauseText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
  },
});
