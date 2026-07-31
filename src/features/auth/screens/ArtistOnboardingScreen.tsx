import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../AuthContext';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Country',
  'Jazz', 'Metal', 'Latin', 'Indie', 'Alternative', 'Classical',
  'Folk', 'Reggae', 'Blues', 'Soul', 'Funk', 'Punk',
];

interface ArtistOnboardingScreenProps {
  navigation: any;
}

interface ArtistData {
  artistName: string;
  bio: string;
  profilePhoto: string | null;
  bannerImage: string | null;
  location: string;
  genres: string[];
  musicalStyle: string;
  influences: string;
  isBand: boolean;
  bandType: string;
  spotifyUrl: string;
  instagramHandle: string;
  twitterHandle: string;
  youtubeChannel: string;
  websiteUrl: string;
}

const ArtistOnboardingScreen: React.FC<ArtistOnboardingScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 5;

  const [artistData, setArtistData] = useState<ArtistData>({
    artistName: '',
    bio: '',
    profilePhoto: null,
    bannerImage: null,
    location: '',
    genres: [],
    musicalStyle: '',
    influences: '',
    isBand: false,
    bandType: '',
    spotifyUrl: '',
    instagramHandle: '',
    twitterHandle: '',
    youtubeChannel: '',
    websiteUrl: '',
  });

  const progress = (currentStep / totalSteps) * 100;

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in to create an artist profile');
      return;
    }

    setIsLoading(true);
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser || checkError) {
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: user.name || 'User',
            email: user.email || '',
            role: 'artist',
            avatar: user.avatar || null,
          });

        if (createUserError) {
          Alert.alert('Error', 'Failed to create your account. Please try logging out and back in.');
          setIsLoading(false);
          return;
        }
      }

      const { data: existingProfile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const profilePayload = {
        artist_name: artistData.artistName,
        bio: artistData.bio,
        biography: artistData.bio,
        profile_photo: artistData.profilePhoto,
        banner_photo: artistData.bannerImage,
        location: artistData.location,
        genre: artistData.genres,
        musical_style: artistData.musicalStyle,
        influences: artistData.influences,
        is_band: artistData.isBand,
        band_type: artistData.isBand ? artistData.bandType : null,
        spotify_profile_url: artistData.spotifyUrl,
        instagram_handle: artistData.instagramHandle,
        twitter_handle: artistData.twitterHandle,
        youtube_channel_id: artistData.youtubeChannel,
        website_url: artistData.websiteUrl,
        status: 'approved',
      };

      if (existingProfile) {
        const { error } = await supabase
          .from('artist_profiles')
          .update(profilePayload)
          .eq('id', existingProfile.id);

        if (error) {
          Alert.alert('Error', `Failed to update profile: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('artist_profiles')
          .insert({
            ...profilePayload,
            user_id: user.id,
            created_at: new Date().toISOString(),
          });

        if (error) {
          Alert.alert('Error', `Failed to create profile: ${error.message}`);
          return;
        }
      }

      navigation.navigate('ArtistOnboardingComplete', {
        artistData: {
          artistName: artistData.artistName,
          bio: artistData.bio,
          genres: artistData.genres,
          profilePhoto: artistData.profilePhoto,
          gradientColors: ['#8B5CF6', '#EC4899', '#EF4444'],
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async (type: 'profile' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        setArtistData({ ...artistData, profilePhoto: result.assets[0].uri });
      } else {
        setArtistData({ ...artistData, bannerImage: result.assets[0].uri });
      }
    }
  };

  const toggleGenre = (genre: string) => {
    if (artistData.genres.includes(genre)) {
      setArtistData({
        ...artistData,
        genres: artistData.genres.filter(g => g !== genre),
      });
    } else {
      setArtistData({
        ...artistData,
        genres: [...artistData.genres, genre],
      });
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Artist Identity</Text>
      <Text style={styles.stepSubtitle}>What's your artist or band name?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Artist / Band Name *</Text>
        <TextInput
          style={styles.input}
          value={artistData.artistName}
          onChangeText={(text) => setArtistData({ ...artistData, artistName: text })}
          placeholder="Your stage name"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.bandToggle}>
        <Text style={styles.inputLabel}>Are you a band or group?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, !artistData.isBand && styles.toggleOptionSelected]}
            onPress={() => setArtistData({ ...artistData, isBand: false })}
          >
            <Ionicons name="person" size={20} color={!artistData.isBand ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.toggleText, !artistData.isBand && styles.toggleTextSelected]}>Solo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, artistData.isBand && styles.toggleOptionSelected]}
            onPress={() => setArtistData({ ...artistData, isBand: true })}
          >
            <Ionicons name="people" size={20} color={artistData.isBand ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.toggleText, artistData.isBand && styles.toggleTextSelected]}>Band/Group</Text>
          </TouchableOpacity>
        </View>
      </View>

      {artistData.isBand && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Band Type</Text>
          <TextInput
            style={styles.input}
            value={artistData.bandType}
            onChangeText={(text) => setArtistData({ ...artistData, bandType: text })}
            placeholder="e.g., Rock Band, Jazz Ensemble"
            placeholderTextColor="#6B7280"
          />
        </View>
      )}

      <View style={styles.imageUploadRow}>
        <View style={styles.imageUploadContainer}>
          <Text style={styles.inputLabel}>Profile Photo</Text>
          <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('profile')}>
            {artistData.profilePhoto ? (
              <Image source={{ uri: artistData.profilePhoto }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color="#8B5CF6" />
                <Text style={styles.uploadText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.imageUploadContainer}>
          <Text style={styles.inputLabel}>Banner Image</Text>
          <TouchableOpacity style={styles.imageUpload} onPress={() => pickImage('banner')}>
            {artistData.bannerImage ? (
              <Image source={{ uri: artistData.bannerImage }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="image-outline" size={24} color="#8B5CF6" />
                <Text style={styles.uploadText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>About You</Text>
      <Text style={styles.stepSubtitle}>Tell fans about yourself and your music</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={artistData.bio}
          onChangeText={(text) => setArtistData({ ...artistData, bio: text })}
          placeholder="Share your story — who you are, your sound, your journey..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <Text style={styles.inputLabel}>Location *</Text>
        </View>
        <TextInput
          style={styles.input}
          value={artistData.location}
          onChangeText={(text) => setArtistData({ ...artistData, location: text })}
          placeholder="City, State/Country"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Musical Style</Text>
        <TextInput
          style={styles.input}
          value={artistData.musicalStyle}
          onChangeText={(text) => setArtistData({ ...artistData, musicalStyle: text })}
          placeholder="Describe your unique sound"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Influences</Text>
        <TextInput
          style={styles.input}
          value={artistData.influences}
          onChangeText={(text) => setArtistData({ ...artistData, influences: text })}
          placeholder="Artists that inspire you"
          placeholderTextColor="#6B7280"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Genres</Text>
      <Text style={styles.stepSubtitle}>Pick the genres that fit your music</Text>

      <View style={styles.genreGrid}>
        {GENRES.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              artistData.genres.includes(genre) && styles.genreChipSelected,
            ]}
            onPress={() => toggleGenre(genre)}
          >
            <Text style={[
              styles.genreChipText,
              artistData.genres.includes(genre) && styles.genreChipTextSelected,
            ]}>
              {genre}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {artistData.genres.length > 0 && (
        <View style={styles.selectedBadge}>
          <Ionicons name="musical-notes" size={16} color="#8B5CF6" />
          <Text style={styles.selectedText}>
            {artistData.genres.length} genre{artistData.genres.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Social & Links</Text>
      <Text style={styles.stepSubtitle}>Connect your online presence</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="musical-notes" size={18} color="#1DB954" />
          <Text style={styles.inputLabel}>Spotify Profile URL</Text>
        </View>
        <TextInput
          style={styles.input}
          value={artistData.spotifyUrl}
          onChangeText={(text) => setArtistData({ ...artistData, spotifyUrl: text })}
          placeholder="https://open.spotify.com/artist/..."
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-instagram" size={18} color="#E4405F" />
            <Text style={styles.inputLabel}>Instagram</Text>
          </View>
          <TextInput
            style={styles.input}
            value={artistData.instagramHandle}
            onChangeText={(text) => setArtistData({ ...artistData, instagramHandle: text })}
            placeholder="@handle"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
            <Text style={styles.inputLabel}>Twitter</Text>
          </View>
          <TextInput
            style={styles.input}
            value={artistData.twitterHandle}
            onChangeText={(text) => setArtistData({ ...artistData, twitterHandle: text })}
            placeholder="@handle"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="logo-youtube" size={18} color="#FF0000" />
          <Text style={styles.inputLabel}>YouTube Channel</Text>
        </View>
        <TextInput
          style={styles.input}
          value={artistData.youtubeChannel}
          onChangeText={(text) => setArtistData({ ...artistData, youtubeChannel: text })}
          placeholder="Channel name or URL"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="globe-outline" size={18} color="#6B7280" />
          <Text style={styles.inputLabel}>Website</Text>
        </View>
        <TextInput
          style={styles.input}
          value={artistData.websiteUrl}
          onChangeText={(text) => setArtistData({ ...artistData, websiteUrl: text })}
          placeholder="https://yoursite.com"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Launch</Text>
      <Text style={styles.stepSubtitle}>Your profile is almost ready!</Text>

      <View style={styles.reviewCard}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899', '#EF4444']}
          style={styles.reviewGradient}
        >
          <View style={styles.reviewContent}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                {artistData.profilePhoto ? (
                  <Image source={{ uri: artistData.profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={28} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewName}>{artistData.artistName || 'Your Name'}</Text>
                <Text style={styles.reviewGenre}>
                  {artistData.genres.slice(0, 3).join(' · ') || 'Select genres'}
                </Text>
              </View>
            </View>
            {artistData.bio ? (
              <Text style={styles.reviewBio} numberOfLines={2}>{artistData.bio}</Text>
            ) : null}
            {artistData.location ? (
              <View style={styles.reviewLocation}>
                <Ionicons name="location" size={14} color="#D1D5DB" />
                <Text style={styles.reviewLocationText}>{artistData.location}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </View>

      <View style={styles.reviewChecklist}>
        <Text style={styles.checklistTitle}>Profile Checklist</Text>
        <ChecklistItem label="Artist name" done={!!artistData.artistName} />
        <ChecklistItem label="Bio" done={!!artistData.bio} />
        <ChecklistItem label="Location" done={!!artistData.location} />
        <ChecklistItem label="Genres" done={artistData.genres.length > 0} />
        <ChecklistItem label="Profile photo" done={!!artistData.profilePhoto} />
        <ChecklistItem label="Social links" done={!!(artistData.spotifyUrl || artistData.instagramHandle)} />
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1: return artistData.artistName.length > 0;
      case 2: return artistData.bio.length > 0 && artistData.location.length > 0;
      case 3: return artistData.genres.length > 0;
      default: return true;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.progressContainer}>
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progress}%` }]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue() && styles.continueButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canContinue() || isLoading}
          >
            <LinearGradient
              colors={canContinue() ? ['#8B5CF6', '#EC4899'] : ['#374151', '#374151']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {currentStep === totalSteps ? 'Create Profile' : 'Continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ChecklistItem = ({ label, done }: { label: string; done: boolean }) => (
  <View style={styles.checklistItem}>
    <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
      {done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
    </View>
    <Text style={[styles.checklistLabel, done && styles.checklistLabelDone]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  placeholder: {
    width: 44,
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#1F2937',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bandToggle: {
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
  },
  toggleOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextSelected: {
    color: '#FFFFFF',
  },
  imageUploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageUploadContainer: {
    flex: 1,
    gap: 8,
  },
  imageUpload: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  uploadText: {
    fontSize: 12,
    color: '#6B7280',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  genreChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  genreChipText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  genreChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  selectedText: {
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
  },
  reviewCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  reviewGradient: {
    padding: 2,
  },
  reviewContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reviewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reviewGenre: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  reviewBio: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  reviewLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewLocationText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  reviewChecklist: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checklistLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  checklistLabelDone: {
    color: '#D1D5DB',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ArtistOnboardingScreen;
