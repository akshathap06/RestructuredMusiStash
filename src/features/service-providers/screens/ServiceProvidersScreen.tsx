import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import serviceProviderService, { ServiceProviderProfile } from '../../../services/serviceProviderService';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface ServiceProviderWithPosts extends ServiceProviderProfile {
  posts?: any[];
  average_rating?: number;
}

export default function ServiceProvidersScreen({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderWithPosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Get parent navigation from route params
  const parentNavigation = route.params?.parentNavigation || navigation;

  const serviceTypes = [
    { id: 'all', label: 'All Services', icon: 'grid' },
    { id: 'producer', label: 'Producers', icon: 'musical-notes' },
    { id: 'video_editor', label: 'Video Editors', icon: 'videocam' },
    { id: 'sound_engineer', label: 'Sound Engineers', icon: 'mic' },
    { id: 'mixing_engineer', label: 'Mixing Engineers', icon: 'layers' },
    { id: 'mastering_engineer', label: 'Mastering Engineers', icon: 'trending-up' },
    { id: 'songwriter', label: 'Songwriters', icon: 'create' },
    { id: 'musician', label: 'Musicians', icon: 'musical-note' },
    { id: 'photographer', label: 'Photographers', icon: 'camera' },
    { id: 'graphic_designer', label: 'Graphic Designers', icon: 'color-palette' },
    { id: 'marketing_specialist', label: 'Marketing Specialists', icon: 'megaphone' },
  ];

  const genres = [
    'all', 'Hip Hop', 'Pop', 'Rock', 'Electronic', 'R&B', 'Country', 'Jazz', 'Classical', 'Folk', 'Blues', 'Reggae', 'Latin', 'Metal', 'Punk', 'Indie', 'Alternative'
  ];

  useEffect(() => {
    loadServiceProviders();
  }, [selectedType, selectedGenre]);

  const loadServiceProviders = async () => {
    try {
      setLoading(true);
      let providers: ServiceProviderProfile[] = [];

      if (selectedType === 'all') {
        providers = await serviceProviderService.getAllApprovedProviders();
      } else {
        providers = await serviceProviderService.getProvidersByType(selectedType);
      }

      // Filter by genre if selected
      if (selectedGenre !== 'all') {
        providers = providers.filter(provider => 
          provider.genres.includes(selectedGenre)
        );
      }

      // Load recent posts for each provider
      const providersWithPosts = await Promise.all(
        providers.map(async (provider) => {
          try {
            const { data: posts, error } = await supabase
              .from('posts')
              .select('*')
              .eq('user_id', provider.user_id)
              .order('created_at', { ascending: false })
              .limit(3); // Only get recent 3 posts for Recent Work

            if (error) {
              console.error('Error loading posts for provider:', provider.business_name, error);
              return { ...provider, posts: [] };
            }

            return { ...provider, posts: posts || [] };
          } catch (error) {
            console.error('Error loading posts for provider:', provider.business_name, error);
            return { ...provider, posts: [] };
          }
        })
      );

      setServiceProviders(providersWithPosts);
    } catch (error) {
      console.error('Failed to load service providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPosts = (provider: ServiceProviderProfile) => {
    // Generate mock portfolio posts for demonstration
    // In production, you'd fetch real portfolio items from your service
    const mediaTypes = ['audio', 'video', 'image'];
    const audioTitles = ['Hip Hop Beat', 'R&B Instrumental', 'Trap Beat', 'Lo-Fi Loop', 'Jazz Sample'];
    const videoTitles = ['Music Video', 'Behind the Scenes', 'Studio Session', 'Performance', 'Promotional'];
    const imageTitles = ['Album Cover', 'Artist Photo', 'Concert Poster', 'Brand Design', 'Logo Design'];
    
    const mockPosts = [];
    
    for (let i = 0; i < Math.floor(Math.random() * 4) + 2; i++) {
      const type = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
      let title, basePrice;
      
      switch (type) {
        case 'audio':
          title = audioTitles[Math.floor(Math.random() * audioTitles.length)];
          basePrice = Math.floor(Math.random() * 300) + 100;
          break;
        case 'video':
          title = videoTitles[Math.floor(Math.random() * videoTitles.length)];
          basePrice = Math.floor(Math.random() * 500) + 200;
          break;
        case 'image':
          title = imageTitles[Math.floor(Math.random() * imageTitles.length)];
          basePrice = Math.floor(Math.random() * 200) + 50;
          break;
        default:
          title = 'Portfolio Item';
          basePrice = 100;
      }
      
      mockPosts.push({
        id: `portfolio-${provider.id}-${i}`,
        title,
        image: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
        price: basePrice,
        type,
        duration: type === 'audio' ? `${Math.floor(Math.random() * 3) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : 
                  type === 'video' ? `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : null,
        description: `Professional ${type} work showcasing ${provider.provider_type} skills`,
        tags: provider.genres.slice(0, 2),
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    
    return mockPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServiceProviders();
    setRefreshing(false);
  };

  const handlePostPress = (post: any, provider: ServiceProviderWithPosts) => {
    // Navigate to post detail or initiate transaction
    parentNavigation.navigate('PostDetail', { post, provider });
  };

  const handleServiceProviderPress = (provider: ServiceProviderWithPosts) => {
    // Navigate to service provider profile view
    parentNavigation.navigate('ServiceProviderDetail', { provider });
  };

  const handleContactPress = (provider: ServiceProviderWithPosts) => {
    // Navigate to contact/booking form
    parentNavigation.navigate('ContactServiceProvider', { provider });
  };

  const renderServiceProvider = ({ item, index }: { item: ServiceProviderWithPosts; index: number }) => (
    <TouchableOpacity 
      style={styles.providerCard}
      onPress={() => handleServiceProviderPress(item)}
    >
      {/* Rover-style Provider Card */}
      <View style={styles.providerHeader}>
        <View style={styles.providerInfo}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              <Ionicons 
                name={serviceTypes.find(t => t.id === item.provider_type)?.icon as any || 'person'} 
                size={24} 
                color="#3B82F6" 
              />
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>{index + 1}. {item.business_name}</Text>
            <Text style={styles.providerTagline}>{item.tagline}</Text>
            <Text style={styles.providerLocation}>{item.location}</Text>
            <View style={styles.providerMeta}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>New Provider</Text>
              </View>
              <View style={styles.experienceContainer}>
                <Ionicons name="time-outline" size={14} color="#3B82F6" />
                <Text style={styles.experienceText}>
                  {item.years_of_experience || 0}+ years experience
                </Text>
              </View>
              <Text style={styles.availabilityText}>Available for new projects</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>from ${item.base_price}</Text>
          <Text style={styles.priceUnit}>per project</Text>
        </View>
      </View>

      {/* Genres */}
      <View style={styles.genresContainer}>
        {item.genres.slice(0, 3).map((genre, genreIndex) => (
          <View key={genreIndex} style={styles.genreChip}>
            <Text style={styles.genreChipText}>{genre}</Text>
          </View>
        ))}
        {item.genres.length > 3 && (
          <Text style={styles.moreGenres}>+{item.genres.length - 3} more</Text>
        )}
      </View>

      {/* Portfolio Section - Instagram-style Grid */}
      <View style={styles.portfolioSection}>
        <View style={styles.portfolioHeader}>
          <Text style={styles.portfolioTitle}>Recent Work</Text>
          {item.posts && item.posts.length > 3 && (
            <TouchableOpacity 
              style={styles.viewAllLink}
              onPress={() => navigation.navigate('ServiceProviderDetail', { 
                provider: item, 
                initialTab: 'services' 
              })}
            >
              <Text style={styles.viewAllLinkText}>View All ({item.posts.length})</Text>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>
        
        {item.posts && item.posts.length > 0 ? (
          <View style={styles.portfolioGrid}>
            {item.posts.slice(0, 3).map((post, index) => (
              <TouchableOpacity 
                key={post.id || index} 
                style={styles.portfolioGridItem}
                onPress={() => navigation.navigate('ServiceProviderDetail', { provider: item })}
                activeOpacity={0.8}
              >
                <View style={styles.portfolioMediaCompact}>
                  {post.type === 'audio' ? (
                    <View style={styles.audioPreviewCompact}>
                      <View style={styles.audioIconContainer}>
                        <Ionicons name="musical-notes" size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.audioWaveformCompact}>
                        {[...Array(8)].map((_, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.waveformBarCompact, 
                              { height: Math.random() * 20 + 8 }
                            ]} 
                          />
                        ))}
                      </View>
                    </View>
                  ) : post.type === 'video' ? (
                    <View style={styles.videoPreviewCompact}>
                      <Image source={{ uri: post.image }} style={styles.videoThumbnailCompact} />
                      <View style={styles.videoOverlayCompact}>
                        <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePreviewCompact}>
                      <Image source={{ uri: post.image }} style={styles.portfolioImageCompact} />
                      <View style={styles.imageOverlayCompact}>
                        <Ionicons name="camera" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  )}
                </View>
                
                {/* Compact Info */}
                <View style={styles.portfolioItemInfoCompact}>
                  <Text style={styles.portfolioItemTitleCompact} numberOfLines={1}>
                    {post.title}
                  </Text>
                  <View style={styles.portfolioItemMeta}>
                    <Text style={styles.portfolioItemTypeCompact}>
                      {post.type === 'audio' ? '🎵' : post.type === 'video' ? '🎬' : '📷'}
                    </Text>
                    <Text style={styles.portfolioItemPriceCompact}>${post.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPortfolioContainer}>
            <Ionicons name="folder-open-outline" size={32} color="#6B7280" />
            <Text style={styles.emptyPortfolioText}>No portfolio items uploaded yet</Text>
            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => navigation.navigate('ServiceProviderDetail', { provider: item })}
            >
              <Text style={styles.viewProfileButtonText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading service providers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, genre, or skill..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Service Type Filters */}
      <View style={styles.filtersSection}>
        <FlatList
          data={serviceTypes}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.serviceTypeChip,
                selectedType === item.id && styles.serviceTypeChipSelected
              ]}
              onPress={() => setSelectedType(item.id)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={16} 
                color={selectedType === item.id ? '#FFFFFF' : '#3B82F6'} 
              />
              <Text style={[
                styles.serviceTypeChipText,
                selectedType === item.id && styles.serviceTypeChipTextSelected
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id || 'temp-id'}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Service Providers List */}
      <FlatList
        data={serviceProviders}
        renderItem={renderServiceProvider}
        keyExtractor={(item) => item.id || 'temp-id'}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
            title="Pull to refresh service providers..."
            titleColor="#9CA3AF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>No service providers found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  // Filters Section
  filtersSection: {
    backgroundColor: '#000000',
    paddingBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  serviceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  serviceTypeChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  serviceTypeChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  serviceTypeChipTextSelected: {
    color: '#FFFFFF',
  },
  // Provider Cards (Dark theme)
  listContainer: {
    paddingBottom: 100,
  },
  providerCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerTagline: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  providerLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  availabilityText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  priceUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Genres
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  genreChipText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  moreGenres: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  // Compact Portfolio Preview - Instagram Style
  portfolioSection: {
    marginBottom: 16,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllLinkText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    marginRight: 2,
  },
  portfolioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portfolioGridItem: {
    width: '31%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  portfolioMediaCompact: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  // Audio Preview Styles
  audioPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    opacity: 0.9,
  },
  playButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  // Video Preview Styles
  videoPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Image Preview Styles
  imagePreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Portfolio Item Info
  portfolioItemInfo: {
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  portfolioItemTitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  portfolioItemType: {
    fontSize: 11,
    color: '#3B82F6',
    marginBottom: 6,
    fontWeight: '500',
  },
  portfolioItemPrice: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  
  // Compact Portfolio Styles
  audioPreviewCompact: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  audioIconContainer: {
    marginBottom: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  audioWaveformCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveformBarCompact: {
    width: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    opacity: 0.9,
  },
  videoPreviewCompact: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoThumbnailCompact: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    resizeMode: 'cover',
  },
  videoOverlayCompact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCompact: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  portfolioImageCompact: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    resizeMode: 'cover',
  },
  imageOverlayCompact: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioItemInfoCompact: {
    padding: 10,
    backgroundColor: '#1C1C1E',
  },
  portfolioItemTitleCompact: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  portfolioItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioItemTypeCompact: {
    fontSize: 12,
  },
  portfolioItemPriceCompact: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
  },
  // View All Button
  viewAllButton: {
    width: 90,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewAllText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  viewAllCount: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Empty Portfolio Styles
  emptyPortfolioContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
  },
  emptyPortfolioText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  viewProfileButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Updated Provider Meta Styles
  providerMeta: {
    gap: 4,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
  },
});
