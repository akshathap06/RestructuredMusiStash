import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '../../../components/ProfilePicture';
import { moderationService } from '../../../services/moderationService';
import AdaptiveImage from '../../../components/AdaptiveImage';

const { width } = Dimensions.get('window');

interface PostCardProps {
  username: string;
  userAvatar: string;
  userId: string;
  postId: string;
  postImage: string;
  /** Original image width for adaptive display */
  imageWidth?: number;
  /** Original image height for adaptive display */
  imageHeight?: number;
  likes: number;
  caption: string;
  timeAgo: string;
  isLiked: boolean;
  currentUserId?: string;
  onUserPress: () => void;
  onLikePress: () => void;
  onCommentPress: () => void;
  onUserBlocked?: (userId: string) => void;
}

export default function PostCard({
  username,
  userAvatar,
  userId,
  postId,
  postImage,
  imageWidth,
  imageHeight,
  likes,
  caption,
  timeAgo,
  isLiked,
  currentUserId,
  onUserPress,
  onLikePress,
  onCommentPress,
  onUserBlocked,
}: PostCardProps) {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  
  // Heart animation
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  const handleLikeWithAnimation = () => {
    // Trigger the like immediately
    onLikePress();
    
    // Only animate if we're liking (not unliking)
    if (!isLiked) {
      setShowHeartAnimation(true);
      heartScale.setValue(0.3);
      heartOpacity.setValue(1);
      
      Animated.parallel([
        Animated.spring(heartScale, {
          toValue: 1.2,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setShowHeartAnimation(false);
        heartScale.setValue(1);
      });
    }
  };

  const reportReasons = [
    { id: 'spam', label: 'Spam or misleading' },
    { id: 'harassment', label: 'Harassment or bullying' },
    { id: 'inappropriate', label: 'Inappropriate content' },
    { id: 'copyright', label: 'Copyright infringement' },
    { id: 'other', label: 'Other' },
  ];

  const handleReport = async () => {
    if (!selectedReason || !currentUserId) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    const result = await moderationService.reportContent(
      currentUserId,
      'post',
      selectedReason,
      `Post by ${username}`,
      userId,
      postId
    );

    setShowReportModal(false);
    setSelectedReason(null);

    if (result.success) {
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review this content and take appropriate action.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleBlockUser = () => {
    if (!currentUserId) return;
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${username}? You won't see their posts or messages anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const result = await moderationService.blockUser(currentUserId, userId);
            setShowOptionsMenu(false);
            
            if (result.success) {
              Alert.alert('User Blocked', `You have blocked ${username}.`);
              onUserBlocked?.(userId);
            } else {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Don't show options menu for own posts
  const isOwnPost = currentUserId === userId;

  return (
    <View style={styles.postCard}>
      {/* User Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.postHeaderLeft}
          onPress={onUserPress}
        >
          <ProfilePicture
            userId={userId}
            userName={username}
            avatarUrl={userAvatar}
            size={40}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{username}</Text>
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Options Menu Button - Only show for other users' posts */}
        {!isOwnPost && currentUserId && (
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={() => setShowOptionsMenu(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={22} color="#F59E0B" />
              <Text style={styles.optionText}>Report Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, styles.optionItemDanger]}
              onPress={handleBlockUser}
            >
              <Ionicons name="ban-outline" size={22} color="#EF4444" />
              <Text style={[styles.optionText, styles.optionTextDanger]}>Block User</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, styles.optionItemCancel]}
              onPress={() => setShowOptionsMenu(false)}
            >
              <Text style={styles.optionTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Report Post</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.reportModalSubtitle}>
              Why are you reporting this post?
            </Text>
            
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reportReasonItem,
                  selectedReason === reason.id && styles.reportReasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Text style={[
                  styles.reportReasonText,
                  selectedReason === reason.id && styles.reportReasonTextSelected,
                ]}>
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                styles.submitReportButton,
                !selectedReason && styles.submitReportButtonDisabled,
              ]}
              onPress={handleReport}
              disabled={!selectedReason}
            >
              <Text style={styles.submitReportButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post Image - Adaptive aspect ratio (portrait/landscape/square) */}
      {postImage && (
        <AdaptiveImage
          uri={postImage}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
        />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLikeWithAnimation}
        >
          <View style={styles.likeButtonContainer}>
            <Animated.View
              style={[
                styles.heartIconContainer,
                {
                  transform: [{ scale: isLiked ? heartScale : 1 }],
                },
              ]}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={22} 
                color={isLiked ? "#EF4444" : "#FFFFFF"} 
              />
            </Animated.View>
            {showHeartAnimation && (
              <Animated.View
                style={[
                  styles.heartPopAnimation,
                  {
                    opacity: heartOpacity,
                    transform: [{ scale: heartScale }],
                  },
                ]}
              >
                <Ionicons name="heart" size={40} color="#EF4444" />
              </Animated.View>
            )}
          </View>
          <Text style={styles.actionText}>{likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onCommentPress}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
      </View>

      {/* Post Caption */}
      {caption && (
        <View style={styles.captionContainer}>
          <TouchableOpacity onPress={onUserPress}>
            <Text style={styles.captionUsername}>{username}</Text>
          </TouchableOpacity>
          <Text style={styles.captionText}> {caption}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  
  // Post Image - adaptive sizing handled by AdaptiveImage component
  
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
  likeButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartPopAnimation: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // Options Button
  optionsButton: {
    padding: 8,
  },
  
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  
  // Options Menu
  optionsMenu: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 14,
  },
  optionItemDanger: {
    borderBottomWidth: 0,
  },
  optionItemCancel: {
    justifyContent: 'center',
    borderTopWidth: 8,
    borderTopColor: 'rgba(0, 0, 0, 0.3)',
    marginTop: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  optionTextDanger: {
    color: '#EF4444',
  },
  optionTextCancel: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Report Modal
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  reportModal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reportReasonItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  reportReasonText: {
    fontSize: 15,
    color: '#E5E7EB',
  },
  reportReasonTextSelected: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  submitReportButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitReportButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  submitReportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

