import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';

const DISCLOSURE =
  'Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.';

type PaperDisclosureProps = {
  style?: StyleProp<TextStyle>;
  compact?: boolean;
};

export function PaperDisclosure({ style, compact = false }: PaperDisclosureProps) {
  return (
    <Text
      style={[styles.base, compact ? styles.compact : styles.full, style]}
      accessibilityRole="text"
    >
      {DISCLOSURE}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: '#8C8C93',
    lineHeight: 16,
  },
  full: {
    fontSize: 12,
  },
  compact: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default PaperDisclosure;
