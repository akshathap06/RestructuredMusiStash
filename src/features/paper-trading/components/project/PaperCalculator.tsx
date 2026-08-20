import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';
import {
  calcIllustrativeValue,
  formatMoney,
} from '../../../artists/data/kalebDemo';

const c = MusiStashTheme.colors;
const AMOUNTS = [50, 100, 250, 500, 1000] as const;

type PaperCalculatorProps = {
  project: Project;
  amount: number;
  weeks: number;
  onAmountChange: (amount: number) => void;
  onWeeksChange: (weeks: number) => void;
};

type PickerKind = 'amount' | 'weeks' | null;

export function PaperCalculator({
  project,
  amount,
  weeks,
  onAmountChange,
  onWeeksChange,
}: PaperCalculatorProps) {
  const [picker, setPicker] = useState<PickerKind>(null);

  const target = useMemo(
    () =>
      project.scenarioTargets.find((t) => t.weeks === weeks) ??
      project.scenarioTargets[0],
    [project.scenarioTargets, weeks],
  );

  const illustrative = useMemo(() => {
    if (!target) return 0;
    return calcIllustrativeValue(
      amount,
      project.currentPaperSharePrice,
      target.targetPaperSharePrice,
    );
  }, [amount, project.currentPaperSharePrice, target]);

  const weeksLabel = target?.label ?? `${weeks} weeks`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} accessibilityRole="header">
        Paper calculator
      </Text>

      <View style={styles.selectors}>
        <Selector
          label="Amount"
          value={formatMoney(amount)}
          onPress={() => setPicker('amount')}
          accessibilityLabel={`Select amount, currently ${formatMoney(amount)}`}
        />
        <Selector
          label="Horizon"
          value={weeksLabel}
          onPress={() => setPicker('weeks')}
          accessibilityLabel={`Select horizon, currently ${weeksLabel}`}
        />
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>Illustrative paper value</Text>
        <Text
          style={styles.resultValue}
          accessibilityLabel={`Illustrative paper value ${formatMoney(illustrative, false)}`}
        >
          {formatMoney(illustrative, false)}
        </Text>
        <Text style={styles.resultHint}>
          At {formatMoney(project.currentPaperSharePrice)} →{' '}
          {target ? formatMoney(target.targetPaperSharePrice, false) : '—'} over{' '}
          {weeksLabel}
        </Text>
      </View>

      <Modal
        visible={picker != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setPicker(null)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss picker"
        >
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>
              {picker === 'amount' ? 'Select amount' : 'Select horizon'}
            </Text>
            {picker === 'amount' ? (
              <FlatList
                data={[...AMOUNTS]}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => {
                      onAmountChange(item);
                      setPicker(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={formatMoney(item)}
                    accessibilityState={{ selected: item === amount }}
                  >
                    <Text
                      style={[
                        styles.pickerRowText,
                        item === amount && styles.pickerRowActive,
                      ]}
                    >
                      {formatMoney(item)}
                    </Text>
                    {item === amount ? (
                      <Ionicons name="checkmark" size={20} color={c.accent} />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={project.scenarioTargets}
                keyExtractor={(item) => String(item.weeks)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() => {
                      onWeeksChange(item.weeks);
                      setPicker(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: item.weeks === weeks }}
                  >
                    <Text
                      style={[
                        styles.pickerRowText,
                        item.weeks === weeks && styles.pickerRowActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.weeks === weeks ? (
                      <Ionicons name="checkmark" size={20} color={c.accent} />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Selector({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      style={styles.selector}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorValueRow}>
        <Text style={styles.selectorValue}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 14,
  },
  selectors: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  selector: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  selectorLabel: {
    fontSize: 12,
    color: c.textMuted,
    marginBottom: 6,
  },
  selectorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  resultCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  resultLabel: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: c.positive,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  resultHint: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '50%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerRowText: {
    fontSize: 16,
    color: c.textSecondary,
  },
  pickerRowActive: {
    color: c.textPrimary,
    fontWeight: '600',
  },
});

export default PaperCalculator;
