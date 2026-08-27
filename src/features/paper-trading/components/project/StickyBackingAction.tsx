import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../../styles/theme';
import { PAPER_DISCLOSURE_SHORT } from '../../../artists/types/experience';
import { formatMoney } from '../../../artists/data/kalebDemo';

const c = MusiStashTheme.colors;

type StickyBackingActionProps = {
  amount: number;
  onPress: () => void;
  disabled?: boolean;
};

export function StickyBackingAction({
  amount,
  onPress,
  disabled = false,
}: StickyBackingActionProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <Text style={styles.disclosure}>{PAPER_DISCLOSURE_SHORT}</Text>
      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Back ${formatMoney(amount)}`}
        accessibilityState={{ disabled }}
      >
        <Text style={styles.btnText}>Back {formatMoney(amount)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: c.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.divider,
  },
  disclosure: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: c.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  btn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: c.accentPressed,
  },
  btnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: c.onAccent,
  },
});

export default StickyBackingAction;
