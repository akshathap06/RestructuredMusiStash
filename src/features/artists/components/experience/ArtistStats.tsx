import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import { formatListeners } from '../../data/kalebDemo';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  monthlyListeners: number;
  totalStreams?: number;
};

export function ArtistStats({ monthlyListeners, totalStreams }: Props) {
  const stats: { label: string; value: string }[] = [
    { label: 'Monthly listeners', value: formatListeners(monthlyListeners) },
  ];
  if (totalStreams != null) {
    stats.push({ label: 'Streams', value: formatListeners(totalStreams) });
  }

  return (
    <View style={styles.section}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.cell}>
          <Text style={styles.value} numberOfLines={1}>
            {stat.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default ArtistStats;
