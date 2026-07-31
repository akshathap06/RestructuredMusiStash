import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const PAGE_SIZE = 20; // Load 20 artists at a time

interface Artist {
  id: string;
  user_id: string;
  artist_name: string;
  bio?: string;
  genre?: string[];
  profile_photo_url?: string;  // Supabase Storage URL (small, fast)
  monthly_listeners?: number;
  total_streams?: number;
  is_verified?: boolean;
  status: string;
}

const BrowseArtistsScreen = ({ navigation }: { navigation: any }) => {
  // State
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for pagination
  const pageRef = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Fetch artists with pagination and retry logic
  const fetchArtists = useCallback(async (page: number, search: string = '', refresh: boolean = false, retryAttempt: number = 0): Promise<{ artists: Artist[], total: number, error?: string }> => {
    try {
      const offset = page * PAGE_SIZE;
      
      console.log(`📥 Fetching artists: page=${page}, offset=${offset}, search="${search}", attempt=${retryAttempt + 1}`);
      
      // Build query - OPTIMIZED: Uses profile_photo_url (Storage URL) instead of profile_photo (base64)
      // This reduces response from 22MB to ~10KB for 20 artists
      let query = supabase
        .from('artist_profiles')
        .select('id, user_id, artist_name, bio, genre, profile_photo_url, monthly_listeners, total_streams, is_verified, status', { count: 'exact' })
        .eq('status', 'approved')
        .not('artist_name', 'is', null);
      
      // Add search filter
      if (search.trim()) {
        query = query.or(`artist_name.ilike.%${search}%,bio.ilike.%${search}%`);
      }
      
      // Add pagination and ordering - simplified ordering for faster query
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      
      const { data, error: queryError, count } = await query;
      
      if (queryError) {
        console.error('❌ Error fetching artists:', queryError);
        
        // Check if it's a timeout error and retry
        if (queryError.code === '57014' || queryError.message?.includes('timeout')) {
          if (retryAttempt < MAX_RETRIES) {
            console.log(`🔄 Retrying... (attempt ${retryAttempt + 2}/${MAX_RETRIES + 1})`);
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 1000));
            return fetchArtists(page, search, refresh, retryAttempt + 1);
          }
          return { artists: [], total: 0, error: 'Request timed out. Please try again.' };
        }
        
        return { artists: [], total: 0, error: queryError.message || 'Failed to load artists' };
      }
      
      console.log(`✅ Fetched ${data?.length || 0} artists (total: ${count})`);
      
      // Debug: Log first artist's photo URL to verify it's being fetched
      if (data && data.length > 0 && data[0].profile_photo_url) {
        console.log(`📸 Sample photo URL: ${data[0].artist_name} -> ${data[0].profile_photo_url.substring(0, 80)}...`);
      }
      
      return {
        artists: data || [],
        total: count || 0
      };
    } catch (error: any) {
      console.error('❌ Exception fetching artists:', error);
      
      // Retry on network errors
      if (retryAttempt < MAX_RETRIES) {
        console.log(`🔄 Retrying after exception... (attempt ${retryAttempt + 2}/${MAX_RETRIES + 1})`);
        await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 1000));
        return fetchArtists(page, search, refresh, retryAttempt + 1);
      }
      
      return { artists: [], total: 0, error: 'Network error. Please check your connection.' };
    }
  }, []);

  // Initial load
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    pageRef.current = 0;
    retryCountRef.current = 0;
    
    const result = await fetchArtists(0, searchQuery);
    
    if (result.error) {
      setError(result.error);
      setArtists([]);
    } else {
      setArtists(result.artists);
      setTotalCount(result.total);
      setHasMore(result.artists.length === PAGE_SIZE && result.artists.length < result.total);
    }
    setIsLoading(false);
  }, [fetchArtists, searchQuery]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    pageRef.current = 0;
    retryCountRef.current = 0;
    
    const result = await fetchArtists(0, searchQuery, true);
    
    if (result.error) {
      setError(result.error);
    } else {
      setArtists(result.artists);
      setTotalCount(result.total);
      setHasMore(result.artists.length === PAGE_SIZE && result.artists.length < result.total);
    }
    setIsRefreshing(false);
  }, [fetchArtists, searchQuery]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading || error) return;
    
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    
    const result = await fetchArtists(nextPage, searchQuery);
    
    if (result.error) {
      // Don't show error for load more, just stop loading
      console.warn('Load more failed:', result.error);
    } else if (result.artists.length > 0) {
      pageRef.current = nextPage;
      setArtists(prev => [...prev, ...result.artists]);
      setHasMore(result.artists.length === PAGE_SIZE && artists.length + result.artists.length < result.total);
    } else {
      setHasMore(false);
    }
    
    setIsLoadingMore(false);
  }, [fetchArtists, searchQuery, isLoadingMore, hasMore, isLoading, artists.length, error]);

  // Handle search with debounce
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setError(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      pageRef.current = 0;
      
      const result = await fetchArtists(0, text);
      
      if (result.error) {
        setError(result.error);
        setArtists([]);
      } else {
        setArtists(result.artists);
        setTotalCount(result.total);
        setHasMore(result.artists.length === PAGE_SIZE && result.artists.length < result.total);
      }
      setIsLoading(false);
    }, 300);
  }, [fetchArtists]);

  // Initial load on mount
  useEffect(() => {
    loadInitial();
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Format numbers
  const formatNumber = useCallback((num: number | undefined | null): string => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }, []);

  // Get initials from artist name
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Generate consistent color based on artist name
  const getArtistColor = (name: string): string => {
    const colors = [
      '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
      '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
      '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Artist card component (memoized)
  const ArtistCard = useMemo(() => React.memo(({ item }: { item: Artist }) => {
    const genres = item.genre?.slice(0, 2).join(', ') || 'Artist';
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    
    // Reset states when URL changes
    React.useEffect(() => {
      setImageError(false);
      setImageLoaded(false);
    }, [item.profile_photo_url]);
    
    // Show placeholder if no URL, error, or not loaded yet
    const showPlaceholder = !item.profile_photo_url || imageError || !imageLoaded;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ArtistProfileView', {
          artistId: item.id,
          userId: item.user_id,
          artistData: item
        })}
      >
        {/* Image - Uses profile_photo_url from Supabase Storage (fast!) */}
        <View style={styles.imageContainer}>
          {/* Placeholder - shown when loading or on error */}
          {showPlaceholder && (
            <View style={[styles.imagePlaceholder, { backgroundColor: getArtistColor(item.artist_name) }]}>
              <Text style={styles.initialsText}>
                {getInitials(item.artist_name)}
              </Text>
            </View>
          )}
          
          {/* Actual image - hidden until loaded */}
          {item.profile_photo_url && !imageError && (
            <Image 
              source={{ uri: item.profile_photo_url }} 
              style={[styles.image, !imageLoaded && { opacity: 0 }]}
              resizeMode="cover"
              onLoad={() => {
                setImageLoaded(true);
              }}
              onError={(error) => {
                console.warn(`❌ Image load failed for ${item.artist_name}:`, item.profile_photo_url);
                setImageError(true);
              }}
            />
          )}
          
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
            </View>
          )}
        </View>
        
        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.artistName} numberOfLines={1}>{item.artist_name}</Text>
          <Text style={styles.genre} numberOfLines={1}>{genres}</Text>
          
          {/* Stats */}
          <View style={styles.statsRow}>
            {item.monthly_listeners ? (
              <View style={styles.stat}>
                <Ionicons name="people" size={12} color="#6B7280" />
                <Text style={styles.statText}>{formatNumber(item.monthly_listeners)}</Text>
              </View>
            ) : null}
            {item.total_streams ? (
              <View style={styles.stat}>
                <Ionicons name="play" size={12} color="#6B7280" />
                <Text style={styles.statText}>{formatNumber(item.total_streams)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }), [navigation, formatNumber]);

  // Render artist
  const renderArtist = useCallback(({ item }: { item: Artist }) => (
    <ArtistCard item={item} />
  ), [ArtistCard]);

  // Key extractor
  const keyExtractor = useCallback((item: Artist) => item.id, []);

  // Get item layout for better performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200,
    offset: 200 * Math.floor(index / 2),
    index,
  }), []);

  // Footer component
  const ListFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    
    if (!hasMore && artists.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {totalCount} artist{totalCount !== 1 ? 's' : ''} total
          </Text>
        </View>
      );
    }
    
    return null;
  }, [isLoadingMore, hasMore, artists.length, totalCount]);

  // Empty/Error component
  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    
    // Show error state with retry button
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={56} color="#EF4444" />
          <Text style={styles.errorTitle}>Couldn't load artists</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadInitial}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={48} color="#4B5563" />
        <Text style={styles.emptyTitle}>No artists found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery ? 'Try a different search' : 'Check back later for new artists'}
        </Text>
      </View>
    );
  }, [isLoading, searchQuery, error, loadInitial]);

  return (
    <View style={styles.container}>
      {/* Compact Header with Search */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Future Investments</Text>
            <Text style={styles.headerSubtitle}>Discover artists to back</Text>
          </View>
          {!isLoading && artists.length > 0 && (
            <Text style={styles.artistCount}>{totalCount}</Text>
          )}
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading State */}
      {isLoading && artists.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading artists...</Text>
        </View>
      ) : (
        /* Artists Grid */
        <FlatList
          data={artists}
          renderItem={renderArtist}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={11}
          initialNumToRender={10}
          getItemLayout={getItemLayout}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  artistCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#1F1F1F',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 3,
  },
  cardInfo: {
    padding: 12,
  },
  artistName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  genre: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#6B7280',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BrowseArtistsScreen;
