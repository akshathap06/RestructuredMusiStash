import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MusiStashTheme } from '../../../../styles/theme';
import type { Artist } from '../../types/experience';
import { formatListeners } from '../../data/kalebDemo';

const { width, height } = Dimensions.get('window');
const H_PAD = width < 375 ? 16 : 20;
const HERO_H = Math.min(520, Math.max(390, height * 0.48));
const NAME_SIZE = Math.min(48, Math.max(36, width * 0.11));
const { colors } = MusiStashTheme;

type Props = {
  artist: Artist;
  onPlayFeatured: () => void;
  onFollow: () => void;
  isFollowing: boolean;
  onBack?: () => void;
  onMore?: () => void;
};

export function ArtistHero({
  artist,
  onPlayFeatured,
  onFollow,
  isFollowing,
  onBack,
  onMore,
}: Props) {
  const insets = useSafeAreaInsets();
  const playScale = useRef(new Animated.Value(1)).current;

  const scaleTo = (toValue: number) =>
    Animated.spring(playScale, { toValue, useNativeDriver: true, friction: 6 }).start();

  return (
    <View style={[styles.hero, { height: HERO_H }]}>
      <Image
        source={{ uri: artist.heroImageUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['transparent', 'rgba(8,10,13,0.55)', colors.background]}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={onBack}
          disabled={!onBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={onMore}
          disabled={!onMore}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: NAME_SIZE }]} numberOfLines={1}>
            {artist.name}
          </Text>
          {artist.verified ? (
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.accent}
              style={styles.verified}
              accessibilityLabel="Verified artist"
            />
          ) : null}
        </View>
        <Text style={styles.meta}>
          {artist.genre} · {artist.location}
        </Text>
        <Text style={styles.listeners}>
          {formatListeners(artist.monthlyListeners)} monthly listeners
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onFollow}
            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? 'Unfollow artist' : 'Follow artist'}
          >
            <Text style={styles.followText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>

          <View style={styles.spacer} />

          <Animated.View style={{ transform: [{ scale: playScale }] }}>
            <Pressable
              onPress={onPlayFeatured}
              onPressIn={() => scaleTo(0.92)}
              onPressOut={() => scaleTo(1)}
              style={styles.playBtn}
              accessibilityRole="button"
              accessibilityLabel="Play featured track"
            >
              <Ionicons
                name="play"
                size={28}
                color={colors.textPrimary}
                style={styles.playIcon}
              />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    zIndex: 2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PAD,
    paddingBottom: 20,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: {
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  verified: { marginLeft: 8 },
  meta: { marginTop: 6, fontSize: 14, color: colors.textSecondary },
  listeners: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  followBtn: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  followText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  spacer: { flex: 1 },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { marginLeft: 3 },
});
