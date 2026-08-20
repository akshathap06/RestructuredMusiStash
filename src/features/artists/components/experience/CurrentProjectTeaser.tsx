import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { ProjectSummary } from '../../types/experience';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const ART_SIZE = width < 360 ? 96 : 116;
const { colors } = MusiStashTheme;

type Props = {
  project: ProjectSummary;
  onViewProject: () => void;
  isOwner?: boolean;
  onCreateProject?: () => void;
};

export function CurrentProjectTeaser({
  project,
  onViewProject,
  isOwner,
  onCreateProject,
}: Props) {
  const percent = Math.round(project.percentBacked);

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>CURRENT PROJECT</Text>
        {isOwner && onCreateProject ? (
          <Pressable
            onPress={onCreateProject}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Create another paper project"
          >
            <Text style={styles.newLink}>New</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.row}>
        <Image
          source={{ uri: project.artworkUrl }}
          style={[styles.art, { width: ART_SIZE, height: ART_SIZE }]}
          accessibilityIgnoresInvertColors
        />

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {project.title}
          </Text>
          <Text style={styles.percent}>{percent}% backed</Text>
          <Text style={styles.disclosure}>
            PAPER SIMULATION · NO REAL MONEY
          </Text>

          <Pressable
            onPress={onViewProject}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel={`View project ${project.title}`}
          >
            <Text style={styles.ctaText}>View project</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 32,
    paddingHorizontal: H_PAD,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  newLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  art: {
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  percent: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  disclosure: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  cta: {
    marginTop: 14,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 4,
  },
});

export default CurrentProjectTeaser;
