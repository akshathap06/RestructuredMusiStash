import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from '../../../shared/components/ui';

const c = MusiStashTheme.colors;

type ReceiptRow = { k: string; v: string };

type Params = {
  kind?: 'back' | 'submit';
  title?: string;
  subtitle?: string;
  rows?: ReceiptRow[];
  primaryLabel?: string;
  primaryTarget?: string; // tab route name under MainTabs
};

type NavLike = {
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
  popToTop?: () => void;
};

export default function BackingReceiptScreen({
  navigation,
  route,
}: {
  navigation?: NavLike;
  route?: { params?: Params };
}) {
  const insets = useSafeAreaInsets();
  const p = route?.params ?? {};
  const kind = p.kind ?? 'back';
  const rows = p.rows ?? [];

  const title = p.title ?? (kind === 'submit' ? 'Submitted' : 'You backed it');
  const subtitle =
    p.subtitle ??
    (kind === 'submit'
      ? "We review new projects within two business days. You'll get a note when it opens for paper backing."
      : 'Your position is live in the portfolio.');
  const primaryLabel =
    p.primaryLabel ?? (kind === 'submit' ? 'View my projects' : 'View in portfolio');
  const primaryTarget = p.primaryTarget ?? (kind === 'submit' ? 'Profile' : 'Portfolio');

  const goTab = (name: string) => {
    navigation?.popToTop?.();
    if (navigation?.navigate) navigation.navigate('MainTabs', { screen: name });
    else navigation?.getParent?.()?.navigate?.('MainTabs', { screen: name });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.body}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={30} color={c.accentSolid} />
        </View>
        <AppText variant="h1" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="body" color={c.textMuted} style={styles.sub}>
          {subtitle}
        </AppText>

        <View style={styles.rows}>
          {rows.map((r, i) => (
            <View key={r.k} style={[styles.row, i > 0 && styles.rowDivider]}>
              <AppText variant="bodySmall" color={c.textMuted}>
                {r.k}
              </AppText>
              <AppText variant="bodySmall" tabular>
                {r.v}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="caption" color={c.textFaint} style={styles.disclosure}>
          Simulation only · no real money, securities, ownership, or returns.
        </AppText>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primary}
          onPress={() => goTab(primaryTarget)}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          <AppText variant="button" color={c.onAccent}>
            {primaryLabel}
          </AppText>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => goTab('Explore')}
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
        >
          <AppText variant="label" color={c.textPrimary}>
            Back to Explore
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background, paddingHorizontal: 20 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 22 },
  sub: { marginTop: 10 },
  rows: { marginTop: 28, alignSelf: 'stretch' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.listDivider },
  disclosure: { marginTop: 18, lineHeight: 16 },
  actions: { gap: 10 },
  primary: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
