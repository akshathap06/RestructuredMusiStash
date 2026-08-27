import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import { formatMoney } from '../../../artists/data/kalebDemo';

const c = MusiStashTheme.colors;

type FundingSummaryProps = {
  paperBackingTotal: number;
  fundingGoal: number;
  paperBackerCount: number;
  daysRemaining: number;
};

export function FundingSummary({
  paperBackingTotal,
  fundingGoal,
  paperBackerCount,
  daysRemaining,
}: FundingSummaryProps) {
  const progress = Math.min(1, fundingGoal > 0 ? paperBackingTotal / fundingGoal : 0);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    widthAnim.setValue(0);
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  const fillWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const backersLabel =
    paperBackerCount === 1
      ? '1 backer'
      : `${paperBackerCount.toLocaleString()} backers`;
  const daysLabel =
    daysRemaining === 1 ? '1 day left' : `${daysRemaining} days left`;

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={`${formatMoney(paperBackingTotal)} of ${formatMoney(fundingGoal)} raised. ${backersLabel}. ${daysLabel}`}
    >
      <View style={styles.amountRow}>
        <Text style={styles.raised}>{formatMoney(paperBackingTotal)}</Text>
        <Text style={styles.goal}> of {formatMoney(fundingGoal)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <Text style={styles.meta}>
        {backersLabel} · {daysLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  raised: {
    fontSize: 30,
    fontWeight: '700',
    color: c.accent,
    letterSpacing: -0.5,
  },
  goal: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textSecondary,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: c.progressTrack,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 3,
  },
  meta: {
    fontSize: 13,
    color: c.textMuted,
  },
});

export default FundingSummary;
