import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Track } from '../../types/experience';
import { usePlayback } from '../../hooks/PlaybackContext';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  artistName?: string;
  queue: Track[];
  onOpenFullPlayer?: () => void;
};

export function MiniPlayer({
  artistName = '',
  queue,
  onOpenFullPlayer,
}: Props) {
  const {
    activeTrack,
    isPlaying,
    progress,
    togglePlayPause,
    playNext,
    playPrevious,
  } = usePlayback();

  if (!activeTrack) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, Math.max(0, progress * 100))}%` },
          ]}
        />
      </View>

      <Pressable
        style={styles.row}
        onPress={onOpenFullPlayer}
        accessibilityRole="button"
        accessibilityLabel={`Now playing ${activeTrack.title}`}
      >
        <Image
          source={{ uri: activeTrack.artworkUrl }}
          style={styles.art}
          accessibilityIgnoresInvertColors
        />

        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {activeTrack.title}
          </Text>
          {artistName ? (
            <Text style={styles.artist} numberOfLines={1}>
              {artistName}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => playPrevious(queue)}
          style={styles.ctrl}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
        >
          <Ionicons name="play-skip-back" size={20} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={togglePlayPause}
          style={styles.ctrl}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>

        <Pressable
          onPress={() => playNext(queue)}
          style={styles.ctrl}
          accessibilityRole="button"
          accessibilityLabel="Next track"
        >
          <Ionicons name="play-skip-forward" size={20} color={colors.textPrimary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    backgroundColor: colors.progressTrack,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  artist: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  ctrl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MiniPlayer;
