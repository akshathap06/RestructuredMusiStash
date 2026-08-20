import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService } from '../../../services/postsService';
import { followService } from '../../../services/followService';
import { moderationService } from '../../../services/moderationService';
import CommentModal from '../../../components/CommentModal';
import ReportBlockModal from '../../../components/ReportBlockModal';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

// Direct database loader function - works for both artists and regular users
const loadProfileDirectly = async (artistId?: string, userId?: string, artistData?: any) => {
  try {
    let resolvedUserId = userId;
    
    if (!resolvedUserId && artistData?.user_id) {
      resolvedUserId = artistData.user_id;
    }
    
    if (!resolvedUserId && artistId) {
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('user_id')
        .eq('id', artistId)
        .maybeSingle();
      if (artistProfile) resolvedUserId = artistProfile.user_id;
    }
    
    if (!resolvedUserId && artistData?.id) {
      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('user_id')
        .eq('id', artistData.id)
        .maybeSingle();
      if (artistProfile) resolvedUserId = artistProfile.user_id;
    }

    if (!resolvedUserId) throw new Error('No user ID available');

    // First, always get user data - this should exist for all users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, avatar, role, created_at')
      .eq('id', resolvedUserId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      throw new Error('User not found');
    }

    // Try to get artist profile (may not exist for regular users)
    const { data: artistProfile } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    // Try to get service provider profile (may not exist)
    const { data: serviceProvider } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    const [followersResult, followingResult, postsResult] = await Promise.all([
      supabase.from('follow_relationships').select('id').eq('followed_user_id', resolvedUserId),
      supabase.from('follow_relationships').select('id').eq('follower_user_id', resolvedUserId),
      supabase.from('posts').select('id').eq('user_id', resolvedUserId).eq('is_active', true).eq('post_status', 'approved')
    ]);

    const { data: posts } = await supabase
      .from('posts')
      .select('id, user_id, content, media_urls, created_at, likes_count, comments_count')
      .eq('user_id', resolvedUserId)
      .eq('is_active', true)
      .eq('post_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      profile: {
        user_data: userData,
        artist_profile: artistProfile || null,
        service_provider: serviceProvider || null,
        stats: {
          followers_count: followersResult.data?.length || 0,
          following_count: followingResult.data?.length || 0,
          posts_count: postsResult.data?.length || 0
        },
        posts: posts || []
      },
      error: null
    };
  } catch (error: any) {
    console.error('Error loading profile directly:', error);
    return { profile: null, error: error.message };
  }
};

// Investment interest tracker - uses AsyncStorage as fallback if DB table doesn't exist
const INTEREST_STORAGE_KEY = 'investment_interests';

const recordInvestmentInterest = async (userId: string, artistId: string, artistName: string) => {
  try {
    // Try database first
    try {
      const { data: existing } = await supabase
        .from('investment_interests')
        .select('id')
        .eq('user_id', userId)
        .eq('artist_id', artistId)
        .maybeSingle();

      if (existing) {
        return { success: false, alreadyRegistered: true };
      }

      const { error } = await supabase
        .from('investment_interests')
        .insert({
          user_id: userId,
          artist_id: artistId,
          artist_name: artistName,
          created_at: new Date().toISOString()
        });

      if (!error) {
        return { success: true, alreadyRegistered: false };
      }
    } catch (dbError) {
      console.log('DB not available, using local storage');
    }

    // Fallback to AsyncStorage
    const stored = await AsyncStorage.getItem(INTEREST_STORAGE_KEY);
    const interests = stored ? JSON.parse(stored) : [];
    const key = `${userId}_${artistId}`;
    
    if (interests.includes(key)) {
      return { success: false, alreadyRegistered: true };
    }
    
    interests.push(key);
    await AsyncStorage.setItem(INTEREST_STORAGE_KEY, JSON.stringify(interests));
    
    // Also store count per artist
    const countKey = `interest_count_${artistId}`;
    const currentCount = parseInt(await AsyncStorage.getItem(countKey) || '0');
    await AsyncStorage.setItem(countKey, String(currentCount + 1));
    
    return { success: true, alreadyRegistered: false };
  } catch (error) {
    console.log('Interest recording failed:', error);
    return { success: true, alreadyRegistered: false }; // Silently succeed for UX
  }
};

