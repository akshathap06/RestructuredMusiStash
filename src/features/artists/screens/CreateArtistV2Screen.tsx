import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../auth/AuthContext';
import { ArtistAccountService, ArtistAccount } from '../services/artistAccountService';
import { uploadProfileImage } from '../services/imageUploadService';
import { SpotifyConnect } from '../components/onboarding/SpotifyConnect';
import {
  resolveTopTracks,
  saveArtistMetrics,
  type SpotifyArtist,
} from '../services/musicMetricsService';

const colors = {
  background: '#0A0A0C',
  surface: '#15151A',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  line: '#26262D',
  textPrimary: '#F4F4F6',
  textSecondary: '#C9C6D4',
  textMuted: '#9B9BA4',
  accent: '#4B9CD3',
  onAccent: '#0A0A0C',
};

const GENRES = [
  'R&B', 'Hip-Hop', 'Pop', 'Alternative', 'Electronic', 'Rock',
  'Jazz', 'Soul', 'Country', 'Latin', 'Afrobeats', 'Indie',
];

export default function CreateArtistV2Screen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<ArtistAccount | null>(null);

  const [step, setStep] = useState(0);
  const [artistName, setArtistName] = useState('');
  const [location, setLocation] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [heroUri, setHeroUri] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [monthlyListeners, setMonthlyListeners] = useState('');
  const [totalStreams, setTotalStreams] = useState('');
  const [spotify, setSpotify] = useState<SpotifyArtist | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        setChecking(false);
        return;
      }
      const account = await ArtistAccountService.getUserArtistAccount(user.id);
      if (mounted) {
        setExisting(account);
        setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const toggleGenre = (genre: string) => {
    setGenres(prev => {
      if (prev.includes(genre)) return prev.filter(g => g !== genre);
      if (prev.length >= 3) return prev;
      return [...prev, genre];
    });
  };

  const pickImage = async (aspect: [number, number], onPicked: (uri: string) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect,
      });
      if (!result.canceled && result.assets[0]) {
        onPicked(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!user?.id || submitting) return;
    setSubmitting(true);
    try {
      const listeners = parseInt(monthlyListeners.replace(/[^0-9]/g, ''), 10);

      // Upload picked images to Storage; write URLs, never local file:// URIs.
      let avatarUrl: string | undefined;
      let bannerUrl: string | undefined;
      try {
        if (avatarUri) {
          avatarUrl = await uploadProfileImage(avatarUri, { userId: user.id, kind: 'avatar' });
        }
        if (heroUri) {
          bannerUrl = await uploadProfileImage(heroUri, { userId: user.id, kind: 'banner' });
        }
      } catch (e) {
        console.warn('Artist photo upload failed, continuing without images', e);
      }

      const streams = parseInt(totalStreams.replace(/[^0-9]/g, ''), 10);

      const result = await ArtistAccountService.createArtistAccount({
        user_id: user.id,
        artist_name: artistName.trim(),
        bio: bio.trim() || undefined,
        // Spotify's own genres beat the chips when the profile is linked.
        genre: spotify?.genres.length ? spotify.genres.slice(0, 3) : genres,
        profile_photo: avatarUrl ?? spotify?.imageUrl ?? undefined,
        banner_photo: bannerUrl,
        location: location.trim() || undefined,
        monthly_listeners: Number.isNaN(listeners) ? undefined : listeners,
      });

      // Metrics + the playable track list are a second write: the profile is
      // already usable if Spotify or iTunes is slow or down.
      if (result.success && result.data?.id) {
        try {
          const tracks = await resolveTopTracks(
            artistName.trim(),
            spotify?.spotifyId ?? null,
          );
          await saveArtistMetrics(result.data.id, {
            spotify,
            tracks,
            monthlyListeners: Number.isNaN(listeners) ? null : listeners,
            totalStreams: Number.isNaN(streams) ? null : streams,
          });
        } catch (e) {
          console.warn('Artist metrics lookup failed; profile saved without them', e);
        }
      }

      if (result.success) {
        Alert.alert('Profile created', 'Welcome to your artist profile.', [
          { text: 'OK', onPress: () => navigation.replace('ArtistExperience', { userId: user.id }) },
        ]);
      } else {
        Alert.alert('Something went wrong', result.error ?? 'Please try again.');
      }
    } catch {
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (existing && user) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <View style={styles.doneCard}>
            <Text style={styles.doneKicker}>You're set up</Text>
            <Text style={styles.doneName}>{existing.artist_name}</Text>
            <Text style={styles.doneStatus}>
              {existing.is_approved ? 'Approved' : 'Pending approval'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View public page"
              style={styles.primaryButton}
              onPress={() =>
                navigation.replace('ArtistExperience', { artistId: existing.id, userId: user.id })
              }
            >
              <Text style={styles.primaryButtonText}>View public page</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.ghostButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.ghostButtonText}>Go back</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const canContinueStep1 = artistName.trim().length >= 2 && genres.length >= 1;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Become an artist</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.progressRow}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.progressSegment, i <= step && styles.progressSegmentActive]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>Who are you?</Text>
              <Text style={styles.label}>Artist name</Text>
              <TextInput
                style={styles.input}
                value={artistName}
                onChangeText={setArtistName}
                placeholder="Your stage name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                accessibilityLabel="Artist name"
              />
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City, State"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Location"
              />
              <Text style={styles.label}>Genres · up to 3</Text>
              <View style={styles.chipWrap}>
                {GENRES.map(genre => {
                  const selected = genres.includes(genre);
                  return (
                    <Pressable
                      key={genre}
                      accessibilityRole="button"
                      accessibilityLabel={`${genre}${selected ? ', selected' : ''}`}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleGenre(genre)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {genre}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Link your Spotify</Text>
              <Text style={styles.stepBlurb}>
                We pull your follower count, popularity, genres and top tracks
                straight from Spotify, so you don&apos;t have to type them in and
                listeners can trust them.
              </Text>
              <SpotifyConnect
                initialQuery={artistName}
                selected={spotify}
                onSelect={setSpotify}
              />
              <Text style={styles.stepNote}>
                Optional — you can skip this and enter your numbers by hand.
              </Text>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Set the scene</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add hero photo"
                style={styles.heroPicker}
                onPress={() => pickImage([16, 9], setHeroUri)}
              >
                {heroUri ? (
                  <Image source={{ uri: heroUri }} style={styles.heroImage} />
                ) : (
                  <View style={styles.pickerEmpty}>
                    <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                    <Text style={styles.pickerEmptyText}>Add hero photo</Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.caption}>Profiles with a hero photo get discovered more.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add avatar photo"
                style={styles.avatarPicker}
                onPress={() => pickImage([1, 1], setAvatarUri)}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                )}
              </Pressable>
              <Text style={styles.caption}>Avatar</Text>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Tell your story</Text>
              <View style={styles.preview}>
                {heroUri && <Image source={{ uri: heroUri }} style={styles.previewImage} />}
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {artistName.trim().toUpperCase() || 'YOUR NAME'}
                  </Text>
                  <Text style={styles.previewMeta} numberOfLines={1}>
                    {[genres.join(', '), location.trim()].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Music for the hours when..."
                placeholderTextColor={colors.textMuted}
                multiline
                accessibilityLabel="Bio"
              />
              <Text style={styles.label}>Monthly listeners (optional)</Text>
              <TextInput
                style={styles.input}
                value={monthlyListeners}
                onChangeText={setMonthlyListeners}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                accessibilityLabel="Monthly listeners, optional"
              />
              <Text style={styles.label}>Total streams (optional)</Text>
              <TextInput
                style={styles.input}
                value={totalStreams}
                onChangeText={setTotalStreams}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                accessibilityLabel="Total streams, optional"
              />
              <Text style={styles.stepNote}>
                Spotify does not publish these two figures to anyone, so they
                show on your profile as self-reported until we can verify them.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              style={[
                styles.primaryButton,
                step === 0 && !canContinueStep1 && styles.primaryButtonDisabled,
              ]}
              disabled={step === 0 && !canContinueStep1}
              onPress={() => setStep(step + 1)}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create artist profile"
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              disabled={submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.primaryButtonText}>Create artist profile</Text>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 52,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderSubtle,
  },
  progressSegmentActive: { backgroundColor: colors.accent },
  content: { padding: 20, paddingBottom: 40 },
  stepTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 10 },
  stepBlurb: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  stepNote: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 14,
  },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 14 },
  chipTextSelected: { color: colors.onAccent, fontFamily: "Manrope_700Bold", fontWeight: "700" },
  heroPicker: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  pickerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pickerEmptyText: { color: colors.textSecondary, fontSize: 14 },
  caption: { color: colors.textMuted, fontSize: 13, marginTop: 8, marginBottom: 20 },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  preview: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    height: 140,
    marginBottom: 20,
    justifyContent: 'flex-end',
  },
  previewImage: { ...StyleSheet.absoluteFillObject, opacity: 0.45 },
  previewOverlay: { padding: 16 },
  previewName: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  previewMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  footer: { padding: 20, paddingTop: 8 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: colors.onAccent, fontFamily: "Manrope_800ExtraBold", fontSize: 16, fontWeight: "800" },
  ghostButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ghostButtonText: { color: colors.textSecondary, fontSize: 15 },
  doneCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    padding: 24,
  },
  doneKicker: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  doneName: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  doneStatus: { color: colors.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 20 },
});
