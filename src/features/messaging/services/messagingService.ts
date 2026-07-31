import { supabase } from '../../../lib/supabase';

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  conversation_type: 'direct' | 'group' | 'project' | 'service';
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  metadata: any;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'file';
  message_status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  updated_at: string;
  delivery_timestamp?: string;
  read_timestamp?: string;
  media_metadata?: any;
  reply_preview?: string;
  reply_to_id?: string;
  is_edited: boolean;
  edited_at?: string;
}

export interface ConversationWithParticipants extends Conversation {
  participants: {
    id: string;
    name: string;
    avatar?: string;
    is_online?: boolean;
  }[];
  last_message?: Message;
  unread_count: number;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  reply_to_id?: string;
}

class MessagingService {
  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<ConversationWithParticipants[]> {
    try {
      console.log('Getting user conversations for:', userId);
      
      // Use direct query for better performance and reliability
      return await this.getUserConversationsDirect(userId);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Return empty array for now - user can start new conversations
      return [];
    }
  }

  /**
   * Fallback method for getting conversations directly from tables
   */
  private async getUserConversationsDirect(userId: string): Promise<ConversationWithParticipants[]> {
    try {
      // Get conversations where user is a participant
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return [];
      }

      if (!conversations || conversations.length === 0) {
        return [];
      }

      // Fetch participant details for each conversation
      const conversationsWithParticipants = await Promise.all(
        conversations.map(async (conv) => {
          const otherParticipantId = conv.participant_1_id === userId ? conv.participant_2_id : conv.participant_1_id;
          
          // PRIORITY: Check if this user has an artist profile first (for privacy)
          const { data: artistData, error: artistError } = await supabase
            .from('artist_profiles')
            .select('id, artist_name, profile_photo, user_id')
            .eq('user_id', otherParticipantId)
            .maybeSingle();

          let participantInfo = null;
          
          // If artist profile exists, use artist name (PRIVACY FIRST)
          if (artistData && !artistError) {
            participantInfo = {
              id: artistData.user_id, // Use user_id, not artist profile id
              name: artistData.artist_name || null, // Use artist name, not real name
              avatar: artistData.profile_photo,
              isArtist: true
            };
            console.log('✅ Using artist name for privacy:', artistData.artist_name, 'for user:', otherParticipantId);
          } else {
            // Fallback to regular user data only if no artist profile
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, name, avatar')
              .eq('id', otherParticipantId)
              .maybeSingle();
            
            if (userData && !userError) {
              participantInfo = {
                id: userData.id,
                name: userData.name,
                avatar: userData.avatar,
                isArtist: false
              };
              console.log('✅ Using user name:', userData.name, 'for user:', otherParticipantId);
            } else {
              console.warn('❌ Could not fetch participant data for user:', otherParticipantId, 'Error:', userError);
            }
          }

          return {
            ...conv,
            participants: participantInfo && participantInfo.name ? [{
              id: participantInfo.id,
              name: participantInfo.name,
              avatar: participantInfo.avatar,
              is_online: false
            }] : [{
              id: otherParticipantId,
              name: 'Unknown User',
              avatar: undefined,
              is_online: false
            }],
            last_message: undefined,
            unread_count: 0
          };
        })
      );

      return conversationsWithParticipants;
    } catch (error) {
      console.error('Failed to fetch conversations directly:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getConversationMessages(
    conversationId: string, 
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<MessageWithSender[]> {
    try {
      // Use direct query for better performance and reliability
      return await this.getConversationMessagesDirect(conversationId, userId, limit, offset);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Return empty array for now
      return [];
    }
  }

  /**
   * Fallback method for getting messages directly from tables
   */
  private async getConversationMessagesDirect(
    conversationId: string, 
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<MessageWithSender[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, name, avatar)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching messages directly:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      console.error('Failed to fetch messages directly:', error);
      return [];
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string, 
    replyToId?: string,
    messageType: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text'
  ): Promise<Message | null> {
    try {
      console.log('Sending message:', { conversationId, senderId, content, replyToId, messageType });
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType,
          message_status: 'sent',
          reply_to_id: replyToId || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Update conversation last message
      await this.updateConversationLastMessage(conversationId, content);

      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }

  /**
   * Helper function to find user ID from any table (users, service_providers, artist_profiles)
   */
  private async findUserId(userId: string): Promise<string | null> {
    if (!userId) {
      console.warn('⚠️ findUserId called with empty userId');
      return null;
    }

    console.log('🔍 findUserId: Looking for user with ID:', userId);

    // Strategy 1: Check if it's already a user_id in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (user && !userError) {
      console.log('✅ findUserId: Found in users table:', user.id);
      return user.id;
    }

    if (userError) {
      console.warn('⚠️ findUserId: Error checking users table:', userError);
    }

    // Strategy 2: Check if it's a service_provider ID (not user_id)
    const { data: spById, error: spByIdError } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', userId)
      .maybeSingle();

    if (spById && !spByIdError && spById.user_id) {
      console.log('✅ findUserId: Found service_provider by ID, user_id:', spById.user_id);
      return spById.user_id;
    }

    // Strategy 3: Check if it's a service_provider user_id
    const { data: serviceProvider, error: spError } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (serviceProvider && !spError && serviceProvider.user_id) {
      console.log('✅ findUserId: Found service_provider by user_id:', serviceProvider.user_id);
      return serviceProvider.user_id;
    }

    // Strategy 4: Check if it's an artist_profile ID (not user_id)
    const { data: artistById, error: artistByIdError } = await supabase
      .from('artist_profiles')
      .select('user_id')
      .eq('id', userId)
      .maybeSingle();

    if (artistById && !artistByIdError && artistById.user_id) {
      console.log('✅ findUserId: Found artist_profile by ID, user_id:', artistById.user_id);
      return artistById.user_id;
    }

    // Strategy 5: Check if it's an artist_profile user_id
    const { data: artist, error: artistError } = await supabase
      .from('artist_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (artist && !artistError && artist.user_id) {
      console.log('✅ findUserId: Found artist_profile by user_id:', artist.user_id);
      return artist.user_id;
    }

    // Strategy 6: If all else fails, assume it's a user_id and return it
    // (This handles cases where the user exists but the query failed)
    console.warn('⚠️ findUserId: User not found in any table, assuming it\'s a valid user_id:', userId);
    return userId;
  }

  /**
   * Ensure a user exists in the users table (required for foreign key constraints)
   */
  private async ensureUserExists(userId: string): Promise<string | null> {
    try {
      // First, try to find the user in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingUser) {
        console.log('✅ User exists in users table:', userId);
        return userId;
      }

      // User doesn't exist, try to get their info from Supabase Auth
      console.log('⚠️ User not found in users table, checking Supabase Auth...');
      
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authUser && authUser.id === userId) {
          // This is the current authenticated user, create them in users table
          console.log('📝 Creating user record from Supabase Auth data...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              email: authUser.email || '',
              role: 'listener',
              avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null
            }])
            .select()
            .single();

          if (newUser && !createError) {
            console.log('✅ Created user from Supabase Auth:', newUser.id);
            return newUser.id;
          } else if (createError) {
            console.warn('⚠️ Error creating user from Auth:', createError);
            // If it's a duplicate key error, the user might have been created by another process
            if (createError.code === '23505') {
              // Try to fetch the user again
              const { data: fetchedUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .maybeSingle();
              
              if (fetchedUser) {
                return fetchedUser.id;
              }
            }
          }
        }
      } catch (authErr) {
        console.warn('⚠️ Could not get auth user:', authErr);
      }

