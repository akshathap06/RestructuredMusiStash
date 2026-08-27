import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';

const c = MusiStashTheme.colors;
const t = MusiStashTheme.typography;

type Variant =
  | 'display'
  | 'money'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'eyebrow';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  /** Tabular figures — always on for `money`. */
  tabular?: boolean;
  center?: boolean;
}

/**
 * Themed text. Defaults to body copy in the primary colour. Pick a `variant`
 * for the "Paper Mobile" type scale; override `color` with a token value.
 */
export function AppText({
  variant = 'body',
  color,
  tabular,
  center,
  style,
  ...rest
}: AppTextProps) {
  const useTabular = tabular ?? variant === 'money';
  return (
    <Text
      {...rest}
      style={[
        t[variant],
        { color: color ?? c.textPrimary },
        useTabular && styles.tabular,
        center && styles.center,
        style,
      ]}
    />
  );
}

/** Uppercase 11/700/.16em label — section kickers, stat captions. */
export function Eyebrow({ color, style, ...rest }: AppTextProps) {
  return (
    <AppText
      variant="eyebrow"
      color={color ?? c.textMuted}
      {...rest}
      style={[styles.upper, style]}
    />
  );
}

/** Section heading: small caps eyebrow style used above list groups. */
export function SectionTitle({ color, style, ...rest }: AppTextProps) {
  return (
    <AppText
      variant="eyebrow"
      color={color ?? c.textMuted}
      {...rest}
      style={[styles.upper, styles.sectionTitle, style]}
    />
  );
}

/** Oversized tabular money readout. */
export function MoneyText({ style, ...rest }: AppTextProps) {
  return <AppText variant="money" tabular {...rest} style={style} />;
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  upper: { textTransform: 'uppercase' },
  sectionTitle: { marginBottom: 8 },
});
