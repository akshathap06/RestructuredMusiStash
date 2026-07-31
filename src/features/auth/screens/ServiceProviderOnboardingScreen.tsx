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

const SERVICE_TYPES = [
  { id: 'producer', icon: 'musical-notes', title: 'Music Producer', description: 'Create beats and produce tracks' },
  { id: 'video_editor', icon: 'videocam', title: 'Video Editor', description: 'Edit music videos and content' },
  { id: 'sound_engineer', icon: 'mic', title: 'Sound Engineer', description: 'Professional audio recording' },
  { id: 'mixing_engineer', icon: 'options', title: 'Mixing Engineer', description: 'Mix and balance tracks' },
  { id: 'mastering_engineer', icon: 'trending-up', title: 'Mastering Engineer', description: 'Master final tracks' },
  { id: 'songwriter', icon: 'create', title: 'Songwriter', description: 'Write lyrics and melodies' },
  { id: 'musician', icon: 'musical-note', title: 'Session Musician', description: 'Play instruments on tracks' },
  { id: 'photographer', icon: 'camera', title: 'Photographer', description: 'Professional photo shoots' },
  { id: 'graphic_designer', icon: 'color-palette', title: 'Graphic Designer', description: 'Album art and branding' },
  { id: 'marketing_specialist', icon: 'megaphone', title: 'Marketing Specialist', description: 'Promote your music' },
];

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Country',
  'Jazz', 'Metal', 'Latin', 'Indie', 'Alternative', 'Classical',
];

const SPECIALIZATIONS: { [key: string]: string[] } = {
  producer: ['Beat Making', 'Sample Production', 'Track Arrangement', 'Sound Design', 'Mixing', 'Collaboration'],
  video_editor: ['Music Videos', 'Lyric Videos', 'Social Media Content', 'Live Performance', 'Color Grading', 'Motion Graphics'],
  sound_engineer: ['Studio Recording', 'Live Sound', 'Location Recording', 'Vocal Production', 'Podcast Recording', 'Audio Restoration'],
  mixing_engineer: ['Stem Mixing', 'Track Mixing', 'Live Mixing', 'Vocal Mixing', 'Instrumental Mixing', 'Genre Specialist'],
  mastering_engineer: ['Stereo Mastering', 'Stem Mastering', 'Vinyl Mastering', 'Streaming Optimization', 'LUFS Normalization', 'Genre Specialist'],
  songwriter: ['Lyric Writing', 'Melody Writing', 'Topline Writing', 'Co-Writing', 'Ghost Writing', 'Jingle Writing'],
  musician: ['Guitar', 'Bass', 'Drums', 'Keys', 'Strings', 'Horns'],
  photographer: ['Headshots', 'Album Covers', 'Live Concert', 'Promotional', 'Band Photos', 'Editorial'],
  graphic_designer: ['Album Art', 'Logo Design', 'Promotional Graphics', 'Social Media', 'Merch Design', 'Branding'],
  marketing_specialist: ['Social Media', 'PR Campaigns', 'Playlist Pitching', 'Email Marketing', 'Influencer Outreach', 'Brand Strategy'],
};

interface ServiceProviderOnboardingScreenProps {
  navigation: any;
}

interface ServiceData {
  serviceType: string;
  businessName: string;
  tagline: string;
  profilePhoto: string | null;
  bannerImage: string | null;
  bio: string;
  location: string;
  genres: string[];
  yearsExperience: string;
  basePrice: string;
  hourlyRate: string;
  minBudget: string;
  maxBudget: string;
  turnaroundTime: string;
  specializations: string[];
  email: string;
  phone: string;
  website: string;
  instagram: string;
  twitter: string;
  portfolioDescription: string;
}

