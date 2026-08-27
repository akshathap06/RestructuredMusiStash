import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { InteractiveLineChart, ChartPoint } from '../components/charts';
import {
  paperWalletService,
  HistoryRange,
  PaperPosition,
  PortfolioHistoryPoint,
  PortfolioSummary,
} from '../services/paperWalletService';

const c = MusiStashTheme.colors;

const RANGES: HistoryRange[] = ['1W', '1M', '3M', '1Y', 'ALL'];

const DISCLOSURE =
  'Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.';

type NavLike = {
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
};

function money(n: number, dp = 2): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;
}

function signedMoney(n: number): string {
  return `${n >= 0 ? '+' : '-'}${money(Math.abs(n))}`;
}

function scrubDate(t: number, range: HistoryRange): string {
  const d = new Date(t);
  if (range === '1D') {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PortfolioScreen({ navigation }: { navigation?: NavLike }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<HistoryRange>('1M');
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [scrubPoint, setScrubPoint] = useState<ChartPoint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      await paperWalletService.ensureWallet(user.id);
      const [nextSummary, nextPositions, nextHistory] = await Promise.all([
        paperWalletService.getPortfolioSummary(user.id),
        paperWalletService.getPositions(user.id),
        paperWalletService.getPortfolioHistory(user.id, range),
      ]);
      setSummary(nextSummary);
      setPositions(nextPositions.filter((p) => p.status === 'open'));
      setHistory(nextHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your portfolio');
    }
  }, [user?.id, range]);

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

  const goProject = (projectId: string) =>
    navigation?.navigate?.('ProjectDetail', { projectId });

  const goWaitlist = () => {
    if (navigation?.navigate) navigation.navigate('Waitlist');
    else navigation?.getParent?.()?.navigate?.('Waitlist');
  };

  const goKalebDemo = () => {
    const parent = navigation?.getParent?.();
    (parent?.navigate ?? navigation?.navigate)?.('ArtistExperience', {
      artistId: '11111111-1111-4111-8111-111111111111',
    });
  };

  if (!user?.id) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AppText variant="h4" color={c.textSecondary} center>
          Sign in to view your paper portfolio
        </AppText>
      </View>
    );
  }

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const total = summary?.total ?? 0;
  const cash = summary?.cash ?? 0;
  const deployed = summary?.positionsValue ?? 0;
  const dayChangePct = summary?.dayChangePct ?? 0;
  const dayChangeAmount = (total * dayChangePct) / 100;
  const dayPositive = dayChangeAmount >= 0;

  const headerValue = scrubPoint ? scrubPoint.v : total;
  const fundedCount = positions.length;
  const headerSub = scrubPoint
    ? scrubDate(scrubPoint.t, range)
    : `${signedMoney(dayChangeAmount)} (${dayPositive ? '+' : ''}${dayChangePct.toFixed(2)}%) Today`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      scrollEnabled={!scrubPoint}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
      }
    >
      {/* Eyebrow + PAPER / LIVE toggle */}
      <View style={styles.topRow}>
        <Eyebrow>Paper Portfolio</Eyebrow>
        <View style={styles.segment}>
          <View style={styles.segmentOn}>
            <AppText variant="eyebrow" color={c.onAccent}>PAPER</AppText>
          </View>
          <Pressable
            style={styles.segmentOff}
            onPress={goWaitlist}
            accessibilityRole="button"
            accessibilityLabel="Switch to live — join the waitlist"
          >
            <AppText variant="eyebrow" color={c.textFaint}>LIVE</AppText>
            <Ionicons name="lock-closed" size={10} color={c.textFaint} />
          </Pressable>
        </View>
      </View>

      {/* Value */}
      <View style={styles.valueRow}>
        <AppText variant="money" style={styles.value}>
          {money(headerValue)}
        </AppText>
        {!scrubPoint && (
          <AppText
            variant="h4"
            tabular
            color={dayPositive ? c.accentSolid : c.negative}
            style={styles.deltaPill}
          >
            {`${dayPositive ? '+' : ''}${dayChangePct.toFixed(2)}%`}
          </AppText>
        )}
      </View>
      <AppText
        variant="bodySmall"
        color={scrubPoint ? c.textSecondary : dayPositive ? c.accentSolid : c.negative}
        style={styles.sub}
      >
        {headerSub}
      </AppText>
      <AppText variant="bodySmall" color={c.textMuted} style={styles.sub2}>
        {`${fundedCount} position${fundedCount === 1 ? '' : 's'} · all-time paper return`}
      </AppText>

      <View style={styles.chartWrap}>
        <InteractiveLineChart
          points={history}
          height={130}
          positiveColor={c.accent}
          negativeColor={c.negative}
          onScrub={setScrubPoint}
        />
      </View>

      {/* Range */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const active = r === range;
          return (
            <Pressable
              key={r}
              style={[styles.rangeButton, active && styles.rangeButtonActive]}
              onPress={() => setRange(r)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${r} history`}
              accessibilityState={{ selected: active }}
            >
              <AppText variant="label" color={active ? c.textPrimary : c.textFaint}>
                {r}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Stat pair */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <AppText variant="eyebrow" color={c.textFaint}>BUYING POWER</AppText>
          <AppText variant="h2" tabular style={styles.statValue}>
            {money(cash, 0)}
          </AppText>
        </View>
        <View style={styles.statCard}>
          <AppText variant="eyebrow" color={c.textFaint}>DEPLOYED</AppText>
          <AppText variant="h2" tabular style={styles.statValue}>
            {money(deployed, 0)}
          </AppText>
        </View>
      </View>

      {error ? (
        <AppText variant="bodySmall" color={c.negative} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <AppText variant="eyebrow" color={c.textMuted} style={styles.positionsTitle}>
        POSITIONS
      </AppText>

      {positions.length === 0 ? (
        <View style={styles.emptyState}>
          <AppText variant="h4" color={c.textSecondary} center>
            No positions yet
          </AppText>
          <Pressable
            style={styles.demoButton}
            onPress={goKalebDemo}
            accessibilityRole="button"
            accessibilityLabel="Open the Kaleb demo project"
          >
            <AppText variant="label" color={c.accent}>Open the Kaleb demo</AppText>
          </Pressable>
        </View>
      ) : (
        positions.map((position, index) => {
          const value = position.units * position.currentUnitPrice;
          const pnl = value - position.costBasis;
          const pnlPct = position.costBasis > 0 ? (pnl / position.costBasis) * 100 : 0;
          const up = pnl >= 0;
          return (
            <Pressable
              key={position.id}
              style={[styles.positionRow, index > 0 && styles.rowDivider]}
              onPress={() => goProject(position.projectId)}
              accessibilityRole="button"
              accessibilityLabel={`${position.artistName}, ${position.projectTitle}, ${money(value)}`}
            >
              <View style={styles.positionMark}>
                <AppText variant="h4" color={c.textFaint}>
                  {(position.projectTitle || '?').charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View style={styles.positionLeft}>
                <AppText variant="h4" numberOfLines={1}>
                  {position.projectTitle}
                </AppText>
                <AppText variant="bodySmall" color={c.textMuted} numberOfLines={1}>
                  {`${position.artistName} · ${position.units.toFixed(0)} shares`}
                </AppText>
              </View>
              <View style={styles.positionRight}>
                <AppText variant="h4" tabular>
                  {money(value)}
                </AppText>
                <AppText
                  variant="bodySmall"
                  tabular
                  color={up ? c.accentSolid : c.textMuted}
                  style={styles.positionPnl}
                >
                  {`${up ? '+' : ''}${pnlPct.toFixed(1)}%`}
                </AppText>
              </View>
            </Pressable>
          );
        })
      )}

      <AppText variant="caption" color={c.textFaint} style={styles.disclosure}>
        {DISCLOSURE}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  segmentOn: {
    minHeight: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
  },
  segmentOff: {
    minHeight: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 },
  value: { color: c.textPrimary },
  deltaPill: { paddingBottom: 6 },
  sub: { marginTop: 4 },
  sub2: { marginTop: 2 },

  chartWrap: { marginTop: 16 },

  rangeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  rangeButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonActive: { backgroundColor: c.surfaceElevated },

  statGrid: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  statValue: { marginTop: 5 },

  error: { marginTop: 14 },

  positionsTitle: { marginTop: 26, marginBottom: 6 },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    minHeight: 66,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.listDivider },
  positionMark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionLeft: { flex: 1, minWidth: 0 },
  positionRight: { alignItems: 'flex-end' },
  positionPnl: { marginTop: 2 },

  emptyState: { paddingVertical: 28, alignItems: 'center' },
  demoButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.accentTint,
  },

  disclosure: { marginTop: 26, lineHeight: 16 },
});
