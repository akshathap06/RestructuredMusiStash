import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService, Post as PostType } from '../../../services/postsService';
import ProfilePicture from '../../../components/ProfilePicture';
import CommentModal from '../../../components/CommentModal';
import AutoplayVideo from '../../../components/AutoplayVideo';
import AnimatedAudioBubble from '../../../components/audio/AnimatedAudioBubble';
import ReportBlockModal from '../../../components/ReportBlockModal';
import { moderationService } from '../../../services/moderationService';
import AdaptiveImage from '../../../components/AdaptiveImage';

const { width } = Dimensions.get('window');

export default function PostsScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const updatedPostData = route?.params?.updatedPost;
  const [posts, setPosts] = useState<PostType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsOffset, setPostsOffset] = useState(0);
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
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      await loadPosts();
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

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset pagination state
    setPostsOffset(0);
    setHasMorePosts(true);
    await loadContent();
    setRefreshing(false);
  };

  // Load more posts when reaching the end
  const handleLoadMore = async () => {
    if (loadingMore) return;
    if (!hasMorePosts) return;
    
    setLoadingMore(true);
    try {
      await loadPosts(true);
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
      {/* Content */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => `posts-${item.id || index}`}
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
              name="musical-notes-outline" 
              size={64} 
              color="#6B7280" 
            />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Follow some artists to see their posts here
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

