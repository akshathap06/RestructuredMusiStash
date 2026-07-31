import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { stripeConnectService } from '../../../services/stripeConnectService';

const { width } = Dimensions.get('window');

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  title?: string;
  description?: string;
  isUploaded?: boolean;
  uploadedUrl?: string;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: string;
  priceType: 'fixed' | 'hourly' | 'per_project';
  duration: string;
}

const CreateServiceProviderScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const { editMode = false, serviceProvider = null } = route.params || {};
  
  // Add states for handling existing profiles
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState(!editMode); // View mode by default unless explicitly editing

  // Predefined options for tag selectors
  const specializationOptions = [
    'Music Production', 'Mixing', 'Mastering', 'Recording', 'Beat Making',
    'Songwriting', 'Vocal Production', 'Sound Design', 'Audio Editing',
    'Live Sound', 'Studio Engineering', 'Post Production'
  ];

  const genreOptions = [
    'Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical',
    'Country', 'Folk', 'Blues', 'Reggae', 'Latin', 'Metal', 'Punk',
    'Indie', 'Alternative', 'Trap', 'Lo-Fi', 'House', 'Techno'
  ];

  const skillOptions = [
    'Pro Tools', 'Logic Pro X', 'Ableton Live', 'FL Studio', 'Cubase',
    'Reaper', 'Studio One', 'Reason', 'Garage Band', 'Audacity',
    'Auto-Tune', 'Melodyne', 'Waves Plugins', 'FabFilter', 'Native Instruments'
  ];
  
  // Form data state
  const [formData, setFormData] = useState({
    businessName: '',
    providerType: '',
    tagline: '',
    bio: '',
    aboutSection: '',
    contactEmail: '',
    phone: '',
    website: '',
    location: '',
    yearsOfExperience: '',
    basePrice: '',
    pricePerHour: '',
    minProjectBudget: '',
    maxProjectBudget: '',
    turnaroundTime: '',
    portfolioDescription: '',
    acceptsRemoteWork: true,
    availableForHire: true,
  });

  // Arrays for multi-value fields
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    youtube: '',
    soundcloud: '',
    spotify: '',
  });

  // Services and media
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Check for existing service provider profile
  const checkExistingProfile = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data: existingProvider, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProvider) {
        setHasExistingProfile(true);
        setExistingProfile(existingProvider);
        setViewMode(true);
        
        // Load form data for potential editing
        setFormData({
          businessName: existingProvider.business_name || '',
          providerType: existingProvider.provider_type || '',
          tagline: existingProvider.tagline || '',
          bio: existingProvider.bio || '',
          aboutSection: existingProvider.about_section || '',
          contactEmail: existingProvider.contact_email || '',
          phone: existingProvider.phone || '',
          website: existingProvider.website_url || '',
          location: existingProvider.location || '',
          yearsOfExperience: existingProvider.years_of_experience?.toString() || '',
          basePrice: existingProvider.base_price?.toString() || '',
          pricePerHour: existingProvider.price_per_hour?.toString() || '',
          minProjectBudget: existingProvider.min_project_budget?.toString() || '',
          maxProjectBudget: existingProvider.max_project_budget?.toString() || '',
          turnaroundTime: existingProvider.turnaround_time_days?.toString() || '',
          portfolioDescription: existingProvider.portfolio_description || '',
          acceptsRemoteWork: existingProvider.accepts_remote_work ?? true,
          availableForHire: existingProvider.available_for_hire ?? true,
        });

        setSpecializations(existingProvider.specializations || []);
        setGenres(existingProvider.genres || []);
        setSkills(existingProvider.skills || []);
        setSocialLinks(existingProvider.social_links || {});
        setProfileImage(existingProvider.profile_photo || null);
        setBannerImage(existingProvider.banner_photo || null);

        await loadExistingServices();
        await loadExistingMedia();
      } else {
        // No existing profile, set edit mode
        setHasExistingProfile(false);
        setViewMode(false);
      }
    } catch (error) {
      console.error('Error checking existing profile:', error);
      setHasExistingProfile(false);
      setViewMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize form data if in edit mode
  useEffect(() => {
    if (!editMode && !serviceProvider) {
      // Check for existing profile when coming from "Become Service Provider"
      checkExistingProfile();
    } else if (editMode && serviceProvider) {
      // Handle explicit edit mode
      setIsLoading(false);
      setViewMode(false);
      console.log('=== EDIT MODE INITIALIZATION ===');
      console.log('Service Provider Data:', JSON.stringify(serviceProvider, null, 2));
      
      setFormData({
        businessName: serviceProvider.business_name || '',
        providerType: serviceProvider.provider_type || '',
        tagline: serviceProvider.tagline || '',
        bio: serviceProvider.bio || '',
        aboutSection: serviceProvider.about_section || '',
        contactEmail: serviceProvider.contact_email || '',
        phone: serviceProvider.phone || '',
        website: serviceProvider.website_url || '',
        location: serviceProvider.location || '',
        yearsOfExperience: serviceProvider.years_of_experience?.toString() || '',
        basePrice: serviceProvider.base_price?.toString() || '',
        pricePerHour: serviceProvider.price_per_hour?.toString() || '',
        minProjectBudget: serviceProvider.min_project_budget?.toString() || '',
        maxProjectBudget: serviceProvider.max_project_budget?.toString() || '',
        turnaroundTime: serviceProvider.turnaround_time_days?.toString() || '',
        portfolioDescription: serviceProvider.portfolio_description || '',
        acceptsRemoteWork: serviceProvider.accepts_remote_work ?? true,
        availableForHire: serviceProvider.available_for_hire ?? true,
      });

      setSpecializations(serviceProvider.specializations || []);
      setGenres(serviceProvider.genres || []);
      setSkills(serviceProvider.skills || []);
      setSocialLinks(serviceProvider.social_links || {});
      setProfileImage(serviceProvider.profile_photo || null);
      setBannerImage(serviceProvider.banner_photo || null);

      loadExistingServices();
      loadExistingMedia();
    }
  }, [editMode, serviceProvider]);

  const loadExistingServices = async () => {
    if (!serviceProvider?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('service_provider_services')
        .select('*')
        .eq('service_provider_id', serviceProvider.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('Error loading services:', error);
      return;
    }

      const serviceItems = data?.map(service => ({
        id: service.id,
        name: service.service_name,
        description: service.service_description || '',
        price: service.base_price?.toString() || '',
        priceType: service.price_type || 'fixed',
        duration: service.estimated_duration_days?.toString() || '',
      })) || [];

      setServices(serviceItems);
    } catch (error) {
      console.log('Error loading services:', error);
    }
  };

  const loadExistingMedia = async () => {
    if (!serviceProvider?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('service_provider_media')
        .select('*')
        .eq('service_provider_id', serviceProvider.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.log('Error loading media:', error);
        return;
      }

      const mediaItems = data?.map(media => ({
        id: media.id,
        type: media.media_type,
        uri: media.file_url,
        name: media.file_name || '',
        title: media.title || media.file_name || '',
        description: media.description || '',
        isUploaded: true,
        uploadedUrl: media.file_url,
      })) || [];

      setMediaItems(mediaItems);
    } catch (error) {
      console.log('Error loading media:', error);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      navigation.goBack();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Basic Information
        return formData.businessName.trim() !== '' && formData.providerType !== '';
      case 2: // Contact Information - email and phone required
        return formData.contactEmail.trim() !== '' && formData.phone.trim() !== '';
      case 3: // Professional Details
        return true; // All optional
      case 4: // Pricing
        return true; // All optional
      case 5: // Services
        return true; // Optional
      case 6: // Portfolio & Social
        return true; // Optional
      default:
        return false;
    }
  };

  // Media picker functions
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to photos to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaItem: MediaItem = {
          id: Date.now().toString(),
          type: 'photo',
          uri: asset.uri,
          name: `image_${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: 'image/jpeg',
          title: '',
          description: '',
          isUploaded: false,
        };
        
        setMediaItems(prev => [...prev, mediaItem]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to photos to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaItem: MediaItem = {
          id: Date.now().toString(),
          type: 'video',
          uri: asset.uri,
          name: `video_${Date.now()}.mp4`,
          size: asset.fileSize,
          mimeType: 'video/mp4',
          duration: asset.duration,
          title: '',
          description: '',
          isUploaded: false,
        };
        
        setMediaItems(prev => [...prev, mediaItem]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaItem: MediaItem = {
          id: Date.now().toString(),
          type: 'audio',
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
          title: '',
          description: '',
          isUploaded: false,
        };
        
        setMediaItems(prev => [...prev, mediaItem]);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      Alert.alert('Error', 'Failed to pick audio. Please try again.');
    }
  };

  const removeMediaItem = (id: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== id));
  };

  const updateMediaItem = (id: string, updates: Partial<MediaItem>) => {
    setMediaItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const updateArrayField = (field: 'specializations' | 'genres' | 'skills', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    if (field === 'specializations') setSpecializations(array);
    if (field === 'genres') setGenres(array);
    if (field === 'skills') setSkills(array);
  };

  const updateSocialLinks = (platform: string, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
  };

  const handleHideProfile = async () => {
    Alert.alert(
      'Hide Service Profile',
      'Are you sure you want to hide your service provider profile? This will remove it from public listings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Hide Profile', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('service_providers')
                .update({ status: 'pending' })
                .eq('id', existingProfile.id);

              if (error) {
                Alert.alert('Error', 'Failed to hide profile. Please try again.');
                return;
              }

              Alert.alert(
                'Profile Hidden',
                'Your service provider profile has been hidden from public listings.',
                [{ 
                  text: 'OK', 
                  onPress: () => navigation.goBack()
                }]
              );
            } catch (error) {
              console.error('Error hiding profile:', error);
              Alert.alert('Error', 'Failed to hide profile. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Service management
  const addService = () => {
    const newService: ServiceItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: '',
      priceType: 'fixed',
      duration: '',
    };
    setServices(prev => [...prev, newService]);
  };

  const updateService = (id: string, field: string, value: string) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(service => service.id !== id));
  };


  const uploadMedia = async (mediaItem: MediaItem): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    const fileExt = mediaItem.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${mediaItem.type}_${Date.now()}.${fileExt}`;
    
    const response = await fetch(mediaItem.uri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const bucketName = `service-provider-${mediaItem.type}s`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: mediaItem.mimeType || 'application/octet-stream',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!formData.businessName || !formData.providerType) {
      Alert.alert('Error', 'Please fill in business name and provider type');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      // Ensure user exists in users table before creating service provider profile
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingUser || checkError) {
        console.log('User not found in database, creating now...');
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: user?.name || 'User',
            email: user?.email || '',
            role: 'listener',
          });

        if (createUserError && createUserError.code !== '23505') {
          console.error('Failed to create user in database:', createUserError);
          Alert.alert('Error', 'Failed to create your account. Please try logging out and back in.');
          setLoading(false);
          setUploading(false);
          return;
        }
      }

      // First, check if the service_providers table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('service_providers')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        Alert.alert(
          'Database Setup Required',
          'The service provider tables need to be created first. Please run the REBUILD_SERVICE_PROVIDER_SCHEMA.sql script in your Supabase SQL Editor.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Upload media files first
      const uploadedMedia = [];
      for (const mediaItem of mediaItems) {
        if (!mediaItem.isUploaded) {
          try {
            const uploadedUrl = await uploadMedia(mediaItem);
            uploadedMedia.push({
              ...mediaItem,
              uploadedUrl,
              isUploaded: true,
            });
          } catch (error) {
            console.log(`Failed to upload ${mediaItem.type}:`, error);
            // Continue with other uploads
          }
        } else {
          uploadedMedia.push(mediaItem);
        }
      }

      // Prepare service provider data
      const serviceProviderData = {
        user_id: user.id,
        business_name: formData.businessName,
        provider_type: formData.providerType,
        tagline: formData.tagline || null,
        bio: formData.bio || null,
        about_section: formData.aboutSection || null,
        email: formData.contactEmail || user?.email || null,
        contact_email: formData.contactEmail || null,
        phone: formData.phone || null,
        website_url: formData.website || null,
        location: formData.location || null,
        years_of_experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        specializations: specializations,
        genres: genres,
        skills: skills,
        base_price: formData.basePrice ? parseFloat(formData.basePrice) : null,
        price_per_hour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : null,
        min_project_budget: formData.minProjectBudget ? parseFloat(formData.minProjectBudget) : null,
        max_project_budget: formData.maxProjectBudget ? parseFloat(formData.maxProjectBudget) : null,
        turnaround_time_days: formData.turnaroundTime ? parseInt(formData.turnaroundTime) : null,
        portfolio_description: formData.portfolioDescription || null,
        social_links: socialLinks,
        profile_photo: profileImage,
        banner_photo: bannerImage,
        accepts_remote_work: formData.acceptsRemoteWork,
        available_for_hire: formData.availableForHire,
        status: 'approved',
        // Onboarding status (only set for new profiles, not updates)
        ...((!editMode) && {
          onboarding_step: 1,
          business_info_completed: true, // Step 1 complete
          stripe_verification_completed: false, // Step 2 pending
          can_list_services: false, // Cannot list until Stripe verified
        }),
      };

      console.log('=== SAVING SERVICE PROVIDER ===');
      console.log('Form Data:', JSON.stringify(formData, null, 2));
      console.log('Service Provider Data:', JSON.stringify(serviceProviderData, null, 2));

      let result;
      let providerId;
      
      if (editMode && serviceProvider) {
        // For updates, we don't need .single() since we're updating by ID
        console.log('Updating provider with ID:', serviceProvider.id);
        result = await supabase
          .from('service_providers')
          .update(serviceProviderData)
          .eq('id', serviceProvider.id)
          .select();
        
        if (result.error) {
          console.error('Error updating service provider:', result.error);
          throw result.error;
        }
        providerId = serviceProvider.id;
        console.log('Updated service provider:', result.data);
      } else {
        // For inserts, we can use .single() safely
        result = await supabase
          .from('service_providers')
          .insert(serviceProviderData)
          .select()
          .single();
        
        if (result.error) throw result.error;
        providerId = result.data?.id;
        console.log('Created service provider:', result.data);
      }

      // Save services
      if (providerId) {
        try {
          // Delete existing services (only in edit mode)
          if (editMode) {
            const { error: deleteError } = await supabase
              .from('service_provider_services')
              .delete()
              .eq('service_provider_id', providerId);
            
            if (deleteError) {
              console.log('Error deleting existing services:', deleteError);
            }
          }

          // Insert new services
          console.log('=== SAVING SERVICES ===');
          console.log('Services to save:', services);
          if (services.length > 0) {
            const servicesData = services
              .filter(service => service.name.trim() !== '') // Only save services with names
              .map(service => ({
                service_provider_id: providerId,
                service_name: service.name,
                service_description: service.description,
                base_price: parseFloat(service.price) || 0,
                price_type: service.priceType,
                estimated_duration_days: service.duration ? parseInt(service.duration) : null,
              }));

            console.log('Processed services data:', servicesData);
            if (servicesData.length > 0) {
              const { error: servicesError } = await supabase
                .from('service_provider_services')
                .insert(servicesData);

              if (servicesError) {
                console.error('Error saving services:', servicesError);
                // Don't throw here, just log the error
              } else {
                console.log('Services saved successfully');
              }
            }
          }

          // Save media
          if (mediaItems.length > 0) {
            const mediaData = mediaItems
              .filter(media => media.uri) // Only save media with URIs
              .map((media, index) => ({
                service_provider_id: providerId,
                media_type: media.type,
                file_url: media.uploadedUrl || media.uri,
                file_name: media.name,
              }));

            if (mediaData.length > 0) {
              const { error: mediaError } = await supabase
                .from('service_provider_media')
                .insert(mediaData);

              if (mediaError) {
                console.log('Error saving media:', mediaError);
                // Don't throw here, just log the error
              } else {
                console.log('Media saved successfully');
              }
            }
          }
        } catch (error) {
          console.log('Error saving services/media:', error);
          // Don't throw here, the main profile was saved successfully
        }
      }

      // Create Stripe Connect account for new service providers (not in edit mode)
      if (!editMode && providerId) {
        try {
          console.log('Creating Stripe Connect account...');
          const connectResult = await stripeConnectService.createConnectAccount(
            providerId,
            formData.contactEmail || user?.email || '',
            formData.businessName,
            'US' // Default to US, could be made configurable
          );

          if (connectResult.success && connectResult.onboardingUrl) {
            // Update onboarding step to Stripe verification
            await supabase
              .from('service_providers')
              .update({ onboarding_step: 2 })
              .eq('id', providerId);
            
            // Show success message with Stripe onboarding info
            Alert.alert(
              '✅ Step 1 Complete: Business Info Saved!',
              'Great start! Now let\'s complete Step 2:\n\n📋 Stripe Identity Verification\n\nYou\'ll need to provide:\n• Photo ID verification\n• SSN for tax reporting\n• Bank account details\n• Address verification\n\n⚠️ You cannot list services until verification is complete.\n\nThis takes about 5-10 minutes.',
              [
                {
                  text: 'Start Step 2 Now',
                  onPress: async () => {
                    try {
                      console.log('Opening Stripe onboarding URL:', connectResult.onboardingUrl);
                      
                      // Check if URL can be opened
                      const canOpen = await Linking.canOpenURL(connectResult.onboardingUrl);
                      
                      if (canOpen) {
                        // Open Stripe's hosted onboarding in browser
                        await Linking.openURL(connectResult.onboardingUrl);
                        
                        // Show info about what happens next
                        Alert.alert(
                          'Complete Stripe Onboarding',
                          'A browser window has opened with Stripe\'s secure onboarding form.\n\nPlease complete all steps:\n\n1. Verify your identity with photo ID\n2. Provide SSN for tax reporting\n3. Add bank account details\n4. Confirm your address\n\nOnce complete, return to the app. You may need to restart the app to see your updated status.',
                          [
                            { 
                              text: 'Got It', 
                              onPress: () => navigation.goBack() 
                            }
                          ]
                        );
                      } else {
                        throw new Error('Cannot open Stripe URL');
                      }
                    } catch (error) {
                      console.error('Error opening Stripe URL:', error);
                      Alert.alert(
                        'Unable to Open Browser',
                        `Please copy this link and open it in your browser to complete verification:\n\n${connectResult.onboardingUrl}\n\nYou can also complete this later from your profile settings.`,
                        [
                          { text: 'Copy Link', onPress: () => {
                            // In a real app, you'd use Clipboard API
                            console.log('Copy:', connectResult.onboardingUrl);
                          }},
                          { text: 'OK', onPress: () => navigation.goBack() }
                        ]
                      );
                    }
                  }
                },
                {
                  text: 'I\'ll Do This Later',
                  style: 'cancel',
                  onPress: () => {
                    Alert.alert(
                      '⚠️ Setup Incomplete',
                      'Step 1: ✅ Business Info Complete\nStep 2: ⏳ Stripe Verification Pending\nStep 3: ⏳ Service Listing (Locked)\n\nYou cannot list services or accept payments until Step 2 is complete.\n\nComplete Stripe verification anytime from your Service Provider Dashboard.',
                      [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                  }
                }
              ]
            );
            return; // Don't show the default success alert
          } else {
            // Stripe account creation failed, but service provider was created
            console.error('Stripe Connect account creation failed:', connectResult.error);
            
            // Show user-friendly error with helpful information
            Alert.alert(
              '⚠️ Step 2 Setup Failed',
              `Step 1: ✅ Business Info Complete\nStep 2: ❌ Stripe Verification Failed\n\nError: ${connectResult.error}\n\n⚠️ You cannot list services until Stripe verification is complete.\n\nPlease try again from your Service Provider Dashboard or contact support if the issue persists.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }
        } catch (stripeError) {
          console.error('Error creating Stripe Connect account:', stripeError);
          
          // Show error but don't block the user since profile was created
          Alert.alert(
            'Profile Created',
            'Your service provider profile was created successfully, but there was an issue setting up payments. You can complete payment setup later from your profile settings.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }

      Alert.alert('Success', editMode ? 'Service provider updated successfully!' : 'Service provider profile saved successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back and pass updated data
            navigation.goBack();
            // Force refresh by navigating with updated data
            if (editMode && route.params?.onUpdate) {
              route.params.onUpdate();
            }
          }
        }
      ]);

    } catch (error) {
      console.error('Error saving service provider:', error);
      
      // Handle specific permission errors
      if (error.code === '42501') {
        Alert.alert(
          'Permission Error', 
          'Database permissions need to be updated. Please run the fix-all-permissions-production.sql script in Supabase SQL Editor first.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to save profile: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDeleteServiceProfile = async () => {
    if (!user?.id || !serviceProvider) {
      Alert.alert('Error', 'Cannot delete service profile');
      return;
    }

    Alert.alert(
      'Delete Service Profile',
      'Are you sure you want to delete your service profile? This action cannot be undone and will remove all your services, portfolio items, and reviews.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('🗑️ Deleting service profile:', serviceProvider.id);

              // Delete related data first
              // Delete services
              const { error: servicesError } = await supabase
                .from('provider_services')
                .delete()
                .eq('provider_id', serviceProvider.id);

              if (servicesError) {
                console.error('Error deleting services:', servicesError);
              } else {
                console.log('✅ Services deleted');
              }

              // Delete portfolio items
              const { error: portfolioError } = await supabase
                .from('provider_portfolio')
                .delete()
                .eq('provider_id', serviceProvider.id);

              if (portfolioError) {
                console.error('Error deleting portfolio:', portfolioError);
              } else {
                console.log('✅ Portfolio deleted');
              }

              // Delete the service provider profile
              const { error: deleteError } = await supabase
                .from('service_providers')
                .delete()
                .eq('id', serviceProvider.id)
                .eq('user_id', user.id); // Ensure user can only delete their own profile

              if (deleteError) {
                throw deleteError;
              }

              console.log('✅ Service profile deleted successfully');

              Alert.alert(
                'Success',
                'Your service profile has been deleted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                      // Call update callback if provided
                      if (route.params?.onUpdate) {
                        route.params.onUpdate();
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('❌ Error deleting service profile:', error);
              Alert.alert('Error', 'Failed to delete service profile. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderFormField = (
    label: string,
    field: string,
    value: string,
    placeholder: string,
    multiline: boolean = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={(text) => updateFormData(field, text)}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#52525B"
      />
    </View>
  );

  const renderTagSelector = (
    label: string,
    field: 'specializations' | 'genres' | 'skills',
    value: string[],
    options: string[]
  ) => {
    const addTag = (tag: string) => {
      if (!value.includes(tag)) {
        if (field === 'specializations') setSpecializations([...value, tag]);
        if (field === 'genres') setGenres([...value, tag]);
        if (field === 'skills') setSkills([...value, tag]);
      }
    };

    const removeTag = (tag: string) => {
      if (field === 'specializations') setSpecializations(value.filter(item => item !== tag));
      if (field === 'genres') setGenres(value.filter(item => item !== tag));
      if (field === 'skills') setSkills(value.filter(item => item !== tag));
    };

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        
        {/* Selected Tags */}
        <View style={styles.selectedTagsContainer}>
          {value.map((tag, index) => (
            <TouchableOpacity
              key={index}
              style={styles.selectedTag}
              onPress={() => removeTag(tag)}
            >
              <Text style={styles.selectedTagText}>{tag}</Text>
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Options */}
        <View style={styles.tagOptionsContainer}>
          {options.filter(option => !value.includes(option)).map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tagOption}
              onPress={() => addTag(option)}
            >
              <Text style={styles.tagOptionText}>{option}</Text>
              <Ionicons name="add" size={16} color="#3B82F6" />
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.fieldHint}>Tap to add/remove items</Text>
      </View>
    );
  };

  const renderMediaItem = (item: MediaItem) => (
    <View key={item.id} style={styles.mediaItem}>
      <View style={styles.mediaPreview}>
        {item.type === 'photo' && (
          <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
        )}
        {item.type === 'video' && (
          <View style={styles.mediaThumbnail}>
            <Ionicons name="play-circle" size={40} color="#fff" />
          </View>
        )}
        {item.type === 'audio' && (
          <View style={styles.mediaThumbnail}>
            <Ionicons name="musical-notes" size={40} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.mediaDetails}>
        <TextInput
          style={styles.mediaTitle}
          value={item.title}
          onChangeText={(text) => updateMediaItem(item.id, { title: text })}
          placeholder={`${item.type} title`}
          placeholderTextColor="#52525B"
        />
        <TextInput
          style={styles.mediaDescription}
          value={item.description}
          onChangeText={(text) => updateMediaItem(item.id, { description: text })}
          placeholder={`${item.type} description`}
          placeholderTextColor="#52525B"
          multiline
        />
      </View>
      
      <TouchableOpacity
        style={styles.removeMediaButton}
        onPress={() => removeMediaItem(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading service profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // View mode for existing profiles
  if (hasExistingProfile && viewMode) {
    return (
      <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Your Service Profile</Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setViewMode(false)}
            >
              <Ionicons name="create-outline" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Profile Header */}
            <View style={styles.profileSummary}>
              <Text style={styles.businessName}>{existingProfile.business_name}</Text>
              <Text style={styles.tagline}>{existingProfile.tagline}</Text>
              <Text style={styles.location}>
                <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                {' '}{existingProfile.location}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${existingProfile.base_price}</Text>
                <Text style={styles.statLabel}>Base Price</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{existingProfile.years_of_experience}</Text>
                <Text style={styles.statLabel}>Years Experience</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{services.length}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{existingProfile.bio}</Text>
            </View>

            {/* Tags */}
            {existingProfile.specializations && existingProfile.specializations.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Specializations</Text>
                <View style={styles.tagsContainer}>
                  {existingProfile.specializations.map((spec: string, index: number) => (
                    <View key={index} style={styles.viewTag}>
                      <Text style={styles.viewTagText}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.viewModeActions}>
              <TouchableOpacity 
                style={styles.editProfileButton} 
                onPress={() => setViewMode(false)}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.hideProfileButton} 
                onPress={handleHideProfile}
              >
                <Ionicons name="eye-off-outline" size={20} color="#EF4444" />
                <Text style={styles.hideProfileText}>Hide Profile</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      </SafeAreaView>
    );
  }

  // Edit/Create mode
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
              <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
            <Text style={styles.title}>
              {editMode ? 'Edit Service Profile' : 'Create Service Profile'}
            </Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${(currentStep / totalSteps) * 100}%` }]}
            />
          </View>

          <View style={styles.form}>
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <Text style={styles.sectionSubtitle}>Let's start with the essentials</Text>
                
                {renderFormField('Business Name *', 'businessName', formData.businessName, 'Enter your business name')}
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Provider Type *</Text>
                  <View style={styles.providerTypeGrid}>
                    {[
                      { id: 'producer', label: 'Producer' },
                      { id: 'sound_engineer', label: 'Sound Engineer' },
                      { id: 'mixing_engineer', label: 'Mixing Engineer' },
                      { id: 'mastering_engineer', label: 'Mastering' },
                      { id: 'songwriter', label: 'Songwriter' },
                      { id: 'musician', label: 'Musician' },
                      { id: 'video_editor', label: 'Video Editor' },
                      { id: 'photographer', label: 'Photographer' },
                      { id: 'graphic_designer', label: 'Designer' },
                      { id: 'marketing_specialist', label: 'Marketing' },
                    ].map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.providerTypeButton,
                          formData.providerType === type.id && styles.providerTypeButtonActive
                        ]}
                        onPress={() => updateFormData('providerType', type.id)}
                      >
                        <Text style={[
                          styles.providerTypeText,
                          formData.providerType === type.id && styles.providerTypeTextActive
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {renderFormField('Tagline', 'tagline', formData.tagline, 'Brief description of your services')}
                {renderFormField('Bio', 'bio', formData.bio, 'Tell us about yourself and your experience', true)}
              </>
            )}

            {/* Step 2: Contact Information */}
            {currentStep === 2 && (
              <>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <Text style={styles.sectionSubtitle}>How can clients reach you?</Text>
                {renderFormField('Contact Email *', 'contactEmail', formData.contactEmail, 'your@email.com', false, 'email-address')}
                {renderFormField('Phone *', 'phone', formData.phone, '+1 (555) 123-4567', false, 'phone-pad')}
                {renderFormField('Website', 'website', formData.website, 'https://yourwebsite.com', false, 'url')}
                {renderFormField('Location', 'location', formData.location, 'City, State/Country')}
              </>
            )}

            {/* Step 3: Professional Details */}
            {currentStep === 3 && (
              <>
                <Text style={styles.sectionTitle}>Professional Details</Text>
                <Text style={styles.sectionSubtitle}>Showcase your expertise</Text>
                {renderFormField('Years of Experience', 'yearsOfExperience', formData.yearsOfExperience, '5', false, 'numeric')}
                
                {renderTagSelector('Specializations', 'specializations', specializations, specializationOptions)}
                {renderTagSelector('Genres', 'genres', genres, genreOptions)}
                {renderTagSelector('Skills', 'skills', skills, skillOptions)}
              </>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <>
                <Text style={styles.sectionTitle}>Pricing</Text>
                <Text style={styles.sectionSubtitle}>Set your rates and project budgets</Text>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    {renderFormField('Base Price ($)', 'basePrice', formData.basePrice, '500', false, 'numeric')}
                  </View>
                  <View style={{ flex: 1 }}>
                    {renderFormField('Hourly Rate ($)', 'pricePerHour', formData.pricePerHour, '75', false, 'numeric')}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    {renderFormField('Min Budget ($)', 'minProjectBudget', formData.minProjectBudget, '200', false, 'numeric')}
                  </View>
                  <View style={{ flex: 1 }}>
                    {renderFormField('Max Budget ($)', 'maxProjectBudget', formData.maxProjectBudget, '2000', false, 'numeric')}
                  </View>
                </View>

                {renderFormField('Turnaround Time (Days)', 'turnaroundTime', formData.turnaroundTime, '7', false, 'numeric')}
              </>
            )}

            {/* Step 5: Services */}
            {currentStep === 5 && (
              <>
                <Text style={styles.sectionTitle}>Services Offered</Text>
                <Text style={styles.sectionSubtitle}>Add the services you provide</Text>
                
                {services.map(service => (
              <View key={service.id} style={styles.serviceItem}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceTitle}>Service {services.indexOf(service) + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeServiceButton}
                    onPress={() => removeService(service.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
            </View>

              <TextInput
                style={styles.input}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="Service name"
                  placeholderTextColor="#52525B"
                />
                
              <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Service description"
                  placeholderTextColor="#52525B"
                  multiline
                />
                
                <View style={styles.servicePricingContainer}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceInputLabel}>Price ($)</Text>
                    <TextInput
                      style={styles.priceInputField}
                      value={service.price}
                      onChangeText={(text) => updateService(service.id, 'price', text)}
                      placeholder="0"
                      placeholderTextColor="#52525B"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.priceTypeSelector}>
                    <Text style={styles.priceInputLabel}>Type</Text>
                    <View style={styles.priceTypeButtons}>
                      {['fixed', 'hourly', 'per_project'].map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.priceTypeButton,
                            service.priceType === type && styles.priceTypeButtonActive
                          ]}
                          onPress={() => updateService(service.id, 'priceType', type)}
                        >
                          <Text style={[
                            styles.priceTypeText,
                            service.priceType === type && styles.priceTypeTextActive
                          ]}>
                            {type === 'fixed' ? 'Fixed' : type === 'hourly' ? 'Hourly' : 'Per Project'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
            </View>
                ))}
                
                <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addServiceText}>Add Service</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 6: Portfolio & Social */}
            {currentStep === 6 && (
              <>
                <Text style={styles.sectionTitle}>Portfolio & Social</Text>
                <Text style={styles.sectionSubtitle}>Connect your social profiles</Text>
                
                <Text style={styles.fieldLabel}>Portfolio Media</Text>
                <View style={styles.mediaButtons}>
              <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#3B82F6" />
                <Text style={styles.mediaButtonText}>Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
                <Ionicons name="videocam" size={24} color="#3B82F6" />
                <Text style={styles.mediaButtonText}>Video</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.mediaButton} onPress={pickAudio}>
                <Ionicons name="musical-notes" size={24} color="#3B82F6" />
                <Text style={styles.mediaButtonText}>Audio</Text>
              </TouchableOpacity>
            </View>

            {mediaItems.map(renderMediaItem)}

            {/* Social Links */}
                <Text style={styles.fieldLabel}>Social Links</Text>
                
                <TextInput
                  style={styles.input}
                  value={socialLinks.instagram}
                  onChangeText={(text) => updateSocialLinks('instagram', text)}
                  placeholder="https://instagram.com/yourusername"
                  placeholderTextColor="#52525B"
                  keyboardType="url"
                />

                <TextInput
                  style={styles.input}
                  value={socialLinks.twitter}
                  onChangeText={(text) => updateSocialLinks('twitter', text)}
                  placeholder="https://twitter.com/yourusername"
                  placeholderTextColor="#52525B"
                  keyboardType="url"
                />

                <TextInput
                  style={styles.input}
                  value={socialLinks.youtube}
                  onChangeText={(text) => updateSocialLinks('youtube', text)}
                  placeholder="https://youtube.com/@yourusername"
                  placeholderTextColor="#52525B"
                  keyboardType="url"
                />

                <TextInput
                  style={styles.input}
                  value={socialLinks.soundcloud}
                  onChangeText={(text) => updateSocialLinks('soundcloud', text)}
                  placeholder="https://soundcloud.com/yourusername"
                  placeholderTextColor="#52525B"
                  keyboardType="url"
                />

                <TextInput
                  style={styles.input}
                  value={socialLinks.spotify}
                  onChangeText={(text) => updateSocialLinks('spotify', text)}
                  placeholder="https://spotify.com/artist/yourid"
                  placeholderTextColor="#52525B"
                  keyboardType="url"
                />
              </>
            )}

          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={currentStep === totalSteps ? handleSubmit : handleNext}
              disabled={!canProceed() || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={!canProceed() || loading ? ['#1E293B', '#1E293B'] : ['#3B82F6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {currentStep === totalSteps ? (editMode ? 'Update Profile' : 'Create Profile') : 'Next'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 0,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: '#000000',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 24,
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0,
  },
  fieldHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0D1117',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    minHeight: 54,
    marginBottom: 0,
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  providerTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerTypeButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    minHeight: 44,
    justifyContent: 'center',
  },
  providerTypeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  providerTypeText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
  providerTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  serviceItem: {
    backgroundColor: '#0D1117',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  removeServiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Updated pricing styles
  servicePricingContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 16,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0,
  },
  priceInputField: {
    backgroundColor: '#0D1117',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  priceTypeSelector: {
    flex: 1,
  },
  priceTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    minWidth: 80,
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  priceTypeText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  priceTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Tag selector styles
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  selectedTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  tagOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  tagOptionText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1117',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    minHeight: 52,
  },
  addServiceText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1117',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    minHeight: 90,
    gap: 8,
  },
  mediaButtonText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  mediaItem: {
    flexDirection: 'row',
    backgroundColor: '#0D1117',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  mediaPreview: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mediaThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDetails: {
    flex: 1,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  mediaDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    backgroundColor: '#0D1117',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  removeMediaButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
    minHeight: 54,
  },
  submitButtonDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 50,
    minHeight: 54,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  uploadingText: {
    color: '#3B82F6',
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  // View Mode Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 16,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSummary: {
    backgroundColor: '#0D1117',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0D1117',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#0D1117',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  bioText: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  viewTag: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  viewModeActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 50,
  },
  editProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    minHeight: 50,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  hideProfileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    minHeight: 50,
  },
  hideProfileText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  navigationButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 54,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateServiceProviderScreen;