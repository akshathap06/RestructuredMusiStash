import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import { InteractiveLineChart, ChartPoint } from '../components/charts';
import {
  paperWalletService,
  HistoryRange,
  PaperPosition,
  PortfolioHistoryPoint,
  PortfolioSummary,
} from '../services/paperWalletService';

const C = {
  background: MusiStashTheme.colors.background,
  surface: MusiStashTheme.colors.surface,
  borderSubtle: MusiStashTheme.colors.borderSubtle,
  textPrimary: MusiStashTheme.colors.textPrimary,
  textSecondary: MusiStashTheme.colors.textSecondary,
  textMuted: MusiStashTheme.colors.textMuted,
  accent: MusiStashTheme.colors.accent,
  accentSoft: 'rgba(139,92,246,0.15)',
  positive: MusiStashTheme.colors.positive,
  negative: '#EF4444',
};

const RANGES: HistoryRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

const DISCLOSURE =
  'Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.';

type NavLike = {
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
};

type PortfolioScreenProps = {
  navigation?: NavLike;
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedMoney(n: number): string {
  return `${n >= 0 ? '+' : '-'}${formatMoney(Math.abs(n))}`;
}

function formatScrubDate(t: number, range: HistoryRange): string {
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

export default function PortfolioScreen({ navigation }: PortfolioScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<HistoryRange>('1M');
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [scrubPoint, setScrubPoint] = useState<ChartPoint | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    await paperWalletService.ensureWallet(user.id);
    const [nextSummary, nextPositions, nextHistory] = await Promise.all([
      paperWalletService.getPortfolioSummary(user.id),
      paperWalletService.getPositions(user.id),
      paperWalletService.getPortfolioHistory(user.id, range),
    ]);
    setSummary(nextSummary);
    setPositions(nextPositions.filter((p) => p.status === 'open'));
    setHistory(nextHistory);
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

  const goProject = (projectId: string) => {
    navigation?.navigate?.('ProjectDetail', { projectId });
  };

  const goWaitlist = () => {
    if (navigation?.navigate) {
      navigation.navigate('Waitlist');
      return;
    }
    navigation?.getParent?.()?.navigate?.('Waitlist');
  };

  const goKalebDemo = () => {
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate('ArtistExperience', { artistId: 'artist_kaleb' });
      return;
    }
    navigation?.navigate?.('ArtistExperience', { artistId: 'artist_kaleb' });
  };

  if (!user?.id) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyTitle}>Sign in to view your paper portfolio</Text>
      </View>
    );
  }

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const total = summary?.total ?? 0;
  const dayChangePct = summary?.dayChangePct ?? 0;
  const dayChangeAmount = (total * dayChangePct) / 100;
  const dayPositive = dayChangeAmount >= 0;
  const changeColor = dayPositive ? C.positive : C.negative;

  const headerValue = scrubPoint ? scrubPoint.v : total;
  const headerSub = scrubPoint
    ? formatScrubDate(scrubPoint.t, range)
    : `${formatSignedMoney(dayChangeAmount)} (${dayPositive ? '+' : ''}${dayChangePct.toFixed(
        2
      )}%) Today`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      scrollEnabled={!scrubPoint}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.totalValue}>{formatMoney(headerValue)}</Text>
        <Text style={[styles.changeLine, { color: scrubPoint ? C.textSecondary : changeColor }]}>
          {headerSub}
        </Text>
      </View>

      <InteractiveLineChart
        points={history}
        height={190}
        positiveColor={C.positive}
        negativeColor={C.negative}
        onScrub={setScrubPoint}
      />

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
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.buyingPowerRow}
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel={`Buying power ${formatMoney(summary?.cash ?? 0)}`}
      >
        <Text style={styles.buyingPowerLabel}>Buying power</Text>
        <Text style={styles.buyingPowerValue}>{formatMoney(summary?.cash ?? 0)}</Text>
      </Pressable>

      <Text style={styles.disclosure}>{DISCLOSURE}</Text>

      <Text style={styles.sectionTitle}>Positions</Text>

      {positions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No positions yet</Text>
          <Pressable
            style={styles.demoButton}
            onPress={goKalebDemo}
            accessibilityRole="button"
            accessibilityLabel="Open Kaleb demo"
          >
            <Text style={styles.demoButtonText}>Open Kaleb demo</Text>
          </Pressable>
        </View>
      ) : (
        positions.map((position, index) => {
          const value = position.units * position.currentUnitPrice;
          const pnl = value - position.costBasis;
          const pnlPct = position.costBasis > 0 ? (pnl / position.costBasis) * 100 : 0;
          const positive = pnl >= 0;
          return (
            <View key={position.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                style={styles.positionRow}
                onPress={() => goProject(position.projectId)}
                accessibilityRole="button"
                accessibilityLabel={`${position.artistName}, ${position.projectTitle}, ${formatMoney(
                  value
                )}`}
              >
                <View style={styles.positionLeft}>
                  <Text style={styles.positionArtist}>{position.artistName}</Text>
                  <Text style={styles.positionProject}>{position.projectTitle}</Text>
                </View>
                <View style={styles.positionRight}>
                  <Text style={styles.positionValue}>{formatMoney(value)}</Text>
                  <Text
                    style={[styles.positionPnl, { color: positive ? C.positive : C.negative }]}
                  >
                    {positive ? '+' : ''}
                    {pnlPct.toFixed(2)}%
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })
      )}

      <Pressable
        style={styles.waitlistRow}
        onPress={goWaitlist}
        accessibilityRole="button"
        accessibilityLabel="Join real-money waitlist"
      >
        <Text style={styles.waitlistText}>Join real-money waitlist</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginTop: 8,
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  changeLine: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
  },
  rangeButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonActive: {
    backgroundColor: C.accentSoft,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  rangeTextActive: {
    color: C.accent,
  },
  buyingPowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buyingPowerLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
  buyingPowerValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  disclosure: {
    fontSize: 11,
    lineHeight: 15,
    color: C.textMuted,
    marginTop: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 4,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  positionLeft: {
    flex: 1,
    paddingRight: 12,
  },
  positionArtist: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  positionProject: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  positionRight: {
    alignItems: 'flex-end',
  },
  positionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  positionPnl: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.borderSubtle,
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
  },
  demoButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
  waitlistRow: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  waitlistText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
});
