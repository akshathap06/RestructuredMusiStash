import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface ArtistProfile {
  id: string;
  artist_name: string;
  bio: string;
  biography: string;
  profile_photo: string;
  banner_photo: string;
  genre: string[];
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  monthly_listeners?: number;
  total_streams?: number;
  spotify_followers?: number;
  is_verified: boolean;
  social_links?: Record<string, string>;
  career_highlights?: any[];
  musical_style?: string;
  influences?: string;
  // Band support fields
  is_band?: boolean;
  band_members?: any[];
  band_type?: string;
  primary_artist_name?: string;
  // Social media fields
  spotify_profile_url?: string;
  spotify_artist_id?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  youtube_channel_id?: string;
  website_url?: string;
  // Additional fields
  future_releases?: any[];
  spotify_embed_urls?: string[];
  spotify_data?: any;
  verified_status?: boolean;
}

const ArtistProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Hide header when creating/editing
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Form state for editing - comprehensive fields from web app
  const [formData, setFormData] = useState({
    // Basic info
    artist_name: '',
    bio: '',
    biography: '',
    genre: '',
    location: '',
    musical_style: '',
    influences: '',
    
    // Band support
    is_band: false,
    band_type: '',
    primary_artist_name: '',
    
    // Stats
    monthly_listeners: '',
    total_streams: '',
    spotify_followers: '',
    
    // Social media
    spotify_profile_url: '',
    spotify_artist_id: '',
    instagram_handle: '',
    twitter_handle: '',
    youtube_channel_id: '',
    website_url: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      
      if (!user) return;

      const { data: profileData } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFormData({
          artist_name: profileData.artist_name || '',
          bio: profileData.bio || '',
          biography: profileData.biography || '',
          genre: profileData.genre?.join(', ') || '',
          location: profileData.location || '',
          musical_style: profileData.musical_style || '',
          influences: profileData.influences || '',
          is_band: profileData.is_band || false,
          band_type: profileData.band_type || '',
          primary_artist_name: profileData.primary_artist_name || '',
          monthly_listeners: profileData.monthly_listeners?.toString() || '',
          total_streams: profileData.total_streams?.toString() || '',
          spotify_followers: profileData.spotify_followers?.toString() || '',
          spotify_profile_url: profileData.spotify_profile_url || '',
          spotify_artist_id: profileData.spotify_artist_id || '',
          instagram_handle: profileData.instagram_handle || '',
          twitter_handle: profileData.twitter_handle || '',
          youtube_channel_id: profileData.youtube_channel_id || '',
          website_url: profileData.website_url || '',
        });
      } else {
        // No profile exists, set editing mode
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setIsEditing(true); // Allow creating new profile
    } finally {
      setIsLoading(false);
    }
  };

  // Step navigation
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setIsEditing(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Basic Information
        return formData.artist_name.trim() !== '';
      case 2: // Band Information
        return !formData.is_band || (formData.band_type !== '' && formData.primary_artist_name.trim() !== '');
      case 3: // Statistics
        return true; // All optional
      case 4: // Social Media
        return true; // All optional
      case 5: // Career Highlights
        return true; // Optional
      case 6: // Future Releases
        return true; // Optional
      default:
        return false;
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      if (!user) return;

      // Prepare the data - only include fields that exist in the database schema
      // Filter out non-existent columns to prevent PGRST204 errors
      const allowedFields = [
        'artist_name', 'bio', 'biography', 'genre', 'location', 'musical_style', 'influences',
        'is_band', 'band_type', 'monthly_listeners', 'total_streams',
        'spotify_profile_url', 'instagram_handle', 'twitter_handle',
        'youtube_channel_id', 'website_url', 'updated_at'
      ];
      
      const updateData: any = {
        artist_name: formData.artist_name || '',
        bio: formData.bio || '',
        biography: formData.biography || '',
        genre: formData.genre.split(',').map(g => g.trim()).filter(g => g),
        location: formData.location || '',
        musical_style: formData.musical_style || '',
        influences: formData.influences || '',
        is_band: formData.is_band,
        band_type: formData.band_type || '',
        monthly_listeners: formData.monthly_listeners ? Number(formData.monthly_listeners) : 0,
        total_streams: formData.total_streams ? Number(formData.total_streams) : 0,
        spotify_profile_url: formData.spotify_profile_url || '',
        instagram_handle: formData.instagram_handle || '',
        twitter_handle: formData.twitter_handle || '',
        youtube_channel_id: formData.youtube_channel_id || '',
        website_url: formData.website_url || '',
        updated_at: new Date().toISOString(),
      };
      
      // Filter to only include allowed fields
      const filteredUpdateData: any = {};
      for (const key in updateData) {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          filteredUpdateData[key] = updateData[key];
        }
      }

      if (profile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('artist_profiles')
          .update(filteredUpdateData)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('artist_profiles')
          .insert({
            ...filteredUpdateData,
            user_id: user.id,
            status: 'pending',
            is_verified: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      }

      setIsEditing(false);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={isEditing ? handleBack : () => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {profile && !isEditing ? 'Artist Profile' : 'Create Artist Profile'}
          </Text>
          {!isEditing && profile ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setIsEditing(false); setCurrentStep(1); navigation.goBack(); }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

      {/* Progress Bar (only in edit mode) */}
      {isEditing && (
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#3B82F6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${(currentStep / totalSteps) * 100}%` }]}
          />
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Display/Edit Mode */}
        {!isEditing && profile ? (
          // View Mode
          <View style={styles.viewMode}>
            {/* Profile Header */}
            <LinearGradient
              colors={['#3B82F6', '#3B82F6']}
              style={styles.profileHeader}
            >
              <Image
                source={{ uri: profile.profile_photo || 'https://via.placeholder.com/120' }}
                style={styles.profileImage}
              />
              <Text style={styles.artistName}>{profile.artist_name}</Text>
              {profile.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  <Text style={styles.verifiedText}>Verified Artist</Text>
                </View>
              )}
              <Text style={styles.status}>Status: {profile.status?.toUpperCase()}</Text>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profile.monthly_listeners || 0)}</Text>
                <Text style={styles.statLabel}>Monthly Listeners</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profile.total_streams || 0)}</Text>
                <Text style={styles.statLabel}>Total Streams</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(profile.spotify_followers || 0)}</Text>
                <Text style={styles.statLabel}>Spotify Followers</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bioText}>{profile.bio || 'No bio available'}</Text>
            </View>

            {/* Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Genre:</Text>
                <Text style={styles.detailValue}>{profile.genre?.join(', ') || 'Not specified'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>{profile.location || 'Not specified'}</Text>
              </View>
              {profile.musical_style && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Musical Style:</Text>
                  <Text style={styles.detailValue}>{profile.musical_style}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Edit Mode - Multi-step Form
          <View style={styles.editMode}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <Text style={styles.sectionSubtitle}>Tell us about your music</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Artist Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.artist_name}
                    onChangeText={(text) => setFormData(prev => ({...prev, artist_name: text}))}
                    placeholder="Enter artist name"
                    placeholderTextColor="#52525B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={formData.bio}
                    onChangeText={(text) => setFormData(prev => ({...prev, bio: text}))}
                    placeholder="Tell us about your music..."
                    placeholderTextColor="#52525B"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Detailed Biography</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={formData.biography}
                    onChangeText={(text) => setFormData(prev => ({...prev, biography: text}))}
                    placeholder="Detailed biography for your profile..."
                    placeholderTextColor="#52525B"
                  multiline
                  numberOfLines={6}
                />
              </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Genre (comma-separated)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.genre}
                    onChangeText={(text) => setFormData(prev => ({...prev, genre: text}))}
                    placeholder="Pop, Rock, Hip-Hop"
                    placeholderTextColor="#52525B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({...prev, location: text}))}
                    placeholder="City, Country"
                    placeholderTextColor="#52525B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Musical Style</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.musical_style}
                    onChangeText={(text) => setFormData(prev => ({...prev, musical_style: text}))}
                    placeholder="Describe your musical style"
                    placeholderTextColor="#52525B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Influences</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={formData.influences}
                    onChangeText={(text) => setFormData(prev => ({...prev, influences: text}))}
                    placeholder="Artists that influence your music"
                    placeholderTextColor="#52525B"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </>
            )}

            {/* Step 2: Band Information */}
            {currentStep === 2 && (
              <>
                <Text style={styles.sectionTitle}>Band Information</Text>
                <Text style={styles.sectionSubtitle}>Are you a solo artist or part of a band?</Text>
                
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>This is a band</Text>
                  <Switch
                    value={formData.is_band}
                    onValueChange={(value) => setFormData(prev => ({...prev, is_band: value}))}
                    trackColor={{ false: '#374151', true: '#3B82F6' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {formData.is_band ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Band Type <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.band_type}
                        onChangeText={(text) => setFormData(prev => ({...prev, band_type: text}))}
                        placeholder="Rock Band, Orchestra, etc."
                        placeholderTextColor="#52525B"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Band Members (comma-separated) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <TextInput
                        style={styles.textInput}
                        value={formData.primary_artist_name}
                        onChangeText={(text) => setFormData(prev => ({...prev, primary_artist_name: text}))}
                        placeholder="John Doe, Jane Smith, Mike Johnson"
                        placeholderTextColor="#52525B"
                      />
                    </View>
                  </>
                ) : (
                  <View style={{ padding: 24, backgroundColor: '#18181B', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center' }}>
                    <Text style={{ color: '#A1A1AA', textAlign: 'center' }}>You're set as a solo artist. Click Next to continue.</Text>
                  </View>
                )}
              </>
            )}

            {/* Step 3: Statistics */}
            {currentStep === 3 && (
              <>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <Text style={styles.sectionSubtitle}>Share your music metrics</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monthly Listeners</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.monthly_listeners}
                    onChangeText={(text) => setFormData(prev => ({...prev, monthly_listeners: text}))}
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Total Streams</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.total_streams}
                    onChangeText={(text) => setFormData(prev => ({...prev, total_streams: text}))}
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Spotify Followers</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.spotify_followers}
                    onChangeText={(text) => setFormData(prev => ({...prev, spotify_followers: text}))}
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {/* Step 4: Social Media */}
            {currentStep === 4 && (
              <>
                <Text style={styles.sectionTitle}>Social Media</Text>
                <Text style={styles.sectionSubtitle}>Connect your social profiles</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Spotify Profile URL</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.spotify_profile_url}
                    onChangeText={(text) => setFormData(prev => ({...prev, spotify_profile_url: text}))}
                    placeholder="https://open.spotify.com/artist/..."
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Instagram Handle</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.instagram_handle}
                    onChangeText={(text) => setFormData(prev => ({...prev, instagram_handle: text}))}
                    placeholder="@username"
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Twitter Handle</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.twitter_handle}
                    onChangeText={(text) => setFormData(prev => ({...prev, twitter_handle: text}))}
                    placeholder="@username"
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>YouTube URL</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.youtube_channel_id}
                    onChangeText={(text) => setFormData(prev => ({...prev, youtube_channel_id: text}))}
                    placeholder="https://youtube.com/@channel"
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Website</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.website_url}
                    onChangeText={(text) => setFormData(prev => ({...prev, website_url: text}))}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor="#52525B"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {/* Step 5: Career Highlights */}
            {currentStep === 5 && (
              <>
                <Text style={styles.sectionTitle}>Career Highlights</Text>
                <Text style={styles.sectionSubtitle}>Showcase your achievements</Text>
                
                <TouchableOpacity 
                  style={{ padding: 16, backgroundColor: '#18181B', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Ionicons name="add" size={20} color="#A78BFA" />
                  <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: '600' }}>Add Career Highlight</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 6: Future Releases */}
            {currentStep === 6 && (
              <>
                <Text style={styles.sectionTitle}>Future Releases</Text>
                <Text style={styles.sectionSubtitle}>What's coming next?</Text>
                
                <TouchableOpacity 
                  style={{ padding: 16, backgroundColor: '#18181B', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Ionicons name="add" size={20} color="#A78BFA" />
                  <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: '600' }}>Add Future Release</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons (only in edit mode) */}
      {isEditing && (
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={currentStep === totalSteps ? handleSave : handleNext}
            disabled={!canProceed() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <LinearGradient
                colors={['#3B82F6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === totalSteps ? (profile ? 'Update Profile' : 'Complete Profile') : 'Next'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#A1A1AA',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  editButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: '#18181B',
    width: '100%',
  },
  progressBarFill: {
    height: 2,
  },
  editButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  viewMode: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  status: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
  },
  editMode: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A1A1AA',
    marginBottom: 20,
    letterSpacing: 0,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E4E4E7',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: '#18181B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 52,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 100,
    minHeight: 52,
    shadowColor: 'rgba(139, 92, 246, 0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  navigationButtons: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 52,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default ArtistProfileScreen;