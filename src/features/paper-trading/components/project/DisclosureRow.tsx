import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';

const c = MusiStashTheme.colors;

type DisclosureRowProps = {
  title: string;
  leftValue: string;
  rightValue?: string;
  subtitle?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function DisclosureRow({
  title,
  leftValue,
  rightValue,
  subtitle,
  onPress,
  icon = 'chevron-forward',
}: DisclosureRowProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${leftValue}${rightValue ? `. ${rightValue}` : ''}${subtitle ? `. ${subtitle}` : ''}`}
    >
      <View style={styles.top}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={icon} size={18} color={c.textMuted} />
      </View>
      <View style={styles.values}>
        <Text style={styles.leftValue}>{leftValue}</Text>
        {rightValue ? <Text style={styles.rightValue}>{rightValue}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  values: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftValue: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  rightValue: {
    fontSize: 15,
    fontWeight: '600',
    color: c.accent,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
  },
});

export default DisclosureRow;
