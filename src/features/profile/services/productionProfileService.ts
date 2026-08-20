import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

// Production-ready interface that matches actual database structure
export interface ProductionProfileData {
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
    genre?: string[];
    monthly_listeners?: number;
    total_streams?: number;
    is_verified?: boolean;
    status?: string;
    created_at: string;
    spotify_followers?: number;
  };
  service_provider?: {
    id: string;
    user_id: string;
    business_name: string;
    provider_type: string;
    about_section?: string;
    bio?: string;
    profile_photo?: string;
    status?: string;
    created_at: string;
    tagline?: string;
    location?: string;
    email?: string;
    phone?: string;
    website_url?: string;
    social_links?: any;
    genres?: string;
    specializations?: string;
    years_of_experience?: number;
    base_price?: number;
    currency?: string;
    price_per_hour?: number;
    min_project_budget?: number;
    max_project_budget?: number;
    turnaround_time_days?: number;
    portfolio_description?: string;
    sample_work_urls?: string;
    is_verified?: boolean;
    verification_level?: string;
    average_rating?: number;
    total_ratings_count?: number;
    response_time_hours?: number;
    skills?: string;
    website?: string;
    contact_email?: string;
    description?: string;
    onboarding_step?: number;
    business_info_completed?: boolean;
    stripe_verification_completed?: boolean;
    stripe_verification_date?: string;
    can_list_services?: boolean;
    verification_notes?: string;
    stripe_account_id?: string;
    stripe_onboarding_url?: string;
    stripe_account_status?: string;
    can_accept_payments?: boolean;
  };
  stats: {
    followers_count: number;
    following_count: number;
    posts_count: number;
  };
  posts: Array<{
    id: string;
    title: string;
    content?: string;
    image_url?: string;
    created_at: string;
    likes_count?: number;
    genre?: string[];
    post_type: string;
    media_urls: string[];
    description: string;
    user_id: string;
    is_featured: boolean;
    is_active: boolean;
    updated_at: string;
    tags?: string[];
  }>;
  last_updated: string;
}

interface CachedData {
  profile: ProductionProfileData;
  lastUpdated: number;
  version: string;
}

export class ProductionProfileService {
  private static readonly CACHE_KEY_PREFIX = 'prod_profile_v2_';
  private static readonly CACHE_VERSION = '2.0.0'; // Bumped for optimized version
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for smoother experience
  private static readonly STALE_CACHE_DURATION = 30 * 60 * 1000; // 30 min stale cache as backup
  
  // In-memory cache for instant access
  private static memoryCache: Map<string, { profile: ProductionProfileData; timestamp: number }> = new Map();
  private static readonly MEMORY_CACHE_DURATION = 60 * 1000; // 1 minute memory cache
  
