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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Project } from '../../../artists/types/experience';

const c = MusiStashTheme.colors;
const NAV_HEIGHT = 52;

type ProjectHeaderProps = {
  project: Project;
  onBack: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  onShare?: () => void;
};

export function ProjectHeader({
  project,
  onBack,
  onBookmark,
  isBookmarked,
  onShare,
}: ProjectHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artSize = width < 360 ? 104 : 120;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} accessibilityRole="header">
          Project
        </Text>
        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={onBookmark}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove from saved' : 'Save project'}
            accessibilityState={{ selected: !!isBookmarked }}
            disabled={!onBookmark}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isBookmarked ? c.accent : c.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Share project"
            disabled={!onShare}
          >
            <Ionicons name="share-outline" size={22} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroRow}>
        <Image
          source={{ uri: project.artworkUrl }}
          style={[styles.artwork, { width: artSize, height: artSize }]}
          accessibilityLabel={`${project.title} artwork`}
        />
        <View style={styles.meta}>
          <View style={styles.artistRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {project.artistName}
            </Text>
            {project.artistVerified ? (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={c.accent}
                accessibilityLabel="Verified artist"
              />
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {project.title}
          </Text>
          <Text style={styles.type} numberOfLines={1}>
            {project.type}
          </Text>
          <Text style={styles.shortDesc} numberOfLines={3}>
            {project.shortDescription}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  nav: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  artwork: {
    borderRadius: 12,
    backgroundColor: c.surface,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  artist: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    flexShrink: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: '500',
    color: c.accent,
    marginBottom: 8,
  },
  shortDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textSecondary,
  },
});

export default ProjectHeader;
