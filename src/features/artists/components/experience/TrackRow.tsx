import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Track } from '../../types/experience';
import { formatDuration, formatListeners } from '../../data/kalebDemo';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  onMore: () => void;
};

export function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onPress,
  onMore,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${isPlaying && isActive ? 'Pause' : 'Play'} ${track.title}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.index, isActive && styles.indexActive]}>{index}</Text>

      <Image
        source={{ uri: track.artworkUrl }}
        style={styles.art}
        accessibilityIgnoresInvertColors
      />

      <View style={styles.meta}>
        <Text
          style={[styles.title, isActive && styles.titleActive]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {track.playCount != null
            ? `${formatListeners(track.playCount)} plays`
            : '—'}
        </Text>
      </View>

      <Text style={styles.duration}>{formatDuration(track.durationSeconds)}</Text>

      <Pressable
        onPress={onMore}
        hitSlop={8}
        style={styles.moreBtn}
        accessibilityRole="button"
        accessibilityLabel={`More options for ${track.title}`}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingVertical: 8,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  index: {
    width: 24,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  indexActive: {
    color: colors.accent,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 5,
    marginLeft: 10,
    backgroundColor: colors.surface,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  titleActive: {
    color: colors.accent,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },
  duration: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 4,
    minWidth: 36,
    textAlign: 'right',
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TrackRow;
