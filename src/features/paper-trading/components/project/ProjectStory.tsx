import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';

const c = MusiStashTheme.colors;

type ProjectStoryProps = {
  project: Project;
  onSeeFullPlan: () => void;
};

export function ProjectStory({ project, onSeeFullPlan }: ProjectStoryProps) {
  const { width } = useWindowDimensions();
  const heroWidth = width - 32;
  const heroHeight = heroWidth / 2.3;
  const heroUri = project.heroImageUrl || project.artworkUrl;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} accessibilityRole="header">
        The project
      </Text>
      <Image
        source={{ uri: heroUri }}
        style={[styles.hero, { width: heroWidth, height: heroHeight }]}
        accessibilityLabel={`${project.title} project image`}
      />
      <Text style={styles.copy}>{project.fullDescription}</Text>

      <View style={styles.deliverables}>
        {project.deliverables.map((d) => (
          <View key={d.id} style={styles.deliverable}>
            <Ionicons name={d.icon} size={16} color={c.accent} />
            <Text style={styles.deliverableText}>{d.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={onSeeFullPlan}
        style={styles.linkRow}
        accessibilityRole="button"
        accessibilityLabel="See full plan"
      >
        <Text style={styles.link}>See full plan</Text>
        <Ionicons name="chevron-forward" size={16} color={c.accent} />
      </TouchableOpacity>
    </View>
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
    marginBottom: 12,
  },
  hero: {
    borderRadius: 14,
    backgroundColor: c.surface,
    marginBottom: 14,
  },
  copy: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
    marginBottom: 14,
  },
  deliverables: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  deliverable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  deliverableText: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: c.accent,
  },
});

export default ProjectStory;
