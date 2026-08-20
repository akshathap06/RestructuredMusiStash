import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { PaperDisclosure } from '../components/PaperDisclosure';
import {
  paperWalletService,
  HistoryRange,
  PaperPosition,
  PortfolioHistoryPoint,
  PortfolioSummary,
} from '../services/paperWalletService';

const VIOLET = '#8B5CF6';
const RANGES: HistoryRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

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

function SimpleHistoryChart({ points }: { points: PortfolioHistoryPoint[] }) {
  if (points.length === 0) {
    return <View style={styles.chartEmpty} />;
  }

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return (
    <View style={styles.chart} accessibilityLabel="Paper portfolio chart placeholder">
      {points.map((point, index) => {
        const heightPct = ((point.v - min) / span) * 0.85 + 0.15;
        return (
          <View key={`${point.t}-${index}`} style={styles.barSlot}>
            <View style={[styles.bar, { height: `${Math.round(heightPct * 100)}%` }]} />
          </View>
        );
      })}
    </View>
  );
}

function PositionCard({ position }: { position: PaperPosition }) {
  const value = position.units * position.currentUnitPrice;
  const pnl = value - position.costBasis;
  const pnlPct = position.costBasis > 0 ? (pnl / position.costBasis) * 100 : 0;
  const pnlPositive = pnl >= 0;

  return (
    <View style={styles.positionCard}>
      <Text style={styles.positionArtist}>{position.artistName}</Text>
      <Text style={styles.positionProject}>{position.projectTitle}</Text>
      <View style={styles.positionRow}>
        <View>
          <Text style={styles.positionLabel}>Cost</Text>
          <Text style={styles.positionValue}>{formatMoney(position.costBasis)}</Text>
        </View>
        <View>
          <Text style={styles.positionLabel}>Value</Text>
          <Text style={styles.positionValue}>{formatMoney(value)}</Text>
        </View>
        <View style={styles.pnlCol}>
          <Text style={styles.positionLabel}>P&amp;L</Text>
          <Text style={[styles.positionValue, pnlPositive ? styles.gain : styles.loss]}>
            {pnlPositive ? '+' : ''}
            {formatMoney(pnl)} ({pnlPct.toFixed(1)}%)
          </Text>
        </View>
      </View>
    </View>
  );
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

  const onSelectRange = (next: HistoryRange) => {
    setRange(next);
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
        <Text style={styles.emptyText}>Sign in to view your paper portfolio</Text>
      </View>
    );
  }

  if (loading && !summary) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={VIOLET} />
      </View>
    );
  }

  const dayChange = summary?.dayChangePct ?? 0;
  const dayPositive = dayChange >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VIOLET} />
      }
    >
      <Text style={styles.heading}>Portfolio</Text>
      <Text style={styles.totalLabel}>Total value</Text>
      <Text style={styles.totalValue}>{formatMoney(summary?.total ?? 0)}</Text>
      <Text style={[styles.dayChange, dayPositive ? styles.gain : styles.loss]}>
        {dayPositive ? '+' : ''}
        {dayChange.toFixed(2)}% today
      </Text>
      <Text style={styles.cashLabel}>
        Available cash · {formatMoney(summary?.cash ?? 0)}
      </Text>

      <PaperDisclosure style={styles.disclosure} />

      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const active = r === range;
          return (
            <TouchableOpacity
              key={r}
              style={[styles.rangeChip, active && styles.rangeChipActive]}
              onPress={() => onSelectRange(r)}
              accessibilityLabel={`Select ${r} time range`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <SimpleHistoryChart points={history} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Positions</Text>
      </View>

      {positions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            The mockup screens are on the artist profile — open the Kaleb demo to see them.
          </Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={goKalebDemo}
            accessibilityLabel="Open Kaleb artist profile demo"
          >
            <Text style={styles.waitlistButtonText}>Open Kaleb profile demo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        positions.map((p) => <PositionCard key={p.id} position={p} />)
      )}

      <TouchableOpacity
        style={styles.waitlistButton}
        onPress={goWaitlist}
        accessibilityLabel="Join the waitlist"
      >
        <Text style={styles.waitlistButtonText}>Join waitlist</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C8C93',
    marginBottom: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  totalLabel: {
    fontSize: 14,
    color: '#B5B5BA',
  },
  totalValue: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FCFCFD',
    marginTop: 4,
  },
  dayChange: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  cashLabel: {
    fontSize: 14,
    color: '#B5B5BA',
    marginTop: 8,
  },
  disclosure: {
    marginTop: 16,
    marginBottom: 20,
  },
  gain: {
    color: '#10B981',
  },
  loss: {
    color: '#F87171',
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#454648',
  },
  rangeChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: VIOLET,
  },
  rangeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C8C93',
  },
  rangeChipTextActive: {
    color: VIOLET,
  },
  chart: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  chartEmpty: {
    height: 140,
    marginBottom: 24,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  bar: {
    width: '100%',
    backgroundColor: VIOLET,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    opacity: 0.85,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FCFCFD',
  },
  positionCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  positionArtist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FCFCFD',
  },
  positionProject: {
    fontSize: 13,
    color: '#B5B5BA',
    marginTop: 2,
    marginBottom: 12,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pnlCol: {
    alignItems: 'flex-end',
  },
  positionLabel: {
    fontSize: 11,
    color: '#8C8C93',
    marginBottom: 2,
  },
  positionValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FCFCFD',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#B5B5BA',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  demoButton: {
    marginTop: 8,
    alignSelf: 'stretch',
    backgroundColor: VIOLET,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  waitlistButton: {
    marginTop: 16,
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  waitlistButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
