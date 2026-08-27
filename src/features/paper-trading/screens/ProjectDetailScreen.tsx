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
import { paperWalletService } from '../services/paperWalletService';
import { artistProjectService } from '../../artists/services/artistProjectService';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuccess(false);
      const loaded = await artistProjectService.getById(projectId);
      if (!cancelled) {
        setProject(loaded || seed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, seed]);

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
      setPaperBalance(result.wallet.availableBalance);
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to open paper position';
      Alert.alert('Paper backing failed', message);
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
      <ProjectHeader project={project} onBack={onBack} onShare={onShare} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.simBadge}>{PAPER_DISCLOSURE_SHORT}</Text>

        <FundingSummary
          paperBackingTotal={project.paperBackingTotal}
          fundingGoal={project.fundingGoal}
          paperBackerCount={project.paperBackerCount}
          daysRemaining={project.daysRemaining}
        />

        <DisclosureRow
          title="Paper contract"
          leftValue={`${formatMoney(project.currentPaperSharePrice)} / share`}
          rightValue={horizonLabel}
          subtitle="Simulated terms · not a real security"
          onPress={() => setContractOpen(true)}
        />

        <DisclosureRow
          title="AI analysis"
          leftValue={project.aiAnalysis.label}
          rightValue={String(project.aiAnalysis.score)}
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
  simBadge: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
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
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
});
