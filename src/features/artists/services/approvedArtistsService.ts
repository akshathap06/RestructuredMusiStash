import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

export interface ApprovedArtist {
  id: string;
  user_id: string;
  artist_name: string;
  bio?: string;
  biography?: string;
  genre?: string[];
  profile_photo?: string;        // Legacy: base64 data (deprecated)
  banner_photo?: string;         // Legacy: base64 data (deprecated)
  profile_photo_url?: string;    // New: Supabase Storage URL
  banner_photo_url?: string;     // New: Supabase Storage URL
  monthly_listeners?: number;
  total_streams?: number;
  spotify_followers?: number;
  is_verified?: boolean;
  status: 'approved';
  created_at: string;
  updated_at?: string;
  location?: string;
  is_band?: boolean;
  social_links?: any;
  career_highlights?: any[];
}

interface CachedArtistsData {
  artists: ApprovedArtist[];
  lastUpdated: number;
  version: string;
  totalCount: number;
}

interface PaginatedResult {
  artists: ApprovedArtist[];
  total: number;
  page: number;
  hasMore: boolean;
}

export class ApprovedArtistsService {
  private static readonly CACHE_KEY = 'approved_artists_cache_v2';
  private static readonly CACHE_VERSION = '2.0.0';
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly PAGE_SIZE = 20;
  
  /**
   * Fetch paginated artists from database
   * Optimized for infinite scroll with proper pagination
   */
  static async fetchPaginatedArtists(
    page: number = 0,
    search: string = '',
    pageSize: number = this.PAGE_SIZE
  ): Promise<PaginatedResult> {
    try {
      const offset = page * pageSize;
      
      console.log(`📥 Fetching artists: page=${page}, offset=${offset}, search="${search}"`);
      
      // Build optimized query - Uses profile_photo_url (small URL) instead of profile_photo (large base64)
      let query = supabase
        .from('artist_profiles')
        .select('id, user_id, artist_name, bio, genre, profile_photo_url, monthly_listeners, total_streams, is_verified, status, created_at', { count: 'exact' })
        .eq('status', 'approved')
        .not('artist_name', 'is', null)
        .neq('artist_name', '');
      
      // Add search filter if provided
      if (search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`artist_name.ilike.${searchTerm},bio.ilike.${searchTerm}`);
      }
      
      // Order by popularity then recency
      query = query
        .order('monthly_listeners', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      const artists = this.normalizeArtists(data || []);
      const total = count || 0;
      const hasMore = artists.length === pageSize && offset + artists.length < total;
      
      console.log(`✅ Loaded ${artists.length}/${total} artists (hasMore: ${hasMore})`);
      
      return { artists, total, page, hasMore };
      
    } catch (error) {
      console.error('❌ Error fetching paginated artists:', error);
      return { artists: [], total: 0, page, hasMore: false };
    }
  }

  /**
   * Search artists with optimized query
   */
  static async searchArtists(searchTerm: string, limit: number = 50): Promise<ApprovedArtist[]> {
    try {
      if (!searchTerm.trim()) {
        const result = await this.fetchPaginatedArtists(0, '', limit);
        return result.artists;
      }
      
      const term = `%${searchTerm.trim()}%`;
      
      // Uses profile_photo_url (small URL) instead of profile_photo (large base64)
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, user_id, artist_name, bio, genre, profile_photo_url, monthly_listeners, total_streams, is_verified, status')
        .eq('status', 'approved')
        .or(`artist_name.ilike.${term},bio.ilike.${term}`)
        .order('monthly_listeners', { ascending: false, nullsFirst: false })
        .limit(limit);
      
      if (error) {
        console.error('❌ Search error:', error);
        return [];
      }
      
      return this.normalizeArtists(data || []);
      
    } catch (error) {
      console.error('❌ Error searching artists:', error);
      return [];
    }
  }

