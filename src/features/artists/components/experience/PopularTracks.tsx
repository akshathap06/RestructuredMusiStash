import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Track } from '../../types/experience';
import { usePlayback } from '../../hooks/PlaybackContext';
import { TrackRow } from './TrackRow';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  tracks: Track[];
  title?: string;
  onSeeAll?: () => void;
};

function showTrackOverflow(track: Track) {
  const options = ['Share', 'Add to queue', 'Cancel'];
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 2,
        title: track.title,
      },
      () => undefined,
    );
    return;
  }
  Alert.alert(track.title, undefined, [
    { text: 'Share', style: 'default' },
    { text: 'Add to queue', style: 'default' },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function PopularTracks({ tracks, title = 'Popular', onSeeAll }: Props) {
  const { activeTrack, isPlaying, playTrack } = usePlayback();
  const visible = tracks.slice(0, 3);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {tracks.length > 3 && onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel="See all popular tracks"
            hitSlop={8}
          >
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        ) : null}
      </View>

      {visible.map((track, i) => {
        const isActive = activeTrack?.id === track.id;
        return (
          <TrackRow
            key={track.id}
            track={track}
            index={i + 1}
            isActive={isActive}
            isPlaying={isActive && isPlaying}
            onPress={() => playTrack(track)}
            onMore={() => showTrackOverflow(track)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default PopularTracks;
