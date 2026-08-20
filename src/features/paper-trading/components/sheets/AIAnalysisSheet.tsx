import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import type { AIAnalysis } from '../../../artists/types/experience';
import { BottomSheetFrame } from './BottomSheetFrame';

const c = MusiStashTheme.colors;

type AIAnalysisSheetProps = {
  visible: boolean;
  onClose: () => void;
  analysis: AIAnalysis;
};

export function AIAnalysisSheet({
  visible,
  onClose,
  analysis,
}: AIAnalysisSheetProps) {
  return (
    <BottomSheetFrame visible={visible} title="AI analysis" onClose={onClose}>
      <View style={styles.scoreBlock} accessibilityLabel={`Score ${analysis.score}, ${analysis.label}`}>
        <Text style={styles.score}>{analysis.score}</Text>
        <View style={styles.scoreMeta}>
          <Text style={styles.label}>{analysis.label}</Text>
          <Text style={styles.summary}>{analysis.summary}</Text>
        </View>
      </View>

      <Text style={styles.factorsTitle}>Factors</Text>
      {analysis.factors.map((f, i) => (
        <View key={`${f.label}-${i}`} style={styles.factorRow}>
          <View style={styles.factorHeader}>
            <Text style={styles.factorLabel}>{f.label}</Text>
            <Text style={styles.factorScore}>{f.score}</Text>
          </View>
          {f.explanation ? (
            <Text style={styles.factorExplain}>{f.explanation}</Text>
          ) : null}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, f.score))}%` },
              ]}
            />
          </View>
        </View>
      ))}

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimer}>
          AI analysis is informational only and is not financial advice. Scores are
          illustrative for this paper-trading simulation.
        </Text>
      </View>
    </BottomSheetFrame>
  );
}

const styles = StyleSheet.create({
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  score: {
    fontSize: 40,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: -1,
  },
  scoreMeta: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
  factorsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 12,
  },
  factorRow: {
    marginBottom: 16,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  factorScore: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
  factorExplain: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
    marginBottom: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: c.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 2,
  },
  disclaimerBox: {
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
});

export default AIAnalysisSheet;
