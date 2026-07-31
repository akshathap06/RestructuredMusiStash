import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService } from '../../../services/postsService';
import CommentModal from '../../../components/CommentModal';
import AnimatedAudioBubble from '../../../components/audio/AnimatedAudioBubble';
import AdaptiveImage from '../../../components/AdaptiveImage';

const { width } = Dimensions.get('window');

export default function PostDetailScreen({ route, navigation }: any) {
  const { postId, post: initialPost, userProfile } = route.params;
  const { user } = useAuth();
  
  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Audio player state
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!initialPost && postId) {
      loadPost();
    }
    
    // Cleanup audio on unmount
    return () => {
      if (audioSound) {
        audioSound.unloadAsync();
      }
    };
  }, [postId, initialPost]);

  // Audio permissions
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
  }, []);

  // Handle focus/blur events to pause audio when navigating away
  useFocusEffect(
    useCallback(() => {
      // When screen comes into focus, do nothing special
      
      // When screen loses focus, pause audio
      return () => {
        if (audioSound && isPlaying) {
          audioSound.pauseAsync().then(() => {
            setIsPlaying(false);
          }).catch(error => {
            console.log('Error pausing audio on navigation:', error);
          });
        }
      };
    }, [audioSound, isPlaying])
  );

  const loadPost = async () => {
    try {
      setLoading(true);
      // For now, we'll use the passed post data
      // In future, implement postsService.getPostById(postId)
      if (!initialPost) {
        Alert.alert('Error', 'Post data not available');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    // Pass back updated post data to refresh the parent screen
    if (post) {
      navigation.navigate({
        name: route.params?.sourceScreen || 'Profile',
        params: { 
          updatedPost: {
            id: post.id,
            like_count: post.like_count,
            user_liked: post.user_liked
          },
          forceRefresh: true 
        },
        merge: true
      });
    } else {
      navigation.goBack();
    }
  };


  const handleComment = () => {
    setCommentModalVisible(true);
  };

  const handleShare = async () => {
    try {
      if (!post) return;
      
      const shareContent = {
        message: `Check out this post by ${post.user_name || userProfile?.name || 'Unknown User'}: ${post.description || post.title || 'A post on MusiStash'}`,
        url: `https://musistash.com/post/${post.id}`, // Replace with your actual URL scheme
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAudioPlayback = async (audioUrl: string) => {
    try {
      if (audioSound) {
        if (isPlaying) {
          await audioSound.pauseAsync();
          setIsPlaying(false);
        } else {
          await audioSound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      setIsAudioLoading(true);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => setPlaybackStatus(status)
      );

      setAudioSound(sound);
      setIsAudioLoading(false);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        setPlaybackStatus(status);
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAudioLoading(false);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleEditPost = () => {
    if (!post) return;
    
    setShowOptionsMenu(false);
    navigation.navigate('CreatePost', { 
      editMode: true, 
      postData: post 
    });
  };

  const handleDeletePost = async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!post) return;
              
              const success = await postsService.deletePost(post.id);
              if (success) {
                Alert.alert('Success', 'Post deleted successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };


  const handleLike = async () => {
    if (!user || !post) return;
    
    try {
      setLiking(true);
      const result = await postsService.togglePostLike(post.id, user.id);
      
      if (result) {
        setPost((prev: any) => prev ? ({
          ...prev,
          like_count: result.likeCount,
          user_liked: result.liked
        }) : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to like post');
    } finally {
      setLiking(false);
    }
  };

  const handleOptionsPress = () => {
    setShowOptionsMenu(!showOptionsMenu);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.moreButton} onPress={handleOptionsPress}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: post.user_avatar || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {post.user_name || userProfile?.artist_name || userProfile?.name || user?.name || 'Unknown User'}
              </Text>
              <Text style={styles.userType}>
                {post.user_type || userProfile?.role || 'User'}
              </Text>
            </View>
          </View>
          <View style={styles.postTypeBadge}>
            <Text style={styles.postTypeText}>{post.post_type?.replace('_', ' ') || 'post'}</Text>
          </View>
        </View>

        {/* Post Media */}
        {post.media_urls && post.media_urls.length > 0 && (() => {
          const mediaUrl = post.media_urls[0];
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.avi');
          const isAudio = mediaUrl.includes('.mp3') || mediaUrl.includes('.wav') || mediaUrl.includes('.m4a');
          const mediaDimensions = post.content?.media_dimensions?.[0];
          
          return (
            <View style={styles.mediaContainer}>
              {isVideo ? (
                <View style={styles.videoContainer}>
                  <Ionicons name="videocam" size={64} color="#3B82F6" />
                  <TouchableOpacity style={styles.playButton}>
                    <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.mediaLabel}>Video</Text>
                </View>
              ) : isAudio ? (
                <View style={styles.audioContainer}>
                  <AnimatedAudioBubble
                    isPlaying={isPlaying}
                    isLoading={isAudioLoading}
                    onPress={() => handleAudioPlayback(post.media_urls[0])}
                    label={isPlaying ? 'Now Playing' : 'Audio Track'}
                    size={200}
                    primaryColor="#32D5FF"
                    progress={playbackStatus ? (playbackStatus.positionMillis || 0) / (playbackStatus.durationMillis || 1) : 0}
                    duration={playbackStatus?.durationMillis || 0}
                    currentTime={playbackStatus?.positionMillis || 0}
                    onSeek={async (position) => {
                      if (audioSound && playbackStatus?.durationMillis) {
                        await audioSound.setPositionAsync(position * playbackStatus.durationMillis);
                      }
                    }}
                    showProgressBar={true}
                  />
                </View>
              ) : (
                // Image — adaptive aspect ratio
                <AdaptiveImage
                  uri={mediaUrl}
                  imageWidth={mediaDimensions?.width}
                  imageHeight={mediaDimensions?.height}
                />
              )}
            </View>
          );
        })()}

        {/* Post Actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLike}
              disabled={liking}
            >
              <Ionicons 
                name={post.user_liked ? "heart" : "heart-outline"} 
                size={28} 
                color={post.user_liked ? "#EF4444" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleComment}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.likesCount}>
            {post.like_count || 0} {(post.like_count || 0) === 1 ? 'like' : 'likes'}
          </Text>
        </View>

        {/* Post Content */}
        <View style={styles.contentContainer}>
          <View style={styles.captionContainer}>
            <Text style={styles.captionUser}>
              {post.user_name || userProfile?.artist_name || userProfile?.name || user?.name || 'Unknown User'}
            </Text>
            <Text style={styles.captionText}> {post.description || post.title}</Text>
          </View>
          
          {/* Music Info */}
          {post.content?.music_info && (
            <View style={styles.musicInfoCard}>
              <Ionicons name="musical-notes" size={16} color="#3B82F6" />
              <View style={styles.musicDetails}>
                {post.content.music_info.track_title && (
                  <Text style={styles.musicTitle}>{post.content.music_info.track_title}</Text>
                )}
                {post.content.music_info.artist_name && (
                  <Text style={styles.musicArtist}>{post.content.music_info.artist_name}</Text>
                )}
                {post.content.music_info.album_name && (
                  <Text style={styles.musicAlbum}>{post.content.music_info.album_name}</Text>
                )}
              </View>
            </View>
          )}
          
          <Text style={styles.timeAgo}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>

      {/* Modern Options Menu - Only for post owner */}
      {showOptionsMenu && post && user && post.user_id === user.id && (
        <>
          <TouchableOpacity 
            style={styles.overlay}
            onPress={() => setShowOptionsMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.modernOptionsMenu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Post Options</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modernOptionButton}
              onPress={() => {
                setShowOptionsMenu(false);
                handleEditPost();
              }}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="create-outline" size={22} color="#3B82F6" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Edit Post</Text>
                <Text style={styles.optionSubtitle}>Make changes to your post</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modernOptionButton}
              onPress={() => {
                setShowOptionsMenu(false);
                handleDeletePost();
              }}
            >
              <View style={[styles.optionIconContainer, styles.dangerIconContainer]}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.dangerText]}>Delete Post</Text>
                <Text style={styles.optionSubtitle}>This action cannot be undone</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modernOptionButton, styles.cancelButton]}
              onPress={() => setShowOptionsMenu(false)}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="close-outline" size={22} color="#9CA3AF" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.cancelText]}>Cancel</Text>
                <Text style={styles.optionSubtitle}>Close this menu</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={post.id}
        postImage={post.media_urls?.[0]}
      />
    </KeyboardAvoidingView>
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
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreButton: {
    padding: 8,
    position: 'relative',
  },
  // Modern Options Menu Styles
  modernOptionsMenu: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1001,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  modernOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(59, 130, 246, 0.1)',
  },
  cancelButton: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dangerIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  cancelText: {
    color: '#9CA3AF',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userType: {
    fontSize: 14,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  postTypeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postTypeText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  mediaContainer: {
    width: width,
    marginBottom: 8,
  },
  // postImage style no longer needed — AdaptiveImage handles sizing
  videoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  audioContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
  },
  mediaLabel: {
    marginTop: 80,
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  likesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  captionContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  captionUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  musicInfoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  musicDetails: {
    marginLeft: 8,
    flex: 1,
  },
  musicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  musicArtist: {
    fontSize: 12,
    color: '#3B82F6',
  },
  musicAlbum: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // Options Menu Styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  // Audio Progress Styles
  progressContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});