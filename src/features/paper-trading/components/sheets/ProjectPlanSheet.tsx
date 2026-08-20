import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';
import { formatMoney } from '../../../artists/data/kalebDemo';
import { BottomSheetFrame } from './BottomSheetFrame';

const c = MusiStashTheme.colors;

type ProjectPlanSheetProps = {
  visible: boolean;
  onClose: () => void;
  project: Project;
};

export function ProjectPlanSheet({
  visible,
  onClose,
  project,
}: ProjectPlanSheetProps) {
  return (
    <BottomSheetFrame visible={visible} title="Full plan" onClose={onClose}>
      <Section title="Description">
        <Text style={styles.body}>{project.fullDescription}</Text>
      </Section>

      <Section title="Deliverables">
        {project.deliverables.map((d) => (
          <View key={d.id} style={styles.row}>
            <Ionicons name={d.icon} size={18} color={c.accent} />
            <Text style={styles.rowText}>{d.label}</Text>
          </View>
        ))}
      </Section>

      <Section title="Timeline">
        {project.timeline.map((line, i) => (
          <Text key={`tl-${i}`} style={styles.bullet}>
            · {line}
          </Text>
        ))}
      </Section>

      <Section title="Use of funds">
        {project.useOfFunds.map((f) => (
          <View key={f.id} style={styles.fundRow}>
            <Text style={styles.fundLabel}>{f.label}</Text>
            <Text style={styles.fundValue}>
              {formatMoney(f.amount)} · {f.percent}%
            </Text>
          </View>
        ))}
      </Section>

      <Section title="Milestones">
        {project.milestones.map((m) => (
          <View key={m.id} style={styles.row}>
            <Ionicons
              name={m.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={m.status === 'done' ? c.positive : c.textMuted}
            />
            <View style={styles.milestoneCopy}>
              <Text style={styles.rowText}>{m.title}</Text>
              {m.targetLabel ? (
                <Text style={styles.meta}>{m.targetLabel}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </Section>

      <Section title="Risks">
        {project.risks.map((risk, i) => (
          <Text key={`risk-${i}`} style={styles.bullet}>
            · {risk}
          </Text>
        ))}
      </Section>
    </BottomSheetFrame>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  milestoneCopy: {
    flex: 1,
  },
  meta: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    marginBottom: 4,
  },
  fundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.divider,
  },
  fundLabel: {
    flex: 1,
    fontSize: 14,
    color: c.textSecondary,
    paddingRight: 12,
  },
  fundValue: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textPrimary,
  },
});

export default ProjectPlanSheet;
