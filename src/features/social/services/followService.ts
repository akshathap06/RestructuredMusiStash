import { supabase } from '../../../lib/supabase';

export interface FollowData {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface FollowResult {
  success: boolean;
  error?: string;
  followerCount?: number;
  followingCount?: number;
}

export class FollowService {
  /**
   * Get artist profile ID from user ID (needed for follow_relationships mapping)
   */
  private static async getArtistProfileId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.warn('No artist profile found for user:', userId);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error getting artist profile ID:', error);
      return null;
    }
  }

  /**
   * Get follow data for a specific user/artist
   */
  static async getFollowData(targetUserId: string, currentUserId?: string): Promise<FollowData> {
    try {
      // Get the artist profile ID (follow_relationships uses profile.id, not user.id)
      const targetProfileId = await this.getArtistProfileId(targetUserId);
      const currentProfileId = currentUserId ? await this.getArtistProfileId(currentUserId) : null;

      if (!targetProfileId) {
        console.warn('No artist profile found for target user:', targetUserId);
        return { followerCount: 0, followingCount: 0, isFollowing: false };
      }

      // Use profile IDs instead of user IDs for follow_relationships queries
      const [followerResult, followingResult, isFollowingResult] = await Promise.all([
        supabase
          .from('follow_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('artist_id', targetProfileId),
        supabase
          .from('follow_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetUserId),
        (currentUserId && targetProfileId) ? supabase
          .from('follow_relationships')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('artist_id', targetProfileId)
          .single() : Promise.resolve({ data: null, error: null })
      ]);

      if (followerResult.error) {
        console.error('Error getting follower count:', followerResult.error);
      }

      if (followingResult.error) {
        console.error('Error getting following count:', followingResult.error);
      }

      if (isFollowingResult.error && isFollowingResult.error.code !== 'PGRST116') {
        console.error('Error checking follow status:', isFollowingResult.error);
      }

      return {
        followerCount: followerResult.count || 0,
        followingCount: followingResult.count || 0,
        isFollowing: !!isFollowingResult.data
      };
    } catch (error) {
      console.error('Error getting follow data:', error);
      return {
        followerCount: 0,
        followingCount: 0,
        isFollowing: false
      };
    }
  }

  /**
   * Follow a user
   */
  static async followUser(currentUserId: string, targetUserId: string): Promise<FollowResult> {
    try {
      // Get target artist's profile ID (follow_relationships uses profile.id)
      const targetProfileId = await this.getArtistProfileId(targetUserId);
      
      if (!targetProfileId) {
        return { success: false, error: 'Target user does not have an artist profile' };
      }

      // Check if already following
      const { data: existing } = await supabase
        .from('follow_relationships')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('artist_id', targetProfileId)
        .single();

      if (existing) {
        return { success: false, error: 'Already following this user' };
      }

      // Insert follow relationship
      const { error: insertError } = await supabase
        .from('follow_relationships')
        .insert({
          follower_id: currentUserId,
          artist_id: targetProfileId, // Use profile ID, not user ID
          followed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error following user:', insertError);
        return { success: false, error: insertError.message };
      }

      // Get updated counts
      const followData = await this.getFollowData(targetUserId, currentUserId);

      return {
        success: true,
        followerCount: followData.followerCount,
        followingCount: followData.followingCount
      };
    } catch (error) {
      console.error('Error following user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(currentUserId: string, targetUserId: string): Promise<FollowResult> {
    try {
      // Get target artist's profile ID (follow_relationships uses profile.id)
      const targetProfileId = await this.getArtistProfileId(targetUserId);
      
      if (!targetProfileId) {
        return { success: false, error: 'Target user does not have an artist profile' };
      }

      // Delete follow relationship
      const { error: deleteError } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('artist_id', targetProfileId); // Use profile ID, not user ID

      if (deleteError) {
        console.error('Error unfollowing user:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // Get updated counts
      const followData = await this.getFollowData(targetUserId, currentUserId);

      return {
        success: true,
        followerCount: followData.followerCount,
        followingCount: followData.followingCount
      };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get users that follow a specific user
   */
  static async getFollowers(userId: string, limit = 20, offset = 0) {
    try {
      // Get artist's profile ID (follow_relationships uses profile.id)
      const profileId = await this.getArtistProfileId(userId);
      
      if (!profileId) {
        console.warn('No artist profile found for user:', userId);
        return [];
      }

      const { data, error } = await supabase
        .from('follow_relationships')
        .select(`
          follower_id,
          followed_at,
          users!follow_relationships_follower_id_fkey (
            name,
            avatar
          )
        `)
        .eq('artist_id', profileId) // Use profile ID, not user ID
        .order('followed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting followers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  /**
   * Get users that a specific user follows
   */
  static async getFollowing(userId: string, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('follow_relationships')
        .select(`
          artist_id,
          followed_at,
          users!follow_relationships_artist_id_fkey (
            name,
            avatar
          )
        `)
        .eq('follower_id', userId)
        .order('followed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting following:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  /**
   * Check if user A follows user B (simple check)
   */
  static async checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Get target artist's profile ID (follow_relationships uses profile.id)
      const targetProfileId = await this.getArtistProfileId(followingId);
      
      if (!targetProfileId) {
        console.warn('No artist profile found for user:', followingId);
        return false;
      }

      const { data, error } = await supabase
        .from('follow_relationships')
        .select('id')
        .eq('follower_id', followerId)
        .eq('artist_id', targetProfileId) // Use profile ID, not user ID
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking follow status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  /**
   * Get follow statistics for analytics
   */
  static async getFollowStats(userId: string) {
    try {
      const followData = await this.getFollowData(userId);
      
      // Get recent followers (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // `follows` was renamed to follow_relationships (follower_id/artist_id/
      // followed_at); this call was never updated, so recent-follower stats
      // always came back empty.
      const { data: recentFollowers, error } = await supabase
        .from('follow_relationships')
        .select('followed_at')
        .eq('artist_id', userId)
        .gte('followed_at', thirtyDaysAgo.toISOString())
        .order('followed_at', { ascending: false });

      if (error) {
        console.error('Error getting recent followers:', error);
      }

      return {
        totalFollowers: followData.followerCount,
        totalFollowing: followData.followingCount,
        recentFollowersCount: recentFollowers?.length || 0,
        recentFollowers: recentFollowers || []
      };
    } catch (error) {
      console.error('Error getting follow stats:', error);
      return {
        totalFollowers: 0,
        totalFollowing: 0,
        recentFollowersCount: 0,
        recentFollowers: []
      };
    }
  }
}

export const followService = FollowService;