const checkInvestmentInterest = async (userId: string, artistId: string) => {
  try {
    // Try DB first
    const { data } = await supabase
      .from('investment_interests')
      .select('id')
      .eq('user_id', userId)
      .eq('artist_id', artistId)
      .maybeSingle();
    if (data) return true;
  } catch {}
  
  // Fallback to local
  try {
    const stored = await AsyncStorage.getItem(INTEREST_STORAGE_KEY);
    const interests = stored ? JSON.parse(stored) : [];
    return interests.includes(`${userId}_${artistId}`);
  } catch {
    return false;
  }
};

const getInvestmentInterestCount = async (artistId: string) => {
  try {
    // Try DB first
    const { count } = await supabase
      .from('investment_interests')
      .select('id', { count: 'exact' })
      .eq('artist_id', artistId);
    if (count && count > 0) return count;
  } catch {}
  
  // Fallback to local
  try {
    const countKey = `interest_count_${artistId}`;
    return parseInt(await AsyncStorage.getItem(countKey) || '0');
  } catch {
    return 0;
  }
};

const ArtistProfileViewScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { artistId, artistData, userId, userName } = route.params || {};
  
  const targetUserId = userId || artistData?.user_id || artistId;
  const targetArtistId = artistId || artistData?.id;
  const fallbackName = userName || artistData?.artist_name;
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostImage, setSelectedPostImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'invest'>('invest');
  const [hasRegisteredInterest, setHasRegisteredInterest] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (targetUserId) loadUserData();
  }, [targetUserId]);

  useEffect(() => {
    if (profileData && user?.id) loadFollowData();
  }, [profileData, user?.id]);

  useEffect(() => {
    if (profileData?.artist_profile?.id && user?.id) {
      checkInvestmentInterest(user.id, profileData.artist_profile.id).then(setHasRegisteredInterest);
      getInvestmentInterestCount(profileData.artist_profile.id).then(setInterestCount);
    }
  }, [profileData, user?.id]);

  // Check if we've blocked this user or they've blocked us
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (user?.id && targetUserId && user.id !== targetUserId) {
        const blocked = await moderationService.isUserBlocked(user.id, targetUserId);
        setIsBlocked(blocked);
      }
    };
    checkBlockStatus();
  }, [user?.id, targetUserId]);

  const handleUserBlocked = (blockedUserId: string) => {
    setIsBlocked(true);
    // Navigate back since we blocked this user
    Alert.alert(
      'User Blocked',
      'You will no longer see this user\'s content.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const result = await loadProfileDirectly(targetArtistId, targetUserId, artistData);
      if (result.profile) {
        setProfileData(result.profile);
        setFollowerCount(result.profile.stats.followers_count || 0);
        setFollowingCount(result.profile.stats.following_count || 0);
        setPosts(result.profile.posts || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowData = async () => {
    try {
      const resolvedUserId = profileData?.user_data?.id || targetUserId;
      if (!resolvedUserId) return;
      const followData = await followService.getFollowData(resolvedUserId, user?.id);
      setFollowerCount(followData.followerCount);
      setFollowingCount(followData.followingCount);
      setIsFollowing(followData.isFollowing);
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to follow users');
      return;
    }
    const resolvedUserId = profileData?.user_data?.id || targetUserId;
    if (!resolvedUserId) return;

    try {
      const result = isFollowing
        ? await followService.unfollowUser(user.id, resolvedUserId)
        : await followService.followUser(user.id, resolvedUserId);
      if (result.success) {
        setIsFollowing(!isFollowing);
        if (result.followerCount !== undefined) setFollowerCount(result.followerCount);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleInvestmentInterest = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to register your interest');
      return;
    }

    if (hasRegisteredInterest) {
      Alert.alert('Already Registered', "You've already expressed interest in investing in this artist!");
      return;
    }

    setIsSubmittingInterest(true);
    const artistId = profileData?.artist_profile?.id;
    const artistName = profileData?.artist_profile?.artist_name || displayName;

    const result = await recordInvestmentInterest(user.id, artistId, artistName);

    if (result.success) {
      setHasRegisteredInterest(true);
      setInterestCount(prev => prev + 1);
      Alert.alert(
        '🎉 Interest Registered!',
        `You're now on the list for ${artistName}'s future investment opportunities. We'll notify you when investing goes live!`,
        [{ text: 'Awesome!' }]
      );
    } else if (result.alreadyRegistered) {
      setHasRegisteredInterest(true);
    } else {
      // Fallback - still show success to user even if DB fails
      setHasRegisteredInterest(true);
      setInterestCount(prev => prev + 1);
      Alert.alert(
        '🎉 Interest Registered!',
        `You're on the list for ${artistName}'s future investment opportunities!`,
        [{ text: 'Awesome!' }]
      );
    }
    setIsSubmittingInterest(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show blocked message if user is blocked
  if (isBlocked) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="ban-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>You have blocked this user</Text>
        <Text style={[styles.errorText, { fontSize: 14, color: '#6B7280', marginTop: 8 }]}>
          Unblock them from Settings to view their profile
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profileData.artist_profile?.artist_name || profileData.user_data?.name || fallbackName || 'Artist';
  const profilePhoto = profileData.artist_profile?.profile_photo || profileData.user_data?.avatar;
  const bannerPhoto = profileData.artist_profile?.banner_photo;
  const bio = profileData.artist_profile?.bio || '';
  const genres = profileData.artist_profile?.genre || [];
  const location = profileData.artist_profile?.location;
  const isVerified = profileData.artist_profile?.is_verified;
  const monthlyListeners = profileData.artist_profile?.monthly_listeners || 0;
  const totalStreams = profileData.artist_profile?.total_streams || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner with Header Overlay */}
      <View style={styles.bannerContainer}>
        <Image source={{ uri: bannerPhoto }} style={styles.bannerImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#000']}
          style={styles.bannerGradient}
        />
        
        {/* Navigation Row */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          {user?.id && targetUserId && user.id !== targetUserId && (
            <TouchableOpacity 
              style={styles.navBtn}
              onPress={() => setShowReportModal(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Profile Info on Banner */}
        <View style={styles.profileInfoOverlay}>
          <Image source={{ uri: profilePhoto }} style={styles.profileAvatar} />
          <View style={styles.profileTextContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              {isVerified && <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />}
            </View>
            {genres.length > 0 && <Text style={styles.profileGenres}>{genres.slice(0, 3).join(' · ')}</Text>}
          </View>
        </View>
      </View>

      {/* Stats & Actions */}
      <View style={styles.compactSection}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatNumber(followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          {(monthlyListeners > 0 || totalStreams > 0) && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatNumber(monthlyListeners || totalStreams)}</Text>
                <Text style={styles.statLabel}>{monthlyListeners > 0 ? 'Listeners' : 'Streams'}</Text>
              </View>
            </>
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => navigation.navigate('NewMessage', {
              recipientId: profileData?.user_data?.id || targetUserId,
              recipientName: displayName
            })}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Bio (if exists) */}
        {bio ? <Text style={styles.bio} numberOfLines={2}>{bio}</Text> : null}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons name="grid-outline" size={20} color={activeTab === 'posts' ? '#FFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invest' && styles.tabActive]}
          onPress={() => setActiveTab('invest')}
        >
          <Ionicons name="trending-up" size={20} color={activeTab === 'invest' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'invest' && styles.tabTextActiveGreen]}>Invest</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'posts' ? (
        <View style={styles.postsSection}>
          {posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id, post })}
                >
                  {post.media_urls?.[0] ? (
                    <Image source={{ uri: post.media_urls[0] }} style={styles.postImage} />
                  ) : (
                    <View style={styles.postPlaceholder}>
                      <Ionicons name="chatbubble" size={20} color="#6B7280" />
                    </View>
                  )}
                  <View style={styles.postOverlay}>
                    <Ionicons name="heart" size={12} color="#FFF" />
                    <Text style={styles.postLikes}>{post.likes_count || 0}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPosts}>
              <Ionicons name="camera-outline" size={40} color="#4B5563" />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          )}
        </View>
      ) : (
        /* Investment Interest Tab */
        <View style={styles.investSection}>
          {/* Hero Card */}
          <LinearGradient
            colors={['#064E3B', '#047857', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.investHeroCard}
          >
            <View style={styles.investHeroContent}>
              <View style={styles.investBadge}>
                <Text style={styles.investBadgeText}>COMING SOON</Text>
              </View>
              <Text style={styles.investHeroTitle}>Invest in {displayName}</Text>
              <Text style={styles.investHeroSubtitle}>
                Be part of the future. Join the MusiStash investment movement and get early access to artist investment opportunities.
              </Text>
              
              {/* Interest Counter */}
              <View style={styles.interestCounter}>
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={styles.interestCountText}>
                  {interestCount > 0 ? `${interestCount} people interested` : 'Be the first to show interest'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Info Cards */}
          <View style={styles.investInfoCards}>
            <View style={styles.investInfoCard}>
              <View style={styles.investInfoIcon}>
                <Ionicons name="rocket" size={24} color="#3B82F6" />
              </View>
              <View style={styles.investInfoTextContainer}>
                <Text style={styles.investInfoTitle}>Paper capital flow</Text>
                <Text style={styles.investInfoDesc}>
                  Practice backing artists with simulated funds through transparent project packages. No real money moves.
                </Text>
              </View>
            </View>

            <View style={styles.investInfoCard}>
              <View style={styles.investInfoIcon}>
                <Ionicons name="trending-up" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.investInfoTextContainer}>
                <Text style={styles.investInfoTitle}>Simulated portfolio</Text>
                <Text style={styles.investInfoDesc}>
                  Track hypothetical performance while we gather demand signals before any real-money launch.
                </Text>
              </View>
            </View>

            <View style={styles.investInfoCard}>
              <View style={styles.investInfoIcon}>
                <Ionicons name="sparkles" size={24} color="#F59E0B" />
              </View>
              <View style={styles.investInfoTextContainer}>
                <Text style={styles.investInfoTitle}>AI-Powered Insights</Text>
                <Text style={styles.investInfoDesc}>
                  Resonance and similarity scores help explain momentum. Scores are signals, not guarantees.
                </Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              styles.investCTA,
              hasRegisteredInterest && styles.investCTARegistered
            ]}
            onPress={handleInvestmentInterest}
            disabled={isSubmittingInterest || hasRegisteredInterest}
          >
            {isSubmittingInterest ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name={hasRegisteredInterest ? 'checkmark-circle' : 'flash'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.investCTAText}>
                  {hasRegisteredInterest ? "You're on the list!" : 'Join paper-backing waitlist'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer Note */}
          <Text style={styles.investFooter}>
            Paper trading simulation interest only. No real money, securities, or ownership is offered. Join the waitlist for a future real-money launch.
          </Text>
        </View>
      )}

      <View style={{ height: 100 }} />

      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={selectedPostId || ''}
        postImage={selectedPostImage || ''}
      />

      {/* Report/Block Modal */}
      {user?.id && targetUserId && (
        <ReportBlockModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          currentUserId={user.id}
          targetUserId={targetUserId}
          targetUserName={displayName}
          contentType={profileData?.artist_profile ? 'artist' : 'user'}
          contentId={profileData?.artist_profile?.id}
          onUserBlocked={handleUserBlocked}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bannerContainer: {
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F1F',
  },
  bannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  navRow: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#2C2C2E',
  },
  profileTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileGenres: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  compactSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2C2C2E',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  followBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
  },
  followingBtn: {
    backgroundColor: '#2C2C2E',
  },
  followBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingBtnText: {
    color: '#FFF',
  },
  messageBtn: {
    width: 44,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
  },
  shareBtn: {
    width: 44,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
  },
  bio: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabTextActiveGreen: {
    color: '#3B82F6',
  },
  postsSection: {
    padding: 16,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  postItem: {
    width: (width - 36) / 3,
    aspectRatio: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F1F',
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  postLikes: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 12,
  },
  investSection: {
    padding: 16,
  },
  investHeroCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  investHeroContent: {
    alignItems: 'center',
  },
  investBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  investBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  investHeroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  investHeroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  interestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  interestCountText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  investInfoCards: {
    gap: 12,
    marginBottom: 24,
  },
  investInfoCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  investInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  investInfoTextContainer: {
    flex: 1,
  },
  investInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  investInfoDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  investCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  investCTARegistered: {
    backgroundColor: '#059669',
  },
  investCTAText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  investFooter: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ArtistProfileViewScreen;
