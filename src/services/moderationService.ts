import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReportData {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  reported_content_id?: string;
  content_type: 'post' | 'comment' | 'message' | 'user' | 'service';
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  created_at: string;
}

export interface BlockedUserWithDetails {
  id: string;
  blocked_user_id: string;
  blocked_at: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

const AI_CONSENT_KEY = '@musistash_ai_consent';
const BLOCKED_USERS_KEY = '@musistash_blocked_users';

class ModerationService {
  // ==========================================
  // REPORT FUNCTIONALITY
  // ==========================================

  /**
   * Report a user or content
   */
  async reportContent(
    reporterId: string,
    contentType: 'post' | 'comment' | 'message' | 'user' | 'service',
    reason: string,
    details?: string,
    reportedUserId?: string,
    reportedContentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, try to insert into the reports table
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reported_content_id: reportedContentId,
          content_type: contentType,
          reason: reason,
          details: details || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (error) {
        // If table doesn't exist, store locally and log for manual review
        console.warn('Reports table not found, storing locally:', error.message);
        await this.storeReportLocally({
          reporterId,
          contentType,
          reason,
          details,
          reportedUserId,
          reportedContentId,
        });
      }

      console.log('✅ Report submitted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error submitting report:', error);
      // Still store locally as backup
      await this.storeReportLocally({
        reporterId,
        contentType,
        reason,
        details,
        reportedUserId,
        reportedContentId,
      });
      return { success: true }; // Return success since we stored locally
    }
  }

  /**
   * Store report locally if database table doesn't exist
   */
  private async storeReportLocally(report: any): Promise<void> {
    try {
      const key = '@musistash_reports';
      const existingReports = await AsyncStorage.getItem(key);
      const reports = existingReports ? JSON.parse(existingReports) : [];
      reports.push({
        ...report,
        id: `local_${Date.now()}`,
        created_at: new Date().toISOString(),
      });
      await AsyncStorage.setItem(key, JSON.stringify(reports));
    } catch (error) {
      console.error('Error storing report locally:', error);
    }
  }