const ServiceProviderOnboardingScreen: React.FC<ServiceProviderOnboardingScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = 7;

  const [serviceData, setServiceData] = useState<ServiceData>({
    serviceType: '',
    businessName: '',
    tagline: '',
    profilePhoto: null,
    bannerImage: null,
    bio: '',
    location: '',
    genres: [],
    yearsExperience: '',
    basePrice: '',
    hourlyRate: '',
    minBudget: '',
    maxBudget: '',
    turnaroundTime: '',
    specializations: [],
    email: '',
    phone: '',
    website: '',
    instagram: '',
    twitter: '',
    portfolioDescription: '',
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
      Alert.alert('Error', 'Please log in to create a service provider profile');
      return;
    }

    setIsLoading(true);
    try {
      // CRITICAL FIX: Ensure user exists in users table before creating service provider profile
      // During OAuth signup, user creation might have timed out or failed
      console.log('🔍 Checking if user exists in database...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser || checkError) {
        console.log('🆕 User not found in database, creating now...');
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: user.name || 'User',
            email: user.email || '',
            role: 'listener',
            avatar: user.avatar || null,
          });

        if (createUserError) {
          console.error('Failed to create user in database:', createUserError);
          Alert.alert('Error', 'Failed to create your account. Please try logging out and back in.');
          setIsLoading(false);
          return;
        }
        console.log('✅ User created in database successfully');
      } else {
        console.log('✅ User already exists in database');
      }

      // Check if user already has a service provider profile
      const { data: existingProvider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProvider) {
        // Update existing profile instead of creating a new one
        const { data, error } = await supabase
          .from('service_providers')
          .update({
            business_name: serviceData.businessName,
            tagline: serviceData.tagline,
            bio: serviceData.bio,
            profile_photo: serviceData.profilePhoto,
            banner_photo: serviceData.bannerImage,
            location: serviceData.location,
            provider_type: serviceData.serviceType,
            genres: serviceData.genres,
            years_of_experience: serviceData.yearsExperience ? parseInt(serviceData.yearsExperience) : 0,
            base_price: serviceData.basePrice ? parseFloat(serviceData.basePrice) : 0,
            price_per_hour: serviceData.hourlyRate ? parseFloat(serviceData.hourlyRate) : null,
            min_project_budget: serviceData.minBudget ? parseFloat(serviceData.minBudget) : null,
            max_project_budget: serviceData.maxBudget ? parseFloat(serviceData.maxBudget) : null,
            turnaround_time_days: serviceData.turnaroundTime ? parseInt(serviceData.turnaroundTime) : null,
            specializations: serviceData.specializations,
            email: serviceData.email || user.email,
            contact_email: serviceData.email || user.email,
            phone: serviceData.phone,
            website_url: serviceData.website,
            social_links: {
              instagram: serviceData.instagram,
              twitter: serviceData.twitter,
            },
            portfolio_description: serviceData.portfolioDescription,
            status: 'approved',
          })
          .eq('id', existingProvider.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating service provider profile:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          Alert.alert('Error', `Failed to update profile: ${error.message || 'Unknown error'}`);
          return;
        }

        navigation.navigate('ServiceProviderOnboardingComplete', { serviceData });
        return;
      }

      // Create service provider profile in database
      const { data, error } = await supabase
        .from('service_providers')
        .insert({
          user_id: user.id,
          business_name: serviceData.businessName,
          tagline: serviceData.tagline,
          bio: serviceData.bio,
          profile_photo: serviceData.profilePhoto,
          banner_photo: serviceData.bannerImage,
          location: serviceData.location,
          provider_type: serviceData.serviceType,
          genres: serviceData.genres,
          years_of_experience: serviceData.yearsExperience ? parseInt(serviceData.yearsExperience) : 0,
          base_price: serviceData.basePrice ? parseFloat(serviceData.basePrice) : 0,
          price_per_hour: serviceData.hourlyRate ? parseFloat(serviceData.hourlyRate) : null,
          min_project_budget: serviceData.minBudget ? parseFloat(serviceData.minBudget) : null,
          max_project_budget: serviceData.maxBudget ? parseFloat(serviceData.maxBudget) : null,
          turnaround_time_days: serviceData.turnaroundTime ? parseInt(serviceData.turnaroundTime) : null,
          specializations: serviceData.specializations,
          email: serviceData.email || user.email,
          contact_email: serviceData.email || user.email,
          phone: serviceData.phone,
          website_url: serviceData.website,
          social_links: {
          instagram: serviceData.instagram,
          twitter: serviceData.twitter,
          },
          portfolio_description: serviceData.portfolioDescription,
          status: 'approved',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating service provider profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', `Failed to create profile: ${error.message || 'Unknown error'}`);
        return;
      }

      // Navigate to success screen
      navigation.navigate('ServiceProviderOnboardingComplete', { serviceData });
    } catch (error) {
      console.error('Error:', error);
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
        setServiceData({ ...serviceData, profilePhoto: result.assets[0].uri });
      } else {
        setServiceData({ ...serviceData, bannerImage: result.assets[0].uri });
      }
    }
  };

  const toggleGenre = (genre: string) => {
    if (serviceData.genres.includes(genre)) {
      setServiceData({
        ...serviceData,
        genres: serviceData.genres.filter(g => g !== genre),
      });
    } else {
      setServiceData({
        ...serviceData,
        genres: [...serviceData.genres, genre],
      });
    }
  };

  const toggleSpecialization = (spec: string) => {
    if (serviceData.specializations.includes(spec)) {
      setServiceData({
        ...serviceData,
        specializations: serviceData.specializations.filter(s => s !== spec),
      });
    } else {
      setServiceData({
        ...serviceData,
        specializations: [...serviceData.specializations, spec],
      });
    }
  };

  // Step 1: Service Type
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Service Type</Text>
      <Text style={styles.stepSubtitle}>What service do you provide?</Text>

      <View style={styles.serviceTypeGrid}>
        {SERVICE_TYPES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceTypeCard,
              serviceData.serviceType === service.id && styles.serviceTypeCardSelected,
            ]}
            onPress={() => setServiceData({ ...serviceData, serviceType: service.id })}
          >
            <Ionicons
              name={service.icon as any}
              size={28}
              color={serviceData.serviceType === service.id ? '#3B82F6' : '#6B7280'}
            />
            <Text style={[
              styles.serviceTypeTitle,
              serviceData.serviceType === service.id && styles.serviceTypeTitleSelected,
            ]}>
              {service.title}
            </Text>
            <Text style={styles.serviceTypeDesc}>{service.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 2: Business Identity
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Business Identity</Text>
      <Text style={styles.stepSubtitle}>How do you want to be known?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business/Brand Name *</Text>
        <TextInput
          style={styles.input}
          value={serviceData.businessName}
          onChangeText={(text) => setServiceData({ ...serviceData, businessName: text })}
          placeholder="Your business name"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tagline *</Text>
        <TextInput
          style={styles.input}
          value={serviceData.tagline}
          onChangeText={(text) => setServiceData({ ...serviceData, tagline: text })}
          placeholder="A brief description of what you do"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.imageUploadRow}>
        <View style={styles.imageUploadContainer}>
          <Text style={styles.inputLabel}>Profile Photo</Text>
          <TouchableOpacity
            style={styles.imageUpload}
            onPress={() => pickImage('profile')}
          >
            {serviceData.profilePhoto ? (
              <Image source={{ uri: serviceData.profilePhoto }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#6B7280" />
                <Text style={styles.uploadText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.imageUploadContainer}>
          <Text style={styles.inputLabel}>Banner Image</Text>
          <TouchableOpacity
            style={styles.imageUpload}
            onPress={() => pickImage('banner')}
          >
            {serviceData.bannerImage ? (
              <Image source={{ uri: serviceData.bannerImage }} style={styles.uploadedImage} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#6B7280" />
                <Text style={styles.uploadText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Step 3: About & Location
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>About & Location</Text>
      <Text style={styles.stepSubtitle}>Tell us more about your service</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio/Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={serviceData.bio}
          onChangeText={(text) => setServiceData({ ...serviceData, bio: text })}
          placeholder="Describe your services, experience, and what makes you unique..."
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
          value={serviceData.location}
          onChangeText={(text) => setServiceData({ ...serviceData, location: text })}
          placeholder="City, State/Country"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Genres You Work With</Text>
        <View style={styles.genreGrid}>
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                serviceData.genres.includes(genre) && styles.genreChipSelected,
              ]}
              onPress={() => toggleGenre(genre)}
            >
              <Text style={[
                styles.genreChipText,
                serviceData.genres.includes(genre) && styles.genreChipTextSelected,
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Step 4: Experience & Pricing
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Experience & Pricing</Text>
      <Text style={styles.stepSubtitle}>Set your rates and experience level</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          value={serviceData.yearsExperience}
          onChangeText={(text) => setServiceData({ ...serviceData, yearsExperience: text })}
          placeholder="0"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="cash-outline" size={20} color="#10B981" />
          <Text style={styles.inputLabel}>Base Price ($) *</Text>
        </View>
        <TextInput
          style={styles.input}
          value={serviceData.basePrice}
          onChangeText={(text) => setServiceData({ ...serviceData, basePrice: text })}
          placeholder="0"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Hourly Rate ($) - Optional</Text>
        <TextInput
          style={styles.input}
          value={serviceData.hourlyRate}
          onChangeText={(text) => setServiceData({ ...serviceData, hourlyRate: text })}
          placeholder="0"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Min Budget ($)</Text>
          <TextInput
            style={styles.input}
            value={serviceData.minBudget}
            onChangeText={(text) => setServiceData({ ...serviceData, minBudget: text })}
            placeholder="0"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.inputLabel}>Max Budget ($)</Text>
          <TextInput
            style={styles.input}
            value={serviceData.maxBudget}
            onChangeText={(text) => setServiceData({ ...serviceData, maxBudget: text })}
            placeholder="0"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Typical Turnaround Time</Text>
        <TextInput
          style={styles.input}
          value={serviceData.turnaroundTime}
          onChangeText={(text) => setServiceData({ ...serviceData, turnaroundTime: text })}
          placeholder="e.g., 3-5 days, 1 week"
          placeholderTextColor="#6B7280"
        />
      </View>
    </View>
  );

  // Step 5: Specializations
  const renderStep5 = () => {
    const specs = SPECIALIZATIONS[serviceData.serviceType] || [];
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Specializations</Text>
        <Text style={styles.stepSubtitle}>What specific skills do you offer?</Text>

        {specs.length > 0 ? (
          <View style={styles.specGrid}>
            {specs.map((spec) => (
              <TouchableOpacity
                key={spec}
                style={[
                  styles.specChip,
                  serviceData.specializations.includes(spec) && styles.specChipSelected,
                ]}
                onPress={() => toggleSpecialization(spec)}
              >
                <Text style={[
                  styles.specChipText,
                  serviceData.specializations.includes(spec) && styles.specChipTextSelected,
                ]}>
                  {spec}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noSpecsMessage}>
            <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
            <Text style={styles.noSpecsText}>
              Please select a service type in Step 1 to see available specializations
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Step 6: Contact & Portfolio
  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Contact & Portfolio</Text>
      <Text style={styles.stepSubtitle}>How can clients reach you?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Contact Email *</Text>
        <TextInput
          style={styles.input}
          value={serviceData.email}
          onChangeText={(text) => setServiceData({ ...serviceData, email: text })}
          placeholder="contact@yourbusiness.com"
          placeholderTextColor="#6B7280"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={serviceData.phone}
          onChangeText={(text) => setServiceData({ ...serviceData, phone: text })}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputWithIcon}>
          <Ionicons name="globe-outline" size={20} color="#6B7280" />
          <Text style={styles.inputLabel}>Website</Text>
        </View>
        <TextInput
          style={styles.input}
          value={serviceData.website}
          onChangeText={(text) => setServiceData({ ...serviceData, website: text })}
          placeholder="https://yourwebsite.com"
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
            value={serviceData.instagram}
            onChangeText={(text) => setServiceData({ ...serviceData, instagram: text })}
            placeholder="@username"
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
            value={serviceData.twitter}
            onChangeText={(text) => setServiceData({ ...serviceData, twitter: text })}
            placeholder="@username"
            placeholderTextColor="#6B7280"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Portfolio Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={serviceData.portfolioDescription}
          onChangeText={(text) => setServiceData({ ...serviceData, portfolioDescription: text })}
          placeholder="Describe your best work..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  // Step 7: Payment Setup Info
  const renderStep7 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment Setup</Text>
      <Text style={styles.stepSubtitle}>Get ready to receive payments</Text>

      <View style={styles.paymentCard}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.paymentCardGradient}
        >
          <View style={styles.paymentIcon}>
            <Ionicons name="card-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.paymentTitle}>Stripe Connect</Text>
          <Text style={styles.paymentDesc}>Secure payment processing</Text>
        </LinearGradient>
      </View>

      <View style={styles.paymentFeatures}>
        <View style={styles.paymentFeature}>
          <View style={styles.featureCheck}>
            <Ionicons name="checkmark" size={16} color="#10B981" />
          </View>
          <Text style={styles.featureText}>Secure payments with bank-level encryption</Text>
        </View>
        <View style={styles.paymentFeature}>
          <View style={styles.featureCheck}>
            <Ionicons name="checkmark" size={16} color="#10B981" />
          </View>
          <Text style={styles.featureText}>Fast payouts directly to your bank account</Text>
        </View>
        <View style={styles.paymentFeature}>
          <View style={styles.featureCheck}>
            <Ionicons name="checkmark" size={16} color="#10B981" />
          </View>
          <Text style={styles.featureText}>Track all your earnings in one place</Text>
        </View>
      </View>

      <View style={styles.paymentNote}>
        <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
        <Text style={styles.paymentNoteText}>
          You can set up Stripe payments later from your profile settings. Complete your profile first to start getting discovered!
        </Text>
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
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1: return serviceData.serviceType.length > 0;
      case 2: return serviceData.businessName.length > 0 && serviceData.tagline.length > 0;
      case 3: return serviceData.bio.length > 0 && serviceData.location.length > 0;
      case 4: return serviceData.basePrice.length > 0;
      case 6: return serviceData.email.length > 0 && serviceData.phone.length > 0;
      default: return true;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step {currentStep} of {totalSteps}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
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

        {/* Footer */}
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
              colors={canContinue() ? ['#3B82F6', '#8B5CF6'] : ['#374151', '#374151']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {currentStep === totalSteps ? 'Complete Profile' : 'Continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  serviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceTypeCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  serviceTypeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  serviceTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  serviceTypeTitleSelected: {
    color: '#3B82F6',
  },
  serviceTypeDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
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
    gap: 8,
  },
  genreChip: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  genreChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  genreChipText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  genreChipTextSelected: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specChip: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  specChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  specChipText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  specChipTextSelected: {
    color: '#FFFFFF',
  },
  noSpecsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
  },
  noSpecsText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  paymentCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  paymentCardGradient: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paymentDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  paymentFeatures: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  paymentNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
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

export default ServiceProviderOnboardingScreen;