  /**
   * Load all approved artists (with caching for backward compatibility)
   */
  static async loadApprovedArtists(forceRefresh = false): Promise<{
    artists: ApprovedArtist[];
    fromCache: boolean;
    error?: string;
  }> {
    try {
      // Try cache first
      if (!forceRefresh) {
        const cached = await this.getCachedArtists();
        if (cached) {
          console.log(`✓ Returning ${cached.artists.length} cached artists`);
          
          // Background refresh if stale
          if (Date.now() - cached.lastUpdated > this.CACHE_DURATION / 2) {
            this.refreshCache().catch(() => {});
          }
          
          return { artists: cached.artists, fromCache: true };
        }
      }
      
      // Fetch fresh data
      const result = await this.fetchAllArtists();
      
      // Cache the results
      await this.cacheArtists(result.artists, result.total);
      
      return { artists: result.artists, fromCache: false };
      
    } catch (error) {
      console.error('❌ Error loading artists:', error);
      
      // Try cache as fallback
      const cached = await this.getCachedArtists();
      if (cached) {
        return { artists: cached.artists, fromCache: true, error: 'Using cached data' };
      }
      
      return { artists: [], fromCache: false, error: String(error) };
    }
  }

  /**
   * Fetch all artists (for caching)
   */
  private static async fetchAllArtists(): Promise<{ artists: ApprovedArtist[]; total: number }> {
    // Uses profile_photo_url (small URL) instead of profile_photo (large base64)
    const { data, error, count } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name, bio, genre, profile_photo_url, monthly_listeners, total_streams, is_verified, status, created_at', { count: 'exact' })
      .eq('status', 'approved')
      .not('artist_name', 'is', null)
      .order('monthly_listeners', { ascending: false, nullsFirst: false })
      .limit(100);
    
    if (error) throw error;
    
    return {
      artists: this.normalizeArtists(data || []),
      total: count || 0
    };
  }

  /**
   * Normalize artist data
   */
  private static normalizeArtists(data: any[]): ApprovedArtist[] {
    return data.map(artist => ({
      ...artist,
      artist_name: artist.artist_name || 'Unknown Artist',
      bio: artist.bio || '',
      genre: Array.isArray(artist.genre) ? artist.genre : (artist.genre ? [artist.genre] : []),
      profile_photo: artist.profile_photo || null,
      monthly_listeners: artist.monthly_listeners || 0,
      total_streams: artist.total_streams || 0,
      is_verified: artist.is_verified || false,
      status: 'approved' as const
    }));
  }

  /**
   * Background cache refresh
   */
  private static async refreshCache(): Promise<void> {
    try {
      console.log('🔄 Background cache refresh...');
      const result = await this.fetchAllArtists();
      await this.cacheArtists(result.artists, result.total);
      console.log('✅ Cache refreshed');
    } catch (error) {
      console.warn('⚠️ Background refresh failed:', error);
    }
  }

  /**
   * Cache artists
   */
  private static async cacheArtists(artists: ApprovedArtist[], totalCount: number): Promise<void> {
    try {
      const cacheData: CachedArtistsData = {
        artists,
        lastUpdated: Date.now(),
        version: this.CACHE_VERSION,
        totalCount
      };
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Cache write failed:', error);
    }
  }

  /**
   * Get cached artists
   */
  private static async getCachedArtists(): Promise<CachedArtistsData | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedArtistsData = JSON.parse(cached);
      
      // Version check
      if (data.version !== this.CACHE_VERSION) {
        await AsyncStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      
      // Expiry check
      if (Date.now() - data.lastUpdated > this.CACHE_DURATION) {
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache
   */
  static async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.CACHE_KEY);
    console.log('✓ Cache cleared');
  }

  /**
   * Get artist by ID
   */
  static async getArtistById(artistId: string): Promise<ApprovedArtist | null> {
    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('id', artistId)
        .eq('status', 'approved')
        .single();
      
      if (error || !data) return null;
      
      return this.normalizeArtists([data])[0];
    } catch {
      return null;
    }
  }

  /**
   * Preload artists on app startup
   */
  static async preloadArtists(): Promise<void> {
    try {
      console.log('🚀 Preloading artists...');
      await this.loadApprovedArtists();
      console.log('✅ Artists preloaded');
    } catch (error) {
      console.warn('⚠️ Preload failed:', error);
    }
  }

  // Backward compatibility aliases
  static searchApprovedArtists = this.searchArtists;
  static getApprovedArtistById = this.getArtistById;
  static preloadApprovedArtists = this.preloadArtists;
  
  static async filterApprovedArtistsByGenre(genre: string): Promise<ApprovedArtist[]> {
    const { artists } = await this.loadApprovedArtists();
    if (!genre || genre === 'all') return artists;
    return artists.filter(a => a.genre?.some(g => g.toLowerCase().includes(genre.toLowerCase())));
  }
}
