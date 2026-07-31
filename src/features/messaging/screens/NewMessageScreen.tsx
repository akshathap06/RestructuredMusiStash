import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { messagingService } from '../../../services/messagingService';
import { supabase } from '../../../lib/supabase';

interface User {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  isOnline?: boolean;
  isArtist?: boolean;
}

export default function NewMessageScreen({ route, navigation }: { navigation: any; route?: any }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'find' | 'recent'>('find');
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    if (route?.params?.recipientId && route?.params?.recipientName) {
      const recipientUser: User = {
        id: route.params.recipientId,
        name: route.params.recipientName,
        email: route.params.recipientEmail || '',
        isOnline: false,
      };
      setSelectedUser(recipientUser);
    }
  }, [route?.params]);

  useEffect(() => {
    // Load conversations first (usually faster)
    loadConversations();
    // Then load users (can take longer)
    loadUsers();
  }, [user?.id]);

  // Debounced search - queries database when user types
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() === '') {
        // Reset to show all users
        loadUsers();
      } else {
        // Search database with the query
        loadUsers(searchQuery.trim());
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadUsers = async (searchTerm?: string) => {
    try {
      // Only show loading spinner on initial load, not on search
      const isInitialLoad = users.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const searchFilter = searchTerm?.trim() || '';
      // Reduced limits for faster initial load
      const limit = searchFilter ? 50 : 15; // Even smaller initial load for faster response
      
      console.log('⏳ Starting to load users...', { searchFilter, limit, isInitialLoad });
      const startTime = Date.now();
      
      // OPTIMIZATION: Load users first (fastest), then artists/providers
      // This shows results faster to the user
      let usersResult, artistsResult, providersResult;
      
      if (isInitialLoad && !searchFilter) {
        // On initial load without search: load users first, show them, then load artists/providers
        usersResult = await (searchFilter 
          ? supabase
              .from('users')
              .select('id, email, name, avatar')
              .neq('id', user?.id || '')
              .or(`name.ilike.%${searchFilter}%,email.ilike.%${searchFilter}%`)
              .limit(limit)
          : supabase
              .from('users')
              .select('id, email, name, avatar')
              .neq('id', user?.id || '')
              .order('created_at', { ascending: false })
              .limit(limit));
        
        // Show users immediately
        if (usersResult.data) {
          const initialUsers = usersResult.data.map(u => ({
            id: u.id,
            name: u.name || u.email?.split('@')[0] || 'User',
            email: u.email,
            avatar: u.avatar,
            isArtist: false
          }));
          initialUsers.sort((a, b) => a.name.localeCompare(b.name));
          setUsers(initialUsers);
          setFilteredUsers(initialUsers);
          setLoading(false); // Clear loading so users can see results
          console.log(`✅ Loaded ${initialUsers.length} users first (${Date.now() - startTime}ms)`);
        }
        
        // Then load artists and providers in background
        [artistsResult, providersResult] = await Promise.all([
          supabase
            .from('artist_profiles')
            .select('user_id, artist_name, profile_photo')
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('service_providers')
            .select('user_id, business_name, profile_photo')
            .order('created_at', { ascending: false })
            .limit(limit)
        ]);
      } else {
        // On search or subsequent loads: load everything in parallel
        [usersResult, artistsResult, providersResult] = await Promise.all([
          // Users query
          searchFilter 
            ? supabase
                .from('users')
                .select('id, email, name, avatar')
                .neq('id', user?.id || '')
                .or(`name.ilike.%${searchFilter}%,email.ilike.%${searchFilter}%`)
                .limit(limit)
            : supabase
                .from('users')
                .select('id, email, name, avatar')
                .neq('id', user?.id || '')
                .order('created_at', { ascending: false })
                .limit(limit),
          
          // Artists query
          searchFilter
            ? supabase
                .from('artist_profiles')
                .select('user_id, artist_name, profile_photo')
                .ilike('artist_name', `%${searchFilter}%`)
                .limit(limit)
            : supabase
                .from('artist_profiles')
                .select('user_id, artist_name, profile_photo')
                .order('created_at', { ascending: false })
                .limit(limit),
          
          // Providers query
          searchFilter
            ? supabase
                .from('service_providers')
                .select('user_id, business_name, profile_photo')
                .ilike('business_name', `%${searchFilter}%`)
                .limit(limit)
            : supabase
                .from('service_providers')
                .select('user_id, business_name, profile_photo')
                .order('created_at', { ascending: false })
                .limit(limit)
        ]);
      }

      const usersData = usersResult.data;
      const artists = artistsResult.data;
      const providers = providersResult.data;

      const allUsers: User[] = [];
      const addedUserIds = new Set<string>();
      
      // Add artists first (they take priority for display name)
      if (artists) {
        artists.forEach(artist => {
          if (artist.user_id && !addedUserIds.has(artist.user_id)) {
            addedUserIds.add(artist.user_id);
            allUsers.push({
              id: artist.user_id,
              name: artist.artist_name || 'Unknown Artist',
              avatar: artist.profile_photo,
              isArtist: true
            });
          }
        });
      }

      // Add service providers
      if (providers) {
        providers.forEach(provider => {
          if (provider.user_id && !addedUserIds.has(provider.user_id)) {
            addedUserIds.add(provider.user_id);
            allUsers.push({
              id: provider.user_id,
              name: provider.business_name || 'Service Provider',
              avatar: provider.profile_photo,
              isArtist: false
            });
          }
        });
      }

      // Add regular users (those without artist or provider profiles)
      if (usersData) {
        usersData.forEach(u => {
          if (!addedUserIds.has(u.id)) {
            addedUserIds.add(u.id);
            allUsers.push({
              id: u.id,
              name: u.name || u.email?.split('@')[0] || 'User',
              email: u.email,
              avatar: u.avatar,
              isArtist: false
            });
          }
        });
      }

      // Sort alphabetically by name
      allUsers.sort((a, b) => a.name.localeCompare(b.name));

      const loadTime = Date.now() - startTime;
      console.log(`✅ Loaded ${allUsers.length} total users in ${loadTime}ms`, {
        users: usersData?.length || 0,
        artists: artists?.length || 0,
        providers: providers?.length || 0
      });

      // Update with merged results (includes artists/providers if loaded)
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      // Set empty arrays on error so UI doesn't stay stuck
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
      console.log('✅ Loading state cleared');
    }
  };

  const loadConversations = async () => {
    try {
      if (user?.id) {
        const userConversations = await messagingService.getUserConversations(user.id);
        console.log('📨 NewMessageScreen: Loaded conversations:', userConversations.length);
        userConversations.forEach((conv, index) => {
          console.log(`📨 Conversation ${index}:`, {
            id: conv.id,
            hasParticipants: !!conv.participants,
            participantCount: conv.participants?.length || 0,
            participantName: conv.participants?.[0]?.name || 'No name',
          });
        });
        setConversations(userConversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim() || !user?.id) return;

    try {
      setSending(true);
      const conversation = await messagingService.getOrCreateConversation(user.id, selectedUser.id);
      
      if (conversation) {
        await messagingService.sendMessage(conversation.id, user.id, messageText.trim());
        navigation.navigate('Chat', { 
          conversationId: conversation.id,
          participant: selectedUser
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleConversationSelect = (conversation: any) => {
    // Get participant from the participants array (same structure as MessagesScreen)
    const otherParticipant = conversation.participants && conversation.participants[0] ? conversation.participants[0] : {
      id: conversation.participant_1_id === user?.id ? conversation.participant_2_id : conversation.participant_1_id,
      name: 'Unknown User',
      avatar: undefined,
    };
    
    navigation.navigate('Chat', { 
      conversationId: conversation.id,
      participant: {
        id: otherParticipant.id,
        name: otherParticipant.name || 'Unknown User',
        avatar: otherParticipant.avatar,
      }
    });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => setSelectedUser(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userBadge}>{item.isArtist ? 'Artist' : 'User'}</Text>
      </View>
      {selectedUser?.id === item.id && (
        <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
      )}
    </TouchableOpacity>
  );

  const renderConversationItem = ({ item }: { item: any }) => {
    // Get participant from the participants array (same structure as MessagesScreen)
    const otherParticipant = item.participants && item.participants[0] ? item.participants[0] : {
      id: item.participant_1_id === user?.id ? item.participant_2_id : item.participant_1_id,
      name: 'Unknown User',
      avatar: undefined,
    };
    
    const participantName = otherParticipant.name || 'Unknown User';
    const participantAvatar = otherParticipant.avatar;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleConversationSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {participantAvatar ? (
            <Image source={{ uri: participantAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{participantName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{participantName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message_preview || 'Start chatting'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4B5563" />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}
        >
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>People</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>Recent</Text>
        </TouchableOpacity>
      </View>

      {/* Selected User */}
      {selectedUser && (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedUser}>
            <View style={styles.selectedAvatarSmall}>
              <Text style={styles.selectedAvatarText}>{selectedUser.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.selectedName}>{selectedUser.name}</Text>
            <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.removeButton}>
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Users/Conversations List */}
      <View style={styles.listContainer}>
        {loading && activeTab === 'find' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'find' ? filteredUsers : conversations}
            renderItem={activeTab === 'find' ? renderUserItem : renderConversationItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name={activeTab === 'find' ? "people-outline" : "chatbubbles-outline"} size={40} color="#4B5563" />
                <Text style={styles.emptyText}>
                  {activeTab === 'find' ? 'No users found' : 'No recent chats'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Message Input */}
      {selectedUser && (
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Write a message..."
              placeholderTextColor="#6B7280"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color={messageText.trim() ? "#FFFFFF" : "#6B7280"} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#1F1F1F',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    alignSelf: 'flex-start',
  },
  selectedAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  removeButton: {
    marginLeft: 8,
    padding: 2,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  userBadge: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#1F1F1F',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  messageInput: {
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
});
