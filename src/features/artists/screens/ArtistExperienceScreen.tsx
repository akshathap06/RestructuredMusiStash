import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../styles/theme';
import { useAuth } from '../../auth/AuthContext';
import { followService } from '../../social/services/followService';
import { PlaybackProvider, usePlayback } from '../hooks/PlaybackContext';
import { ArtistHero } from '../components/experience/ArtistHero';
import { PopularTracks } from '../components/experience/PopularTracks';
import { CurrentProjectTeaser } from '../components/experience/CurrentProjectTeaser';
import { MiniPlayer } from '../components/experience/MiniPlayer';
import { artistExperienceService } from '../services/artistExperienceService';
import type { Artist } from '../types/experience';

const { colors } = MusiStashTheme;

function ArtistExperienceContent() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { playTrack } = usePlayback();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await artistExperienceService.load({
        artistId: route.params?.artistId,
        userId: route.params?.userId,
        artistData: route.params?.artistData,
        viewerUserId: user?.id,
      });
      if (!result) {
        setError('Artist not found');
        setArtist(null);
        return;
      }
      setArtist(result.artist);
      setOwnerUserId(result.userId);
      setIsOwner(result.isOwner);

      if (user?.id && result.userId && user.id !== result.userId) {
        try {
          const following = await followService.checkFollowStatus(user.id, result.userId);
          setIsFollowing(following);
        } catch {
          // follow check optional
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load artist');
    } finally {
      setLoading(false);
    }
  }, [route.params, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onPlayFeatured = useCallback(() => {
    const first = artist?.popularTracks[0];
    if (first) playTrack(first);
  }, [artist?.popularTracks, playTrack]);

  const onViewProject = useCallback(() => {
    const projectId = artist?.currentProject?.id;
    if (!projectId) return;
    navigation.navigate('ProjectDetail', { projectId });
  }, [artist?.currentProject?.id, navigation]);

  const onCreateProject = useCallback(() => {
    if (!artist) return;
    navigation.navigate('CreateArtistProject', {
      artistId: artist.id,
      artistName: artist.name,
      artistVerified: artist.verified,
      artworkUrl: artist.heroImageUrl,
    });
  }, [artist, navigation]);

  const onFollow = useCallback(async () => {
    if (!user?.id || !ownerUserId || isOwner) return;
    try {
      if (isFollowing) {
        await followService.unfollowUser(user.id, ownerUserId);
        setIsFollowing(false);
      } else {
        await followService.followUser(user.id, ownerUserId);
        setIsFollowing(true);
      }
    } catch {
      setIsFollowing((v) => !v);
    }
  }, [user?.id, ownerUserId, isOwner, isFollowing]);

  const onMore = useCallback(() => {
    if (!artist) return;
    const buttons: any[] = [
      { text: 'Share', style: 'default' },
      { text: 'Cancel', style: 'cancel' },
    ];
    if (isOwner) {
      buttons.unshift({
        text: 'Create paper project',
        onPress: onCreateProject,
      });
      buttons.unshift({
        text: 'Edit profile',
        onPress: () => navigation.navigate('ArtistProfile'),
      });
    }
    Alert.alert(artist.name, undefined, buttons);
  }, [artist, isOwner, onCreateProject, navigation]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !artist) {
    return (
      <View style={[styles.root, styles.centered, { paddingHorizontal: 24 }]}>
        <Text style={styles.errorText}>{error || 'Artist not found'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, 8) + 64;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ArtistHero
          artist={artist}
          isFollowing={isFollowing}
          onFollow={onFollow}
          onPlayFeatured={onPlayFeatured}
          onBack={() => navigation.goBack()}
          onMore={onMore}
        />

        {artist.bio ? (
          <Text style={styles.bio}>{artist.bio}</Text>
        ) : null}

        <PopularTracks tracks={artist.popularTracks} />

        {artist.currentProject ? (
          <CurrentProjectTeaser
            project={artist.currentProject}
            onViewProject={onViewProject}
            isOwner={isOwner}
            onCreateProject={onCreateProject}
          />
        ) : isOwner ? (
          <View style={styles.createWrap}>
            <Text style={styles.createLabel}>CURRENT PROJECT</Text>
            <Text style={styles.createHint}>
              Publish a paper project so fans can simulate backing your next release.
            </Text>
            <Pressable
              style={styles.createBtn}
              onPress={onCreateProject}
              accessibilityRole="button"
              accessibilityLabel="Create paper project"
            >
              <Text style={styles.createBtnText}>Create paper project</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.createWrap}>
            <Text style={styles.createLabel}>CURRENT PROJECT</Text>
            <Text style={styles.createHint}>No active paper project yet.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.miniWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <MiniPlayer artistName={artist.name} queue={artist.popularTracks} />
      </View>
    </View>
  );
}

export default function ArtistExperienceScreen() {
  return (
    <PlaybackProvider>
      <ArtistExperienceContent />
    </PlaybackProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  bio: {
    marginTop: 8,
    marginHorizontal: 20,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  miniWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
  },
  errorText: { color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  backLink: { padding: 12 },
  backLinkText: { color: colors.accent, fontWeight: '600' },
  createWrap: {
    marginTop: 32,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  createLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    marginBottom: 10,
  },
  createHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  createBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
