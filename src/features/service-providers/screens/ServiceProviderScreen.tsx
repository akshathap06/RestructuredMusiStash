import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import serviceProviderService, { ServiceProviderProfile } from '../../../services/serviceProviderService';

const serviceTypes = [
  { id: 'producer', label: 'Music Producer', icon: 'musical-notes', description: 'Create beats, produce tracks, and collaborate with artists' },
  { id: 'video_editor', label: 'Video Editor', icon: 'videocam', description: 'Edit music videos, lyric videos, and promotional content' },
  { id: 'sound_engineer', label: 'Sound Engineer', icon: 'mic', description: 'Record, mix, and master audio professionally' },
  { id: 'mixing_engineer', label: 'Mixing Engineer', icon: 'layers', description: 'Specialize in mixing and audio post-production' },
  { id: 'mastering_engineer', label: 'Mastering Engineer', icon: 'trending-up', description: 'Finalize tracks for distribution and streaming' },
  { id: 'songwriter', label: 'Songwriter', icon: 'create', description: 'Write lyrics, melodies, and song structures' },
  { id: 'musician', label: 'Musician', icon: 'musical-note', description: 'Provide session work and live performance' },
  { id: 'photographer', label: 'Photographer', icon: 'camera', description: 'Capture artist photos and promotional imagery' },
  { id: 'graphic_designer', label: 'Graphic Designer', icon: 'color-palette', description: 'Design album covers, logos, and branding' },
  { id: 'marketing_specialist', label: 'Marketing Specialist', icon: 'megaphone', description: 'Promote artists and manage social media' },
];

const genres = [
  'Hip Hop', 'Pop', 'Rock', 'Electronic', 'R&B', 'Country', 'Jazz', 'Classical', 'Folk', 'Blues', 'Reggae', 'Latin', 'Metal', 'Punk', 'Indie', 'Alternative'
];

