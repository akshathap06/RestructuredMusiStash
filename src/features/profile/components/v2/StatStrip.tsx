import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './tokens';

export type StatItem = {
  label: string;
  value: string;
};

type Props = {
  items: StatItem[];
};

export default function StatStrip({ items }: Props) {
  return (
    <View style={styles.strip}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <View style={styles.divider} />}
          <View style={styles.cell}>
            <Text style={styles.value} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingVertical: 16,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
