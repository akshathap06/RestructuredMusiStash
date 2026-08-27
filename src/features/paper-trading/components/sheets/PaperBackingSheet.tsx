import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';
import {
  PAPER_DISCLOSURE_BODY,
  PAPER_DISCLOSURE_SHORT,
} from '../../../artists/types/experience';
import { formatMoney } from '../../../artists/data/kalebDemo';
import { BottomSheetFrame } from './BottomSheetFrame';

const c = MusiStashTheme.colors;
const PRESETS = [50, 100, 250, 500, 1000] as const;

type PaperBackingSheetProps = {
  visible: boolean;
  onClose: () => void;
  project: Project;
  selectedAmount: number;
  onAmountChange: (amount: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  success: boolean;
  paperBalance?: number;
};

export function PaperBackingSheet({
  visible,
  onClose,
  project,
  selectedAmount,
  onAmountChange,
  onConfirm,
  isSubmitting,
  success,
  paperBalance,
}: PaperBackingSheetProps) {
  const [customText, setCustomText] = useState('');
  const [usingCustom, setUsingCustom] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const isPreset = (PRESETS as readonly number[]).includes(selectedAmount);
    setUsingCustom(!isPreset);
    setCustomText(isPreset ? '' : String(selectedAmount));
  }, [visible, selectedAmount]);

  const selectPreset = (n: number) => {
    setUsingCustom(false);
    setCustomText('');
    onAmountChange(n);
  };

  const onCustomChange = (text: string) => {
    setUsingCustom(true);
    setCustomText(text);
    const parsed = Number(text.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      onAmountChange(parsed);
    }
  };

  const handleConfirm = () => {
    if (isSubmitting || success || selectedAmount <= 0) return;
    onConfirm();
  };

  if (success) {
    return (
      <BottomSheetFrame visible={visible} title="Position opened" onClose={onClose}>
        <View style={styles.successBlock} accessibilityLabel="Paper backing successful">
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={36} color={c.onAccent} />
          </View>
          <Text style={styles.successTitle}>Position opened</Text>
          <Text style={styles.successBody}>
            {formatMoney(selectedAmount)} in {project.title}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFrame>
    );
  }

  return (
    <BottomSheetFrame visible={visible} title="Back project" onClose={onClose}>
      <Text style={styles.badge}>{PAPER_DISCLOSURE_SHORT}</Text>

      <View style={styles.projectRow}>
        <View style={styles.projectCopy}>
          <Text style={styles.artist}>{project.artistName}</Text>
          <Text style={styles.projectTitle} numberOfLines={2}>
            {project.title}
          </Text>
        </View>
      </View>

      {paperBalance != null ? (
        <Text style={styles.balance} accessibilityLabel={`MusiStash Cash ${formatMoney(paperBalance)}`}>
          MusiStash Cash · {formatMoney(paperBalance)}
        </Text>
      ) : null}

      <Text style={styles.sectionLabel}>Amount</Text>
      <View style={styles.presets}>
        {PRESETS.map((n) => {
          const active = !usingCustom && selectedAmount === n;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectPreset(n)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Paper back ${formatMoney(n)}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {formatMoney(n)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[styles.input, usingCustom && styles.inputActive]}
        value={customText}
        onChangeText={onCustomChange}
        onFocus={() => setUsingCustom(true)}
        placeholder="Custom amount"
        placeholderTextColor={c.textMuted}
        keyboardType="decimal-pad"
        accessibilityLabel="Custom paper backing amount"
      />

      <Text style={styles.disclosure}>{PAPER_DISCLOSURE_BODY}</Text>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (isSubmitting || selectedAmount <= 0) && styles.primaryBtnDisabled,
        ]}
        onPress={handleConfirm}
        disabled={isSubmitting || selectedAmount <= 0}
        accessibilityRole="button"
        accessibilityLabel={`Confirm paper back ${formatMoney(selectedAmount)}`}
        accessibilityState={{ disabled: isSubmitting || selectedAmount <= 0, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color={c.onAccent} />
        ) : (
          <Text style={styles.primaryBtnText}>
            Confirm · {formatMoney(selectedAmount)}
          </Text>
        )}
      </TouchableOpacity>
    </BottomSheetFrame>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: c.accent,
    backgroundColor: c.accentSoft,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  projectRow: {
    marginBottom: 12,
  },
  projectCopy: {
    gap: 4,
  },
  artist: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  balance: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 10,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  chipActive: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textSecondary,
  },
  chipTextActive: {
    color: c.textPrimary,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceElevated,
    paddingHorizontal: 14,
    fontSize: 16,
    color: c.textPrimary,
    marginBottom: 16,
  },
  inputActive: {
    borderColor: c.accent,
  },
  disclosure: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
    marginBottom: 16,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16.5,
    fontWeight: '800',
    color: c.onAccent,
  },
  successBlock: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.positive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default PaperBackingSheet;