export default function ServiceProviderScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    providerType: '',
    businessName: '',
    tagline: '',
    bio: '',
    location: '',
    email: '',
    phone: '',
    websiteUrl: '',
    genres: [] as string[],
    specializations: [] as string[],
    yearsOfExperience: '',
    basePrice: '',
    pricePerHour: '',
    minProjectBudget: '',
    maxProjectBudget: '',
    turnaroundTimeDays: '',
    acceptsRemoteWork: true,
    availableForHire: true,
    portfolioDescription: '',
    sampleWorkUrls: [] as string[],
    socialLinks: {} as any,
  });

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenreToggle = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const getSpecializationsForType = (type: string) => {
    const specializationsMap: { [key: string]: string[] } = {
      producer: ['Beat Making', 'Sample Production', 'Track Arrangement', 'Sound Design', 'Mixing', 'Collaboration'],
      video_editor: ['Music Videos', 'Lyric Videos', 'Promotional Content', 'Live Performance', 'Behind the Scenes', 'Social Media Content'],
      sound_engineer: ['Recording', 'Live Sound', 'Post Production', 'Studio Setup', 'Equipment Management', 'Acoustic Treatment'],
      mixing_engineer: ['Vocal Mixing', 'Instrumental Mixing', 'Stem Mixing', 'Genre Specialization', 'Reference Tracks', 'Client Communication'],
      mastering_engineer: ['Digital Mastering', 'Analog Mastering', 'Vinyl Mastering', 'Streaming Optimization', 'Loudness Standards', 'Format Preparation'],
      songwriter: ['Lyric Writing', 'Melody Writing', 'Chord Progressions', 'Hook Creation', 'Storytelling', 'Genre Adaptation'],
      musician: ['Session Work', 'Live Performance', 'Recording', 'Arrangement', 'Improvisation', 'Genre Versatility'],
      photographer: ['Portrait Photography', 'Event Photography', 'Product Photography', 'Photo Editing', 'Retouching', 'Color Correction'],
      graphic_designer: ['Logo Design', 'Branding', 'Album Covers', 'Social Media Graphics', 'Typography', 'Color Theory'],
      marketing_specialist: ['Social Media Marketing', 'Email Marketing', 'Content Marketing', 'Influencer Marketing', 'Analytics', 'Brand Strategy'],
    };
    return specializationsMap[type] || [];
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!formData.providerType || !formData.businessName || !formData.tagline) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.bio || !formData.location || formData.genres.length === 0) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.yearsOfExperience || !formData.basePrice) {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
        return false;
      }
    } else if (currentStep === 4) {
      // Step 4 is optional - no validation needed
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !user?.id) return;

    setLoading(true);
    try {
      const profileData: ServiceProviderProfile = {
        user_id: user.id,
        provider_type: formData.providerType,
        business_name: formData.businessName,
        tagline: formData.tagline,
        bio: formData.bio,
        location: formData.location,
        email: formData.email,
        phone: formData.phone || undefined,
        website_url: formData.websiteUrl || undefined,
        genres: formData.genres,
        specializations: formData.specializations,
        years_of_experience: parseInt(formData.yearsOfExperience) || 0,
        base_price: parseFloat(formData.basePrice) || 0,
        currency: 'USD',
        price_per_hour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : undefined,
        min_project_budget: formData.minProjectBudget ? parseFloat(formData.minProjectBudget) : undefined,
        max_project_budget: formData.maxProjectBudget ? parseFloat(formData.maxProjectBudget) : undefined,
        turnaround_time_days: formData.turnaroundTimeDays ? parseInt(formData.turnaroundTimeDays) : undefined,
        portfolio_description: formData.portfolioDescription || undefined,
        sample_work_urls: formData.sampleWorkUrls,
        social_links: formData.socialLinks,
        accepts_remote_work: formData.acceptsRemoteWork,
        available_for_hire: formData.availableForHire,
        is_verified: false,
        status: 'approved', // Auto-approve for now
        approved_at: new Date().toISOString(),
      };

      const createdProfile = await serviceProviderService.createProfile(profileData);
      
      if (createdProfile) {
        Alert.alert(
          'Success!',
          'Your service provider profile has been created and is now visible to artists!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error('Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to submit profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Your Service Type</Text>
      <Text style={styles.stepSubtitle}>Select the primary service you want to provide</Text>
      
      <View style={styles.serviceTypeGrid}>
        {serviceTypes.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceTypeCard,
              formData.providerType === service.id && styles.serviceTypeCardSelected
            ]}
            onPress={() => handleInputChange('providerType', service.id)}
          >
            <Ionicons 
              name={service.icon as any} 
              size={32} 
              color={formData.providerType === service.id ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[
              styles.serviceTypeLabel,
              formData.providerType === service.id && styles.serviceTypeLabelSelected
            ]}>
              {service.label}
            </Text>
            <Text style={styles.serviceTypeDescription}>
              {service.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.businessName}
          onChangeText={(value) => handleInputChange('businessName', value)}
          placeholder="Enter your business name"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tagline *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.tagline}
          onChangeText={(value) => handleInputChange('tagline', value)}
          placeholder="Brief description of your services"
          placeholderTextColor="#6B7280"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
      <Text style={styles.stepSubtitle}>Help artists understand your expertise and style</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.bio}
          onChangeText={(value) => handleInputChange('bio', value)}
          placeholder="Describe your experience, style, and what makes you unique..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Location *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.location}
          onChangeText={(value) => handleInputChange('location', value)}
          placeholder="City, State, or Remote"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Genres You Work With *</Text>
        <View style={styles.genreGrid}>
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                formData.genres.includes(genre) && styles.genreChipSelected
              ]}
              onPress={() => handleGenreToggle(genre)}
            >
              <Text style={[
                styles.genreChipText,
                formData.genres.includes(genre) && styles.genreChipTextSelected
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Specializations</Text>
        <View style={styles.specializationGrid}>
          {getSpecializationsForType(formData.providerType).map((spec) => (
            <TouchableOpacity
              key={spec}
              style={[
                styles.specializationChip,
                formData.specializations.includes(spec) && styles.specializationChipSelected
              ]}
              onPress={() => handleSpecializationToggle(spec)}
            >
              <Text style={[
                styles.specializationChipText,
                formData.specializations.includes(spec) && styles.specializationChipTextSelected
              ]}>
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pricing & Experience</Text>
      <Text style={styles.stepSubtitle}>Set your rates and showcase your expertise</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Years of Experience *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.yearsOfExperience}
          onChangeText={(value) => handleInputChange('yearsOfExperience', value)}
          placeholder="e.g., 5"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Base Price (USD) *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.basePrice}
          onChangeText={(value) => handleInputChange('basePrice', value)}
          placeholder="e.g., 150"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Price Per Hour (USD)</Text>
        <TextInput
          style={styles.textInput}
          value={formData.pricePerHour}
          onChangeText={(value) => handleInputChange('pricePerHour', value)}
          placeholder="e.g., 75"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Project Budget Range (USD)</Text>
        <View style={styles.budgetRow}>
          <TextInput
            style={[styles.textInput, styles.budgetInput]}
            value={formData.minProjectBudget}
            onChangeText={(value) => handleInputChange('minProjectBudget', value)}
            placeholder="Min"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
          <Text style={styles.budgetSeparator}>to</Text>
          <TextInput
            style={[styles.textInput, styles.budgetInput]}
            value={formData.maxProjectBudget}
            onChangeText={(value) => handleInputChange('maxProjectBudget', value)}
            placeholder="Max"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Turnaround Time (Days)</Text>
        <TextInput
          style={styles.textInput}
          value={formData.turnaroundTimeDays}
          onChangeText={(value) => handleInputChange('turnaroundTimeDays', value)}
          placeholder="e.g., 7"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Accept Remote Work</Text>
          <Switch
            value={formData.acceptsRemoteWork}
            onValueChange={(value) => handleInputChange('acceptsRemoteWork', value)}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={formData.acceptsRemoteWork ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Available for Hire</Text>
          <Switch
            value={formData.availableForHire}
            onValueChange={(value) => handleInputChange('availableForHire', value)}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={formData.availableForHire ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Final Details</Text>
      <Text style={styles.stepSubtitle}>Add any additional information to complete your profile</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Portfolio Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.portfolioDescription}
          onChangeText={(value) => handleInputChange('portfolioDescription', value)}
          placeholder="Describe your best work and achievements..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Website URL</Text>
        <TextInput
          style={styles.textInput}
          value={formData.websiteUrl}
          onChangeText={(value) => handleInputChange('websiteUrl', value)}
          placeholder="https://yourwebsite.com"
          placeholderTextColor="#6B7280"
          keyboardType="url"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.textInput}
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          placeholder="+1 (555) 123-4567"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Profile Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Service Type:</Text>
          <Text style={styles.summaryValue}>
            {serviceTypes.find(s => s.id === formData.providerType)?.label}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Business Name:</Text>
          <Text style={styles.summaryValue}>{formData.businessName}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Location:</Text>
          <Text style={styles.summaryValue}>{formData.location}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Base Price:</Text>
          <Text style={styles.summaryValue}>${formData.basePrice}</Text>
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Portfolio & Social Links</Text>
      <Text style={styles.stepSubtitle}>Showcase your work and connect with clients</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sample Work URLs</Text>
        <Text style={styles.inputSubtext}>Add links to your best work (YouTube, SoundCloud, portfolio sites, etc.)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.sampleWorkUrls.join('\n')}
          onChangeText={(value) => handleInputChange('sampleWorkUrls', value.split('\n').filter(url => url.trim()))}
          placeholder="https://youtube.com/watch?v=...\nhttps://soundcloud.com/...\nhttps://yourportfolio.com/..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Social Media Links</Text>
        <Text style={styles.inputSubtext}>Connect your social media profiles</Text>
        
        <View style={styles.socialLinkRow}>
          <Ionicons name="logo-instagram" size={20} color="#E4405F" />
          <TextInput
            style={[styles.textInput, styles.socialInput]}
            value={formData.socialLinks.instagram || ''}
            onChangeText={(value) => handleInputChange('socialLinks', { ...formData.socialLinks, instagram: value })}
            placeholder="Instagram username"
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <View style={styles.socialLinkRow}>
          <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
          <TextInput
            style={[styles.textInput, styles.socialInput]}
            value={formData.socialLinks.twitter || ''}
            onChangeText={(value) => handleInputChange('socialLinks', { ...formData.socialLinks, twitter: value })}
            placeholder="Twitter username"
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <View style={styles.socialLinkRow}>
          <Ionicons name="logo-linkedin" size={20} color="#0077B5" />
          <TextInput
            style={[styles.textInput, styles.socialInput]}
            value={formData.socialLinks.linkedin || ''}
            onChangeText={(value) => handleInputChange('socialLinks', { ...formData.socialLinks, linkedin: value })}
            placeholder="LinkedIn profile URL"
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <View style={styles.socialLinkRow}>
          <Ionicons name="logo-youtube" size={20} color="#FF0000" />
          <TextInput
            style={[styles.textInput, styles.socialInput]}
            value={formData.socialLinks.youtube || ''}
            onChangeText={(value) => handleInputChange('socialLinks', { ...formData.socialLinks, youtube: value })}
            placeholder="YouTube channel URL"
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Final Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Service Type:</Text>
          <Text style={styles.summaryValue}>
            {serviceTypes.find(s => s.id === formData.providerType)?.label}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Business Name:</Text>
          <Text style={styles.summaryValue}>{formData.businessName}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Location:</Text>
          <Text style={styles.summaryValue}>{formData.location}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Base Price:</Text>
          <Text style={styles.summaryValue}>${formData.basePrice}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Genres:</Text>
          <Text style={styles.summaryValue}>{formData.genres.join(', ')}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Specializations:</Text>
          <Text style={styles.summaryValue}>{formData.specializations.join(', ')}</Text>
        </View>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((stepNumber) => (
        <View key={stepNumber} style={styles.stepDotContainer}>
          <View style={[
            styles.stepDot,
            stepNumber <= step ? styles.stepDotActive : styles.stepDotInactive
          ]} />
          {stepNumber < step && (
            <View style={styles.stepLine} />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Service Provider</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButtonFooter} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        {step < 5 ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.nextButton, loading && styles.nextButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.nextButtonText}>Submit Profile</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#1A1A1A',
  },
  stepDotContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepDotInactive: {
    backgroundColor: '#374151',
  },
  stepLine: {
    position: 'absolute',
    top: 6,
    left: 20,
    width: 16,
    height: 2,
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  serviceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  serviceTypeCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceTypeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  serviceTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceTypeLabelSelected: {
    color: '#3B82F6',
  },
  serviceTypeDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  genreChip: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genreChipSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  genreChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  genreChipTextSelected: {
    color: '#3B82F6',
  },
  specializationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  specializationChip: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  specializationChipSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  specializationChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  specializationChipTextSelected: {
    color: '#3B82F6',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
  },
  budgetSeparator: {
    color: '#9CA3AF',
    marginHorizontal: 12,
    fontSize: 16,
  },
  switchGroup: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  backButtonFooter: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    textAlign: 'left',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  socialInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