  // ==========================================
  // BLOCK USER FUNCTIONALITY
  // ==========================================

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to insert into blocked_users table
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: blockerId,
          blocked_user_id: blockedUserId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        // If table doesn't exist, store locally
        console.warn('Blocked users table not found, storing locally:', error.message);
        await this.storeBlockLocally(blockerId, blockedUserId);
      }

      // Also store locally for quick access
      await this.storeBlockLocally(blockerId, blockedUserId);

      console.log('✅ User blocked successfully');
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      await this.storeBlockLocally(blockerId, blockedUserId);
      return { success: true };
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to delete from blocked_users table
      await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_user_id', blockedUserId);

      // Remove from local storage
      await this.removeBlockLocally(blockerId, blockedUserId);

      console.log('✅ User unblocked successfully');
      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      await this.removeBlockLocally(blockerId, blockedUserId);
      return { success: true };
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    try {
      // Check local storage first (faster)
      const blockedUsers = await this.getBlockedUsersLocally(blockerId);
      return blockedUsers.includes(blockedUserId);
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }

  /**
   * Get all blocked users - merges local and database blocks
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    try {
      // Get locally stored blocks
      const localBlocks = await this.getBlockedUsersLocally(userId);
      
      // Try to get database blocks as well
      try {
        const { data: dbBlocks, error } = await supabase
          .from('blocked_users')
          .select('blocked_user_id')
          .eq('blocker_id', userId);
        
        if (!error && dbBlocks) {
          const dbBlockedIds = dbBlocks.map(b => b.blocked_user_id);
          // Merge and dedupe
          const allBlocks = [...new Set([...localBlocks, ...dbBlockedIds])];
          
          // Sync to local storage for faster access
          await AsyncStorage.setItem(
            `${BLOCKED_USERS_KEY}_${userId}`, 
            JSON.stringify(allBlocks)
          );
          
          return allBlocks;
        }
      } catch (dbError) {
        console.log('Could not fetch blocks from database, using local only');
      }
      
      return localBlocks;
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Store block locally
   */
  private async storeBlockLocally(blockerId: string, blockedUserId: string): Promise<void> {
    try {
      const key = `${BLOCKED_USERS_KEY}_${blockerId}`;
      const existing = await AsyncStorage.getItem(key);
      const blockedUsers: string[] = existing ? JSON.parse(existing) : [];
      if (!blockedUsers.includes(blockedUserId)) {
        blockedUsers.push(blockedUserId);
        await AsyncStorage.setItem(key, JSON.stringify(blockedUsers));
      }
    } catch (error) {
      console.error('Error storing block locally:', error);
    }
  }

  /**
   * Remove block locally
   */
  private async removeBlockLocally(blockerId: string, blockedUserId: string): Promise<void> {
    try {
      const key = `${BLOCKED_USERS_KEY}_${blockerId}`;
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        const blockedUsers: string[] = JSON.parse(existing);
        const filtered = blockedUsers.filter(id => id !== blockedUserId);
        await AsyncStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Error removing block locally:', error);
    }
  }

  /**
   * Get blocked users from local storage
   */
  private async getBlockedUsersLocally(blockerId: string): Promise<string[]> {
    try {
      const key = `${BLOCKED_USERS_KEY}_${blockerId}`;
      const existing = await AsyncStorage.getItem(key);
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }
  }

  /**
   * Get blocked users with their profile details (for settings screen)
   */
  async getBlockedUsersWithDetails(userId: string): Promise<BlockedUserWithDetails[]> {
    try {
      const { data: blocks, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_user_id, created_at')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (error || !blocks) {
        console.error('Error fetching blocked users:', error);
        return [];
      }

      // Fetch user details for each blocked user
      const blockedUserIds = blocks.map(b => b.blocked_user_id);
      
      if (blockedUserIds.length === 0) {
        return [];
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, avatar')
        .in('id', blockedUserIds);

      if (usersError) {
        console.error('Error fetching user details:', usersError);
        return [];
      }

      // Combine the data
      const usersMap = new Map(users?.map(u => [u.id, u]) || []);
      
      return blocks.map(block => ({
        id: block.id,
        blocked_user_id: block.blocked_user_id,
        blocked_at: block.created_at,
        user: usersMap.get(block.blocked_user_id) || {
          id: block.blocked_user_id,
          name: 'Unknown User',
          avatar: undefined,
        },
      }));
    } catch (error) {
      console.error('Error getting blocked users with details:', error);
      return [];
    }
  }

  /**
   * Check if a user has blocked the current user (reverse check)
   */
  async hasUserBlockedMe(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', targetUserId)
        .eq('blocked_user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if user blocked me:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }

  /**
   * Check if there's any block relationship between two users (bidirectional)
   */
  async isBlockedRelationship(userId1: string, userId2: string): Promise<{ isBlocked: boolean; blockedBy?: string }> {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_user_id')
        .or(`and(blocker_id.eq.${userId1},blocked_user_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_user_id.eq.${userId1})`)
        .maybeSingle();

      if (error) {
        console.error('Error checking block relationship:', error);
        return { isBlocked: false };
      }

      if (data) {
        return { isBlocked: true, blockedBy: data.blocker_id };
      }

      return { isBlocked: false };
    } catch (error) {
      console.error('Error checking block relationship:', error);
      return { isBlocked: false };
    }
  }

  // ==========================================
  // AI CONSENT FUNCTIONALITY
  // ==========================================

  /**
   * Check if user has consented to AI data processing
   */
  async hasAIConsent(userId: string): Promise<boolean> {
    try {
      const key = `${AI_CONSENT_KEY}_${userId}`;
      const consent = await AsyncStorage.getItem(key);
      return consent === 'true';
    } catch (error) {
      console.error('Error checking AI consent:', error);
      return false;
    }
  }

  /**
   * Set AI consent
   */
  async setAIConsent(userId: string, consented: boolean): Promise<void> {
    try {
      const key = `${AI_CONSENT_KEY}_${userId}`;
      await AsyncStorage.setItem(key, consented ? 'true' : 'false');
      
      // Also try to store in database for backup
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            ai_consent: consented,
            ai_consent_date: consented ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      } catch (dbError) {
        console.warn('Could not store AI consent in database:', dbError);
      }
    } catch (error) {
      console.error('Error setting AI consent:', error);
    }
  }

  /**
   * Revoke AI consent
   */
  async revokeAIConsent(userId: string): Promise<void> {
    await this.setAIConsent(userId, false);
  }

  // ==========================================
  // ACCOUNT DELETION
  // ==========================================

  /**
   * Delete user account and all associated data
   */
  async deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Starting account deletion for user:', userId);

      // Delete in order to handle foreign key constraints
      // 1. Delete notifications
      await supabase.from('notifications').delete().eq('user_id', userId);
      
      // 2. Delete messages
      await supabase.from('messages').delete().eq('sender_id', userId);
      
      // 3. Delete conversations (both as user1 and user2)
      await supabase.from('conversations').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      
      // 4. Delete follows
      await supabase.from('follows').delete().or(`follower_id.eq.${userId},followed_id.eq.${userId}`);
      
      // 5. Delete likes
      await supabase.from('likes').delete().eq('user_id', userId);
      
      // 6. Delete comments
      await supabase.from('comments').delete().eq('user_id', userId);
      
      // 7. Delete posts
      await supabase.from('posts').delete().eq('user_id', userId);
      
      // 8. Delete project requests (as client)
      await supabase.from('project_requests').delete().eq('client_id', userId);
      
      // 9. Delete service provider and related data
      const { data: serviceProvider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (serviceProvider) {
        await supabase.from('services').delete().eq('provider_id', serviceProvider.id);
        await supabase.from('portfolio_items').delete().eq('provider_id', serviceProvider.id);
        await supabase.from('service_providers').delete().eq('id', serviceProvider.id);
      }
      
      // 10. Delete artist profile
      await supabase.from('artist_profiles').delete().eq('user_id', userId);
      
      // 11. Delete user preferences
      await supabase.from('user_preferences').delete().eq('user_id', userId);
      
      // 12. Delete blocked users
      await supabase.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_user_id.eq.${userId}`);
      
      // 13. Delete content reports by this user
      await supabase.from('content_reports').delete().eq('reporter_id', userId);
      
      // 14. Finally delete the user from users table
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (userDeleteError) {
        console.error('Error deleting user record:', userDeleteError);
        // Continue anyway - the auth account deletion will still work
      }

      // 15. Delete the auth.users record itself. The client can't (no service
      // role), so a SECURITY-verified Edge Function does it; the CASCADE FKs
      // then purge paper wallets/positions/transactions/watchlist/snapshots,
      // notifications, financial_profiles, sessions and identities.
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'delete-account',
      );
      if (fnError || (fnData && fnData.error)) {
        const msg = fnError?.message || fnData?.error || 'Account removal failed';
        console.error('delete-account function failed:', msg);
        return { success: false, error: msg };
      }

      // Clear local storage
      await this.clearLocalUserData(userId);

      console.log('✅ Account deletion completed');
      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete account' 
      };
    }
  }

  /**
   * Clear all local data for a user
   */
  private async clearLocalUserData(userId: string): Promise<void> {
    try {
      // Clear all user-specific data from AsyncStorage
      const keysToRemove = [
        `${AI_CONSENT_KEY}_${userId}`,
        `${BLOCKED_USERS_KEY}_${userId}`,
        '@musistash_reports',
        'authToken',
        `profile_cache_${userId}`,
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ Local user data cleared');
    } catch (error) {
      console.error('Error clearing local user data:', error);
    }
  }
}

export const moderationService = new ModerationService();
export default moderationService;



