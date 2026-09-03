import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import type { DiscoveryProject } from '../services/discoveryService';

const c = MusiStashTheme.colors;

const H_PAD = 20;
const ADVANCE_MS = 5200;

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

type Props = {
  projects: DiscoveryProject[];
  onOpen: (id: string) => void;
};

/**
 * The Explore hero. Rotates through every open project rather than pinning the
 * single biggest one, so a project that has just been created still gets the
 * spotlight. Auto-advance stops for good once the viewer swipes — at that point
 * they are steering.
 */
export function FeaturedCarousel({ projects, onOpen }: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<DiscoveryProject>>(null);
  const [index, setIndex] = useState(0);
  const [userDriving, setUserDriving] = useState(false);

  // Guard against the list shrinking under a stale index (pull-to-refresh).
  useEffect(() => {
    if (index >= projects.length && projects.length > 0) setIndex(0);
  }, [projects.length, index]);

  useEffect(() => {
    if (userDriving || projects.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % projects.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [userDriving, projects.length, width]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(next);
    },
    [width],
  );

  if (projects.length === 0) return null;

  return (
    <View>
      <FlatList
        ref={listRef}
        data={projects}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setUserDriving(true)}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: H_PAD }}>
            <FeaturedCard project={item} onPress={() => onOpen(item.id)} />
          </View>
        )}
      />

      {projects.length > 1 ? (
        <View style={styles.dots}>
          {projects.map((p, i) => (
            <View
              key={p.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FeaturedCard({
  project,
  onPress,
}: {
  project: DiscoveryProject;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.feature}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.artistName} — ${project.title}, ${project.percent}% backed`}
    >
      <View style={styles.featureArt}>
        {project.artworkUrl ? (
          <Image source={{ uri: project.artworkUrl }} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.artFallback]} />
        )}
        <View style={styles.featureScrim} />
        <View style={styles.featurePill}>
          <AppText variant="eyebrow" color={c.onAccent}>
            {`CLOSING IN ${project.daysRemaining} DAYS`}
          </AppText>
        </View>
        <View style={styles.featureCaption}>
          <Eyebrow color={c.textSecondary}>{project.artistName}</Eyebrow>
          <AppText variant="h2" style={styles.featureTitle} numberOfLines={2}>
            {project.title}
          </AppText>
        </View>
      </View>
      <View style={styles.featureBody}>
        <View style={styles.featureFig}>
          <AppText variant="h2" tabular color={c.accentSolid}>
            {money(project.paperBackingTotal)}
          </AppText>
          <AppText variant="bodySmall" color={c.textMuted}>
            {` of ${money(project.fundingGoal)}`}
          </AppText>
          <AppText variant="label" color={c.textMuted} style={{ marginLeft: 'auto' }}>
            {project.type}
          </AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${project.percent}%` }]} />
        </View>
        <View style={styles.featureMeta}>
          <AppText variant="bodySmall" color={c.textMuted}>
            {`${project.paperBackerCount} backers`}
          </AppText>
          {project.aiScore != null && (
            <AppText variant="bodySmall" color={c.textMuted}>
              {`AI momentum ${project.aiScore}`}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  feature: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  featureArt: { height: 196 },
  artFallback: {
    backgroundColor: c.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,12,0.5)',
  },
  featurePill: {
    position: 'absolute',
    left: 16,
    top: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: c.accent,
  },
  featureCaption: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  featureTitle: { marginTop: 3 },
  featureBody: { padding: 16 },
  featureFig: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  featureMeta: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  track: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: c.progressTrack,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', backgroundColor: c.accent },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.line,
  },
  dotActive: { backgroundColor: c.accent, width: 18 },
});

export default FeaturedCarousel;
