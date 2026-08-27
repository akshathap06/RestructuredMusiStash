import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from './text';

const c = MusiStashTheme.colors;

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Ionicons name for the leading icon chip. */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Trailing value text (right-aligned, tabular). */
  value?: string;
  valueColor?: string;
  /** Show a chevron on the right. Defaults to true when `onPress` is set. */
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  first?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  rightElement?: React.ReactNode;
}

/**
 * Hairline-separated list row (never boxed). ≥56pt tall, 44pt+ touch target.
 * Optional leading icon chip, trailing value or chevron or custom element.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  value,
  valueColor,
  chevron,
  onPress,
  destructive,
  first,
  style,
  accessibilityLabel,
  rightElement,
}: ListRowProps) {
  const showChevron = chevron ?? !!onPress;
  const titleColor = destructive ? c.negative : c.textPrimary;
  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        !first && styles.divider,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.iconChip, { backgroundColor: c.accentTint }]}>
          <Ionicons
            name={icon}
            size={19}
            color={iconColor ?? (destructive ? c.negative : c.accentLight)}
          />
        </View>
      ) : null}

      <View style={styles.body}>
        <AppText variant="h4" color={titleColor}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={c.textMuted} style={styles.sub}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {rightElement}

      {value ? (
        <AppText
          variant="h4"
          tabular
          color={valueColor ?? c.textMuted}
          style={styles.value}
        >
          {value}
        </AppText>
      ) : null}

      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={17}
          color={destructive ? c.negative : c.textFaint}
        />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.listDivider },
  pressed: { backgroundColor: c.surface },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  sub: { marginTop: 2 },
  value: { marginRight: 2 },
});
