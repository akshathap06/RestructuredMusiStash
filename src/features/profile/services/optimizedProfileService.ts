import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

// Types for the optimized profile data
export interface OptimizedUserProfile {
  user_data: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    created_at: string;
  };
  artist_profile?: {
    id: string;
    user_id: string;
    artist_name: string;
    bio?: string;
    profile_photo?: string;
    banner_photo?: string;
    genre?: string[];
    location?: string;
    monthly_listeners?: number;
    total_streams?: number;
    is_verified?: boolean;
    status?: string;
    created_at: string;
  };
  service_provider?: {
    id: string;
    user_id: string;
    business_name: string;
    provider_type: string;
    about_section?: string;
    contact_email?: string;
    location?: string;
    bio?: string;
    profile_photo?: string;
    status?: string;
    created_at: string;
  };
  social_profile?: {
    id: string;
    user_id: string;
    bio?: string;
    website_url?: string;
    location?: string;
    avatar_url?: string;
    banner_url?: string;
    is_verified: boolean;
    user_type: string;
    social_links?: any;
    created_at: string;
  };
  stats: {
    followers_count: number;
    following_count: number;
    posts_count: number;
  };
  recent_posts: Array<{
    id: string;
    title: string;
    content?: string;
    image_url?: string;
    music_url?: string;
    created_at: string;
    likes_count?: number;
    genre?: string[];
  }>;
  recent_followers: Array<{
    follower_id: string;
    follower_name: string;
    follower_avatar?: string;
    followed_at: string;
  }>;
  following_artists: Array<{
    id: string;
    artist_name: string;
    profile_photo?: string;
    genre?: string[];
    monthly_listeners?: number;
    total_streams?: number;
    is_verified?: boolean;
  }>;
  last_updated: string;
}

export interface UserQuickStats {
  followers_count: number;
  following_count: number;
  posts_count: number;
  updated_at: string;
}

export interface UserRelationships {
  followers: Array<{
    id: string;
    name: string;
    avatar?: string;
    followed_at: string;
  }>;
  following: Array<{
    id: string;
    artist_name: string;
    profile_photo?: string;
    genre?: string[];
    monthly_listeners?: number;
    is_verified?: boolean;
    followed_at: string;
  }>;
  updated_at: string;
}

interface CachedProfileData {
  profile: OptimizedUserProfile;
  lastUpdated: number;
  version: string;
}

export class OptimizedProfileService {
  private static readonly CACHE_KEY_PREFIX = 'optimized_profile_';
  private static readonly CACHE_VERSION = '2.0.0';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for profile data
  private static readonly QUICK_STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for stats
  
  /**
   * Get complete user profile using optimized RPC function
   * This replaces 8+ API calls with a single efficient call
   */
  static async getCompleteUserProfile(
    userId: string, 
    forceRefresh = false
  ): Promise<{
    profile: OptimizedUserProfile;
    fromCache: boolean;
    error?: string;
  }> {
    try {
      // Check cache first unless forced refresh
      if (!forceRefresh) {
        const cachedData = await this.getCachedProfile(userId);
        if (cachedData) {
          console.log('✓ Returning cached profile data for user:', userId);
          
          // Update cache in background if getting stale
          const isStale = Date.now() - cachedData.lastUpdated > this.CACHE_DURATION / 2;
          if (isStale) {
            console.log('⏰ Profile cache getting stale, updating in background...');
            this.fetchAndCacheProfile(userId).catch(error => 
              console.warn('Background profile update failed:', error)
            );
          }
          
          return {
            profile: cachedData.profile,
            fromCache: true
          };
        }
      }
      
      // Fetch fresh data using RPC function
      console.log('🔄 Fetching fresh profile data using RPC function...');
      return await this.fetchAndCacheProfile(userId);
      
    } catch (error) {
      console.error('❌ Error in getCompleteUserProfile:', error);
      
      // Try to return cached data as fallback
      const cachedData = await this.getCachedProfile(userId);
      if (cachedData) {
        console.log('🔄 Returning cached data as fallback');
        return {
          profile: cachedData.profile,
          fromCache: true,
          error: 'Network error, showing cached data'
        };
      }
      
      throw error;
    }
  }

