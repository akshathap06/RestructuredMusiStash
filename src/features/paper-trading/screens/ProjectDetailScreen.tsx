import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';
import { useAuth } from '../../auth/AuthContext';
import {
  KALEB_PROJECT_ID,
  formatMoney,
  kalebProject,
} from '../../artists/data/kalebDemo';
import type { Project } from '../../artists/types/experience';
import { PAPER_DISCLOSURE_SHORT } from '../../artists/types/experience';
import { paperWalletService, PaperPosition } from '../services/paperWalletService';
import { watchlistService } from '../services/watchlistService';
import { artistProjectService } from '../../artists/services/artistProjectService';
import { statusLabel, statusTone, canExit } from '../domain/projectLifecycle';
import { positionPnl, projectedExitProceeds } from '../domain/pricing';
import { analytics } from '../../../services/analytics';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { InteractiveLineChart } from '../components/charts';
import { ProjectHeader } from '../components/project/ProjectHeader';
import { FundingSummary } from '../components/project/FundingSummary';
import { DisclosureRow } from '../components/project/DisclosureRow';
import { ProjectStory } from '../components/project/ProjectStory';
import { PaperCalculator } from '../components/project/PaperCalculator';
import { StickyBackingAction } from '../components/project/StickyBackingAction';
import { PaperContractSheet } from '../components/sheets/PaperContractSheet';
import { ProjectPlanSheet } from '../components/sheets/ProjectPlanSheet';
import { AIAnalysisSheet } from '../components/sheets/AIAnalysisSheet';
import { PaperBackingSheet } from '../components/sheets/PaperBackingSheet';

const c = MusiStashTheme.colors;

const toneColor = (t: 'accent' | 'positive' | 'negative' | 'muted'): string =>
  t === 'positive' ? c.accentSolid : t === 'negative' ? c.negative : t === 'accent' ? c.accent : c.textMuted;

type NavLike = {
  goBack?: () => void;
  navigate?: (name: string, params?: Record<string, unknown>) => void;
};

type ProjectDetailScreenProps = {
  navigation?: NavLike;
  route?: { params?: { projectId?: string } };
};

function resolveProject(projectId?: string): Project | null {
  // Sync fallback for demo only; async load happens in effect
  if (!projectId || projectId === KALEB_PROJECT_ID) {
    return { ...kalebProject };
  }
  return null;
}

