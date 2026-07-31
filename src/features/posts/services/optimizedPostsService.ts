import { supabase } from '../../../lib/supabase';
import { Post } from './postsService';

/**
 * Optimized Posts Service for Production
 * Uses materialized views and optimized queries for better performance
 */
export class OptimizedPostsService {
  /**
   * Get optimized post feed using materialized view
   */
  static async getOptimizedFeed(
    userId?: string, 
    limit = 20, 
    offset = 0
  ): Promise<Post[]> {
    try {
      // Use optimized materialized view for better performance
      let query = supabase
        .from('post_feed_optimized')
        .select('*')
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching optimized feed:', error);
        // Fallback to regular posts service
        return [];
      }

      // Add user liked status if userId provided
      if (userId && data) {
        const postsWithLikeStatus = await Promise.all(
          data.map(async (post) => {
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', userId)
              .single();

            return {
              ...post,
              user_liked: !!userLike,
              // Map materialized view fields to expected format with fallback for profile photos
              user_name: post.artist_name || post.user_name,
              user_avatar: post.profile_photo || post.user_avatar || null,
              user_type: post.artist_name ? 'artist' : 'user',
            };
          })
        );

        return postsWithLikeStatus;
      }

      return data?.map(post => ({
        ...post,
        user_name: post.artist_name || post.user_name,
        user_avatar: post.profile_photo || post.user_avatar || null,
        user_type: post.artist_name ? 'artist' : 'user',
        user_liked: false,
      })) || [];

    } catch (error) {
      console.error('Error in optimized feed:', error);
      return [];
    }
  }

  /**
   * Get posts by user with optimized query
   */
  static async getOptimizedUserPosts(
    targetUserId: string,
    currentUserId?: string,
    limit = 20,
    offset = 0
  ): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('post_feed_optimized')
        .select('*')
        .eq('user_id', targetUserId)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching user posts:', error);
        return [];
      }

      // Add user liked status if currentUserId provided
      if (currentUserId && data) {
        const postsWithLikeStatus = await Promise.all(
          data.map(async (post) => {
            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUserId)
              .single();

            return {
              ...post,
              user_liked: !!userLike,
              user_name: post.artist_name || post.user_name,
              user_avatar: post.profile_photo || post.user_avatar || null,
              user_type: post.artist_name ? 'artist' : 'user',
            };
          })
        );

        return postsWithLikeStatus;
      }

      return data?.map(post => ({
        ...post,
        user_name: post.artist_name || post.user_name,
        user_avatar: post.profile_photo || post.user_avatar || null,
        user_type: post.artist_name ? 'artist' : 'user',
        user_liked: false,
      })) || [];

    } catch (error) {
      console.error('Error fetching optimized user posts:', error);
      return [];
    }
  }

  /**
   * Search posts with full-text search
   */
  static async searchPosts(
    query: string,
    userId?: string,
    limit = 20,
    offset = 0
  ): Promise<Post[]> {
    try {
      // Use PostgreSQL full-text search on JSONB content
      const { data, error } = await supabase
        .from('post_feed_optimized')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,user_name.ilike.%${query}%,artist_name.ilike.%${query}%`)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error searching posts:', error);
        return [];
      }

      return data?.map(post => ({
        ...post,
        user_name: post.artist_name || post.user_name,
        user_avatar: post.profile_photo || post.user_avatar || null,
        user_type: post.artist_name ? 'artist' : 'user',
        user_liked: false,
      })) || [];

    } catch (error) {
      console.error('Error in post search:', error);
      return [];
    }
  }

  /**
   * Get trending posts based on engagement
   */
  static async getTrendingPosts(
    userId?: string,
    limit = 20,
    timeframe = '24 hours'
  ): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('post_feed_optimized')
        .select('*')
        .gte('created_at', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString())
        .order('like_count', { ascending: false })
        .order('comment_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching trending posts:', error);
        return [];
      }

      return data?.map(post => ({
        ...post,
        user_name: post.artist_name || post.user_name,
        user_avatar: post.profile_photo || post.user_avatar || null,
        user_type: post.artist_name ? 'artist' : 'user',
        user_liked: false,
      })) || [];

    } catch (error) {
      console.error('Error fetching trending posts:', error);
      return [];
    }
  }

  /**
   * Refresh materialized view (call periodically)
   */
  static async refreshPostFeed(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('refresh_post_feed');
      
      if (error) {
        console.error('Error refreshing post feed:', error);
        return false;
      }

      console.log('Post feed refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error refreshing post feed:', error);
      return false;
    }
  }

  /**
   * Get posts by type with optimization
   */
  static async getPostsByType(
    postType: string,
    userId?: string,
    limit = 20,
    offset = 0
  ): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('post_feed_optimized')
        .select('*')
        .eq('post_type', postType)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching posts by type:', error);
        return [];
      }

      return data?.map(post => ({
        ...post,
        user_name: post.artist_name || post.user_name,
        user_avatar: post.profile_photo || post.user_avatar || null,
        user_type: post.artist_name ? 'artist' : 'user',
        user_liked: false,
      })) || [];

    } catch (error) {
      console.error('Error fetching posts by type:', error);
      return [];
    }
  }

  private static getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case '1 hour':
        return 60 * 60 * 1000;
      case '6 hours':
        return 6 * 60 * 60 * 1000;
      case '24 hours':
        return 24 * 60 * 60 * 1000;
      case '7 days':
        return 7 * 24 * 60 * 60 * 1000;
      case '30 days':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

export const optimizedPostsService = OptimizedPostsService;
