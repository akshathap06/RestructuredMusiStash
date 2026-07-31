import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService, Comment } from '../services/postsService';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postImage?: string;
}

const { height: screenHeight } = Dimensions.get('window');

export default function CommentModal({ visible, onClose, postId, postImage }: CommentModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    if (visible) {
      loadComments();
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadComments = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const postComments = await postsService.getPostComments(postId, 50, 0, user?.id);
      setComments(postComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadComments(true);
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      console.log('User not authenticated, cannot like comment');
      return;
    }

    try {
      const result = await postsService.toggleCommentLike(commentId, user.id);
      
      // Update the comment in the local state
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, like_count: result.likeCount, user_liked: result.liked }
            : comment
        )
      );
      
      console.log('Comment like toggled:', result);
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const comment = await postsService.createComment(user.id, {
        post_id: postId,
        content: newComment.trim(),
      });

      if (comment) {
        // Check moderation status
        const moderationStatus = (comment as any)?._moderationStatus;
        const isRejected = moderationStatus === 'rejected';
        
        if (isRejected) {
          // Show rejection message
          Alert.alert(
            'Content Guidelines',
            'Your comment doesn\'t follow our content guidelines and has been rejected. Please review and try again.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        // Add the new comment to the list only if approved
        const newCommentWithUser = {
          ...comment,
          user_name: user.name,
          user_avatar: user.avatar,
          like_count: 0,
          user_liked: false,
          replies: [],
        };
        setComments(prev => [...prev, newCommentWithUser]);
        setNewComment('');
        
        // Show success feedback
        console.log('Comment posted successfully!');
      } else {
        console.error('Failed to create comment');
        Alert.alert('Error', 'Failed to create comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to create comment');
    } finally {
      setIsSubmitting(false);
    }
  };


  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return `${Math.floor(diffInHours / 168)}w`;
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <Image
        source={{ uri: item.user_avatar || 'https://via.placeholder.com/40' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.user_name || 'Unknown User'}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleCommentLike(item.id)}
          >
            <Ionicons 
              name={item.user_liked ? "heart" : "heart-outline"} 
              size={16} 
              color={item.user_liked ? "#EF4444" : "#8E8E93"} 
            />
            <Text style={styles.actionText}>{item.like_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackground, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.modalInnerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Post Preview */}
          {postImage && (
            <View style={styles.postPreview}>
              <Image source={{ uri: postImage }} style={styles.postImage} />
            </View>
          )}

          {/* Comments List */}
          <View style={styles.commentsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to comment!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.commentsList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007AFF']}
                    tintColor="#007AFF"
                  />
                }
              />
            )}
          </View>


          {/* Comment Input */}
          <View style={styles.inputWrapper}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              style={styles.inputContainer}
            >
            <Image
              source={{ uri: user?.avatar || 'https://via.placeholder.com/32' }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#8E8E93"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newComment.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Post</Text>
              )}
                          </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7, // Further reduced to 0.7
    marginBottom: 0,
  },
  modalInnerContainer: {
    flex: 1,
    marginHorizontal: 8, // Add horizontal margins to prevent edge cut-off
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8, // Add horizontal padding
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  postPreview: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  postImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  commentsContainer: {
    flex: 1,
    maxHeight: screenHeight * 0.25, // Further reduced to 0.25
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8E8E93',
    fontSize: 14,
  },
  commentsList: {
    padding: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    color: '#8E8E93',
    fontSize: 12,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 4,
  },
  inputWrapper: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    marginHorizontal: 0, // Ensure no horizontal margins
    marginBottom: 0, // Ensure no bottom margin
    paddingBottom: 20, // Add bottom padding for safe area
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: 50, // Fixed padding instead of dynamic
    backgroundColor: '#000000',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    marginLeft: 4, // Add left margin to prevent cut-off
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12, // Increased from 8 to 12 for better touch target
    paddingTop: 12, // Increased from 8 to 12 for consistency
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44, // Increased from 36 to 44 for better touch target
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 12,
    marginRight: 4, // Add right margin to prevent cut-off
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#3A3A3C',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
