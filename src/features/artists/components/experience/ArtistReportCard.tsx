import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import type { ArtistReport } from '../../types/experience';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

/**
 * A read on the artist derived from the metrics we can verify — Spotify reach
 * and popularity, catalogue depth, genre range. Self-reported numbers are
 * deliberately not part of the score, so it cannot be inflated by typing a
 * bigger number into the onboarding form.
 */
export function ArtistReportCard({ report }: { report: ArtistReport }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>ARTIST REPORT</Text>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{`${report.score} · ${report.label}`}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{report.summary}</Text>

      <View style={styles.grid}>
        {report.factors.map((f) => (
          <View key={f.label} style={styles.factor}>
            <Text style={styles.factorLabel}>{f.label.toUpperCase()}</Text>
            <Text style={styles.factorValue} numberOfLines={1}>
              {f.value}
            </Text>
            <Text style={styles.factorDetail} numberOfLines={2}>
              {f.detail}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Computed from verified metrics only — self-reported figures are excluded.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 32,
    marginHorizontal: H_PAD,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accentTint,
  },
  scoreText: { fontSize: 12, fontWeight: '800', color: colors.accentSolid },
  summary: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  grid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  factor: { width: '50%', paddingRight: 12 },
  factorLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textFaint,
  },
  factorValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  factorDetail: { marginTop: 2, fontSize: 11.5, lineHeight: 16, color: colors.textMuted },
  footnote: { marginTop: 14, fontSize: 11, color: colors.textFaint, lineHeight: 15 },
});

export default ArtistReportCard;
