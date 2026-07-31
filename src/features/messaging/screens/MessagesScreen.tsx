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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { messagingService } from '../../../services/messagingService';
import { moderationService } from '../../../services/moderationService';

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
    isRead: boolean;
    senderId: string;
  };
  unreadCount: number;
}

export default function MessagesScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        console.log('Loading conversations for user:', user.id);
        const userConversations = await messagingService.getUserConversations(user.id);
        console.log('Fetched conversations:', userConversations.length);
        
        // Get blocked users to filter them out
        const blockedUsers = await moderationService.getBlockedUsers(user.id);
        
        // Transform the data to match the expected interface
        const transformedConversations: Conversation[] = userConversations
          .filter(conv => {
            // Filter out conversations with blocked users
            const otherParticipantId = conv.participant_1_id === user.id 
              ? conv.participant_2_id 
              : conv.participant_1_id;
            return !blockedUsers.includes(otherParticipantId);
          })
          .map(conv => {
          const otherParticipant = conv.participants && conv.participants[0] ? conv.participants[0] : {
            id: conv.participant_1_id === user.id ? conv.participant_2_id : conv.participant_1_id,
            name: 'Unknown User',
            avatar: undefined,
            is_online: false
          };
          
          console.log('📝 Conversation:', conv.id, 'Participant data:', {
            hasParticipants: !!conv.participants,
            participantCount: conv.participants?.length || 0,
            participantName: otherParticipant.name,
            participantId: otherParticipant.id
          });
          
          return {
            id: conv.id,
            participant: {
              id: otherParticipant.id,
              name: otherParticipant.name || 'Unknown User',
              avatar: otherParticipant.avatar,
              isOnline: otherParticipant.is_online || false
            },
            lastMessage: {
              text: conv.last_message_preview || 'No messages yet',
              timestamp: conv.last_message_at || conv.created_at,
              isRead: true, // For now, assume all messages are read
              senderId: otherParticipant.id
            },
            unreadCount: conv.unread_count || 0
          };
        });
        
        setConversations(transformedConversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Chat', { 
      conversationId: conversation.id,
      participant: conversation.participant 
    });
  };

  const handleNewMessage = () => {
    navigation.navigate('NewMessage');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.participant.avatar ? (
          <Image source={{ uri: item.participant.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.participant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.participant.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.participantName} numberOfLines={1}>
            {item.participant.name}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.lastMessage.timestamp)}
          </Text>
        </View>

        <View style={styles.messagePreview}>
          <View style={styles.messageContent}>
            {item.lastMessage.senderId === user?.id && (
              <Ionicons 
                name={item.lastMessage.isRead ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={item.lastMessage.isRead ? "#3B82F6" : "#9CA3AF"} 
                style={styles.readIndicator}
              />
            )}
            <Text 
              style={[
                styles.lastMessageText,
                !item.lastMessage.isRead && item.lastMessage.senderId !== user?.id && styles.unreadMessage
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage.text}
            </Text>
          </View>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleNewMessage} style={styles.newMessageButton}>
          <Ionicons name="create-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation with a service provider or artist
            </Text>
            <TouchableOpacity style={styles.startConversationButton} onPress={handleNewMessage}>
              <Text style={styles.startConversationButtonText}>Start New Conversation</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 100,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#121212',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1DB954',
    borderWidth: 3,
    borderColor: '#121212',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  readIndicator: {
    marginRight: 6,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
  },
  unreadMessage: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    marginBottom: 24,
    lineHeight: 24,
  },
  startConversationButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  startConversationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