  /**
   * Get quick stats only (followers, following, posts count)
   * Lightweight call for frequent updates
   */
  static async getQuickStats(userId: string): Promise<UserQuickStats> {
    try {
      const cacheKey = `quick_stats_${userId}`;
      const cachedStats = await AsyncStorage.getItem(cacheKey);
      
      if (cachedStats) {
        const parsed = JSON.parse(cachedStats);
        const age = Date.now() - parsed.cached_at;
        
        if (age < this.QUICK_STATS_CACHE_DURATION) {
          return parsed.stats;
        }
      }
      
      // Fetch fresh stats using RPC
      const { data, error } = await supabase.rpc('get_user_quick_stats', {
        user_uuid: userId
      });
      
      if (error) {
        console.error('❌ Error fetching quick stats:', error);
        throw error;
      }
      
      // Cache the stats
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        stats: data,
        cached_at: Date.now()
      }));
      
      return data;
      
    } catch (error) {
      console.error('❌ Error in getQuickStats:', error);
      throw error;
    }
  }

  /**
   * Get user relationships (followers and following)
   * Separate call for relationship-heavy operations
   */
  static async getUserRelationships(
    userId: string, 
    limit = 10
  ): Promise<UserRelationships> {
    try {
      const { data, error } = await supabase.rpc('get_user_relationships', {
        user_uuid: userId,
        limit_count: limit
      });
      
      if (error) {
        console.error('❌ Error fetching user relationships:', error);
        throw error;
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ Error in getUserRelationships:', error);
      throw error;
    }
  }

  /**
   * Refresh only the stats without reloading entire profile
   * Useful for real-time updates
   */
  static async refreshQuickStats(userId: string): Promise<UserQuickStats> {
    try {
      // Clear stats cache first
      const cacheKey = `quick_stats_${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      
      // Fetch fresh stats
      return await this.getQuickStats(userId);
      
    } catch (error) {
      console.error('❌ Error refreshing quick stats:', error);
      throw error;
    }
  }

  /**
   * Preload profile data for faster access
   * Call this early in app lifecycle
   */
  static async preloadProfile(userId: string): Promise<void> {
    try {
      console.log('🚀 Preloading profile data for user:', userId);
      await this.getCompleteUserProfile(userId);
      console.log('✓ Profile preloaded successfully');
    } catch (error) {
      console.warn('⚠️ Profile preload failed:', error);
      // Don't throw - preload failure shouldn't break the app
    }
  }

  /**
   * Clear profile cache for a user
   */
  static async clearProfileCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const statsKey = `quick_stats_${userId}`;
      
      await Promise.all([
        AsyncStorage.removeItem(cacheKey),
        AsyncStorage.removeItem(statsKey)
      ]);
      
      console.log('✓ Profile cache cleared for user:', userId);
    } catch (error) {
      console.warn('⚠️ Failed to clear profile cache:', error);
    }
  }

  /**
   * Private method to fetch and cache profile data
   */
  private static async fetchAndCacheProfile(userId: string): Promise<{
    profile: OptimizedUserProfile;
    fromCache: boolean;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_complete_user_profile', {
        user_uuid: userId
      });
      
      if (error) {
        console.error('❌ RPC error fetching profile:', error);
        return {
          profile: this.getEmptyProfile(userId),
          fromCache: false,
          error: `Database error: ${error.message}`
        };
      }
      
      if (!data) {
        console.warn('⚠️ No profile data returned from RPC');
        return {
          profile: this.getEmptyProfile(userId),
          fromCache: false,
          error: 'No profile data found'
        };
      }
      
      console.log('✓ Profile fetched successfully via RPC');
      
      // Cache the profile data
      await this.cacheProfile(userId, data);
      
      return {
        profile: data,
        fromCache: false
      };
      
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      return {
        profile: this.getEmptyProfile(userId),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Private method to cache profile data
   */
  private static async cacheProfile(userId: string, profile: OptimizedUserProfile): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const cacheData: CachedProfileData = {
        profile,
        lastUpdated: Date.now(),
        version: this.CACHE_VERSION
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('✓ Profile cached successfully');
      
    } catch (error) {
      console.warn('⚠️ Failed to cache profile:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Private method to get cached profile
   */
  private static async getCachedProfile(userId: string): Promise<CachedProfileData | null> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const cachedString = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedString) {
        return null;
      }
      
      const cached: CachedProfileData = JSON.parse(cachedString);
      
      // Check version compatibility
      if (cached.version !== this.CACHE_VERSION) {
        console.log('🔄 Profile cache version mismatch, invalidating');
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      // Check if cache is still valid
      const age = Date.now() - cached.lastUpdated;
      if (age > this.CACHE_DURATION) {
        console.log('⏰ Profile cache expired');
        return null;
      }
      
      console.log(`✓ Valid profile cache found (age: ${Math.round(age / 1000)}s)`);
      return cached;
      
    } catch (error) {
      console.warn('⚠️ Error reading profile cache:', error);
      return null;
    }
  }

  /**
   * Private method to create empty profile structure
   */
  private static getEmptyProfile(userId: string): OptimizedUserProfile {
    return {
      user_data: {
        id: userId,
        name: 'Unknown User',
        email: '',
        role: 'user',
        created_at: new Date().toISOString()
      },
      stats: {
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      },
      recent_posts: [],
      recent_followers: [],
      following_artists: [],
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Get cache info for debugging
   */
  static async getCacheInfo(userId: string): Promise<{
    hasProfileCache: boolean;
    hasStatsCache: boolean;
    profileAge?: number;
    statsAge?: number;
  }> {
    try {
      const profileCacheKey = this.CACHE_KEY_PREFIX + userId;
      const statsCacheKey = `quick_stats_${userId}`;
      
      const [profileCache, statsCache] = await Promise.all([
        AsyncStorage.getItem(profileCacheKey),
        AsyncStorage.getItem(statsCacheKey)
      ]);
      
      const result: any = {
        hasProfileCache: !!profileCache,
        hasStatsCache: !!statsCache
      };
      
      if (profileCache) {
        const parsed = JSON.parse(profileCache);
        result.profileAge = Date.now() - parsed.lastUpdated;
      }
      
      if (statsCache) {
        const parsed = JSON.parse(statsCache);
        result.statsAge = Date.now() - parsed.cached_at;
      }
      
      return result;
      
    } catch (error) {
      return {
        hasProfileCache: false,
        hasStatsCache: false
      };
    }
  }
}
