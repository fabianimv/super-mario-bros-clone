import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorldLabel } from '../engine/biomes';
import { NONLINEAR_PARTITIONS, PARTITION_INFO, PARTITION_ORDER, getPartitionProgress } from '../engine/partitions';
import type { GamePartition, SaveProgress } from '../engine/types';

interface Props {
  partition: GamePartition;
  progress: SaveProgress;
  pixelFontLoaded: boolean;
  onSelectPartition: (partition: GamePartition) => void;
  onStartAdventure: () => void;
  onContinue: () => void;
  onOpenWorldSelect: () => void;
  onOpenSettings: () => void;
  onQuickLaunchCityChaos?: () => void;
  onQuickLaunchRealms?: () => void;
}

export const TitleScreen: React.FC<Props> = ({
  partition,
  progress,
  pixelFontLoaded,
  onSelectPartition,
  onStartAdventure,
  onContinue,
  onOpenWorldSelect,
  onOpenSettings,
  onQuickLaunchCityChaos,
  onQuickLaunchRealms,
}) => {
  const insets = useSafeAreaInsets();
  const fontFamily = pixelFontLoaded ? 'PressStart2P_400Regular' : undefined;

  const info = PARTITION_INFO[partition];
  const pp = getPartitionProgress(progress, partition);
  const unlockedIdx = pp.unlocked;
  const clearedCount = pp.cleared.length;
  const highScore = pp.highScore;
  const totalCount = pp.total;
  const isRealms = partition === 'realms';
  const hasSavedStage = unlockedIdx > 0 && !isRealms;
  const basePartitions: GamePartition[] = ['classic', 'smw', 'expedition', 'dimension'];
  const newPartitions = PARTITION_ORDER.filter((part) => !basePartitions.includes(part));

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: Math.max(insets.top, 8),
        },
      ]}
    >
      {/* Selector de modo: campañas base arriba y modos nuevos abajo. */}
      <View style={styles.partitionSelector}>
        <View style={styles.partitionBar}>
          {basePartitions.map((part) => {
            const active = part === partition;
            return (
              <Pressable
                key={part}
                onPress={() => onSelectPartition(part)}
                style={[
                  styles.partitionTab,
                  active && { backgroundColor: PARTITION_INFO[part].accent },
                ]}
              >
                <Text
                  style={[
                    styles.partitionTabText,
                    { fontFamily },
                    active && styles.partitionTabTextActive,
                  ]}
                >
                  {PARTITION_INFO[part].tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.partitionBar, styles.partitionBarNew]}>
          {newPartitions.map((part) => {
            const active = part === partition;
            return (
              <Pressable
                key={part}
                onPress={() => onSelectPartition(part)}
                style={[
                  styles.partitionTab,
                  styles.partitionTabNew,
                  active && { backgroundColor: PARTITION_INFO[part].accent },
                  active && styles.partitionTabNewActive,
                ]}
              >
                <Text
                  style={[
                    styles.partitionTabText,
                    styles.partitionTabTextNew,
                    { fontFamily },
                    active && styles.partitionTabTextActive,
                  ]}
                >
                  {PARTITION_INFO[part].tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.partitionBar, styles.partitionBarNonlinear]}>
          {NONLINEAR_PARTITIONS.map((part) => {
            const active = part === partition;
            const isCity = part === 'city_chaos';
            const isRealmTab = part === 'realms';
            return (
              <Pressable
                key={part}
                onPress={() => onSelectPartition(part)}
                style={[
                  styles.partitionTab,
                  styles.partitionTabNonlinear,
                  isCity && styles.partitionTabCityChaos,
                  isRealmTab && styles.partitionTabRealms,
                  active && { backgroundColor: PARTITION_INFO[part].accent },
                  active && styles.partitionTabNonlinearActive,
                ]}
              >
                <Text
                  style={[
                    styles.partitionTabText,
                    styles.partitionTabTextNonlinear,
                    isCity && styles.partitionTabTextCityChaos,
                    isRealmTab && styles.partitionTabTextRealms,
                    { fontFamily },
                    active && styles.partitionTabTextActive,
                  ]}
                >
                  {PARTITION_INFO[part].tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Cartridge Signboard Logo */}
      <View
        style={[
          styles.signBoard,
          partition === 'smw' && styles.signBoardSmw,
          partition === 'expedition' && styles.signBoardExp,
          partition === 'frontier' && styles.signBoardFrontier,
          partition === 'tower' && styles.signBoardTower,
          partition === 'flip' && styles.signBoardFlip,
          partition === 'star_road' && styles.signBoardStarRoad,
          partition === 'odyssey' && styles.signBoardOdyssey,
          partition === 'city_chaos' && styles.signBoardCityChaos,
          isRealms && styles.signBoardRealms,
        ]}
      >
        <View style={styles.rivetRow}>
          <View style={styles.rivet} />
          <Text style={[styles.editionTag, { fontFamily }]}>
            {info.edition}
          </Text>
          <View style={styles.rivet} />
        </View>

        <Text style={[styles.logoSuper, { fontFamily }]}>SUPER PLOMERO</Text>
        <Text style={[styles.logoBros, { fontFamily }, partition !== 'classic' && { color: info.subtitleColor }]}>
          {info.subtitle}
        </Text>

        <View style={styles.rivetRowBottom}>
          <View style={styles.rivet} />
          <Text style={[styles.recordText, { fontFamily }]}>
            RÉCORD {String(highScore).padStart(6, '0')}  •  ★ {clearedCount}/{totalCount}
          </Text>
          <View style={styles.rivet} />
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.menuRow}>
        {hasSavedStage && (
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => [
              styles.btnPrimaryEmerald,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={[styles.btnPrimaryText, { fontFamily }]}>
              CONTINUAR {getWorldLabel(unlockedIdx, partition)}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onStartAdventure}
          style={({ pressed }) => [
            partition === 'city_chaos'
              ? styles.btnPrimaryCrimson
              : isRealms
              ? styles.btnPrimaryEmerald
              : styles.btnPrimaryGold,
            pressed && styles.btnPressed,
          ]}
        >
          <Text
            style={[
              partition === 'city_chaos' || isRealms ? styles.btnPrimaryText : styles.btnDarkText,
              { fontFamily },
            ]}
          >
            {partition === 'city_chaos'
              ? '🏎️ ▶ JUGAR CIUDAD CAOS'
              : isRealms
              ? '🌍 ▶ EXPLORAR R-1'
              : hasSavedStage
              ? 'NUEVA PARTIDA'
              : `▶ JUGAR ${info.firstStage}`}
          </Text>
        </Pressable>

        {!isRealms && onQuickLaunchRealms && (
          <Pressable
            onPress={onQuickLaunchRealms}
            style={({ pressed }) => [styles.btnPrimaryEmerald, pressed && styles.btnPressed]}
          >
            <Text style={[styles.btnPrimaryText, { fontFamily }]}>
              🌍 REINOS ABIERTOS
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onOpenWorldSelect}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
        >
          <Text style={[styles.btnLightText, { fontFamily }]}>
            {info.worldsLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.btnIcon, pressed && styles.btnPressed]}
        >
          <Text style={[styles.btnLightText, { fontFamily }]}>⚙</Text>
        </Pressable>
      </View>

      <Text style={styles.hintFooter}>
        {info.hint}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 10, 22, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  partitionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#475569',
    marginBottom: 10,
    gap: 6,
  },
  partitionSelector: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  partitionBarNew: {
    marginTop: 0,
    marginBottom: 0,
    borderColor: '#0ea5e9',
  },
  partitionTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  partitionTabClassicActive: {
    backgroundColor: '#dc2626',
  },
  partitionTabSmwActive: {
    backgroundColor: '#16a34a',
  },
  partitionTabText: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '900',
  },
  partitionTabTextActive: {
    color: '#ffffff',
  },
  partitionTabFrontier: {
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  partitionTabNew: {
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  partitionTabNewActive: {
    borderColor: '#e0f2fe',
  },
  partitionTabFrontierActive: {
    borderColor: '#e0f2fe',
  },
  partitionTabTextNew: {
    color: '#e0f2fe',
  },
  partitionTabTextFrontier: {
    color: '#e0f2fe',
  },
  signBoard: {
    backgroundColor: '#9a3412',
    borderWidth: 4,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.65,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    maxWidth: 560,
  },
  signBoardSmw: {
    backgroundColor: '#065f46',
    borderColor: '#fde047',
  },
  signBoardExp: {
    backgroundColor: '#3b0764',
    borderColor: '#67e8f9',
  },
  signBoardFrontier: {
    backgroundColor: '#082f49',
    borderColor: '#7dd3fc',
  },
  signBoardTower: {
    backgroundColor: '#7c2d12',
    borderColor: '#fed7aa',
  },
  signBoardFlip: {
    backgroundColor: '#581c87',
    borderColor: '#e9d5ff',
  },
  signBoardStarRoad: {
    backgroundColor: '#713f12',
    borderColor: '#fde047',
  },
  signBoardOdyssey: {
    backgroundColor: '#083344',
    borderColor: '#22d3ee',
  },
  signBoardRealms: {
    backgroundColor: '#064e3b',
    borderColor: '#34d399',
  },
  partitionTabRealms: {
    borderWidth: 2,
    borderColor: '#34d399',
    backgroundColor: 'rgba(6, 78, 59, 0.6)',
  },
  partitionTabTextRealms: {
    color: '#d1fae5',
  },
  signBoardCityChaos: {
    backgroundColor: '#881337',
    borderColor: '#f43f5e',
  },
  partitionBarNonlinear: {
    marginTop: 0,
    marginBottom: 0,
    borderColor: '#eab308',
  },
  partitionTabNonlinear: {
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#eab308',
  },
  partitionTabCityChaos: {
    borderWidth: 2,
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(136, 19, 55, 0.55)',
  },
  partitionTabTextCityChaos: {
    color: '#ffe4e6',
  },
  partitionTabNonlinearActive: {
    borderColor: '#fef08a',
  },
  partitionTabTextNonlinear: {
    color: '#fef08a',
  },
  partitionTabLocked: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    opacity: 0.7,
  },
  rivetRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  rivetRowBottom: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  rivet: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#451a03',
  },
  editionTag: {
    color: '#fde68a',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginHorizontal: 8,
  },
  logoSuper: {
    color: '#fef08a',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#141013',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  logoBros: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: '#141013',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  recordText: {
    color: '#ffedd5',
    fontSize: 8,
    fontWeight: '800',
    marginHorizontal: 12,
  },
  menuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  btnPrimaryGold: {
    backgroundColor: '#facc15',
    borderWidth: 3,
    borderColor: '#fef9c3',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#713f12',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPrimaryEmerald: {
    backgroundColor: '#16a34a',
    borderWidth: 3,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: '#052e16',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  btnPrimaryCrimson: {
    backgroundColor: '#e11d48',
    borderWidth: 3,
    borderColor: '#fecdd3',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: '#4c0519',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#94a3b8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#090d16',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  btnIcon: {
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#94a3b8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  btnPressed: {
    transform: [{ translateY: 3 }],
  },
  btnDarkText: {
    color: '#422006',
    fontSize: 9.5,
    fontWeight: '900',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  btnLightText: {
    color: '#f8fafc',
    fontSize: 9.5,
    fontWeight: '900',
  },
  hintFooter: {
    marginTop: 11,
    color: '#e2e8f0',
    fontSize: 10.5,
    fontWeight: '700',
    backgroundColor: 'rgba(9, 13, 22, 0.76)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
