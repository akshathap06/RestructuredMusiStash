import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from './text';

const c = MusiStashTheme.colors;

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Pill filter chip. Selected = solid accent with ink text. */
export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.accent : 'transparent',
          borderColor: selected ? c.accent : c.line,
        },
        pressed && !selected && { backgroundColor: c.surface },
        style,
      ]}
    >
      <AppText
        variant="label"
        color={selected ? c.onAccent : c.textMuted}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export interface ChipRowProps {
  options: string[];
  value: string | string[];
  onChange: (next: string) => void;
  /** Horizontal scroll (default) vs. wrap. */
  wrap?: boolean;
  style?: ViewStyle;
}

/** A row of filter chips — horizontally scrollable, or wrapping. */
export function ChipRow({ options, value, onChange, wrap, style }: ChipRowProps) {
  const isOn = (o: string) =>
    Array.isArray(value) ? value.includes(o) : value === o;

  const chips = options.map((o) => (
    <Chip key={o} label={o} selected={isOn(o)} onPress={() => onChange(o)} />
  ));

  if (wrap) {
    return <View style={[styles.wrap, style]}>{chips}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, style]}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  scroll: { gap: 8, paddingHorizontal: 20, paddingVertical: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
