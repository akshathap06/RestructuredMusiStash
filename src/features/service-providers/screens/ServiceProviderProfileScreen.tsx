import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { moderationService } from '../../../services/moderationService';
import ReportBlockModal from '../../../components/ReportBlockModal';
// Removed ServiceProviderStatsService to fix errors

const { width } = Dimensions.get('window');

interface ServiceProvider {
  id: string;
  user_id?: string;
  business_name: string;
  provider_type: string;
  tagline?: string;
  bio?: string;
  about_section?: string;
  contact_email?: string;
  phone?: string;
  website_url?: string;
  location?: string;
  years_of_experience?: number;
  specializations?: string[];
  genres?: string[];
  skills?: string[];
  base_price?: number;
  price_per_hour?: number;
  min_project_budget?: number;
  max_project_budget?: number;
  turnaround_time_days?: number;
  portfolio_description?: string;
  social_links?: any;
  profile_photo?: string;
  banner_photo?: string;
  is_verified: boolean;
  verification_level: string;
  status: string;
  featured: boolean;
  total_projects_completed: number;
  average_rating: number;
  total_ratings_count: number;
  response_time_hours: number;
  accepts_remote_work: boolean;
  available_for_hire: boolean;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  service_name: string;
  service_description?: string;
  base_price: number;
  currency: string;
  price_type: string;
  estimated_duration_days?: number;
  is_active: boolean;
}

interface MediaItem {
  id: string;
  media_type: 'photo' | 'video' | 'audio';
  file_url: string;
  file_name?: string;
  title?: string;
  description?: string;
  is_featured: boolean;
  sort_order: number;
  duration_seconds?: number;
}

const ServiceProviderProfileScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const { providerId, provider: passedProvider } = route.params || {};
  const [provider, setProvider] = useState<ServiceProvider | null>(passedProvider || null);
  const [services, setServices] = useState<Service[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'portfolio' | 'contact'>('about');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [providerUserId, setProviderUserId] = useState<string | null>(null);
  // Removed stats state to fix errors

  // Debug logging
  console.log('ServiceProviderProfileScreen - Route params:', route.params);
  console.log('ServiceProviderProfileScreen - providerId:', providerId);
  console.log('ServiceProviderProfileScreen - passedProvider:', passedProvider);

  const loadProviderData = async () => {
    try {
      setLoading(true);

      // If we already have provider data passed in, use it
      if (passedProvider && !providerId) {
        setProvider(passedProvider);
        if (passedProvider?.user_id) {
          setProviderUserId(passedProvider.user_id);
          if (user?.id && passedProvider.user_id !== user.id) {
            const blocked = await moderationService.isUserBlocked(user.id, passedProvider.user_id);
            setIsBlocked(blocked);
          }
        }
        setLoading(false);
        return;
      }

      // If we have a providerId, load from database
      if (providerId) {
        const { data: providerData, error: providerError } = await supabase
          .from('service_providers')
          .select('*')
          .eq('id', providerId)
          .eq('status', 'approved')
          .single();

        if (providerError) {
          console.error('Error loading provider:', providerError);
          Alert.alert('Error', 'Failed to load service provider profile');
          return;
        }

        setProvider(providerData);
        
        // Get the user_id for the provider
        if (providerData?.user_id) {
          setProviderUserId(providerData.user_id);
          
          // Check if this user is blocked
          if (user?.id && providerData.user_id !== user.id) {
            const blocked = await moderationService.isUserBlocked(user.id, providerData.user_id);
            setIsBlocked(blocked);
          }
        }
        
        // Removed stats loading to fix errors
      } else {
        console.error('No providerId or provider data provided');
        console.error('Route params:', route.params);
        Alert.alert('Error', 'No provider information available. Please try again.');
        return;
      }

      // Load services and media only if we have a providerId
      if (providerId) {
        // Load services
        const { data: servicesData, error: servicesError } = await supabase
          .from('service_provider_services')
          .select('*')
          .eq('service_provider_id', providerId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (servicesError) {
          console.log('Error loading services:', servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Load media
        const { data: mediaData, error: mediaError } = await supabase
          .from('service_provider_media')
          .select('*')
          .eq('service_provider_id', providerId)
          .order('sort_order', { ascending: true });

        if (mediaError) {
          console.log('Error loading media:', mediaError);
        } else {
          setMediaItems(mediaData || []);
        }
      }

    } catch (error) {
      console.error('Error loading provider data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProviderData();
    }, [providerId])
  );

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const openSocialLink = (platform: string, url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const handleUserBlocked = (blockedUserId: string) => {
    setIsBlocked(true);
    Alert.alert(
      'User Blocked',
      'You will no longer see this user\'s content.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  // Removed loadProviderStats function to fix errors

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Service Provider</Text>
      {user?.id && providerUserId && user.id !== providerUserId ? (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowReportModal(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );

  const renderProfileHeader = () => {
    if (!provider) return null;

    return (
      <View style={styles.profileHeader}>
        {/* Banner Image */}
        {provider.banner_photo && (
          <Image source={{ uri: provider.banner_photo }} style={styles.bannerImage} />
        )}
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bannerGradient}
        />

        {/* Profile Info */}
    <View style={styles.profileInfo}>
      <View style={styles.profileImageContainer}>
            {provider.profile_photo ? (
              <Image source={{ uri: provider.profile_photo }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#666" />
        </View>
            )}
            {provider.is_verified && (
        <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
        </View>
            )}
      </View>

      <View style={styles.profileDetails}>
            <Text style={styles.businessName}>{provider.business_name}</Text>
            <Text style={styles.providerType}>
              {provider.provider_type.charAt(0).toUpperCase() + provider.provider_type.slice(1)}
          </Text>
            {provider.tagline && (
              <Text style={styles.tagline}>{provider.tagline}</Text>
            )}
            
            {/* Location and Remote Work */}
            <View style={styles.locationContainer}>
              {provider.location && (
                <View style={styles.locationItem}>
                  <Ionicons name="location" size={16} color="#999" />
                  <Text style={styles.locationText}>{provider.location}</Text>
                </View>
              )}
              {provider.accepts_remote_work && (
                <View style={styles.remoteWorkBadge}>
                  <Ionicons name="globe" size={14} color="#3B82F6" />
                  <Text style={styles.remoteWorkText}>Remote Work</Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0.0</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>24h</Text>
                <Text style={styles.statLabel}>Response</Text>
              </View>
            </View>
          </View>
      </View>
    </View>
  );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'about', label: 'About', icon: 'person' },
        { key: 'services', label: 'Services', icon: 'briefcase' },
        { key: 'portfolio', label: 'Portfolio', icon: 'images' },
        { key: 'contact', label: 'Contact', icon: 'mail' },
      ].map(tab => (
      <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.key ? '#3B82F6' : '#999'}
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
      </TouchableOpacity>
      ))}
    </View>
  );

  const renderAboutContent = () => {
    if (!provider) return null;

    return (
    <View style={styles.tabContent}>
        {/* About Section */}
        {(provider.about_section || provider.bio) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>
              {provider.about_section || provider.bio}
        </Text>
      </View>
        )}

        {/* Specializations */}
        {provider.specializations && provider.specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.tagsContainer}>
              {provider.specializations.map((spec, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Genres */}
        {provider.genres && provider.genres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.tagsContainer}>
              {provider.genres.map((genre, index) => (
                <View key={index} style={[styles.tag, styles.genreTag]}>
                  <Text style={styles.tagText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills */}
        {provider.skills && provider.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Tools</Text>
            <View style={styles.tagsContainer}>
              {provider.skills.map((skill, index) => (
                <View key={index} style={[styles.tag, styles.skillTag]}>
                  <Text style={styles.tagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pricing Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.pricingContainer}>
            {provider.base_price && (
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Base Price</Text>
                <Text style={styles.pricingValue}>{formatPrice(provider.base_price)}</Text>
              </View>
            )}
            {provider.price_per_hour && (
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Per Hour</Text>
                <Text style={styles.pricingValue}>{formatPrice(provider.price_per_hour)}/hr</Text>
              </View>
            )}
            {provider.min_project_budget && provider.max_project_budget && (
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Project Range</Text>
                <Text style={styles.pricingValue}>
                  {formatPrice(provider.min_project_budget)} - {formatPrice(provider.max_project_budget)}
                </Text>
              </View>
            )}
            {provider.turnaround_time_days && (
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>Turnaround</Text>
                <Text style={styles.pricingValue}>{provider.turnaround_time_days} days</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderServicesContent = () => (
    <View style={styles.tabContent}>
      {services.length > 0 ? (
        services.map(service => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceName}>{service.service_name}</Text>
              <Text style={styles.servicePrice}>
                {formatPrice(service.base_price, service.currency)}
                {service.price_type === 'hourly' && '/hr'}
                {service.price_type === 'per_project' && '/project'}
              </Text>
            </View>
            
            {service.service_description && (
              <Text style={styles.serviceDescription}>{service.service_description}</Text>
            )}
            
            <View style={styles.serviceFooter}>
              <View style={styles.serviceInfo}>
                <Ionicons name="time" size={16} color="#999" />
                <Text style={styles.serviceInfoText}>
                  {service.estimated_duration_days ? `${service.estimated_duration_days} days` : 'Flexible'}
                </Text>
              </View>
              <View style={styles.serviceInfo}>
                <Ionicons name="card" size={16} color="#999" />
                <Text style={styles.serviceInfoText}>
                  {service.price_type.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No services listed</Text>
        </View>
      )}
    </View>
  );

  const renderPortfolioContent = () => (
    <View style={styles.tabContent}>
      {mediaItems.length > 0 ? (
        <View style={styles.mediaGrid}>
          {mediaItems.map(media => (
            <View key={media.id} style={styles.mediaCard}>
              {media.media_type === 'photo' && (
                <Image source={{ uri: media.file_url }} style={styles.mediaImage} />
              )}
              {media.media_type === 'video' && (
                <View style={styles.mediaImage}>
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
              )}
              {media.media_type === 'audio' && (
                <View style={styles.mediaImage}>
                  <Ionicons name="musical-notes" size={40} color="#fff" />
      </View>
              )}
              
              {media.title && (
                <Text style={styles.mediaTitle}>{media.title}</Text>
              )}
              {media.description && (
                <Text style={styles.mediaDescription}>{media.description}</Text>
              )}
        </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No portfolio media</Text>
        </View>
      )}
    </View>
  );

  const renderContactContent = () => {
    if (!provider) return null;

    return (
    <View style={styles.tabContent}>
        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {provider.contact_email && (
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>{provider.contact_email}</Text>
            </TouchableOpacity>
          )}
          
          {provider.phone && (
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>{provider.phone}</Text>
            </TouchableOpacity>
          )}
          
          {provider.website_url && (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL(provider.website_url!)}
            >
              <Ionicons name="globe" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>{provider.website_url}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Links */}
        {provider.social_links && Object.keys(provider.social_links).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            {Object.entries(provider.social_links).map(([platform, url]) => (
              url && (
                <TouchableOpacity
                  key={platform}
                  style={styles.contactItem}
                  onPress={() => openSocialLink(platform, url as string)}
                >
                  <Ionicons 
                    name={platform === 'instagram' ? 'logo-instagram' : 
                          platform === 'twitter' ? 'logo-twitter' :
                          platform === 'youtube' ? 'logo-youtube' :
                          platform === 'soundcloud' ? 'musical-notes' :
                          platform === 'spotify' ? 'musical-notes' : 'globe'} 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.contactText}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            ))}
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityContainer}>
            <View style={styles.availabilityItem}>
              <Ionicons 
                name={provider.available_for_hire ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={provider.available_for_hire ? "#3B82F6" : "#ff4444"} 
              />
              <Text style={styles.availabilityText}>
                {provider.available_for_hire ? "Available for hire" : "Not available"}
              </Text>
            </View>
            <View style={styles.availabilityItem}>
              <Ionicons 
                name={provider.accepts_remote_work ? "globe" : "location"} 
                size={20} 
                color="#3B82F6" 
              />
              <Text style={styles.availabilityText}>
                {provider.accepts_remote_work ? "Accepts remote work" : "Local work only"}
              </Text>
            </View>
          </View>
        </View>
    </View>
  );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutContent();
      case 'services':
        return renderServicesContent();
      case 'portfolio':
        return renderPortfolioContent();
      case 'contact':
        return renderContactContent();
      default:
        return renderAboutContent();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.gradient}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.gradient}>
          {renderHeader()}
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ff4444" />
            <Text style={styles.errorText}>Profile not found</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Show blocked message if user is blocked
  if (isBlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.gradient}>
          {renderHeader()}
          <View style={styles.errorContainer}>
            <Ionicons name="ban-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>You have blocked this user</Text>
            <Text style={[styles.errorText, { fontSize: 14, color: '#6B7280', marginTop: 8 }]}>
              Unblock them from Settings to view their profile
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.gradient}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderProfileHeader()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
      </LinearGradient>

      {/* Report/Block Modal */}
      {user?.id && providerUserId && (
        <ReportBlockModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          currentUserId={user.id}
          targetUserId={providerUserId}
          targetUserName={provider?.business_name || 'Service Provider'}
          contentType="service"
          contentId={providerId}
          onUserBlocked={handleUserBlocked}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  profileInfo: {
    padding: 20,
    marginTop: -50,
  },
  profileImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileDetails: {
    alignItems: 'center',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  providerType: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  locationText: {
    color: '#999',
    marginLeft: 5,
    fontSize: 14,
  },
  remoteWorkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  remoteWorkText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#222',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreTag: {
    backgroundColor: '#3B82F6',
  },
  skillTag: {
    backgroundColor: '#3B82F6',
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pricingContainer: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 15,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  pricingLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  serviceCard: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    gap: 15,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfoText: {
    color: '#999',
    fontSize: 12,
    marginLeft: 4,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaCard: {
    width: (width - 60) / 2,
    backgroundColor: '#222',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  mediaImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    padding: 10,
  },
  mediaDescription: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  availabilityContainer: {
    gap: 10,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  availabilityText: {
    color: '#ccc',
    fontSize: 16,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    marginTop: 10,
  },
});

export default ServiceProviderProfileScreen;