  /**
   * Get complete user profile - OPTIMIZED for speed
   */
  static async getCompleteUserProfile(
    userId: string, 
    forceRefresh = false
  ): Promise<{
    profile: ProductionProfileData;
    fromCache: boolean;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // 1. INSTANT: Check memory cache first (sub-millisecond)
      if (!forceRefresh) {
        const memCached = this.memoryCache.get(userId);
        if (memCached && (Date.now() - memCached.timestamp < this.MEMORY_CACHE_DURATION)) {
          console.log(`⚡ Memory cache hit (${Date.now() - startTime}ms)`);
          return { profile: memCached.profile, fromCache: true };
        }
      }
      
      // 2. FAST: Check AsyncStorage cache (10-50ms)
      if (!forceRefresh) {
        const cached = await this.getCachedProfile(userId);
        if (cached) {
          // Store in memory for next time
          this.memoryCache.set(userId, { profile: cached.profile, timestamp: Date.now() });
          console.log(`✓ AsyncStorage cache hit (${Date.now() - startTime}ms)`);
          
          // Refresh in background if cache is getting stale (but still valid)
          if (Date.now() - cached.lastUpdated > this.CACHE_DURATION / 2) {
            this.refreshInBackground(userId);
          }
          
          return { profile: cached.profile, fromCache: true };
        }
      }
      
      // 3. NETWORK: Fetch from database with parallel queries
      console.log('🔄 Fetching fresh profile data...');
      const result = await this.fetchProfileOptimized(userId);
      
      console.log(`✓ Profile loaded from network (${Date.now() - startTime}ms)`);
      return result;
      
    } catch (error) {
      console.error('❌ Error in getCompleteUserProfile:', error);
      
      // Try stale cache as fallback
      const staleCache = await this.getStaleCachedProfile(userId);
      if (staleCache) {
        console.log('⚠️ Using stale cache as fallback');
        return { profile: staleCache, fromCache: true, error: 'Using stale cache' };
      }
      
      return {
        profile: this.createMinimalProfile(userId),
        fromCache: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh profile in background without blocking UI
   */
  private static async refreshInBackground(userId: string): Promise<void> {
    try {
      console.log('🔄 Background refresh starting...');
      const result = await this.fetchProfileOptimized(userId);
      if (!result.error) {
        console.log('✓ Background refresh complete');
      }
    } catch (error) {
      console.warn('⚠️ Background refresh failed:', error);
    }
  }

  /**
   * OPTIMIZED: Fetch all profile data in parallel
   */
  private static async fetchProfileOptimized(userId: string): Promise<{
    profile: ProductionProfileData;
    fromCache: boolean;
    error?: string;
  }> {
    const profile = this.createMinimalProfile(userId);
    const errors: string[] = [];

    try {
      // Run ALL queries in parallel for maximum speed
      const [
        userResult,
        artistResult,
        serviceResult,
        followingResult,
        postsResult
      ] = await Promise.all([
        // 1. User data
        supabase
          .from('users')
          .select('id, name, email, role, avatar, created_at')
          .eq('id', userId)
          .maybeSingle(),
        
        // 2. Artist profile
        supabase
          .from('artist_profiles')
          .select('id, user_id, artist_name, bio, profile_photo, genre, monthly_listeners, total_streams, is_verified, status, created_at')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // 3. Service provider
        supabase
          .from('service_providers')
          .select('id, user_id, business_name, provider_type, about_section, bio, profile_photo, status, created_at, tagline, location, email, phone, website_url, social_links, genres, specializations, years_of_experience, base_price, currency, price_per_hour, min_project_budget, max_project_budget, turnaround_time_days, portfolio_description, sample_work_urls, is_verified, verification_level, average_rating, total_ratings_count, response_time_hours, skills, website, contact_email, onboarding_step, business_info_completed, stripe_verification_completed, stripe_verification_date, can_list_services, verification_notes, stripe_account_id, stripe_onboarding_url, stripe_account_status, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, can_accept_payments')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // 4. Following count
        supabase
          .from('follow_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId),
        
        // 5. Recent posts (limit 10 for speed)
        supabase
          .from('posts')
          .select('id, title, content, image_url, created_at, likes_count, post_type, media_urls, description, user_id, is_featured, is_active, updated_at, tags, music_url')
          .eq('user_id', userId)
          .eq('is_active', true)
          .eq('post_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Process user data
      if (userResult.error) {
        errors.push(`User: ${userResult.error.message}`);
      } else if (userResult.data) {
        profile.user_data = userResult.data;
      }

      // Process artist profile
      if (artistResult.data) {
        profile.artist_profile = artistResult.data;
      }

      // Process service provider
      if (serviceResult.data) {
        profile.service_provider = serviceResult.data;
      }

      // Process following count
      const followingCount = followingResult.count || 0;

      // Get followers count (needs artist profile ID)
      let followersCount = 0;
      if (artistResult.data?.id) {
        const { count } = await supabase
          .from('follow_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('artist_id', artistResult.data.id);
        followersCount = count || 0;
      }

      // Get posts count
      const postsCount = postsResult.data?.length || 0;

      profile.stats = {
        followers_count: followersCount,
        following_count: followingCount,
        posts_count: postsCount
      };

      // Process posts
      if (postsResult.data) {
        profile.posts = postsResult.data.map(post => {
          let mediaUrls = post.media_urls || [];
          if (post.image_url && !mediaUrls.includes(post.image_url)) {
            mediaUrls = [post.image_url, ...mediaUrls];
          }
          if (post.music_url && !mediaUrls.includes(post.music_url)) {
            mediaUrls = [...mediaUrls, post.music_url];
          }
          
          return {
            id: post.id,
            title: post.title || '',
            content: post.content || '',
            image_url: post.image_url,
            created_at: post.created_at,
            likes_count: post.likes_count || 0,
            post_type: post.post_type || 'post',
            media_urls: mediaUrls,
            description: post.description || post.content || post.title || '',
            user_id: post.user_id || userId,
            is_featured: post.is_featured || false,
            is_active: post.is_active !== false,
            updated_at: post.updated_at || post.created_at,
            tags: post.tags || []
          };
        });
      }

      profile.last_updated = new Date().toISOString();

      // Cache the result
      await this.cacheProfile(userId, profile);
      
      // Store in memory cache
      this.memoryCache.set(userId, { profile, timestamp: Date.now() });

      return {
        profile,
        fromCache: false,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };

    } catch (error) {
      console.error('❌ Error in fetchProfileOptimized:', error);
      return {
        profile,
        fromCache: false,
        error: error instanceof Error ? error.message : 'Fetch error'
      };
    }
  }

  /**
   * Create minimal profile to prevent app crashes
   */
  private static createMinimalProfile(userId: string): ProductionProfileData {
    return {
      user_data: {
        id: userId,
        name: 'User',
        email: '',
        role: 'user',
        created_at: new Date().toISOString()
      },
      stats: {
        followers_count: 0,
        following_count: 0,
        posts_count: 0
      },
      posts: [],
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Cache profile data
   */
  private static async cacheProfile(
    userId: string, 
    profile: ProductionProfileData
  ): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const cacheData: CachedData = {
        profile,
        lastUpdated: Date.now(),
        version: this.CACHE_VERSION
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Cache save failed:', error);
    }
  }

  /**
   * Get cached profile (valid cache only)
   */
  private static async getCachedProfile(userId: string): Promise<CachedData | null> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      
      // Check version and age
      if (data.version !== this.CACHE_VERSION) return null;
      if (Date.now() - data.lastUpdated > this.CACHE_DURATION) return null;
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get stale cached profile (for fallback)
   */
  private static async getStaleCachedProfile(userId: string): Promise<ProductionProfileData | null> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const data: CachedData = JSON.parse(cached);
      
      // Accept stale cache up to 30 minutes
      if (data.version !== this.CACHE_VERSION) return null;
      if (Date.now() - data.lastUpdated > this.STALE_CACHE_DURATION) return null;
      
      return data.profile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Pre-warm cache (call after login)
   */
  static async preWarmCache(userId: string): Promise<void> {
    try {
      console.log('🔥 Pre-warming profile cache...');
      await this.fetchProfileOptimized(userId);
      console.log('✓ Cache pre-warmed');
    } catch (error) {
      console.warn('⚠️ Cache pre-warm failed:', error);
    }
  }

  /**
   * Clear cache
   */
  static async clearCache(userId: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEY_PREFIX + userId;
      await AsyncStorage.removeItem(cacheKey);
      this.memoryCache.delete(userId);
      console.log('✓ Cache cleared');
    } catch (error) {
      console.warn('⚠️ Cache clear failed:', error);
    }
  }

  /**
   * Clear all memory cache
   */
  static clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  static async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'health check failed' };
    }
  }
}
