import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import { formatListeners } from '../../data/kalebDemo';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  monthlyListeners: number;
  totalStreams?: number;
  spotifyFollowers?: number;
  /** monthlyListeners / totalStreams were typed in, not pulled from an API. */
  selfReported?: boolean;
};

/**
 * Verified-first: Spotify followers lead because they come from the API.
 * Monthly listeners and streams are only ever self-reported — Spotify does not
 * publish either — so they are marked rather than shown as equivalent facts.
 */
export function ArtistStats({
  monthlyListeners,
  totalStreams,
  spotifyFollowers,
  selfReported = true,
}: Props) {
  const stats: { label: string; value: string; unverified?: boolean }[] = [];

  if (spotifyFollowers != null && spotifyFollowers > 0) {
    stats.push({ label: 'Spotify followers', value: formatListeners(spotifyFollowers) });
  }
  if (monthlyListeners > 0) {
    stats.push({
      label: 'Monthly listeners',
      value: formatListeners(monthlyListeners),
      unverified: selfReported,
    });
  }
  if (totalStreams != null && totalStreams > 0) {
    stats.push({
      label: 'Streams',
      value: formatListeners(totalStreams),
      unverified: selfReported,
    });
  }

  if (stats.length === 0) return null;

  const anyUnverified = stats.some((s) => s.unverified);

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {stats.slice(0, 3).map((stat) => (
          <View key={stat.label} style={styles.cell}>
            <Text style={styles.value} numberOfLines={1}>
              {stat.value}
            </Text>
            <View style={styles.labelRow}>
              <Text style={styles.label} numberOfLines={1}>
                {stat.label}
              </Text>
              {stat.unverified ? (
                <Ionicons name="person-outline" size={10} color={colors.textFaint} />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      {anyUnverified ? (
        <Text style={styles.footnote}>Self-reported by the artist</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28, paddingHorizontal: H_PAD },
  row: { flexDirection: 'row' },
  cell: { flex: 1, gap: 4, minWidth: 0 },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  footnote: { marginTop: 12, fontSize: 11, color: colors.textFaint },
});

export default ArtistStats;
