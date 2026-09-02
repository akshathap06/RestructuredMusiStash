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
import { PAPER_DISCLOSURE_SHORT } from '../../types/experience';
import type { Project } from '../../types/experience';

const { width } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const { colors } = MusiStashTheme;

type Props = {
  projects: Project[];
  isOwner?: boolean;
  onOpen: (projectId: string) => void;
  onCreate?: () => void;
};

function percentBacked(p: Project): number {
  if (p.fundingGoal <= 0) return 0;
  return Math.round((p.paperBackingTotal / p.fundingGoal) * 100);
}

export function ArtistProjects({ projects, isOwner, onOpen, onCreate }: Props) {
  if (projects.length === 0 && !isOwner) return null;

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>PROJECTS</Text>
        {isOwner && onCreate ? (
          <Pressable
            onPress={onCreate}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Create a paper project"
          >
            <Text style={styles.newLink}>New</Text>
          </Pressable>
        ) : null}
      </View>

      {projects.length === 0 ? (
        <Text style={styles.emptyText}>No paper projects yet.</Text>
      ) : (
        <View style={styles.list}>
          {projects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() => onOpen(project.id)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open project ${project.title}`}
            >
              <Image
                source={{ uri: project.artworkUrl }}
                style={styles.art}
                accessibilityIgnoresInvertColors
              />
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>
                  {project.title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {project.type} · {percentBacked(project)}% backed
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.disclosure}>{PAPER_DISCLOSURE_SHORT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingHorizontal: H_PAD,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  newLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  disclosure: {
    marginTop: 12,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
});

export default ArtistProjects;