      // Try to get user info from service_providers
      const { data: spData } = await supabase
        .from('service_providers')
        .select('user_id, business_name, contact_email')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (spData?.user_id) {
        // Check if the user_id exists in users table
        const { data: spUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', spData.user_id)
          .maybeSingle();

        if (spUser) {
          return spData.user_id;
        }

        // Try to create user from service provider data
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            id: spData.user_id,
            name: spData.business_name || 'Service Provider',
            email: spData.contact_email || '',
            role: 'listener'
          }])
          .select()
          .single();

        if (newUser && !createError) {
          console.log('✅ Created user from service provider data:', newUser.id);
          return newUser.id;
        }
      }

      // Try to get user info from artist_profiles
      const { data: artistData } = await supabase
        .from('artist_profiles')
        .select('user_id, artist_name')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (artistData?.user_id) {
        const { data: artistUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', artistData.user_id)
          .maybeSingle();

        if (artistUser) {
          return artistData.user_id;
        }

        // Try to create user from artist data
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            id: artistData.user_id,
            name: artistData.artist_name || 'Artist',
            email: '',
            role: 'listener'
          }])
          .select()
          .single();

        if (newUser && !createError) {
          console.log('✅ Created user from artist data:', newUser.id);
          return newUser.id;
        }
      }

      // If we can't find or create the user, return null
      console.error('❌ Cannot ensure user exists in users table:', userId);
      return null;
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
      return null;
    }
  }

  /**
   * Create or get existing conversation between two users - now handles artists and service providers
   */
  async getOrCreateConversation(user1Id: string, user2Id: string, user2IsArtist: boolean = false): Promise<Conversation | null> {
    try {
      console.log('📨 Creating conversation between:', user1Id, 'and', user2Id, 'isArtist:', user2IsArtist);
      
      // Find actual user IDs from any table
      const actualUser1Id = await this.findUserId(user1Id);
      const actualUser2Id = await this.findUserId(user2Id);

      // Use resolved IDs or fallback to provided IDs
      let finalUser1Id = actualUser1Id || user1Id;
      let finalUser2Id = actualUser2Id || user2Id;

      console.log('🔍 Resolved user IDs - User1:', finalUser1Id, 'User2:', finalUser2Id);

      // CRITICAL: Ensure both users exist in the users table before creating conversation
      // This is required for the foreign key constraint
      const ensuredUser1Id = await this.ensureUserExists(finalUser1Id);
      const ensuredUser2Id = await this.ensureUserExists(finalUser2Id);

      if (!ensuredUser1Id || !ensuredUser2Id) {
        console.error('❌ Cannot create conversation: one or both users do not exist in users table');
        throw new Error('Cannot create conversation: user account not found. Please ensure you are logged in with a valid account.');
      }

      finalUser1Id = ensuredUser1Id;
      finalUser2Id = ensuredUser2Id;

      console.log('✅ Both users verified in users table - User1:', finalUser1Id, 'User2:', finalUser2Id);

      // First try to find existing conversation
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1_id.eq.${finalUser1Id},participant_2_id.eq.${finalUser2Id}),and(participant_1_id.eq.${finalUser2Id},participant_2_id.eq.${finalUser1Id})`)
        .eq('conversation_type', 'direct')
        .maybeSingle();

      if (existingConversation && !findError) {
        console.log('✅ Found existing conversation:', existingConversation.id);
        return existingConversation;
      }

      if (findError) {
        console.warn('⚠️ Error finding existing conversation:', findError);
      }

      console.log('📝 Creating new conversation...');
      
      // Create new conversation if none exists
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: finalUser1Id,
          participant_2_id: finalUser2Id,
          conversation_type: 'direct',
          last_message_preview: ''
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }

      console.log('Successfully created conversation:', newConversation.id);
      return newConversation;
    } catch (error) {
      console.error('Failed to get or create conversation:', error);
      return null;
    }
  }

  /**
   * Update conversation last message
   */
  private async updateConversationLastMessage(conversationId: string, content: string): Promise<void> {
    try {
      await supabase
        .from('conversations')
        .update({
          last_message_preview: content.length > 100 ? content.substring(0, 100) + '...' : content,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Failed to update conversation last message:', error);
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      // Mark messages as read using direct query
      const { error } = await supabase
        .from('messages')
        .update({ message_status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId); // Don't mark own messages as read

      if (error) {
        console.error('Error marking messages as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      return false;
    }
  }

  /**
   * Get user info for messaging - PRIORITIZES ARTIST NAMES FOR PRIVACY
   */
  async getUserInfo(userId: string, isArtist: boolean = false): Promise<{ id: string; name: string; avatar?: string } | null> {
    try {
      console.log('Getting user info for ID:', userId, 'isArtist:', isArtist);
      
      // ALWAYS check for artist profile first for privacy
      const { data: artistData } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, profile_photo, user_id')
        .eq('user_id', userId)
        .single();

      if (artistData) {
        console.log('Found artist profile, using artist name for privacy:', artistData.artist_name);
        return {
          id: artistData.id,
          name: artistData.artist_name, // Use artist name, not real name
          avatar: artistData.profile_photo
        };
      }

      // Only fallback to user data if no artist profile exists
      if (!isArtist) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user info:', error);
          throw error;
        }

        console.log('User info found (no artist profile):', data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  }

  /**
   * Debug function to check what users exist in the system
   */
  async debugGetAllUsers(): Promise<Array<{ id: string; name: string }>> {
    try {
      console.log('Debug: Getting all users...');
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .limit(50);

      if (error) {
        console.error('Error getting all users:', error);
        throw error;
      }

      console.log('Debug: Found users:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }

  /**
   * Debug function to check what artist profiles exist in the system
   */
  async debugGetAllArtists(): Promise<Array<{ id: string; artist_name: string; user_id: string }>> {
    try {
      console.log('Debug: Getting all artist profiles...');
      
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, user_id')
        .limit(50);

      if (error) {
        console.error('Error getting all artist profiles:', error);
        throw error;
      }

      console.log('Debug: Found artist profiles:', data);
      return data || [];
    } catch (error) {
      console.error('Failed to get all artist profiles:', error);
      return [];
    }
  }

  /**
   * Debug function to get detailed info about a specific user or artist
   */
  async debugGetUserDetails(userId: string, isArtist: boolean = false): Promise<any> {
    try {
      console.log('Debug: Getting user details for:', userId, 'isArtist:', isArtist);
      
      if (isArtist) {
        // Get artist profile details
        const { data, error } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error getting artist details:', error);
          throw error;
        }

        console.log('Debug: Artist details:', data);
        return data;
      } else {
        // Get regular user details
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error getting user details:', error);
          throw error;
        }

        console.log('Debug: User details:', data);
        return data;
      }
    } catch (error) {
      console.error('Failed to get user details:', error);
      return null;
    }
  }

  /**
   * Search for users to message - now includes both users and artists
   */
  async searchUsers(query: string, currentUserId: string): Promise<Array<{ id: string; name: string; avatar?: string; role?: string; isArtist?: boolean }>> {
    try {
      console.log('Searching for users with query:', query);
      
      // Search in users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar')
        .ilike('name', `%${query}%`)
        .neq('id', currentUserId)
        .not('id', 'is', null)
        .limit(10);

      if (usersError) {
        console.error('Error searching users table:', usersError);
      }

      // Search in artist_profiles table
      const { data: artists, error: artistsError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, profile_photo')
        .ilike('artist_name', `%${query}%`)
        .neq('user_id', currentUserId)
        .not('id', 'is', null)
        .limit(10);

      if (artistsError) {
        console.error('Error searching artist_profiles table:', artistsError);
      }

      // Combine and format results
      const userResults = (users || []).map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: 'user',
        isArtist: false
      }));

      const artistResults = (artists || []).map(artist => ({
        id: artist.id,
        name: artist.artist_name,
        avatar: artist.profile_photo,
        role: 'artist',
        isArtist: true
      }));

      const allResults = [...userResults, ...artistResults];
      
      console.log('Found users:', userResults.length);
      console.log('Found artists:', artistResults.length);
      console.log('Total results:', allResults.length);
      
      // Filter out any results without valid IDs
      const validResults = allResults.filter(result => result.id && result.name);
      console.log('Valid results:', validResults.length);
      
      return validResults;
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      await supabase
        .channel(`typing:${conversationId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId,
            isTyping,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(conversationId: string, onTypingUpdate: (userId: string, isTyping: boolean) => void) {
    return supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        onTypingUpdate(userId, isTyping);
      })
      .subscribe();
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ 
          last_seen: new Date().toISOString(),
          is_online: isOnline 
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  }

  /**
   * Subscribe to user online status
   */
  subscribeToUserStatus(userId: string, onStatusUpdate: (isOnline: boolean, lastSeen: string) => void) {
    return supabase
      .channel(`user_status:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            const user = payload.new as any;
            onStatusUpdate(user.is_online, user.last_seen);
          }
        }
      )
      .subscribe();
  }

  /**
   * Update message delivery status
   */
  async updateMessageStatus(messageId: string, status: 'delivered' | 'read'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          message_status: status,
          ...(status === 'read' ? { read_timestamp: new Date().toISOString() } : {}),
          ...(status === 'delivered' ? { delivery_timestamp: new Date().toISOString() } : {})
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message status:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to update message status:', error);
      return false;
    }
  }

  /**
   * Subscribe to message status updates
   */
  subscribeToMessageStatus(conversationId: string, onStatusUpdate: (messageId: string, status: string) => void) {
    return supabase
      .channel(`message_status:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.new) {
            const message = payload.new as any;
            onStatusUpdate(message.id, message.message_status);
          }
        }
      )
      .subscribe();
  }
}

export const messagingService = new MessagingService();
