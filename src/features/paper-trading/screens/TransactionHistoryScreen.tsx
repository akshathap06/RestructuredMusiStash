import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText } from '../../../shared/components/ui';
import {
  paperWalletService,
  PaperTransaction,
  PaperTransactionType,
} from '../services/paperWalletService';

const c = MusiStashTheme.colors;

type NavLike = {
  goBack?: () => void;
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
};

function money(n: number): string {
  return `$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ICON: Record<PaperTransactionType, keyof typeof Ionicons.glyphMap> = {
  INVEST: 'arrow-up-circle-outline',
  SELL: 'arrow-down-circle-outline',
  PROJECT_SETTLEMENT: 'checkmark-circle-outline',
  FAILED_PROJECT_REFUND: 'refresh-circle-outline',
  PROJECT_CANCELLATION_REFUND: 'close-circle-outline',
  PAPER_CASH_INITIALIZED: 'wallet-outline',
  ADJUSTMENT: 'ellipsis-horizontal-circle-outline',
};

function label(tx: PaperTransaction): string {
  const proj = tx.projectTitle ?? 'a project';
  switch (tx.type) {
    case 'INVEST':
      return `Backed ${proj}`;
    case 'SELL':
      return `Exited ${proj}`;
    case 'PROJECT_SETTLEMENT':
      return `Settlement · ${proj}`;
    case 'FAILED_PROJECT_REFUND':
      return `Refund · ${proj}`;
    case 'PROJECT_CANCELLATION_REFUND':
      return `Cancelled · ${proj}`;
    case 'PAPER_CASH_INITIALIZED':
      return 'MusiStash Cash granted';
    case 'ADJUSTMENT':
    default:
      return 'Adjustment';
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TransactionHistoryScreen({
  navigation,
}: {
  navigation?: NavLike;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [txns, setTxns] = useState<PaperTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      setTxns(await paperWalletService.getTransactions(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your transactions');
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const sections = useMemo(() => {
    const groups: { title: string; data: PaperTransaction[] }[] = [];
    for (const tx of txns) {
      const key = dayKey(tx.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.title === key) last.data.push(tx);
      else groups.push({ title: key, data: [tx] });
    }
    return groups;
  }, [txns]);

  const openProject = (id?: string) =>
    id && navigation?.navigate?.('ProjectDetail', { projectId: id });

  const goExplore = () => {
    const parent = navigation?.getParent?.();
    (parent?.navigate ?? navigation?.navigate)?.('MainTabs', { screen: 'Explore' });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.nav, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </Pressable>
        <AppText variant="h4" style={styles.navTitle}>
          Transaction history
        </AppText>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <AppText variant="bodySmall" color={c.negative} center>
            {error}
          </AppText>
          <Pressable style={styles.retry} onPress={load} accessibilityRole="button">
            <AppText variant="label" color={c.accent}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : txns.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={30} color={c.textFaint} />
          <AppText variant="h4" color={c.textSecondary} center style={{ marginTop: 12 }}>
            No transactions yet
          </AppText>
          <AppText
            variant="bodySmall"
            color={c.textMuted}
            center
            style={{ marginTop: 6, maxWidth: 260 }}
          >
            Back a project with MusiStash Cash and it will show up here.
          </AppText>
          <Pressable style={styles.retry} onPress={goExplore} accessibilityRole="button">
            <AppText variant="label" color={c.accent}>
              Explore projects
            </AppText>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(tx) => tx.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
            />
          }
          renderSectionHeader={({ section }) => (
            <AppText
              variant="eyebrow"
              color={c.textMuted}
              style={styles.sectionHeader}
            >
              {section.title.toUpperCase()}
            </AppText>
          )}
          renderItem={({ item }) => {
            const positive = item.amount >= 0;
            const hasUnits = item.units != null && item.price != null;
            return (
              <Pressable
                style={styles.row}
                onPress={() => openProject(item.projectId)}
                disabled={!item.projectId}
                accessibilityRole={item.projectId ? 'button' : 'text'}
                accessibilityLabel={`${label(item)}, ${positive ? 'plus' : 'minus'} ${money(
                  item.amount,
                )}`}
              >
                <View style={styles.icon}>
                  <Ionicons name={ICON[item.type]} size={20} color={c.textSecondary} />
                </View>
                <View style={styles.rowMid}>
                  <AppText variant="h4" numberOfLines={1}>
                    {label(item)}
                  </AppText>
                  <AppText variant="bodySmall" color={c.textMuted} numberOfLines={1}>
                    {hasUnits
                      ? `${item.units!.toFixed(2)} units @ $${item.price!.toFixed(4)} · ${time(
                          item.createdAt,
                        )}`
                      : time(item.createdAt)}
                  </AppText>
                </View>
                <AppText
                  variant="h4"
                  tabular
                  color={positive ? c.accentSolid : c.textPrimary}
                >
                  {`${positive ? '+' : '−'}${money(item.amount)}`}
                </AppText>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  retry: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.accentTint,
  },

  sectionHeader: { marginTop: 22, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.listDivider,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1, minWidth: 0 },
});