export default function ProjectDetailScreen({
  navigation,
  route,
}: ProjectDetailScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const projectId = route?.params?.projectId ?? KALEB_PROJECT_ID;

  const seed = useMemo(() => resolveProject(projectId), [projectId]);

  const [project, setProject] = useState<Project | null>(seed);
  const [amount, setAmount] = useState(100);
  const [weeks, setWeeks] = useState(12);
  const [paperBalance, setPaperBalance] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [contractOpen, setContractOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [backingOpen, setBackingOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ t: number; v: number }[]>([]);
  const [myPosition, setMyPosition] = useState<PaperPosition | null>(null);
  const [exiting, setExiting] = useState(false);
  const [watched, setWatched] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuccess(false);
      const loaded = await artistProjectService.getById(projectId);
      if (cancelled) return;
      setProject(loaded || seed);
      analytics.track('project_view', { project_id: projectId });
      if (loaded) {
        artistProjectService.repriceIfStale(loaded);
        artistProjectService
          .getPriceHistory(loaded.id)
          .then((h) => !cancelled && setPriceHistory(h))
          .catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, seed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const open = await paperWalletService.getPositions(user.id);
        if (!cancelled) {
          setMyPosition(open.find((p) => p.projectId === projectId) ?? null);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, projectId, success]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setWatched(false);
        return;
      }
      try {
        const w = await watchlistService.isWatched(projectId);
        if (!cancelled) setWatched(w);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, projectId]);

  const onToggleWatch = useCallback(async () => {
    if (!user?.id || watchBusy) return;
    setWatchBusy(true);
    const next = !watched;
    setWatched(next); // optimistic
    try {
      const confirmed = await watchlistService.toggle(projectId);
      setWatched(confirmed);
    } catch (err) {
      setWatched(!next); // revert
      Alert.alert(
        'Could not update saved',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setWatchBusy(false);
    }
  }, [user?.id, watchBusy, watched, projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setPaperBalance(undefined);
        return;
      }
      try {
        const wallet = await paperWalletService.ensureWallet(user.id);
        if (!cancelled) setPaperBalance(wallet.availableBalance);
      } catch {
        if (!cancelled) setPaperBalance(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onBack = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  const onShare = useCallback(async () => {
    if (!project) return;
    try {
      await Share.share({
        message: `${project.title} by ${project.artistName} — paper trading on MusiStash`,
      });
    } catch {
      // user dismissed
    }
  }, [project]);

  const openBacking = () => {
    setSuccess(false);
    setBackingOpen(true);
    analytics.track('invest_started', { project_id: projectId, amount });
  };

  const onExit = async () => {
    if (!project || !myPosition || exiting) return;
    const est = projectedExitProceeds(myPosition.units, project.currentPaperSharePrice);
    Alert.alert(
      'Exit position',
      `Sell ${myPosition.units.toFixed(2)} units of ${project.title} at the current model price minus a 2% spread — about ${formatMoney(est)} back to MusiStash Cash.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            setExiting(true);
            try {
              const res = await paperWalletService.exitPosition(project.id);
              analytics.track('position_sold', {
                project_id: project.id,
                proceeds: res.position.proceeds ?? undefined,
              });
              setMyPosition(null);
              navigation?.navigate?.('BackingReceipt', {
                kind: 'submit',
                title: 'Position closed',
                subtitle: `${project.title} — proceeds returned to MusiStash Cash.`,
                primaryLabel: 'View portfolio',
                primaryTarget: 'Portfolio',
                rows: [
                  { k: 'Units sold', v: (res.position.units ?? myPosition.units).toFixed(2) },
                  { k: 'Exit price', v: formatMoney(res.position.exitPrice ?? 0) },
                  { k: 'Proceeds', v: formatMoney(res.position.proceeds ?? 0) },
                  {
                    k: 'Realized P&L',
                    v: `${(res.position.realizedPnl ?? 0) >= 0 ? '+' : ''}${formatMoney(res.position.realizedPnl ?? 0)}`,
                  },
                ],
              });
            } catch (err) {
              Alert.alert(
                'Could not exit',
                err instanceof Error ? err.message : 'Please try again.',
              );
            } finally {
              setExiting(false);
            }
          },
        },
      ],
    );
  };

  const onConfirmBacking = async () => {
    if (!project || !user?.id || isSubmitting || success) return;
    if (!(amount > 0)) return;

    setIsSubmitting(true);
    try {
      await paperWalletService.ensureWallet(user.id);
      const result = await paperWalletService.openPosition(user.id, {
        projectId: project.id,
        projectTitle: project.title,
        artistName: project.artistName,
        notional: amount,
      });
      const balanceAfter = result.wallet.availableBalance;
      setPaperBalance(balanceAfter);
      // Backing totals are updated atomically inside rpc_open_paper_position;
      // reflect it optimistically here.
      setProject((prev) =>
        prev
          ? {
              ...prev,
              paperBackingTotal: prev.paperBackingTotal + amount,
              paperBackerCount: prev.paperBackerCount + 1,
            }
          : prev,
      );
      setSuccess(true);
      setBackingOpen(false);
      const shares = amount / (project.currentPaperSharePrice || 10);
      navigation?.navigate?.('BackingReceipt', {
        kind: 'back',
        subtitle: `${project.title} by ${project.artistName}. Your position is live in the portfolio.`,
        rows: [
          { k: 'Amount', v: formatMoney(amount) },
          { k: 'Paper shares', v: String(Math.round(shares * 100) / 100) },
          { k: 'Share price', v: formatMoney(project.currentPaperSharePrice || 10) },
          { k: 'Term', v: `${weeks} weeks` },
          { k: 'Balance', v: formatMoney(balanceAfter) },
        ],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to open paper position';
      Alert.alert('Could not back project', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.notFoundTitle}>Project not found</Text>
        <Text style={styles.notFoundBody}>
          We couldn&apos;t find a project for that id.
        </Text>
        <TouchableOpacity
          style={styles.notFoundBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.notFoundBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const horizonLabel =
    project.scenarioTargets.find((t) => t.weeks === weeks)?.label ??
    `${weeks} weeks`;

  return (
    <View style={styles.root}>
      <ProjectHeader
        project={project}
        onBack={onBack}
        onShare={onShare}
        onBookmark={user?.id ? onToggleWatch : undefined}
        isBookmarked={watched}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.badgeRow}>
          <Text style={styles.simBadge} numberOfLines={1}>
            {PAPER_DISCLOSURE_SHORT}
          </Text>
          <View
            style={[
              styles.statusPill,
              { borderColor: toneColor(statusTone(project.status)) },
            ]}
          >
            <AppText variant="eyebrow" color={toneColor(statusTone(project.status))}>
              {statusLabel(project.status).toUpperCase()}
            </AppText>
          </View>
        </View>

        {/* Current model price + history (distinct from funding progress) */}
        <View style={styles.priceBlock}>
          <Eyebrow color={c.textFaint}>CURRENT MODEL PRICE</Eyebrow>
          <View style={styles.priceRow}>
            <AppText variant="money" tabular color={c.accentSolid}>
              {formatMoney(project.currentPaperSharePrice)}
            </AppText>
            <AppText variant="bodySmall" color={c.textMuted} style={{ paddingBottom: 6 }}>
              {`per unit · start ${formatMoney(project.initialPrice)}`}
            </AppText>
          </View>
          {priceHistory.length >= 2 && (
            <View style={styles.spark}>
              <InteractiveLineChart
                points={priceHistory}
                height={96}
                positiveColor={c.accent}
                negativeColor={c.negative}
              />
            </View>
          )}
        </View>

        <FundingSummary
          paperBackingTotal={project.paperBackingTotal}
          fundingGoal={project.fundingGoal}
          paperBackerCount={project.paperBackerCount}
          daysRemaining={project.daysRemaining}
        />

        {myPosition && (
          <View style={styles.holdingCard}>
            <View style={{ flex: 1 }}>
              <Eyebrow color={c.textFaint}>YOUR POSITION</Eyebrow>
              <AppText variant="h4" tabular style={{ marginTop: 4 }}>
                {`${myPosition.units.toFixed(2)} units · ${formatMoney(
                  positionPnl(myPosition.units, myPosition.costBasis, project.currentPaperSharePrice).value,
                )}`}
              </AppText>
              <AppText
                variant="bodySmall"
                tabular
                color={
                  positionPnl(myPosition.units, myPosition.costBasis, project.currentPaperSharePrice).pnl >= 0
                    ? c.accentSolid
                    : c.negative
                }
              >
                {(() => {
                  const p = positionPnl(
                    myPosition.units,
                    myPosition.costBasis,
                    project.currentPaperSharePrice,
                  );
                  return `${p.pnl >= 0 ? '+' : ''}${formatMoney(p.pnl)} (${p.pct >= 0 ? '+' : ''}${p.pct.toFixed(1)}%)`;
                })()}
              </AppText>
            </View>
            {canExit(project.status) && (
              <TouchableOpacity
                style={styles.exitBtn}
                onPress={onExit}
                disabled={exiting}
                accessibilityRole="button"
                accessibilityLabel="Exit position"
              >
                <AppText variant="label" color={c.textPrimary}>
                  {exiting ? 'Exiting…' : 'Exit'}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        <DisclosureRow
          title="Paper contract"
          leftValue={`${formatMoney(project.currentPaperSharePrice)} / unit`}
          rightValue={horizonLabel}
          subtitle="Simulated terms · not a real security"
          onPress={() => setContractOpen(true)}
        />

        <DisclosureRow
          title="AI analysis"
          leftValue={project.aiAnalysis.label}
          rightValue={String(project.aiAnalysis.momentumScore ?? project.aiAnalysis.score)}
          subtitle={project.aiAnalysis.summary}
          onPress={() => setAiOpen(true)}
        />

        <ProjectStory
          project={project}
          onSeeFullPlan={() => setPlanOpen(true)}
        />

        <PaperCalculator
          project={project}
          amount={amount}
          weeks={weeks}
          onAmountChange={setAmount}
          onWeeksChange={setWeeks}
        />

        <View style={{ height: 24 }} />
      </ScrollView>

      <StickyBackingAction
        amount={amount}
        onPress={openBacking}
        disabled={!user?.id}
      />

      <PaperContractSheet
        visible={contractOpen}
        onClose={() => setContractOpen(false)}
        project={project}
      />
      <ProjectPlanSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        project={project}
      />
      <AIAnalysisSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        analysis={project.aiAnalysis}
      />
      <PaperBackingSheet
        visible={backingOpen}
        onClose={() => {
          setBackingOpen(false);
          setSuccess(false);
        }}
        project={project}
        selectedAmount={amount}
        onAmountChange={setAmount}
        onConfirm={onConfirmBacking}
        isSubmitting={isSubmitting}
        success={success}
        paperBalance={paperBalance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  statusPill: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  priceBlock: { marginHorizontal: 16, marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  spark: { marginTop: 12 },
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  exitBtn: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBadge: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: c.textMuted,
  },
  notFound: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  notFoundBody: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  notFoundBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.accent,
  },
  notFoundBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    fontWeight: '800',
    color: c.onAccent,
  },
});
