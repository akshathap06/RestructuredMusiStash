import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { PaperDisclosure } from '../components/PaperDisclosure';
import { paperWalletService } from '../services/paperWalletService';

const VIOLET = '#4B9CD3';
const PRESETS = [100, 250, 500, 1000, 2500] as const;

type Step = 'amount' | 'review' | 'success';

type PaperTradeParams = {
  projectId: string;
  projectTitle: string;
  artistName: string;
  fundingGoal?: number;
};

type NavLike = {
  navigate?: (name: string, params?: Record<string, unknown>) => void;
  goBack?: () => void;
  getParent?: () => NavLike | undefined;
};

type PaperTradeScreenProps = {
  navigation?: NavLike;
  route?: { params?: Partial<PaperTradeParams> };
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function PaperTradeScreen({ navigation, route }: PaperTradeScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = route?.params ?? {};

  const projectId = params.projectId ?? '';
  const projectTitle = params.projectTitle ?? 'Untitled project';
  const artistName = params.artistName ?? 'Unknown artist';
  const fundingGoal = params.fundingGoal;

  const [step, setStep] = useState<Step>('amount');
  const [preset, setPreset] = useState<number | null>(250);
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amount = useMemo(() => {
    if (preset != null) return preset;
    const parsed = Number(customText.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [preset, customText]);

  const canContinue = amount > 0 && !!projectId && !!user?.id;

  const goPortfolio = () => {
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate('MainTabs', { screen: 'Portfolio' });
      return;
    }
    navigation?.navigate?.('Portfolio');
    navigation?.navigate?.('MainTabs', { screen: 'Portfolio' });
  };

  const onConfirm = async () => {
    if (!user?.id || !canContinue) return;
    setSubmitting(true);
    try {
      await paperWalletService.openPosition(user.id, {
        projectId,
        projectTitle,
        artistName,
        notional: amount,
      });
      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open paper position';
      Alert.alert('Paper trade failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Missing project details for paper trade</Text>
        <PaperDisclosure style={styles.disclosure} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>Paper trade</Text>
      <Text style={styles.title}>{projectTitle}</Text>
      <Text style={styles.subtitle}>{artistName}</Text>
      {fundingGoal != null && (
        <Text style={styles.goal}>Funding goal · {formatMoney(fundingGoal)}</Text>
      )}

      <PaperDisclosure style={styles.disclosure} compact={step !== 'amount'} />

      {step === 'amount' && (
        <View>
          <Text style={styles.sectionTitle}>Choose amount</Text>
          <View style={styles.presetRow}>
            {PRESETS.map((value) => {
              const active = preset === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => {
                    setPreset(value);
                    setCustomText('');
                  }}
                  accessibilityLabel={`Select ${value} dollars`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {formatMoney(value)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.customLabel}>Custom amount</Text>
          <TextInput
            style={styles.input}
            value={customText}
            onChangeText={(text) => {
              setCustomText(text);
              setPreset(null);
            }}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor="#6B7280"
            accessibilityLabel="Custom paper trade amount"
          />

          <TouchableOpacity
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            disabled={!canContinue}
            onPress={() => setStep('review')}
            accessibilityLabel="Review paper trade"
          >
            <Text style={styles.primaryButtonText}>Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'review' && (
        <View>
          <Text style={styles.sectionTitle}>Confirm paper backing</Text>
          <View style={styles.reviewCard}>
            <Row label="Artist" value={artistName} />
            <Row label="Project" value={projectTitle} />
            <Row label="Amount" value={formatMoney(amount)} />
            <Row label="Unit price" value="$1.00" />
            <Row label="Units" value={amount.toFixed(2)} />
          </View>
          <Text style={styles.simNote}>
            This is a simulated trade. No payment method is required or charged.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            disabled={submitting}
            onPress={onConfirm}
            accessibilityLabel="Confirm paper trade"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('amount')}
            disabled={submitting}
            accessibilityLabel="Go back to amount selection"
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'success' && (
        <View style={styles.successBlock}>
          <Text style={styles.successTitle}>Paper position opened</Text>
          <Text style={styles.successBody}>
            You paper-backed {artistName} with {formatMoney(amount)}. View it in your portfolio.
          </Text>
          <PaperDisclosure style={styles.disclosure} compact />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={goPortfolio}
            accessibilityLabel="View paper portfolio"
          >
            <Text style={styles.primaryButtonText}>View portfolio</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: VIOLET,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FCFCFD',
  },
  subtitle: {
    fontSize: 16,
    color: '#B5B5BA',
    marginTop: 4,
  },
  goal: {
    fontSize: 13,
    color: '#8C8C93',
    marginTop: 8,
  },
  disclosure: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FCFCFD',
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#454648',
  },
  presetChipActive: {
    borderColor: VIOLET,
    backgroundColor: 'rgba(75, 156, 211, 0.2)',
  },
  presetText: {
    color: '#B5B5BA',
    fontWeight: '600',
    fontSize: 14,
  },
  presetTextActive: {
    color: '#FCFCFD',
  },
  customLabel: {
    fontSize: 13,
    color: '#8C8C93',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#454648',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: VIOLET,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#454648',
  },
  secondaryButtonText: {
    color: '#FCFCFD',
    fontSize: 16,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowLabel: {
    color: '#8C8C93',
    fontSize: 14,
  },
  rowValue: {
    color: '#FCFCFD',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  simNote: {
    color: '#B5B5BA',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  muted: {
    color: '#B5B5BA',
    fontSize: 15,
    textAlign: 'center',
  },
  successBlock: {
    marginTop: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FCFCFD',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 15,
    color: '#B5B5BA',
    lineHeight: 22,
  },
});
