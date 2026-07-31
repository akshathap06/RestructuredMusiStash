import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService, Post as PostType } from '../../../services/postsService';
import serviceProviderService, { ServiceProviderProfile } from '../../../services/serviceProviderService';
import ProfilePicture from '../../../components/ProfilePicture';
import CommentModal from '../../../components/CommentModal';
import AutoplayVideo from '../../../components/AutoplayVideo';
import AnimatedAudioBubble from '../../../components/audio/AnimatedAudioBubble';
import { supabase } from '../../../lib/supabase';
import ReportBlockModal from '../../../components/ReportBlockModal';
import { moderationService } from '../../../services/moderationService';
import AdaptiveImage from '../../../components/AdaptiveImage';

const { width } = Dimensions.get('window');

interface ServicePost extends ServiceProviderProfile {
  posts?: any[];
}

export default function PostsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const updatedPostData = route?.params?.updatedPost;
  const [activeTab, setActiveTab] = useState<'posts' | 'services'>('posts');
  const [posts, setPosts] = useState<PostType[]>([]);
  const [servicePosts, setServicePosts] = useState<ServicePost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreServicePosts, setHasMoreServicePosts] = useState(true);
  const [postsOffset, setPostsOffset] = useState(0);
  const [servicePostsOffset, setServicePostsOffset] = useState(0);
  const POSTS_PER_PAGE = 10;
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [selectedPostImage, setSelectedPostImage] = useState<string>('');
  
  // Report/Block modal state
  const [showReportBlockModal, setShowReportBlockModal] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<PostType | null>(null);
  
  // Audio playback state
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<{
    position: number;
    duration: number;
    progress: number;
  }>({ position: 0, duration: 0, progress: 0 });
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Handle updated post data from PostDetailScreen (like/comment updates)
  useEffect(() => {
    if (updatedPostData) {
      console.log('📝 PostsScreen: Updating post with new data:', updatedPostData);
      
      // Update the post in posts array
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === updatedPostData.id 
            ? { ...post, like_count: updatedPostData.like_count, user_liked: updatedPostData.user_liked }
            : post
        )
      );
      
      // Clear the param to prevent reprocessing
      navigation.setParams({ updatedPost: undefined });
    }
  }, [updatedPostData, navigation]);

  // Handle seeking
  const handleSeek = async (position: number) => {
    if (soundRef.current && playbackStatus.duration > 0) {
      const seekPosition = position * playbackStatus.duration;
      await soundRef.current.setPositionAsync(seekPosition);
    }
  };

  // Handle audio playback inline
  const handleAudioPlayback = async (audioUrl: string, postId: string) => {
    try {
      // If same audio is playing, toggle pause/play
      if (currentlyPlayingId === postId && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setCurrentlyPlayingId(null);
          } else {
            await soundRef.current.playAsync();
            setCurrentlyPlayingId(postId);
          }
        }
        return;
      }

      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setIsAudioLoading(true);
      setCurrentlyPlayingId(postId);
      setPlaybackStatus({ position: 0, duration: 0, progress: 0 });

      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load and play new audio with progress tracking
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 },
        (status) => {
          if (status.isLoaded) {
            // Update playback status
            const position = status.positionMillis || 0;
            const duration = status.durationMillis || 0;
            const progress = duration > 0 ? position / duration : 0;
            setPlaybackStatus({ position, duration, progress });
            
            // Handle audio finish
            if (status.didJustFinish) {
              setCurrentlyPlayingId(null);
              setPlaybackStatus({ position: 0, duration: 0, progress: 0 });
            }
          }
        }
      );

      soundRef.current = sound;
      setIsAudioLoading(false);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioLoading(false);
      setCurrentlyPlayingId(null);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  const loadContent = async () => {
    try {
      setLoading(true);
      if (activeTab === 'posts') {
        await loadPosts();
      } else {
        await loadServicePosts();
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (isLoadMore = false) => {
    if (!user) return;
    try {
      const offset = isLoadMore ? postsOffset : 0;
      const feedPosts = await postsService.getUserFeed(user.id, POSTS_PER_PAGE, offset);
      
      // Get blocked users list
      const blockedUsers = await moderationService.getBlockedUsers(user.id);
      
      // Filter out service_offer posts AND posts from blocked users
      const filteredPosts = feedPosts.filter(post => 
        post.post_type !== 'service_offer' && 
        !blockedUsers.includes(post.user_id)
      );
      
      if (isLoadMore) {
        setPosts(prev => [...prev, ...filteredPosts]);
      } else {
        setPosts(filteredPosts);
      }
      
      // Check if there are more posts to load
      setHasMorePosts(filteredPosts.length >= POSTS_PER_PAGE);
      setPostsOffset(offset + filteredPosts.length);
    } catch (error) {
      console.error('Error loading posts:', error);
      if (!isLoadMore) setPosts([]);
    }
  };

  const loadServicePosts = async (isLoadMore = false) => {
    try {
      const offset = isLoadMore ? servicePostsOffset : 0;
      
      // Get blocked users list
      const blockedUsers = user ? await moderationService.getBlockedUsers(user.id) : [];
      
      // Load actual service_offer posts from the database with pagination
      const { data: servicePostsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey (
            name,
            avatar
          )
        `)
        .eq('post_type', 'service_offer')
        .eq('is_active', true)
        .eq('post_status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);

      if (error) {
        console.error('Error loading service posts:', error);
        setServicePosts([]);
        return;
      }
      
      // Filter out posts from blocked users
      const filteredServicePosts = (servicePostsData || []).filter(
        (post: any) => !blockedUsers.includes(post.user_id)
      );

      // Transform posts to include service provider business name
      // CRITICAL: Use service_provider.id, not post.id, for navigation
      const servicePostsWithProvider = await Promise.all(
        filteredServicePosts.map(async (post: any) => {
          // Get service provider info for business name AND correct ID
          const { data: serviceProvider } = await supabase
            .from('service_providers')
            .select('id, business_name, profile_photo, location, tagline, bio, provider_type, genres, specializations, years_of_experience, base_price, currency, accepts_remote_work, available_for_hire, is_verified, status')
            .eq('user_id', post.user_id)
            .eq('status', 'approved')
            .single();

          return {
            // IMPORTANT: Use service_provider.id as the main id for booking
            id: serviceProvider?.id || post.id, // Service provider ID for correct booking
            post_id: post.id, // Keep reference to the original post
            user_id: post.user_id,
            title: post.title,
            description: post.description,
            media_urls: post.media_urls || [],
            created_at: post.created_at,
            business_name: serviceProvider?.business_name || post.users?.name || 'Service Provider',
            profile_photo: serviceProvider?.profile_photo || post.users?.avatar,
            location: serviceProvider?.location || '',
            tagline: serviceProvider?.tagline || post.description || '',
            bio: serviceProvider?.bio || '',
            provider_type: serviceProvider?.provider_type || 'producer',
            genres: serviceProvider?.genres || [],
            specializations: serviceProvider?.specializations || [],
            years_of_experience: serviceProvider?.years_of_experience || 0,
            base_price: serviceProvider?.base_price || post.content?.service_info?.price_min || 0,
            currency: serviceProvider?.currency || 'USD',
            accepts_remote_work: serviceProvider?.accepts_remote_work ?? true,
            available_for_hire: serviceProvider?.available_for_hire ?? true,
            is_verified: serviceProvider?.is_verified ?? false,
            status: serviceProvider?.status || 'approved',
            service_info: post.content?.service_info || {},
          };
        })
      );

      if (isLoadMore) {
        setServicePosts(prev => [...prev, ...servicePostsWithProvider]);
      } else {
        setServicePosts(servicePostsWithProvider);
      }
      
      // Check if there are more service posts to load
      setHasMoreServicePosts(servicePostsWithProvider.length >= POSTS_PER_PAGE);
      setServicePostsOffset(offset + servicePostsWithProvider.length);
    } catch (error) {
      console.error('Error loading service posts:', error);
      if (!isLoadMore) setServicePosts([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset pagination state
    setPostsOffset(0);
    setServicePostsOffset(0);
    setHasMorePosts(true);
    setHasMoreServicePosts(true);
    await loadContent();
    setRefreshing(false);
  };

  // Load more posts when reaching the end
  const handleLoadMore = async () => {
    if (loadingMore) return;
    
    const hasMore = activeTab === 'posts' ? hasMorePosts : hasMoreServicePosts;
    if (!hasMore) return;
    
    setLoadingMore(true);
    try {
      if (activeTab === 'posts') {
        await loadPosts(true);
      } else {
        await loadServicePosts(true);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Footer component for loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    try {
      const result = await postsService.togglePostLike(postId, user.id);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, like_count: result.likeCount, user_liked: result.liked }
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling post like:', error);
    }
  };

  const handleComment = (postId: string, postImage?: string) => {
    setSelectedPostId(postId);
    setSelectedPostImage(postImage || '');
    setCommentModalVisible(true);
  };

  const handleUserPress = (userId: string, userName: string) => {
    if (!userId) return;
    navigation.navigate('ArtistProfileView', {
      userId: userId,
      userName: userName,
    });
  };

  const handlePostOptions = (post: PostType) => {
    setSelectedPostForReport(post);
    setShowReportBlockModal(true);
  };

  const handleUserBlocked = (blockedUserId: string) => {
    // Remove all posts from the blocked user
    setPosts(prevPosts => prevPosts.filter(post => post.user_id !== blockedUserId));
    setServicePosts(prevPosts => prevPosts.filter(post => post.user_id !== blockedUserId));
  };

  const handleServicePress = (provider: ServicePost) => {
    navigation.navigate('ServiceProviderDetail', { provider });
  };

  const handleViewServices = (provider: ServicePost) => {
    navigation.navigate('ServiceProviderDetail', { 
      provider,
      initialTab: 'services'
    });
  };

  const handleMessage = (provider: ServicePost) => {
    navigation.navigate('ContactServiceProvider', { provider });
  };

  // Render regular post
  const renderPost = ({ item }: { item: PostType }) => (
    <View style={styles.postCard}>
      {/* User Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.postHeaderLeft}
          onPress={() => handleUserPress(item.user_id || '', item.user_name || 'Unknown User')}
        >
          <ProfilePicture
            userId={item.user_id}
            userName={item.user_name}
            avatarUrl={item.user_avatar}
            size={40}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user_name || 'Unknown User'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
        {/* Options Menu - Only show for other users' posts */}
        {user?.id !== item.user_id && (
          <TouchableOpacity 
            style={styles.postOptionsButton}
            onPress={() => handlePostOptions(item)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Media */}
      {item.media_urls && item.media_urls.length > 0 && (() => {
        const mediaUrl = item.media_urls[0];
        const isAudio = mediaUrl.includes('.mp3') || mediaUrl.includes('.wav') || mediaUrl.includes('.m4a') || mediaUrl.includes('.aac');
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.avi');
        
        // Get stored dimensions from content.media_dimensions if available
        const mediaDimensions = item.content?.media_dimensions?.[0];
        
        if (isAudio) {
          return (
            <View style={styles.audioPostContainer}>
              <View style={styles.audioPreviewContainer}>
                <AnimatedAudioBubble
                  isPlaying={currentlyPlayingId === item.id}
                  isLoading={isAudioLoading && currentlyPlayingId === item.id}
                  onPress={() => handleAudioPlayback(item.media_urls![0], item.id)}
                  label={currentlyPlayingId === item.id ? 'Now Playing' : 'Audio Track'}
                  size={180}
                  primaryColor="#32D5FF"
                  progress={currentlyPlayingId === item.id ? playbackStatus.progress : 0}
                  duration={currentlyPlayingId === item.id ? playbackStatus.duration : 0}
                  currentTime={currentlyPlayingId === item.id ? playbackStatus.position : 0}
                  onSeek={currentlyPlayingId === item.id ? handleSeek : undefined}
                  showProgressBar={true}
                />
              </View>
            </View>
          );
        } else if (isVideo) {
          return (
            <View style={styles.videoPostContainer}>
              <TouchableOpacity style={styles.videoPreview} onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item, sourceScreen: 'Posts' })}>
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          );
        } else {
          // Image — use AdaptiveImage for dynamic aspect ratio
          return (
            <AdaptiveImage
              uri={mediaUrl}
              imageWidth={mediaDimensions?.width}
              imageHeight={mediaDimensions?.height}
            />
          );
        }
      })()}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons 
            name={item.user_liked ? "heart" : "heart-outline"} 
            size={22} 
            color={item.user_liked ? "#EF4444" : "#FFFFFF"} 
          />
          <Text style={styles.actionText}>{item.like_count || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleComment(item.id, item.media_urls?.[0])}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
      </View>

      {/* Post Caption */}
      {item.description && (
        <View style={styles.captionContainer}>
          <TouchableOpacity onPress={() => handleUserPress(item.user_id || '', item.user_name || 'Unknown User')}>
            <Text style={styles.captionUsername}>{item.user_name}</Text>
          </TouchableOpacity>
          <Text style={styles.captionText}> {item.description}</Text>
        </View>
      )}
    </View>
  );

  // Render service post
  const renderServicePost = ({ item }: { item: any }) => {
    const serviceInfo = item.service_info || item.content?.service_info || {};
    const pricingType = serviceInfo.pricing_type || serviceInfo.price_type || 'flat';
    
    // Debug: log service info to verify data
    console.log('🔍 Service Post Debug:', {
      title: item.title,
      serviceInfo,
      pricingType,
      price_min: serviceInfo.price_min,
      price_max: serviceInfo.price_max,
      price_custom: serviceInfo.price_custom,
    });
    
    // Format pricing based on type - check multiple price fields with proper null checks
    // Use Number() to ensure we get a number, and check explicitly for null/undefined
    const priceMin = serviceInfo.price_min !== null && serviceInfo.price_min !== undefined 
      ? Number(serviceInfo.price_min) 
      : null;
    const priceMax = serviceInfo.price_max !== null && serviceInfo.price_max !== undefined 
      ? Number(serviceInfo.price_max) 
      : null;
    const basePrice = item.base_price !== null && item.base_price !== undefined 
      ? Number(item.base_price) 
      : null;
    
    // Determine the price to display - prefer post's service_info prices over provider's base_price
    let priceDisplay = 'Contact for pricing';
    
    if (pricingType === 'custom' && serviceInfo.price_custom) {
      // Custom pricing text takes priority
      priceDisplay = serviceInfo.price_custom;
    } else if (pricingType === 'range' && priceMin !== null && priceMax !== null) {
      // Range pricing
      priceDisplay = `$${priceMin} - $${priceMax}`;
    } else if (pricingType === 'hourly' || pricingType === 'per_hour') {
      // Hourly pricing
      const hourlyPrice = priceMin ?? basePrice;
      if (hourlyPrice !== null && hourlyPrice > 0) {
        priceDisplay = `$${hourlyPrice}/hour`;
      }
    } else {
      // Flat rate or default - use the first available price
      const flatPrice = priceMin ?? basePrice;
      if (flatPrice !== null && flatPrice > 0) {
        priceDisplay = `$${flatPrice}`;
      }
    }
    
    // Format date
    const postDate = new Date(item.created_at);
    const timeAgo = getTimeAgo(postDate);
    
    return (
      <View style={styles.serviceCard}>
        {/* Business Header */}
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            {item.profile_photo ? (
              <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={styles.serviceAvatar}>
                <Ionicons name="briefcase" size={20} color="#3B82F6" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.business_name || 'Service Provider'}</Text>
              <Text style={styles.timestamp}>{timeAgo}</Text>
            </View>
          </View>
          {/* Options Menu - Only show for other users' service posts */}
          {user?.id !== item.user_id && (
            <TouchableOpacity 
              style={styles.postOptionsButton}
              onPress={() => handlePostOptions(item as any)}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Service Media - Show all attachments */}
        {item.media_urls && item.media_urls.length > 0 && (() => {
          const mediaUrl = item.media_urls[0];
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.avi') || mediaUrl.includes('.m4v');
          const isAudio = mediaUrl.includes('.mp3') || mediaUrl.includes('.wav') || mediaUrl.includes('.m4a') || mediaUrl.includes('.aac');
          const mediaDimensions = item.content?.media_dimensions?.[0];
          
          if (isVideo) {
            return (
              <View style={styles.videoPostContainer}>
                <TouchableOpacity style={styles.videoPreview} onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item, sourceScreen: 'Posts' })}>
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            );
          } else if (isAudio) {
            return (
              <View style={styles.audioPostContainer}>
                <View style={styles.audioPreviewContainer}>
                  <AnimatedAudioBubble
                    isPlaying={currentlyPlayingId === item.id}
                    isLoading={isAudioLoading && currentlyPlayingId === item.id}
                    onPress={() => handleAudioPlayback(item.media_urls[0], item.id)}
                    label={currentlyPlayingId === item.id ? 'Now Playing' : 'Audio Track'}
                    size={180}
                    primaryColor="#32D5FF"
                    progress={currentlyPlayingId === item.id ? playbackStatus.progress : 0}
                    duration={currentlyPlayingId === item.id ? playbackStatus.duration : 0}
                    currentTime={currentlyPlayingId === item.id ? playbackStatus.position : 0}
                    onSeek={currentlyPlayingId === item.id ? handleSeek : undefined}
                    showProgressBar={true}
                  />
                </View>
              </View>
            );
          } else {
            return (
              <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: item.id, post: item, sourceScreen: 'Posts' })}>
                <AdaptiveImage
                  uri={mediaUrl}
                  imageWidth={mediaDimensions?.width}
                  imageHeight={mediaDimensions?.height}
                />
              </TouchableOpacity>
            );
          }
        })()}

        {/* Service Details */}
        <View style={styles.serviceDetails}>
          <Text style={styles.serviceName}>{item.title || item.description || 'Service Listing'}</Text>
          
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.location && (
            <View style={styles.serviceLocation}>
              <Ionicons name="location" size={16} color="#9CA3AF" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}

          <View style={styles.servicePricing}>
            <View>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>{priceDisplay}</Text>
            </View>
            {serviceInfo.delivery_days && (
              <View>
                <Text style={styles.priceLabel}>Delivery</Text>
                <Text style={styles.priceValue}>{serviceInfo.delivery_days} days</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.serviceActions}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={() => handleMessage(item)}
            >
              <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.viewServicesButton}
              onPress={() => handleViewServices(item)}
            >
              <Ionicons name="eye" size={18} color="#000000" />
              <Text style={styles.viewServicesButtonText}>View Service</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Service Posts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'posts' ? posts : servicePosts}
        renderItem={activeTab === 'posts' ? renderPost : renderServicePost}
        keyExtractor={(item, index) => `${activeTab}-${item.id || index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFFFFF']}
            tintColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        // Performance optimizations for recycling (like Instagram)
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={POSTS_PER_PAGE}
        getItemLayout={undefined} // Let FlatList measure dynamically for variable heights
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'posts' ? "musical-notes-outline" : "briefcase-outline"} 
              size={64} 
              color="#6B7280" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'posts' ? 'No posts yet' : 'No service posts yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'posts' 
                ? 'Follow some artists to see their posts here' 
                : 'Check back later for service providers'}
            </Text>
          </View>
        }
      />
      
      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={selectedPostId}
        postImage={selectedPostImage}
      />

      {/* Report/Block Modal */}
      {user?.id && selectedPostForReport && (
        <ReportBlockModal
          visible={showReportBlockModal}
          onClose={() => {
            setShowReportBlockModal(false);
            setSelectedPostForReport(null);
          }}
          currentUserId={user.id}
          targetUserId={selectedPostForReport.user_id || ''}
          targetUserName={selectedPostForReport.user_name || 'Unknown User'}
          contentType="post"
          contentId={selectedPostForReport.id}
          onUserBlocked={handleUserBlocked}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // List Container
  listContainer: {
    paddingBottom: 100,
  },
  
  // Post Card
  postCard: {
    backgroundColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
    paddingBottom: 16,
  },
  
  // Post Header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postOptionsButton: {
    padding: 8,
    borderRadius: 20,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Post Image - adaptive sizing (no fixed aspect ratio for images)
  postImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
  },
  // Audio/Video containers keep square-ish ratio
  audioPostContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0a0f',
  },
  videoPostContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1C1C1E',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  audioPreviewContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioLabel: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  audioLabelText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  
  // Post Actions
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  
  // Caption
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  captionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  
  // Service Card
  serviceCard: {
    backgroundColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
    paddingBottom: 16,
  },
  serviceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Service Details
  serviceDetails: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  serviceLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  servicePricing: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Service Actions
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewServicesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  viewServicesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Loading More
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

