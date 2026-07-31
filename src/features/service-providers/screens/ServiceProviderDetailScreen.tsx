import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useAuth } from '../../../contexts/AuthContext';
import { ServiceProviderProfile } from '../../../services/serviceProviderService';
import { supabase } from '../../../lib/supabase';
import WriteReviewModal from '../../../components/WriteReviewModal';
import ProfilePicture from '../../../components/ProfilePicture';
import { useFocusEffect } from '@react-navigation/native';
import projectRequestService from '../../../services/projectRequestService';
import AnimatedAudioBubble from '../../../components/audio/AnimatedAudioBubble';
import ReportBlockModal from '../../../components/ReportBlockModal';

const { width } = Dimensions.get('window');

interface PortfolioItem {
  id: string;
  title: string;
  type: 'audio' | 'video' | 'image';
  image: string;
  price: number;
  duration?: string;
  description: string;
  tags: string[];
  created_at: string;
}

export default function ServiceProviderDetailScreen({ route, navigation }: any) {
  const { provider: initialProvider, initialTab = 'info' } = route.params;
  const { user } = useAuth();
  const [provider, setProvider] = useState(initialProvider);
  const [selectedTab, setSelectedTab] = useState<'info' | 'reviews' | 'services'>(initialTab || 'services');
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [portfolioMedia, setPortfolioMedia] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<Map<string, any>>(new Map());
  
  // Audio player state
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  
  // Report/Block modal state
  const [showReportBlockModal, setShowReportBlockModal] = useState(false);

  const [portfolioItems] = useState<PortfolioItem[]>(provider.posts || []);

  const refreshProviderData = async () => {
    if (!provider?.id) {
      console.log('⚠️ No provider ID available for refresh');
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('id', provider.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error refreshing provider data:', error);
      } else if (data) {
        setProvider(data);
        console.log('✅ Provider data refreshed:', data);
      } else {
        console.log('⚠️ Provider not found in database, using existing provider data');
      }

      const currentProvider = provider;
      console.log('🔍 Loading services for provider:', {
        provider_id: currentProvider.id,
        user_id: currentProvider.user_id,
        business_name: currentProvider.business_name
      });
      
      if (!currentProvider.user_id) {
        console.error('❌ No user_id available for loading services');
        setLoading(false);
        return;
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentProvider.user_id)
        .eq('post_type', 'service_offer')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if ((!servicesData || servicesData.length === 0) && provider.id) {
        console.log('⚠️ No services found with user_id, trying alternative query...');
        const { data: altServicesData, error: altError } = await supabase
          .from('posts')
          .select('*')
          .contains('content', { service_info: { provider_id: provider.id } })
          .eq('post_type', 'service_offer')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (altServicesData && altServicesData.length > 0) {
          console.log('✅ Found services with alternative query:', altServicesData.length);
          const transformedServices = (altServicesData || []).map(post => {
            let parsedContent = post.content;
            
            if (typeof parsedContent === 'string') {
              try {
                parsedContent = JSON.parse(parsedContent);
              } catch (e) {
                parsedContent = {};
              }
            }
            
            if (parsedContent && typeof parsedContent === 'object') {
              const keys = Object.keys(parsedContent);
              if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
                try {
                  const reconstructedString = keys.sort((a, b) => parseInt(a) - parseInt(b))
                    .map(k => parsedContent[k])
                    .join('');
                  parsedContent = JSON.parse(reconstructedString);
                } catch (e) {
                  parsedContent = {};
                }
              }
            }
            
            const serviceInfo = parsedContent?.service_info || {};
            const pricingType = serviceInfo.pricing_type || 'flat';
            
            return {
              id: post.id,
              post_id: post.id,
              service_name: post.title || post.description || 'Service',
              service_description: post.description,
              pricing_type: pricingType,
              base_price: serviceInfo.price_min || 0,
              price_min: serviceInfo.price_min,
              price_max: serviceInfo.price_max,
              price_custom: serviceInfo.price_custom,
              price_type: pricingType === 'hourly' ? 'hourly' : 'per_project',
              currency: 'USD',
              estimated_duration_days: serviceInfo.delivery_days || 7,
              media_urls: post.media_urls || [],
            };
          });
          setServices(transformedServices);
          return;
        }
      }

      if (servicesError) {
        console.error('❌ Error loading services:', servicesError);
      } else {
        console.log('✅ Raw services data:', servicesData);
        console.log('📊 Number of service posts found:', servicesData?.length || 0);
        
        const transformedServices = (servicesData || []).map(post => {
          let parsedContent = post.content;
          
          if (typeof parsedContent === 'string') {
            try {
              parsedContent = JSON.parse(parsedContent);
            } catch (e) {
              console.error('Failed to parse content string:', e);
              parsedContent = {};
            }
          }
          
          if (parsedContent && typeof parsedContent === 'object') {
            const keys = Object.keys(parsedContent);
            if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
              console.log('⚠️ Detected corrupted content for post:', post.id);
              try {
                const reconstructedString = keys.sort((a, b) => parseInt(a) - parseInt(b))
                  .map(k => parsedContent[k])
                  .join('');
                parsedContent = JSON.parse(reconstructedString);
                console.log('✅ Fixed corrupted content:', parsedContent);
              } catch (e) {
                console.error('❌ Failed to fix corrupted content:', e);
                parsedContent = {};
              }
            }
          }
          
          const serviceInfo = parsedContent?.service_info || {};
          const pricingType = serviceInfo.pricing_type || 'flat';
          
          console.log('🔄 Transforming service:', {
            title: post.title,
            description: post.description,
            serviceInfo,
            pricingType,
            price_min: serviceInfo.price_min,
            price_max: serviceInfo.price_max,
          });
          
          return {
            id: post.id,
            post_id: post.id,
            service_name: post.title || post.description || 'Service',
            service_description: post.description,
            pricing_type: pricingType,
            base_price: serviceInfo.price_min || 0,
            price_min: serviceInfo.price_min,
            price_max: serviceInfo.price_max,
            price_custom: serviceInfo.price_custom,
            price_type: pricingType === 'hourly' ? 'hourly' : 'per_project',
            currency: 'USD',
            estimated_duration_days: serviceInfo.delivery_days || 7,
            media_urls: post.media_urls || [],
          };
        });
        setServices(transformedServices);
        console.log('✅ Services loaded and transformed:', transformedServices.length);
      }

      const { data: portfolioData, error: portfolioError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentProvider.user_id)
        .eq('post_type', 'video_portfolio')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (portfolioError) {
        console.error('Error loading portfolio:', portfolioError);
      } else {
        const transformedPortfolio = (portfolioData || []).map((post, index) => {
          const firstMedia = post.media_urls?.[0] || '';
          let mediaType = 'photo';
          if (firstMedia.includes('.mp3') || firstMedia.includes('.wav') || firstMedia.includes('.m4a')) {
            mediaType = 'audio';
          } else if (firstMedia.includes('.mp4') || firstMedia.includes('.mov')) {
            mediaType = 'video';
          }
          
          return {
            id: post.id,
            title: post.title || 'Portfolio Item',
            description: post.description,
            file_name: firstMedia.split('/').pop() || 'media',
            file_url: firstMedia,
            media_type: mediaType,
            created_at: post.created_at,
            duration_seconds: null,
          };
        });
        setPortfolioMedia(transformedPortfolio);
        console.log('Portfolio items loaded:', transformedPortfolio.length);
      }

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentProvider.user_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (postsError) {
        console.error('Error loading recent posts:', postsError);
      } else {
        setRecentPosts(postsData || []);
        console.log('Recent posts loaded:', postsData?.length || 0);
      }

    } catch (error) {
      console.error('❌ Error refreshing provider:', error);
    } finally {
      setLoading(false);
      console.log('✅ Finished refreshing provider data');
    }
  };

  const loadUserRequests = async () => {
    if (!user?.id) return;
    
    try {
      console.log('🔄 Loading user requests for user:', user.id);
      const userRequests = await projectRequestService.getUserProjectRequests(user.id);
      console.log('📋 User requests received:', userRequests.length, userRequests);
      
      const requestsMap = new Map<string, any>();
      
      userRequests.forEach(request => {
        const normalizedServiceType = (request.service_type || '').trim();
        const key = `${request.service_provider_id}_${normalizedServiceType}`;
        requestsMap.set(key, request);
        console.log(`  ✅ Mapped request: ${key} -> ${request.id} (${request.status})`);
      });
      
      setServiceRequests(requestsMap);
      console.log('✅ Loaded existing requests for provider:', requestsMap.size, 'requests');
    } catch (error) {
      console.error('❌ Error loading existing requests:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const refresh = async () => {
        await refreshProviderData();
        if (user?.id) {
          await loadUserRequests();
        }
      };
      refresh();
    }, [provider?.id, user?.id])
  );

  useEffect(() => {
    if (route?.params?.refreshRequests && user?.id) {
      console.log('🔄 Refreshing requests from route params');
      loadUserRequests();
      navigation.setParams({ refreshRequests: undefined });
    }
  }, [route?.params?.refreshRequests, user?.id]);

  const handleContactPress = () => {
    navigation.navigate('NewMessage', { 
      recipientId: provider.user_id,
      recipientName: provider.business_name 
    });
  };

  const handleHideProfile = async () => {
    Alert.alert(
      'Hide Service Profile',
      'Are you sure you want to hide your service provider profile?',
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
                .eq('id', provider.id);

              if (error) {
                Alert.alert('Error', 'Failed to hide profile. Please try again.');
                return;
              }

              Alert.alert('Profile Hidden', 'Your profile has been hidden.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error hiding profile:', error);
              Alert.alert('Error', 'Failed to hide profile.');
            }
          }
        }
      ]
    );
  };

  const handleBackPress = () => navigation.goBack();

  const handlePortfolioItemPress = (item: PortfolioItem) => {
    setSelectedPortfolioItem(item);
    setPortfolioModalVisible(true);
  };

  const handleRequestService = () => {
    navigation.navigate('ContactServiceProvider', { provider });
  };

  const handleRequestSpecificService = (service: any) => {
    navigation.navigate('ContactServiceProvider', { 
      provider, 
      specificService: service,
      initialMessage: `Hi! I'm interested in your "${service.service_name}" service. Could you please provide more details?`
    });
  };

  const handleSalesDashboard = () => {
    navigation.navigate('ServiceProviderDashboard', { provider });
  };

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.log('Error setting up audio:', error);
      }
    };
    
    setupAudio();
    return () => {
      if (audioSound) audioSound.unloadAsync();
    };
  }, []);

  const handleAudioPlayback = async (audioId: string, audioUrl: string) => {
    try {
      if (currentlyPlayingAudio === audioId && audioSound) {
        if (playbackStatus?.isPlaying) {
          await audioSound.pauseAsync();
        } else {
          await audioSound.playAsync();
        }
        return;
      }

      if (audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
      }

      setAudioLoading(audioId);
      setCurrentlyPlayingAudio(audioId);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          setPlaybackStatus(status);
          if (status.isLoaded === false && status.error) {
            setAudioLoading(null);
            setCurrentlyPlayingAudio(null);
            Alert.alert('Playback Error', 'Unable to play this audio file.');
          }
        }
      );

      setAudioSound(sound);
      setAudioLoading(null);

      sound.setOnPlaybackStatusUpdate((status) => {
        setPlaybackStatus(status);
        if (status.isLoaded && status.didJustFinish) {
          setCurrentlyPlayingAudio(null);
          setAudioSound(null);
        }
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioLoading(null);
      setCurrentlyPlayingAudio(null);
      Alert.alert('Audio Error', 'Failed to play audio.');
    }
  };

  const getProviderTypeDisplay = (type: string) => {
    const types: { [key: string]: string } = {
      'producer': 'Music Producer',
      'engineer': 'Audio Engineer',
      'vocalist': 'Vocalist',
      'musician': 'Musician',
      'studio': 'Recording Studio',
      'other': 'Service Provider',
    };
    return types[type] || 'Service Provider';
  };

  const renderServiceItem = (service: any, index: number) => {
    const pricingType = service.pricing_type || service.price_type || 'flat';
    const priceMinNum = service.price_min != null ? Number(service.price_min) : null;
    const priceMaxNum = service.price_max != null ? Number(service.price_max) : null;
    const basePriceNum = service.base_price != null ? Number(service.base_price) : null;
    
    let priceDisplay = 'Contact for pricing';
    
    if (pricingType === 'custom' && service.price_custom?.trim()) {
      priceDisplay = service.price_custom.trim();
    } else if (pricingType === 'range' && priceMinNum && priceMaxNum) {
      priceDisplay = `$${priceMinNum} - $${priceMaxNum}`;
    } else if ((pricingType === 'hourly' || pricingType === 'per_hour') && priceMinNum) {
      priceDisplay = `$${priceMinNum}/hour`;
    } else {
      const priceValue = priceMinNum || basePriceNum || (service.price ? Number(service.price) : null);
      if (priceValue && priceValue > 0) priceDisplay = `$${priceValue}`;
    }

    let durationText = 'Flexible';
    if (service.pricing_type === 'hourly') {
      durationText = 'Hourly';
    } else if (service.estimated_duration_days) {
      durationText = `${service.estimated_duration_days} day${service.estimated_duration_days !== 1 ? 's' : ''}`;
    }

    const normalizedServiceName = (service.service_name || '').trim();
    const requestKey = `${provider.id}_${normalizedServiceName}`;
    let existingRequest = serviceRequests.get(requestKey);
    
    if (!existingRequest && serviceRequests.size > 0) {
      for (const [key, request] of serviceRequests.entries()) {
        const requestServiceType = (request.service_type || '').trim();
        if (request.service_provider_id === provider.id && requestServiceType === normalizedServiceName) {
          existingRequest = request;
          break;
        }
      }
    }
    
    const hasRequest = !!existingRequest;

    const handleServiceAction = () => {
      if (hasRequest && existingRequest) {
        navigation.navigate('ProjectRequestDetails', { requestId: existingRequest.id });
      } else {
        handleRequestSpecificService(service);
      }
    };

    return (
      <View key={service.id || index} style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceIcon}>
            <Ionicons name="briefcase" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.serviceHeaderText}>
            <Text style={styles.serviceName}>{service.service_name || 'Service'}</Text>
            {service.service_description && (
              <Text style={styles.serviceDescription} numberOfLines={1}>
                {service.service_description}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.serviceMetaRow}>
          <View style={styles.serviceMeta}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.serviceMetaText}>{durationText}</Text>
          </View>
          <Text style={styles.servicePrice}>{priceDisplay}</Text>
        </View>
        
        {user?.id !== provider.user_id && (
          <TouchableOpacity 
            style={[styles.serviceButton, hasRequest && styles.serviceButtonOutline]}
            onPress={handleServiceAction}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={hasRequest ? "eye-outline" : "flash"} 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.serviceButtonText}>
              {hasRequest ? 'View Request' : 'Book Service'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderServicesTab = () => (
    <View style={styles.tabContent}>
      {services.length > 0 ? (
        <View style={styles.servicesList}>
          {services.map((service, index) => renderServiceItem(service, index))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptySubtext}>This provider hasn't added any services.</Text>
        </View>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {user?.id !== provider.user_id && (
        <TouchableOpacity 
          style={styles.writeReviewButton}
          onPress={() => setReviewModalVisible(true)}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.emptyState}>
        <Ionicons name="star-outline" size={48} color="#4B5563" />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptySubtext}>Be the first to leave a review!</Text>
      </View>
    </View>
  );

  const renderPortfolioTab = () => (
    <View style={styles.tabContent}>
      {portfolioMedia.length > 0 ? (
        <View style={styles.portfolioGrid}>
          {portfolioMedia.map((media, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.portfolioCard}
              onPress={() => {
                setSelectedPortfolioItem({
                  id: media.id,
                  title: media.title || media.file_name,
                  description: media.description || '',
                  type: media.media_type,
                  image: media.file_url,
                  price: 0,
                  duration: media.duration_seconds ? `${Math.floor(media.duration_seconds / 60)}:${(media.duration_seconds % 60).toString().padStart(2, '0')}` : undefined,
                  tags: [],
                  created_at: media.created_at
                });
                setPortfolioModalVisible(true);
              }}
            >
              <View style={styles.portfolioPreview}>
                {media.media_type === 'photo' ? (
                  <Image 
                    source={{ uri: media.file_url }} 
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                ) : media.media_type === 'audio' ? (
                  <View style={styles.portfolioIconPreview}>
                    <Ionicons name="musical-notes" size={28} color="#3B82F6" />
                  </View>
                ) : (
                  <View style={styles.portfolioIconPreview}>
                    <Ionicons name="play-circle" size={28} color="#3B82F6" />
                  </View>
                )}
              </View>
              <Text style={styles.portfolioTitle} numberOfLines={2}>{media.title || media.file_name}</Text>
              <Text style={styles.portfolioType}>
                {media.media_type === 'audio' ? '🎵 Audio' : media.media_type === 'video' ? '🎬 Video' : '📷 Photo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={48} color="#4B5563" />
          <Text style={styles.emptyTitle}>No Portfolio Items</Text>
          <Text style={styles.emptySubtext}>No work samples uploaded yet.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{provider.business_name}</Text>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <TouchableOpacity style={styles.headerButton} onPress={refreshProviderData}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {user?.id !== provider.user_id && (
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowReportBlockModal(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ProfilePicture
              userId={provider.user_id}
              userName={provider.business_name}
              avatarUrl={provider.profile_photo}
              size={64}
              showBorder={true}
              borderColor="#2563EB"
              borderWidth={2}
            />
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{provider.business_name}</Text>
              <Text style={styles.profileType}>{getProviderTypeDisplay(provider.provider_type)}</Text>
              {provider.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text style={styles.locationText}>{provider.location}</Text>
                </View>
              )}
            </View>

            {user?.id !== provider.user_id && (
              <TouchableOpacity style={styles.messageButton} onPress={handleContactPress}>
                <Ionicons name="chatbubble" size={18} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.statValue}>{provider.average_rating || '4.8'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#3B82F6" />
              <Text style={styles.statValue}>{provider.years_of_experience || '0'}+</Text>
              <Text style={styles.statLabel}>Years</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={16} color="#10B981" />
              <Text style={styles.statValue}>{provider.response_time_hours || 24}h</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
          </View>

          {/* Tags */}
          {(provider.specializations?.length > 0 || provider.genres?.length > 0) && (
            <View style={styles.tagsRow}>
              {provider.specializations?.slice(0, 3).map((skill: string, index: number) => (
                <View key={`skill-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{skill}</Text>
                </View>
              ))}
              {provider.genres?.slice(0, 2).map((genre: string, index: number) => (
                <View key={`genre-${index}`} style={[styles.tag, styles.genreTag]}>
                  <Text style={[styles.tagText, styles.genreTagText]}>{genre}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {['services', 'reviews', 'info'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab as any)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab === 'info' ? 'Portfolio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTab === 'services' && renderServicesTab()}
        {selectedTab === 'reviews' && renderReviewsTab()}
        {selectedTab === 'info' && renderPortfolioTab()}
      </ScrollView>

      {/* Bottom Bar - Owner Only */}
      {user?.id === provider.user_id && (
        <View style={styles.bottomBar}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>${provider.base_price || 0}</Text>
          </View>
          <TouchableOpacity style={styles.dashboardButton} onPress={handleSalesDashboard}>
            <Ionicons name="analytics" size={18} color="#FFFFFF" />
            <Text style={styles.dashboardButtonText}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Portfolio Modal */}
      <Modal
        visible={portfolioModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPortfolioModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPortfolioModalVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedPortfolioItem?.title}</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {selectedPortfolioItem && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalMediaContainer}>
                {selectedPortfolioItem.type === 'audio' ? (
                  <View style={styles.modalAudioPreview}>
                    <Ionicons name="musical-notes" size={64} color="#3B82F6" />
                    <Text style={styles.modalAudioTitle}>{selectedPortfolioItem.title}</Text>
                    <TouchableOpacity 
                      style={styles.modalPlayButton}
                      onPress={() => handleAudioPlayback(selectedPortfolioItem.id, selectedPortfolioItem.image)}
                    >
                      {audioLoading === selectedPortfolioItem.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons 
                          name={currentlyPlayingAudio === selectedPortfolioItem.id && playbackStatus?.isPlaying ? "pause" : "play"} 
                          size={28} 
                          color="#FFFFFF" 
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image source={{ uri: selectedPortfolioItem.image }} style={styles.modalMedia} resizeMode="cover" />
                )}
              </View>
              
              <View style={styles.modalInfo}>
                <Text style={styles.modalItemTitle}>{selectedPortfolioItem.title}</Text>
                {selectedPortfolioItem.description && (
                  <Text style={styles.modalItemDescription}>{selectedPortfolioItem.description}</Text>
                )}
                <TouchableOpacity style={styles.modalRequestButton} onPress={handleRequestService}>
                  <Text style={styles.modalRequestButtonText}>Request This Service</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      <WriteReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        providerId={provider.id}
        providerName={provider.business_name}
        userId={user?.id || ''}
        onReviewSubmitted={() => refreshProviderData()}
      />

      {user?.id && user.id !== provider.user_id && (
        <ReportBlockModal
          visible={showReportBlockModal}
          onClose={() => setShowReportBlockModal(false)}
          currentUserId={user.id}
          targetUserId={provider.user_id}
          targetUserName={provider.business_name}
          contentType="service"
          contentId={provider.id}
          onUserBlocked={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  
  content: {
    flex: 1,
  },
  
  // Profile Card
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1C1C1E',
  },
  
  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  genreTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  genreTagText: {
    color: '#A78BFA',
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1C1C1E',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  
  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  
  // Service Cards
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  serviceButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  serviceButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Write Review
  writeReviewButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  writeReviewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  
  // Portfolio
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portfolioCard: {
    width: (width - 44) / 2,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  portfolioPreview: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
    marginBottom: 8,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  portfolioIconPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  portfolioType: {
    fontSize: 11,
    color: '#6B7280',
  },
  
  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  priceInfo: {},
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dashboardButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashboardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalMediaContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#0A0A0A',
  },
  modalAudioPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAudioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  modalPlayButton: {
    marginTop: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMedia: {
    width: '100%',
    height: '100%',
  },
  modalInfo: {
    padding: 16,
  },
  modalItemTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalItemDescription: {
    fontSize: 15,
    color: '#9CA3AF',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalRequestButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
