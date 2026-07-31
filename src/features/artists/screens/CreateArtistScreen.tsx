import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { ArtistAccountService, ArtistAccount } from '../../../services/artistAccountService';

// Genre options from web application
const GENRE_OPTIONS = [
  'Pop', 'Pop Rock', 'Pop Punk', 'Indie Pop', 'Synth Pop', 'Electropop', 'Dream Pop', 'Art Pop',
  'Rock', 'Alternative Rock', 'Indie Rock', 'Hard Rock', 'Progressive Rock', 'Psychedelic Rock', 
  'Folk Rock', 'Blues Rock', 'Punk Rock', 'Post-Punk', 'Grunge', 'Emo', 'Screamo', 'Math Rock',
  'Hip-Hop', 'Rap', 'Trap', 'Drill', 'Boom Bap', 'Conscious Hip-Hop', 'Alternative Hip-Hop',
  'Experimental Hip-Hop', 'Lo-Fi Hip-Hop', 'Jazz Rap', 'Gangsta Rap', 'East Coast Hip-Hop',
  'West Coast Hip-Hop', 'Southern Hip-Hop', 'UK Drill', 'Grime',
  'Electronic', 'EDM', 'House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'Ambient',
  'IDM', 'Breakbeat', 'Garage', 'UK Garage', 'Future Garage', 'Dub', 'Reggae',
  'R&B', 'Soul', 'Neo-Soul', 'Contemporary R&B', 'Alternative R&B', 'Funk', 'Disco',
  'Motown', 'Gospel', 'Blues', 'Jazz', 'Smooth Jazz', 'Fusion',
  'Country', 'Country Pop', 'Country Rock', 'Bluegrass', 'Folk', 'Indie Folk', 'Americana',
  'Singer-Songwriter', 'Acoustic', 'Roots',
  'Metal', 'Heavy Metal', 'Death Metal', 'Black Metal', 'Thrash Metal', 'Power Metal',
  'Progressive Metal', 'Nu Metal', 'Metalcore', 'Deathcore', 'Doom Metal', 'Sludge Metal',
  'Latin', 'Reggaeton', 'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Flamenco', 'Bossa Nova',
  'Samba', 'Tango', 'Mariachi', 'Latin Pop', 'Latin Rock',
  'World Music', 'African', 'Middle Eastern', 'Indian', 'Asian', 'Celtic', 'Flamenco',
  'Klezmer', 'Gypsy', 'Traditional', 'Folkloric',
  'Experimental', 'Avant-Garde', 'Minimalism', 'Contemporary Classical', 'Sound Art', 'Field Recordings',
  'Soundtrack', 'Film Score', 'Video Game Music', 'Instrumental', 'Post-Rock',
  'Classical', 'Orchestral', 'Chamber Music', 'Opera', 'Choral',
  'Lo-Fi', 'Chillwave', 'Vaporwave', 'Synthwave', 'Retrowave', 'City Pop', 'J-Pop',
  'K-Pop', 'C-Pop', 'Tropical House', 'Future Bass', 'Trap Soul', 'Alternative',
  'Indie', 'Underground', 'DIY', 'Bedroom Pop', 'Hyperpop', 'PC Music'
];

// Band types from web application
const BAND_TYPES = [
  'Rock Band', 'Jazz Ensemble', 'Electronic Duo', 'Folk Group', 'Pop Band', 'Hip-Hop Collective',
  'Classical Ensemble', 'Country Band', 'R&B Group', 'Indie Band', 'Metal Band', 'Punk Band',
  'Reggae Band', 'Blues Band', 'Funk Band', 'Soul Group', 'Alternative Band', 'Experimental Group',
  'Acoustic Ensemble', 'Symphony Orchestra', 'Chamber Group', 'Big Band', 'Quartet', 'Trio', 'Duo',
  'Solo Artist with Band', 'Supergroup', 'Cover Band', 'Tribute Band', 'Other'
];

export default function CreateArtistScreen({ navigation }: any) {
  const { user } = useAuth();
  const [existingArtistAccount, setExistingArtistAccount] = useState<ArtistAccount | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [formData, setFormData] = useState({
    // Basic Information
    artistName: '',
    bio: '',
    biography: '',
    genre: [] as string[],
    location: '',
    profileImage: '',
    bannerImage: '',
    
    // Band Information
    isBand: false,
    bandMembers: [] as string[],
    bandType: '',
    primaryArtistName: '',
    
    // Career & Music
    careerHighlights: [] as Array<{
      year: string;
      title: string;
      description: string;
    }>,
    musicalStyle: '',
    influences: '',
    
    // Social Media Links
    socialLinks: {
      spotify: '',
      instagram: '',
      twitter: '',
      youtube: '',
      website: '',
    },
    
    // Stats (manual entry)
    monthlyListeners: 0,
    totalStreams: 0,
    
    // Future Releases
    futureReleases: [] as Array<{
      title: string;
      releaseDate: string;
      description: string;
      type: 'single' | 'ep' | 'album' | 'mixtape';
    }>,
    
    // Spotify Integration
    spotifyProfileUrl: '',
    spotifyData: {},
    
    // Color Scheme
    cardGradientStart: '#8b5cf6',
    cardGradientMiddle: '#ec4899',
    cardGradientEnd: '#ef4444',
    accentColor: '#8b5cf6',
    textColor: '#ffffff'
  });

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showBandTypeModal, setShowBandTypeModal] = useState(false);
  const [genreSearch, setGenreSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Check for existing artist account on component mount
  useEffect(() => {
    const checkExistingAccount = async () => {
      if (!user?.id) {
        setCheckingAccount(false);
        return;
      }

      try {
        const existingAccount = await ArtistAccountService.getUserArtistAccount(user.id);
        setExistingArtistAccount(existingAccount);
      } catch (error) {
        console.error('Error checking existing artist account:', error);
      } finally {
        setCheckingAccount(false);
      }
    };

    checkExistingAccount();
  }, [user?.id]);

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.artistName.trim()) {
      errors.artistName = 'Artist name is required';
    }
    
    if (formData.genre.length === 0) {
      errors.genre = 'At least one genre is required';
    }
    
    if (!formData.bio.trim()) {
      errors.bio = 'Bio is required';
    }
    
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }
    
    if (formData.isBand && !formData.primaryArtistName.trim()) {
      errors.primaryArtistName = 'Band name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Image picker functions
  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, profileImage: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickBannerImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, bannerImage: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Genre selection functions
  const toggleGenre = (genre: string) => {
    if (formData.genre.includes(genre)) {
      setFormData(prev => ({
        ...prev,
        genre: prev.genre.filter(g => g !== genre)
      }));
    } else if (formData.genre.length < 4) {
      setFormData(prev => ({
        ...prev,
        genre: [...prev.genre, genre]
      }));
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genre: prev.genre.filter(g => g !== genre)
    }));
  };

  // Career highlights functions
  const addCareerHighlight = () => {
    setFormData(prev => ({
      ...prev,
      careerHighlights: [...prev.careerHighlights, { year: '', title: '', description: '' }]
    }));
  };

  const updateCareerHighlight = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      careerHighlights: prev.careerHighlights.map((highlight, i) => 
        i === index ? { ...highlight, [field]: value } : highlight
      )
    }));
  };

  const removeCareerHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      careerHighlights: prev.careerHighlights.filter((_, i) => i !== index)
    }));
  };

  // Future releases functions
  const addFutureRelease = () => {
    setFormData(prev => ({
      ...prev,
      futureReleases: [...prev.futureReleases, { title: '', releaseDate: '', description: '', type: 'single' }]
    }));
  };

  const updateFutureRelease = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      futureReleases: prev.futureReleases.map((release, i) => 
        i === index ? { ...release, [field]: value } : release
      )
    }));
  };

  const removeFutureRelease = (index: number) => {
    setFormData(prev => ({
      ...prev,
      futureReleases: prev.futureReleases.filter((_, i) => i !== index)
    }));
  };

  // Save to Supabase
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a profile');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setIsSaving(true);
    try {
      // Check if user already has an artist account
      const hasExistingAccount = await ArtistAccountService.userHasArtistAccount(user.id);
      
      if (hasExistingAccount) {
        // Update existing account
        const existingAccount = await ArtistAccountService.getUserArtistAccount(user.id);
        if (existingAccount) {
          const updateResult = await ArtistAccountService.updateArtistAccount(existingAccount.id, {
            artist_name: formData.isBand ? formData.primaryArtistName : formData.artistName,
            bio: formData.bio,
            biography: formData.biography,
            genre: formData.genre,
            location: formData.location,
            profile_photo: formData.profileImage || undefined,
            banner_photo: formData.bannerImage || undefined,
            is_band: formData.isBand,
            band_type: formData.bandType || undefined,
            musical_style: formData.musicalStyle || undefined,
            influences: formData.influences || undefined,
            monthly_listeners: formData.monthlyListeners || 0,
            total_streams: formData.totalStreams || 0,
            spotify_profile_url: formData.socialLinks?.spotify || undefined,
            instagram_handle: formData.socialLinks?.instagram || undefined,
            twitter_handle: formData.socialLinks?.twitter || undefined,
            youtube_channel_id: formData.socialLinks?.youtube || undefined,
            website_url: formData.socialLinks?.website || undefined,
          });

          if (updateResult.success) {
            Alert.alert('Success', 'Artist profile updated successfully!', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } else {
            Alert.alert('Error', updateResult.error || 'Failed to update artist profile. Please try again.');
          }
        }
      } else {
        // Create new account
        const createResult = await ArtistAccountService.createArtistAccount({
          user_id: user.id,
          artist_name: formData.isBand ? formData.primaryArtistName : formData.artistName,
          bio: formData.bio,
          biography: formData.biography,
          genre: formData.genre,
          location: formData.location,
          profile_photo: formData.profileImage || undefined,
          banner_photo: formData.bannerImage || undefined,
          is_band: formData.isBand,
          band_type: formData.bandType || undefined,
          musical_style: formData.musicalStyle || undefined,
          influences: formData.influences || undefined,
          monthly_listeners: formData.monthlyListeners || 0,
          total_streams: formData.totalStreams || 0,
          spotify_profile_url: formData.socialLinks?.spotify || undefined,
          instagram_handle: formData.socialLinks?.instagram || undefined,
          twitter_handle: formData.socialLinks?.twitter || undefined,
          youtube_channel_id: formData.socialLinks?.youtube || undefined,
          website_url: formData.socialLinks?.website || undefined,
        });

        if (createResult.success) {
          Alert.alert('Success', 'Artist profile created successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('Error', createResult.error || 'Failed to create artist profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error with artist profile:', error);
      Alert.alert('Error', 'Failed to process artist profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredGenres = GENRE_OPTIONS.filter(genre =>
    genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  // Show loading state while checking for existing account
  if (checkingAccount) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Become an Artist</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Checking your account...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show existing artist account details if user already has one
  if (existingArtistAccount) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gradient}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Artist Account</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.existingAccountContainer}>
              {/* Account Status */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Ionicons 
                    name={existingArtistAccount.is_approved ? "checkmark-circle" : "time"} 
                    size={24} 
                    color={existingArtistAccount.is_approved ? "#3B82F6" : "#F59E0B"} 
                  />
                  <Text style={styles.statusTitle}>
                    {existingArtistAccount.is_approved ? "Approved" : "Pending Approval"}
                  </Text>
                </View>
                <Text style={styles.statusDescription}>
                  {existingArtistAccount.is_approved 
                    ? "Your artist account is live and visible to other users!"
                    : "Your artist account is under review. You'll be notified once it's approved."
                  }
                </Text>
                {existingArtistAccount.approval_notes && (
                  <Text style={styles.approvalNotes}>
                    Note: {existingArtistAccount.approval_notes}
                  </Text>
                )}
              </View>

              {/* Artist Details */}
              <View style={styles.artistDetailsCard}>
                <Text style={styles.cardTitle}>Artist Details</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Artist Name:</Text>
                  <Text style={styles.detailValue}>{existingArtistAccount.artist_name}</Text>
                </View>

                {existingArtistAccount.bio && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bio:</Text>
                    <Text style={styles.detailValue}>{existingArtistAccount.bio}</Text>
                  </View>
                )}

                {existingArtistAccount.genre && existingArtistAccount.genre.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Genres:</Text>
                    <Text style={styles.detailValue}>{existingArtistAccount.genre.join(', ')}</Text>
                  </View>
                )}

                {existingArtistAccount.profile_photo && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Profile Photo:</Text>
                    <Image 
                      source={{ uri: existingArtistAccount.profile_photo }} 
                      style={styles.profileImagePreview}
                    />
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(existingArtistAccount.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {existingArtistAccount.approved_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Approved:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(existingArtistAccount.approved_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => {
                    // Switch to edit mode
                    setFormData({
                      artistName: existingArtistAccount.artist_name,
                      bio: existingArtistAccount.bio || '',
                      biography: '',
                      genre: existingArtistAccount.genre || [],
                      location: '',
                      profileImage: existingArtistAccount.profile_photo || '',
                      bannerImage: '',
                      isBand: false,
                      bandMembers: [],
                      bandType: '',
                      primaryArtistName: '',
                      careerHighlights: [],
                      musicalStyle: '',
                      influences: '',
                      socialLinks: {
                        spotify: '',
                        instagram: '',
                        twitter: '',
                        youtube: '',
                        website: '',
                      },
                      monthlyListeners: 0,
                      totalStreams: 0,
                      futureReleases: [],
                      spotifyProfileUrl: '',
                      spotifyData: {},
                      cardGradientStart: '#8b5cf6',
                      cardGradientMiddle: '#ec4899',
                      cardGradientEnd: '#ef4444',
                      accentColor: '#8b5cf6',
                      textColor: '#ffffff'
                    });
                    setExistingArtistAccount(null); // Switch to edit mode
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Edit Account</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => {
                    // Navigate to artist profile view
                    navigation.navigate('ArtistProfileView', {
                      artistId: existingArtistAccount.id,
                      userId: user?.id, // Pass the user_id for profile loading
                      artistData: existingArtistAccount
                    });
                  }}
                >
                  <Ionicons name="eye-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.buttonText, { color: '#3B82F6' }]}>View Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Info Message */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#6B7280" />
                <Text style={styles.infoText}>
                  You can only have one artist account. To create a new one, you would need to delete your current account first.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Become an Artist</Text>
            <Text style={styles.headerSubtitle}>Create your artist profile</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Basic Information Section */}
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            {/* Band Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setFormData(prev => ({ ...prev, isBand: !prev.isBand }))}
              >
                <Ionicons 
                  name={formData.isBand ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={formData.isBand ? "#3B82F6" : "#9CA3AF"} 
                />
                <Text style={styles.checkboxLabel}>This is a band (multiple artists)</Text>
              </TouchableOpacity>
            </View>

            {/* Artist/Band Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, validationErrors.artistName && styles.errorLabel]}>
                {formData.isBand ? 'Band Name' : 'Artist Name'} *
              </Text>
              <TextInput
                style={[styles.input, validationErrors.artistName && styles.errorInput]}
                value={formData.isBand ? formData.primaryArtistName : formData.artistName}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  [formData.isBand ? 'primaryArtistName' : 'artistName']: text
                }))}
                placeholder={formData.isBand ? "Enter your band name" : "Enter your artist name"}
                placeholderTextColor="#6B7280"
              />
              {validationErrors.artistName && (
                <Text style={styles.errorText}>{validationErrors.artistName}</Text>
              )}
            </View>

            {/* Genre Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, validationErrors.genre && styles.errorLabel]}>
                Genre * ({formData.genre.length}/4)
              </Text>
              <TouchableOpacity 
                style={styles.genreSelector}
                onPress={() => setShowGenreModal(true)}
              >
                <Text style={styles.genreSelectorText}>
                  {formData.genre.length > 0 ? formData.genre.join(', ') : 'Select genres (up to 4)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {validationErrors.genre && (
                <Text style={styles.errorText}>{validationErrors.genre}</Text>
              )}
              
              {/* Selected Genres */}
              {formData.genre.length > 0 && (
                <View style={styles.selectedGenres}>
                  {formData.genre.map((genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{genre}</Text>
                      <TouchableOpacity onPress={() => removeGenre(genre)}>
                        <Ionicons name="close" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, validationErrors.location && styles.errorLabel]}>
                Location *
              </Text>
              <TextInput
                style={[styles.input, validationErrors.location && styles.errorInput]}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="City, State/Country"
                placeholderTextColor="#6B7280"
              />
              {validationErrors.location && (
                <Text style={styles.errorText}>{validationErrors.location}</Text>
              )}
            </View>

            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, validationErrors.bio && styles.errorLabel]}>
                Short Bio *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, validationErrors.bio && styles.errorInput]}
                value={formData.bio}
                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                placeholder="Tell us about your music, influences, and journey"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
              {validationErrors.bio && (
                <Text style={styles.errorText}>{validationErrors.bio}</Text>
              )}
            </View>

            {/* Detailed Biography */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Detailed Biography</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.biography}
                onChangeText={(text) => setFormData(prev => ({ ...prev, biography: text }))}
                placeholder="Write a more detailed biography (optional)"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={6}
              />
            </View>

            {/* Profile Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Image</Text>
              <TouchableOpacity style={styles.imageUpload} onPress={pickProfileImage}>
                {formData.profileImage ? (
                  <Image source={{ uri: formData.profileImage }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#3B82F6" />
                    <Text style={styles.imagePlaceholderText}>Upload Profile Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Banner Image */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Banner Image</Text>
              <TouchableOpacity style={styles.bannerUpload} onPress={pickBannerImage}>
                {formData.bannerImage ? (
                  <Image source={{ uri: formData.bannerImage }} style={styles.bannerPreview} />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Ionicons name="image" size={32} color="#3B82F6" />
                    <Text style={styles.bannerPlaceholderText}>Upload Banner Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Band Information */}
            {formData.isBand && (
              <>
                <Text style={styles.sectionTitle}>Band Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Band Type</Text>
                  <TouchableOpacity 
                    style={styles.selector}
                    onPress={() => setShowBandTypeModal(true)}
                  >
                    <Text style={styles.selectorText}>
                      {formData.bandType || 'Select band type'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Band Members</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.bandMembers.join(', ')}
                    onChangeText={(text) => setFormData(prev => ({
                      ...prev,
                      bandMembers: text.split(',').map(member => member.trim()).filter(member => member)
                    }))}
                    placeholder="Enter band member names (comma separated)"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </>
            )}

            {/* Social Media Links */}
            <Text style={styles.sectionTitle}>Social Media Links</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Spotify</Text>
              <TextInput
                style={styles.input}
                value={formData.socialLinks.spotify}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, spotify: text }
                }))}
                placeholder="https://open.spotify.com/artist/..."
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={formData.socialLinks.instagram}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, instagram: text }
                }))}
                placeholder="https://instagram.com/yourusername"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Twitter/X</Text>
              <TextInput
                style={styles.input}
                value={formData.socialLinks.twitter}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, twitter: text }
                }))}
                placeholder="https://twitter.com/yourusername"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                value={formData.socialLinks.youtube}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, youtube: text }
                }))}
                placeholder="https://youtube.com/@yourchannel"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.socialLinks.website}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, website: text }
                }))}
                placeholder="https://yourwebsite.com"
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Stats Section */}
            <Text style={styles.sectionTitle}>Music Statistics</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly Listeners *</Text>
              <TextInput
                style={styles.input}
                value={formData.monthlyListeners.toString()}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  monthlyListeners: parseInt(text) || 0
                }))}
                placeholder="Enter your current monthly listeners"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Streams *</Text>
              <TextInput
                style={styles.input}
                value={formData.totalStreams.toString()}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  totalStreams: parseInt(text) || 0
                }))}
                placeholder="Enter your total lifetime streams"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>

            {/* Musical Style & Influences */}
            <Text style={styles.sectionTitle}>Musical Style & Influences</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Musical Style</Text>
              <TextInput
                style={styles.input}
                value={formData.musicalStyle}
                onChangeText={(text) => setFormData(prev => ({ ...prev, musicalStyle: text }))}
                placeholder="e.g., Hip-Hop, R&B, Rap, Pop"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Influences</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.influences}
                onChangeText={(text) => setFormData(prev => ({ ...prev, influences: text }))}
                placeholder="Describe your musical influences and inspirations"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Career Highlights */}
            <Text style={styles.sectionTitle}>Career Highlights</Text>
            <Text style={styles.sectionSubtitle}>Your major achievements and milestones</Text>
            
            {formData.careerHighlights.map((highlight, index) => (
              <View key={index} style={styles.highlightCard}>
                <View style={styles.highlightHeader}>
                  <Text style={styles.highlightTitle}>Career Highlight {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeCareerHighlight(index)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.highlightInputs}>
                  <TextInput
                    style={[styles.input, styles.highlightInput]}
                    value={highlight.year}
                    onChangeText={(text) => updateCareerHighlight(index, 'year', text)}
                    placeholder="Year"
                    placeholderTextColor="#6B7280"
                  />
                  <TextInput
                    style={[styles.input, styles.highlightInput]}
                    value={highlight.title}
                    onChangeText={(text) => updateCareerHighlight(index, 'title', text)}
                    placeholder="Award/Title"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={highlight.description}
                  onChangeText={(text) => updateCareerHighlight(index, 'description', text)}
                  placeholder="Description"
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))}
            
            <TouchableOpacity style={styles.addButton} onPress={addCareerHighlight}>
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addButtonText}>Add Career Highlight</Text>
            </TouchableOpacity>

            {/* Future Releases */}
            <Text style={styles.sectionTitle}>Future Releases</Text>
            <Text style={styles.sectionSubtitle}>Share your upcoming music plans</Text>
            
            {formData.futureReleases.map((release, index) => (
              <View key={index} style={styles.releaseCard}>
                <View style={styles.releaseHeader}>
                  <Text style={styles.releaseTitle}>Release {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeFutureRelease(index)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.input}
                  value={release.title}
                  onChangeText={(text) => updateFutureRelease(index, 'title', text)}
                  placeholder="Release Title"
                  placeholderTextColor="#6B7280"
                />
                
                <View style={styles.releaseInputs}>
                  <TextInput
                    style={[styles.input, styles.releaseInput]}
                    value={release.releaseDate}
                    onChangeText={(text) => updateFutureRelease(index, 'releaseDate', text)}
                    placeholder="Release Date (MM/DD/YYYY)"
                    placeholderTextColor="#6B7280"
                  />
                  <View style={styles.releaseTypeSelector}>
                    <Text style={styles.releaseTypeLabel}>Type:</Text>
                    <View style={styles.releaseTypeOptions}>
                      {['single', 'ep', 'album', 'mixtape'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.releaseTypeOption,
                            release.type === type && styles.releaseTypeOptionSelected
                          ]}
                          onPress={() => updateFutureRelease(index, 'type', type)}
                        >
                          <Text style={[
                            styles.releaseTypeOptionText,
                            release.type === type && styles.releaseTypeOptionTextSelected
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={release.description}
                  onChangeText={(text) => updateFutureRelease(index, 'description', text)}
                  placeholder="Description"
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={3}
                />
              </View>
            ))}
            
            <TouchableOpacity style={styles.addButton} onPress={addFutureRelease}>
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addButtonText}>Add Future Release</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {existingArtistAccount ? 'Update Artist Profile' : 'Create Artist Profile'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Genre Selection Modal */}
        <Modal
          visible={showGenreModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Genres ({formData.genre.length}/4)</Text>
              <TouchableOpacity onPress={() => setShowGenreModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search genres..."
              placeholderTextColor="#6B7280"
              value={genreSearch}
              onChangeText={setGenreSearch}
            />
            
            <FlatList
              data={filteredGenres}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = formData.genre.includes(item);
                const isDisabled = !isSelected && formData.genre.length >= 4;
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.genreItem,
                      isSelected && styles.genreItemSelected,
                      isDisabled && styles.genreItemDisabled
                    ]}
                    onPress={() => !isDisabled && toggleGenre(item)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.genreItemText,
                      isSelected && styles.genreItemTextSelected,
                      isDisabled && styles.genreItemTextDisabled
                    ]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              }}
              style={styles.genreList}
            />
          </SafeAreaView>
        </Modal>

        {/* Band Type Selection Modal */}
        <Modal
          visible={showBandTypeModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Band Type</Text>
              <TouchableOpacity onPress={() => setShowBandTypeModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={BAND_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bandTypeItem,
                    formData.bandType === item && styles.bandTypeItemSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, bandType: item }));
                    setShowBandTypeModal(false);
                  }}
                >
                  <Text style={[
                    styles.bandTypeItemText,
                    formData.bandType === item && styles.bandTypeItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {formData.bandType === item && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
              )}
              style={styles.bandTypeList}
            />
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  form: {
    paddingVertical: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginTop: 20,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Checkbox styles
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Error styles
  errorLabel: {
    color: '#EF4444',
  },
  errorInput: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  // Genre selector styles
  genreSelector: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreSelectorText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  selectedGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreTagText: {
    color: '#3B82F6',
    fontSize: 14,
    marginRight: 4,
  },
  // Image upload styles
  imageUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#3B82F6',
    marginTop: 8,
    fontSize: 14,
  },
  bannerUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  bannerPreview: {
    width: '100%',
    height: 76,
    borderRadius: 8,
  },
  bannerPlaceholder: {
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    color: '#3B82F6',
    marginTop: 8,
    fontSize: 14,
  },
  // Selector styles
  selector: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  // Career highlights styles
  highlightCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  highlightInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  highlightInput: {
    flex: 1,
  },
  // Future releases styles
  releaseCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  releaseInputs: {
    marginBottom: 12,
  },
  releaseInput: {
    marginBottom: 12,
  },
  releaseTypeSelector: {
    marginBottom: 12,
  },
  releaseTypeLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  releaseTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  releaseTypeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  releaseTypeOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  releaseTypeOptionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  releaseTypeOptionTextSelected: {
    color: '#3B82F6',
  },
  // Add button styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    margin: 16,
  },
  genreList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  genreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  genreItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  genreItemDisabled: {
    opacity: 0.5,
  },
  genreItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  genreItemTextSelected: {
    color: '#3B82F6',
  },
  genreItemTextDisabled: {
    color: '#6B7280',
  },
  bandTypeList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bandTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  bandTypeItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  bandTypeItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  bandTypeItemTextSelected: {
    color: '#3B82F6',
  },
  // Existing account styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  existingAccountContainer: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusDescription: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  approvalNotes: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  artistDetailsCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    width: 120,
    marginRight: 8,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  profileImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
});
