import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';
import {
  PAPER_DISCLOSURE_BODY,
  PAPER_DISCLOSURE_SHORT,
} from '../../../artists/types/experience';
import { formatMoney } from '../../../artists/data/kalebDemo';
import { BottomSheetFrame } from './BottomSheetFrame';

const c = MusiStashTheme.colors;

type PaperContractSheetProps = {
  visible: boolean;
  onClose: () => void;
  project: Project;
};

export function PaperContractSheet({
  visible,
  onClose,
  project,
}: PaperContractSheetProps) {
  const horizons = project.scenarioTargets
    .map((t) => t.label)
    .join(' · ');

  return (
    <BottomSheetFrame visible={visible} title="Paper contract" onClose={onClose}>
      <Text style={styles.badge} accessibilityLabel={PAPER_DISCLOSURE_SHORT}>
        {PAPER_DISCLOSURE_SHORT}
      </Text>

      <Section title="What is a paper share?">
        <Text style={styles.body}>
          A paper share is a simulated unit priced at{' '}
          {formatMoney(project.currentPaperSharePrice)} today. Backing allocates
          paper balance toward {project.title} — it does not buy equity, royalties,
          or securities.
        </Text>
      </Section>

      <Section title="Horizon">
        <Text style={styles.body}>
          Scenario horizons for this project: {horizons || 'not specified'}. Pick a
          horizon in the calculator to see illustrative paper value — not a forecast
          of real returns.
        </Text>
      </Section>

      <Section title="Scenario logic">
        <Text style={styles.body}>
          Illustrative value = (paper amount ÷ current paper share price) × target
          paper share price for the selected horizon. Targets are demo scenarios for
          demand discovery only.
        </Text>
      </Section>

      <Section title="Risks">
        {project.risks.map((risk, i) => (
          <Text key={`risk-${i}`} style={styles.bullet}>
            · {risk}
          </Text>
        ))}
      </Section>

      <View style={styles.disclosureBox}>
        <Text style={styles.disclosure}>{PAPER_DISCLOSURE_BODY}</Text>
      </View>
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
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    marginBottom: 4,
  },
  disclosureBox: {
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  disclosure: {
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
});

export default PaperContractSheet;
