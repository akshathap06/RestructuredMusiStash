import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { MusiStashTheme } from '../../../styles/theme';
import { AppText, Eyebrow } from '../../../shared/components/ui';
import { ChipRow } from '../../../shared/components/ui/Chip';
import { paperWalletService } from '../../paper-trading/services/paperWalletService';
import {
  discoveryService,
  DiscoveryArtist,
  DiscoveryProject,
} from '../services/discoveryService';

const c = MusiStashTheme.colors;

const FILTERS = ['All', 'Trending', 'Closing soon', 'High resonance', 'High momentum', 'New'];

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function listeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export default function ExploreScreen(props: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const parentNav = props.route?.params?.parentNavigation ?? props.navigation;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [featured, setFeatured] = useState<DiscoveryProject | null>(null);
  const [projects, setProjects] = useState<DiscoveryProject[]>([]);
  const [artists, setArtists] = useState<DiscoveryArtist[]>([]);
  const [buyingPower, setBuyingPower] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [feat, live, rising] = await Promise.all([
        discoveryService.getFeaturedProject(),
        discoveryService.getLiveProjects(12),
        discoveryService.getRisingArtists(8),
      ]);
      setFeatured(feat);
      setProjects(live);
      setArtists(rising);
      if (user?.id) {
        try {
          const w = await paperWalletService.ensureWallet(user.id);
          setBuyingPower(w.availableBalance);
        } catch {
          /* wallet is non-critical for Explore */
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Explore');
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const carousel = useMemo(() => {
    const rest = projects.filter((p) => p.id !== featured?.id);
    return discoveryService.sortSection(rest, filter);
  }, [projects, featured?.id, filter]);

  const openProject = (id: string) => parentNav?.navigate?.('ProjectDetail', { projectId: id });
  const openArtist = (id: string) =>
    parentNav?.navigate?.('ArtistExperience', { artistId: id });
  const becomeArtist = () => parentNav?.navigate?.('CreateArtist');

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
      }
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={c.accentSolid}>PAPER</Eyebrow>
          <AppText variant="h1" style={styles.h1}>
            Explore
          </AppText>
        </View>
        {buyingPower != null && (
          <View style={styles.bp}>
            <AppText variant="eyebrow" color={c.textFaint}>BUYING POWER</AppText>
            <AppText variant="h4" tabular style={styles.bpValue}>
              {money(buyingPower)}
            </AppText>
          </View>
        )}
      </View>

      <ChipRow options={FILTERS} value={filter} onChange={setFilter} style={styles.chips} />

      {error ? (
        <AppText variant="bodySmall" color={c.negative} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      {featured && (
        <Pressable
          style={styles.feature}
          onPress={() => openProject(featured.id)}
          accessibilityRole="button"
          accessibilityLabel={`${featured.artistName} — ${featured.title}, ${featured.percent}% backed`}
        >
          <View style={styles.featureArt}>
            {featured.artworkUrl ? (
              <Image source={{ uri: featured.artworkUrl }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.artFallback]} />
            )}
            <View style={styles.featureScrim} />
            <View style={styles.featurePill}>
              <AppText variant="eyebrow" color={c.onAccent}>
                {`CLOSING IN ${featured.daysRemaining} DAYS`}
              </AppText>
            </View>
            <View style={styles.featureCaption}>
              <Eyebrow color={c.textSecondary}>{featured.artistName}</Eyebrow>
              <AppText variant="h2" style={styles.featureTitle} numberOfLines={2}>
                {featured.title}
              </AppText>
            </View>
          </View>
          <View style={styles.featureBody}>
            <View style={styles.featureFig}>
              <AppText variant="h2" tabular color={c.accentSolid}>
                {money(featured.paperBackingTotal)}
              </AppText>
              <AppText variant="bodySmall" color={c.textMuted}>
                {` of ${money(featured.fundingGoal)}`}
              </AppText>
              <AppText variant="label" color={c.textMuted} style={{ marginLeft: 'auto' }}>
                {featured.type}
              </AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${featured.percent}%` }]} />
            </View>
            <View style={styles.featureMeta}>
              <AppText variant="bodySmall" color={c.textMuted}>
                {`${featured.paperBackerCount} paper backers`}
              </AppText>
              {featured.aiScore != null && (
                <AppText variant="bodySmall" color={c.textMuted}>
                  {`AI momentum ${featured.aiScore}`}
                </AppText>
              )}
            </View>
          </View>
        </Pressable>
      )}

      <View style={styles.sectionHead}>
        <Eyebrow>MOMENTUM</Eyebrow>
      </View>
      {carousel.length === 0 ? (
        <AppText variant="bodySmall" color={c.textFaint} style={styles.sectionEmpty}>
          Nothing here yet.
        </AppText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {carousel.map((p) => (
            <Pressable
              key={p.id}
              style={styles.card}
              onPress={() => openProject(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`${p.artistName} — ${p.title}`}
            >
              <View style={styles.cardArt}>
                {p.artworkUrl ? (
                  <Image source={{ uri: p.artworkUrl }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.artFallback]}>
                    <AppText variant="h1" color={c.line}>
                      {p.title.charAt(0)}
                    </AppText>
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Eyebrow color={c.textFaint}>{p.artistName}</Eyebrow>
                <AppText variant="h4" numberOfLines={1} style={{ marginTop: 4 }}>
                  {p.title}
                </AppText>
                <View style={[styles.track, { marginTop: 12 }]}>
                  <View style={[styles.trackFill, { width: `${p.percent}%` }]} />
                </View>
                <View style={styles.cardMeta}>
                  <AppText variant="caption" tabular color={c.textMuted}>
                    {`${p.percent}% backed`}
                  </AppText>
                  <AppText variant="caption" tabular color={c.textMuted}>
                    {`${p.daysRemaining}d`}
                  </AppText>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.sectionHead}>
        <Eyebrow>RISING ARTISTS</Eyebrow>
      </View>
      {artists.map((a, i) => (
        <Pressable
          key={a.id}
          style={[styles.artistRow, i > 0 && styles.rowDivider]}
          onPress={() => openArtist(a.id)}
          accessibilityRole="button"
          accessibilityLabel={a.name}
        >
          <View style={styles.artistAvatar}>
            {a.avatarUrl ? (
              <Image source={{ uri: a.avatarUrl }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.artFallback]} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="h4" numberOfLines={1}>
              {a.name}
            </AppText>
            <AppText variant="bodySmall" color={c.textMuted} numberOfLines={1}>
              {`${a.genre} · ${listeners(a.monthlyListeners)} listeners`}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={17} color={c.textFaint} />
        </Pressable>
      ))}

      <Pressable
        style={styles.cta}
        onPress={becomeArtist}
        accessibilityRole="button"
        accessibilityLabel="You're an artist? Put a project up for paper backing"
      >
        <View style={styles.ctaIcon}>
          <Ionicons name="add" size={20} color={c.accentLight} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h4">You&apos;re an artist?</AppText>
          <AppText variant="bodySmall" color={c.textMuted}>
            Put a project up for paper backing
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  h1: { marginTop: 6 },
  bp: { alignItems: 'flex-end' },
  bpValue: { marginTop: 2 },

  chips: { paddingBottom: 14 },
  error: { paddingHorizontal: 20, marginBottom: 8 },

  feature: {
    marginHorizontal: 20,
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

  sectionHead: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 12 },
  sectionEmpty: { paddingHorizontal: 20 },

  carousel: { paddingHorizontal: 20, gap: 12 },
  card: {
    width: 210,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  cardArt: { height: 112 },
  cardBody: { padding: 14 },
  cardMeta: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    minHeight: 64,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.listDivider },
  artistAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderStrong,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
