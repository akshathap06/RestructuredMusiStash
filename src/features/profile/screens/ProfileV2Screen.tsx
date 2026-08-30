import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { paperWalletService } from '../../paper-trading/services/paperWalletService';
import type { PortfolioSummary } from '../../paper-trading/services/paperWalletService';
import { artistProjectService } from '../../artists/services/artistProjectService';
import type { Project } from '../../artists/types/experience';
import { followService } from '../../social/services/followService';
import { colors, formatCompact, formatMoney } from '../components/v2/tokens';
import StatStrip from '../components/v2/StatStrip';
import ListRow from '../components/v2/ListRow';

type NavLike = {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () => NavLike | undefined;
};

type Props = {
  navigation: NavLike;
};

type ArtistProfileRow = {
  id: string;
  artist_name: string | null;
  profile_photo_url: string | null;
  banner_photo_url: string | null;
  monthly_listeners: number | null;
  genre: string | null;
  is_verified: boolean | null;
};

const PAPER_DISCLOSURE =
  'MusiStash Paper Trading uses simulated currency and simulated project values. No real securities or financial returns are being offered.';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function ProfileV2Screen({ navigation }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [artist, setArtist] = useState<ArtistProfileRow | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [openPositions, setOpenPositions] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    let artistRow: ArtistProfileRow | null = null;
    try {
      const { data } = await supabase
        .from('artist_profiles')
        .select(
          'id, artist_name, profile_photo_url, banner_photo_url, monthly_listeners, genre, is_verified'
        )
        .eq('user_id', user.id)
        .maybeSingle();
      artistRow = (data as ArtistProfileRow | null) ?? null;
    } catch {
      artistRow = null;
    }
    setArtist(artistRow);

    try {
      const followData = await followService.getFollowData(user.id);
      setFollowers(followData.followerCount ?? 0);
      setFollowing(followData.followingCount ?? 0);
    } catch {
      setFollowers(0);
      setFollowing(0);
    }

    if (artistRow) {
      try {
        setProjects(await artistProjectService.listForArtist(artistRow.id));
      } catch {
        setProjects([]);
      }
    } else {
      try {
        const [portfolio, positions] = await Promise.all([
          paperWalletService.getPortfolioSummary(user.id),
          paperWalletService.getPositions(user.id),
        ]);
        setSummary(portfolio);
        setOpenPositions(positions.filter((p) => p.status === 'open').length);
      } catch {
        setSummary(null);
        setOpenPositions(0);
      }
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goPortfolio = useCallback(() => {
    try {
      navigation.navigate('MainTabs', { screen: 'Portfolio' });
    } catch {
      navigation.getParent?.()?.navigate('MainTabs', { screen: 'Portfolio' });
    }
  }, [navigation]);

  if (!user) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentProject = projects[0];
  const paperBackers = projects.reduce((sum, p) => sum + (p.paperBackerCount || 0), 0);
  const dayPct = summary?.dayChangePct ?? 0;
  const dayColor = dayPct >= 0 ? colors.positive : colors.negative;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
          />
        }
      >
        {/* Common header */}
        <View style={styles.headerRow}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initialsOf(user.name || '?')}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={({ pressed }) => [styles.gearButton, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {artist ? (
          <>
            {/* Artist identity */}
            <View style={styles.section}>
              <Text style={styles.artistName}>{artist.artist_name || user.name}</Text>
              <View style={styles.genreLine}>
                <Text style={styles.genreText}>{artist.genre || 'Artist'}</Text>
                {artist.is_verified ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                ) : null}
              </View>
              <Text style={styles.listenersText}>
                {formatCompact(artist.monthly_listeners || 0)} monthly listeners
              </Text>
            </View>

            {/* Primary CTAs */}
            <View style={styles.ctaRow}>
              <Pressable
                onPress={() =>
                  navigation.navigate('ArtistExperience', {
                    artistId: artist.id,
                    userId: user.id,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="View your public artist page"
                style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
              >
                <Text style={styles.ctaPrimaryText}>View public page</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ArtistProfile')}
                accessibilityRole="button"
                accessibilityLabel="Edit artist profile"
                style={({ pressed }) => [styles.ctaSecondary, pressed && styles.pressed]}
              >
                <Text style={styles.ctaSecondaryText}>Edit</Text>
              </Pressable>
            </View>

            {/* Your art */}
            <Text style={styles.sectionLabel}>YOUR ART</Text>
            {currentProject ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('ProjectDetail', { projectId: currentProject.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open project ${currentProject.title}`}
                style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]}
              >
                <Image source={{ uri: currentProject.artworkUrl }} style={styles.artwork} />
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {currentProject.title}
                  </Text>
                  <Text style={styles.projectBacked}>
                    {Math.round(
                      (currentProject.paperBackingTotal /
                        Math.max(currentProject.fundingGoal, 1)) *
                        100
                    )}
                    % backed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.emptyProjectRow}>
                <Text style={styles.emptyProjectText}>No live project yet</Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate('CreateArtistProject', {
                      artistId: artist.id,
                      artistName: artist.artist_name || user.name,
                      artworkUrl: artist.profile_photo_url || undefined,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Create a paper project"
                  style={({ pressed }) => [styles.ctaPrimarySmall, pressed && styles.pressed]}
                >
                  <Text style={styles.ctaPrimaryText}>Create paper project</Text>
                </Pressable>
              </View>
            )}

            {/* Demand strip */}
            <View style={styles.stripWrap}>
              <StatStrip
                items={[
                  { label: 'Followers', value: formatCompact(followers) },
                  {
                    label: 'Listeners',
                    value: formatCompact(artist.monthly_listeners || 0),
                  },
                  { label: 'Backers', value: formatCompact(paperBackers) },
                ]}
              />
            </View>

            {/* Rows */}
            <View style={styles.rowsList}>
              <ListRow
                label="New paper project"
                onPress={() =>
                  navigation.navigate('CreateArtistProject', {
                    artistId: artist.id,
                    artistName: artist.artist_name || user.name,
                    artworkUrl: artist.profile_photo_url || undefined,
                  })
                }
              />
              <ListRow label="Create post" onPress={() => navigation.navigate('CreatePost')} />
              <ListRow label="Settings" onPress={() => navigation.navigate('Settings')} />
            </View>

            <Text style={styles.caption}>
              Your art comes first — numbers exist to prove the demand.
            </Text>
            <Text style={styles.disclosure}>{PAPER_DISCLOSURE}</Text>
          </>
        ) : (
          <>
            {/* Portfolio summary */}
            <Pressable
              onPress={goPortfolio}
              accessibilityRole="button"
              accessibilityLabel="Open paper portfolio"
              style={({ pressed }) => [styles.section, pressed && styles.pressed]}
            >
              <Text style={styles.sectionLabel}>PAPER PORTFOLIO</Text>
              <Text style={styles.portfolioTotal}>{formatMoney(summary?.total ?? 0)}</Text>
              <Text style={[styles.dayChange, { color: dayColor }]}>
                {dayPct >= 0 ? '+' : ''}
                {dayPct.toFixed(2)}% today
              </Text>
            </Pressable>

            {/* Stats strip */}
            <View style={styles.stripWrap}>
              <StatStrip
                items={[
                  { label: 'Positions', value: String(openPositions) },
                  { label: 'MusiStash Cash', value: formatMoney(summary?.cash ?? 0) },
                  { label: 'Following', value: formatCompact(following) },
                ]}
              />
            </View>

            {/* Rows */}
            <View style={styles.rowsList}>
              <ListRow
                label="Watchlist & saved"
                onPress={() => navigation.navigate('Watchlist')}
              />
              <ListRow
                label="Transaction history"
                onPress={() => navigation.navigate('TransactionHistory')}
              />
              <ListRow
                label="Explore projects"
                onPress={() =>
                  navigation.getParent?.()?.navigate?.('MainTabs', { screen: 'Explore' }) ??
                  navigation.navigate('MainTabs', { screen: 'Explore' })
                }
              />
            </View>

            <Text style={styles.disclosure}>{PAPER_DISCLOSURE}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  avatarInitials: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
  },
  gearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  portfolioTotal: {
    color: colors.textPrimary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
  },
  dayChange: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  stripWrap: {
    marginBottom: 24,
  },
  rowsList: {
    gap: 10,
    marginBottom: 24,
  },
  artistName: {
    color: colors.textPrimary,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  genreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  listenersText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  ctaPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimarySmall: {
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaPrimaryText: {
    color: colors.onAccent,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14.5,
    fontWeight: '800',
  },
  ctaSecondary: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  ctaSecondaryText: {
    color: colors.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    fontWeight: '700',
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  projectInfo: {
    flex: 1,
    gap: 4,
  },
  projectTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  projectBacked: {
    color: colors.accentSolid,
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  emptyProjectText: {
    color: colors.textSecondary,
    fontSize: 14,
    flexShrink: 1,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  disclosure: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
