import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { messagingService } from '../../../services/messagingService';
import { FollowService } from '../../../services/followService';
import { moderationService } from '../../../services/moderationService';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_status: 'sent' | 'delivered' | 'read' | 'failed';
}

interface ChatScreenProps {
  route: {
    params: {
      conversationId: string;
      participant?: {
        id: string;
        name?: string;
        avatar?: string;
      };
    };
  };
  navigation: any;
}

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { conversationId, participant } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [canFollow, setCanFollow] = useState(false); // Only show follow for artists/service providers
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Safely get participant data with fallbacks
  const participantName = participant?.name || 'Unknown User';
  const participantId = participant?.id;
  const participantAvatar = participant?.avatar;

  useEffect(() => {
    if (!conversationId) {
      console.error('ChatScreen: Missing conversationId');
      navigation.goBack();
      return;
    }
    if (!participantId) {
      console.error('ChatScreen: Missing participant data');
      navigation.goBack();
      return;
    }
    loadMessages();
    checkFollowStatusAndEligibility();
    checkBlockStatus();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, participantId]);

  const checkBlockStatus = async () => {
    if (!user?.id || !participantId) return;
    
    try {
      const result = await moderationService.isBlockedRelationship(user.id, participantId);
      if (result.isBlocked) {
        setIsBlocked(true);
        setBlockedBy(result.blockedBy || null);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  // Check if user can be followed (must have artist profile or service provider profile)
  const checkFollowStatusAndEligibility = async () => {
    if (!user?.id || !participantId) return;
    try {
      // Check if participant has an artist profile or service provider profile
      const [artistResult, serviceResult] = await Promise.all([
        supabase.from('artist_profiles').select('id').eq('user_id', participantId).maybeSingle(),
        supabase.from('service_providers').select('id').eq('user_id', participantId).eq('status', 'approved').maybeSingle()
      ]);

      const hasArtistProfile = !!artistResult.data;
      const hasServiceProvider = !!serviceResult.data;
      
      // Only show follow button for artists or service providers
      setCanFollow(hasArtistProfile || hasServiceProvider);

      // Check if already following
      if (hasArtistProfile || hasServiceProvider) {
        const following = await FollowService.checkFollowStatus(user.id, participantId);
        setIsFollowing(following);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
      setCanFollow(false);
    }
  };

  const loadMessages = async () => {
    try {
      if (user?.id) {
        const conversationMessages = await messagingService.getConversationMessages(
          conversationId,
          user.id,
          50,
          0
        );
        const typedMessages = (conversationMessages || []).map(msg => ({
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          message_status: msg.message_status
        }));
        setMessages(typedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return;

    try {
      setSending(true);
      const message = await messagingService.sendMessage(
        conversationId,
        user.id,
        newMessage.trim()
      );

      if (message) {
        const typedMessage: Message = {
          id: message.id,
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
          message_status: message.message_status
        };
        setMessages(prev => [...prev, typedMessage]);
        setNewMessage('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFollow = async () => {
    if (!user?.id || !participantId || followLoading) return;
    
    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        // Unfollow
        const result = await FollowService.unfollowUser(user.id, participantId);
        if (result.success) {
          setIsFollowing(false);
        } else {
          Alert.alert('Error', result.error || 'Failed to unfollow');
        }
      } else {
        // Follow
        const result = await FollowService.followUser(user.id, participantId);
        if (result.success) {
          setIsFollowing(true);
        } else {
          // If they don't have an artist profile, still allow "following" via a different mechanism
          // or show appropriate message
          if (result.error?.includes('does not have an artist profile')) {
            Alert.alert('Note', 'This user is not an artist yet, but you can still message them!');
          } else {
            Alert.alert('Error', result.error || 'Failed to follow');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setFollowLoading(false);
    }
  };

  // Camera and attachment features removed - not needed yet

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const showDate = shouldShowDate(index);

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        
        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && (
            <View style={styles.messageAvatarContainer}>
              {participantAvatar ? (
                <Image source={{ uri: participantAvatar }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Text style={styles.messageAvatarText}>{participantName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          )}
          
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                {formatTime(item.created_at)}
              </Text>
              {isOwn && (
                <Ionicons 
                  name={item.message_status === 'read' ? "checkmark-done" : "checkmark"} 
                  size={14} 
                  color={item.message_status === 'read' ? "#3B82F6" : "rgba(255,255,255,0.5)"}
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerProfile} activeOpacity={0.7}>
          {participantAvatar ? (
            <Image source={{ uri: participantAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>{participantName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{participantName}</Text>
            <Text style={styles.headerStatus}>Online</Text>
          </View>
        </TouchableOpacity>

        {/* Only show follow button for artists/service providers */}
        {canFollow && (
          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? "#3B82F6" : "#FFFFFF"} />
            ) : (
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyAvatar}>
                <Text style={styles.emptyAvatarText}>{participantName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.emptyName}>{participantName}</Text>
              <Text style={styles.emptyHint}>Send a message to start chatting</Text>
            </View>
          }
        />
      )}

      {/* Input - Simplified without camera/attachment */}
      {isBlocked ? (
        <View style={[styles.blockedContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Ionicons name="ban-outline" size={20} color="#EF4444" />
          <Text style={styles.blockedText}>
            {blockedBy === user?.id 
              ? 'You have blocked this user. Unblock them from Settings to send messages.'
              : 'You cannot message this user.'}
          </Text>
        </View>
      ) : (
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor="#6B7280"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color={newMessage.trim() ? "#FFFFFF" : "#6B7280"} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  headerInfo: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerStatus: {
    fontSize: 12,
    color: '#3B82F6',
  },
  followButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingText: {
    color: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#111111',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageAvatarContainer: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  messageBubble: {
    maxWidth: width * 0.72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1F1F1F',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyAvatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#3B82F6',
  },
  emptyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#1F1F1F',
  },
  blockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
    gap: 10,
  },
  blockedText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },
  inputAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 6,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 80,
    paddingVertical: 2,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
});
