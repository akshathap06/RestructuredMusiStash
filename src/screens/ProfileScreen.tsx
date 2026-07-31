import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { postsService, Post } from '../services/postsService';
import { followService } from '../services/followService';
import { NotificationService, ProjectNotification } from '../services/notificationService';
import { ProductionProfileService, ProductionProfileData } from '../services/productionProfileService';
// Removed ServiceProviderStatsService to fix errors
import ProfilePictureService from '../services/profilePictureService';
import ProfilePicture from '../components/ProfilePicture';
import CommentModal from '../components/CommentModal';
import { OnboardingProgress } from '../components/OnboardingProgress';
import projectRequestService from '../services/projectRequestService';
import { messagingService } from '../services/messagingService';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  artist_name?: string;
  bio?: string;
  profile_photo?: string;
  banner_photo?: string;
  genre?: string[];
  location?: string;
  status?: 'pending' | 'approved' | 'rejected';
  monthly_listeners?: number;
  total_streams?: number;
  spotify_followers?: number;
  is_verified?: boolean;
  user_id: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  created_at?: string;
}

interface UserSocialProfile {
  id: string;
  user_id: string;
  bio?: string;
  website_url?: string;
  location?: string;
  avatar_url?: string;
  banner_url?: string;
  is_verified: boolean;
  user_type: 'user' | 'artist' | 'producer' | 'video_editor' | 'promoter' | 'manager' | 'photographer' | 'songwriter';
  social_links?: any;
  professional_info?: any;
  stats?: any;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  banner_image: string;
  project_type: string;
  genre: string[];
  funding_goal?: number;
  current_funding?: number;
  status: string;
  created_at: string;
}

interface FollowedArtist {
  id: string;
  artist_name: string;
  profile_photo: string;
  genre: string[];
  monthly_listeners?: number;
  total_streams?: number;
}

interface Follower {
  followerId: string;
  followerName: string;
  followerAvatar: string;
  followedAt: string;
}

const ProfileScreen = ({ navigation, route }: { navigation: any; route?: any }) => {
  const { user, logout } = useAuth();
  const forceRefresh = route?.params?.forceRefresh;
  
  // Production-ready state using the robust service
  const [productionProfile, setProductionProfile] = useState<ProductionProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeProfileType, setActiveProfileType] = useState<'user' | 'artist' | 'service'>('user');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [selectedPostImage, setSelectedPostImage] = useState<string>('');
  const [showPostOptions, setShowPostOptions] = useState<string | null>(null);
  const [isCheckingStripeStatus, setIsCheckingStripeStatus] = useState(false);
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [profilePicTimestamp, setProfilePicTimestamp] = useState(Date.now()); // Add timestamp for cache busting
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  // Removed stats state to fix errors
  
  // Derived state from production profile
  const userData = productionProfile?.user_data || null;
  const userProfile = productionProfile?.artist_profile || null;
  const serviceProvider = productionProfile?.service_provider || null;
  const isStripeVerified = Boolean(
    serviceProvider && (
      serviceProvider.can_accept_payments ||
      serviceProvider.stripe_verification_completed ||
      serviceProvider.onboarding_step === 3 ||
      serviceProvider.status === 'approved'
    )
  );
  const stripeCurrentStep = isStripeVerified
    ? 3
    : serviceProvider?.onboarding_step || 2;
  const followersCount = productionProfile?.stats?.followers_count || 0;
  const followingCount = productionProfile?.stats?.following_count || 0;
  const postsCount = productionProfile?.stats?.posts_count || 0;
  const posts = productionProfile?.posts || [];

  // Load profile data using production-ready service
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 ProfileScreen useEffect triggered for user:', user.id);
      console.log('🔄 Force refresh from route params:', forceRefresh);
      
      // First load from cache (instant), then refresh if needed
      loadProductionProfileData(forceRefresh || false);
      
      // Load notifications and requests in parallel (don't block profile)
      loadNotifications();
      loadUserRequests();
    }
  }, [user?.id, forceRefresh]);

  // Clear route params after handling forceRefresh
  useEffect(() => {
    if (forceRefresh && navigation) {
      navigation.setParams({ forceRefresh: undefined });
    }
  }, [forceRefresh, navigation]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Load profile picture when profile data changes
  useEffect(() => {
    const loadProfilePicture = async () => {
      if (!user?.id) return;
      
      try {
        console.log('🖼️ Loading profile picture for user:', user.id);
        console.log('📊 Profile data available:', {
          userData: !!userData,
          userProfile: !!userProfile,
          serviceProvider: !!serviceProvider,
          activeProfileType
        });
        
        let profilePicUrl = '';
        
        // Use the same logic as the Image component but with better debugging
        if (activeProfileType === 'artist' && userProfile?.profile_photo) {
          profilePicUrl = userProfile.profile_photo;
          console.log('✅ Using artist profile photo:', profilePicUrl);
        } else if (activeProfileType === 'service' && serviceProvider?.profile_photo) {
          profilePicUrl = serviceProvider.profile_photo;
          console.log('✅ Using service provider photo:', profilePicUrl);
        } else if (userData?.avatar) {
          profilePicUrl = userData.avatar;
          console.log('✅ Using user avatar:', profilePicUrl);
        } else {
          // Use ProfilePictureService as fallback
          profilePicUrl = await ProfilePictureService.getProfilePictureUrl(user.id);
          console.log('✅ Using ProfilePictureService result:', profilePicUrl);
        }
        
        // Add cache busting if it's not a placeholder and not null
        if (profilePicUrl && !profilePicUrl.includes('placeholder')) {
          const separator = profilePicUrl.includes('?') ? '&' : '?';
          profilePicUrl = `${profilePicUrl}${separator}t=${profilePicTimestamp}`;
        }
        
        setProfilePictureUrl(profilePicUrl);
        console.log('🎯 Final profile picture URL set:', profilePicUrl);
        
      } catch (error) {
        console.error('❌ Error loading profile picture:', error);
        // Fallback to null (will show default icon)
        setProfilePictureUrl(null);
      }
    };
    
    loadProfilePicture();
  }, [user?.id, userData, userProfile, serviceProvider, activeProfileType, profilePicTimestamp]);

  const loadProductionProfileData = async (refresh = false) => {
    try {
      // Debounce rapid refresh calls
      if (refresh && isDebouncing) {
        console.log('⏳ Debouncing refresh request');
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
        setIsDebouncing(true);
        setLoadingError(null);
        
        // Clear any existing debounce timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        
        // Clear debounce after 2 seconds
        debounceTimeoutRef.current = setTimeout(() => {
          setIsDebouncing(false);
          debounceTimeoutRef.current = null;
        }, 2000);
      } else if (!hasLoadedOnce && !productionProfile) {
        // Only show loading if we have NO data at all
        setIsLoading(true);
        setLoadingError(null);
      }

      if (!user?.id) return;

      console.log('🔄 Loading profile data (refresh:', refresh, ')...');
      
      const result = await ProductionProfileService.getCompleteUserProfile(
        user.id,
        refresh
      );

      if (result.error) {
        setLoadingError(result.error);
        console.warn('⚠️ Profile loading error:', result.error);
      } else {
        setLoadingError(null); // Clear any previous errors
      }

      setProductionProfile(result.profile);
      
      // Removed stats loading to fix errors
      
      // Only set active profile type on first load to prevent switching back to services
      if (!hasLoadedOnce) {
        if (result.profile.service_provider) {
          setActiveProfileType('service');
        } else if (result.profile.artist_profile) {
          setActiveProfileType('artist');
        } else {
          setActiveProfileType('user');
        }
      }

      console.log(`✓ Profile loaded successfully (from ${result.fromCache ? 'cache' : 'server'})`);
      console.log('📊 Profile stats:', result.profile.stats);
      console.log('🎤 Artist profile:', !!result.profile.artist_profile);
      console.log('🏢 Service provider:', !!result.profile.service_provider);
      
      // Debug: Log the actual profile data
      if (result.profile.artist_profile) {
        console.log('🎵 Artist name:', result.profile.artist_profile.artist_name);
        console.log('🎵 Artist bio:', result.profile.artist_profile.bio);
      }
      
      if (result.profile.service_provider) {
        console.log('🏢 Business name:', result.profile.service_provider.business_name);
        console.log('🏢 Provider type:', result.profile.service_provider.provider_type);
      }
      
      console.log('👥 Followers:', result.profile.stats.followers_count);
      console.log('👥 Following:', result.profile.stats.following_count);
      
      setHasLoadedOnce(true);
      setLastRefreshTime(Date.now());
      
    } catch (error) {
      console.error('❌ Critical error loading profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Critical error loading profile';
      setLoadingError(errorMessage);
      
      // Create minimal profile to prevent app crash
      setProductionProfile({
        user_data: {
          id: user?.id || '',
          name: user?.name || 'User',
          email: user?.email || '',
          role: user?.role || 'user',
          created_at: new Date().toISOString()
        },
        stats: { followers_count: 0, following_count: 0, posts_count: 0 },
        posts: [],
        last_updated: new Date().toISOString()
      });
      
      setHasLoadedOnce(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      // Don't clear debouncing here as it's handled by setTimeout
    }
  };

  const checkStripeStatus = useCallback(
    async (showAlerts = false) => {
      if (!serviceProvider?.stripe_account_id || isCheckingStripeStatus) {
        if (showAlerts && !serviceProvider?.stripe_account_id) {
          Alert.alert(
            'No Stripe Account',
            'Stripe account not found. Please complete the verification process first.'
          );
        }
        return;
      }

      try {
        setIsCheckingStripeStatus(true);
        const { stripeConnectService } = await import('../services/stripeConnectService');
        const statusResult = await stripeConnectService.checkAccountStatus(serviceProvider.stripe_account_id);

        if (statusResult.success && statusResult.status) {
          const status = statusResult.status;
          const canAccept = status.charges_enabled && status.payouts_enabled;

          const updatePayload: Record<string, any> = {
            stripe_onboarding_complete: status.details_submitted ?? true,
            stripe_charges_enabled: status.charges_enabled,
            stripe_payouts_enabled: status.payouts_enabled,
            can_accept_payments: canAccept,
            stripe_verification_completed: canAccept,
            onboarding_step: canAccept ? 3 : serviceProvider.onboarding_step || 2,
            stripe_account_status: canAccept ? 'complete' : 'pending',
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('service_providers')
            .update(updatePayload)
            .eq('id', serviceProvider.id);

          if (updateError) {
            console.error('Error updating Stripe status:', updateError);
          } else {
            setProductionProfile(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                service_provider: prev.service_provider
                  ? { ...prev.service_provider, ...updatePayload }
                  : { ...((serviceProvider as any) || {}), ...updatePayload },
              };
            });
          }

          if (canAccept) {
            loadProductionProfileData(false);
            if (showAlerts) {
              Alert.alert(
                '✅ Verification Complete!',
                'Your Stripe account is fully verified. You can now list services and accept payments!'
              );
            }
          } else if (showAlerts) {
            const missing: string[] = [];
            if (!status.charges_enabled) missing.push('Charges');
            if (!status.payouts_enabled) missing.push('Payouts');

            Alert.alert(
              '⏳ Verification In Progress',
              `Your Stripe verification is still being processed.\n\nMissing: ${missing.join(', ') || 'Stripe review'}\n\nPlease wait a few minutes and check again. Stripe typically processes verification within 5-10 minutes.`
            );
          }
        } else if (showAlerts) {
          Alert.alert(
            'Unable to Check Status',
            statusResult.error || 'Could not verify your Stripe account status. Please try again later.'
          );
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error);
        if (showAlerts) {
          Alert.alert('Error', 'Failed to check Stripe status. Please try again.');
        }
      } finally {
        setIsCheckingStripeStatus(false);
      }
    },
    [serviceProvider?.stripe_account_id, serviceProvider?.id, serviceProvider?.onboarding_step, supabase, loadProductionProfileData, isCheckingStripeStatus]
  );

  // Quick refresh for stats and posts
  const refreshData = async () => {
    try {
      if (!user?.id) return;
      await loadProductionProfileData(true);
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.warn('⚠️ Failed to refresh data:', error);
    }
  };

  // Load user posts separately (not included in optimized profile)
  const loadUserPosts = async () => {
    try {
      if (!user?.id) return;
      
      const userPosts = await postsService.getUserPosts(user.id, 50, 0, user.id);
      console.log('Loaded user posts:', userPosts.length);
      // Posts are now handled by optimized profile service
    } catch (error) {
      console.log('Could not fetch posts:', error);
    }
  };

  // Removed loadServiceProviderStats function to fix errors

  // Load notifications separately
  const loadNotifications = async () => {
    try {
      if (!user?.id) return;
      
      const userNotifications = await NotificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
      
      const unreadCount = await NotificationService.getUnreadCount(user.id);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.log('Could not fetch notifications:', error);
      setNotifications([]);
      setUnreadNotificationCount(0);
    }
  };

  // Load user's project requests
  const loadUserRequests = async () => {
    try {
      if (!user?.id) return;
      
      const requests = await projectRequestService.getUserProjectRequests(user.id);
      setUserRequests(requests);
      console.log('✅ Loaded user requests:', requests.length);
    } catch (error) {
      console.error('Error loading user requests:', error);
      setUserRequests([]);
    }
  };

  // Load unread message count
  const loadUnreadMessageCount = async () => {
    try {
      if (!user?.id) return;
      const conversations = await messagingService.getUserConversations(user.id);
      const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadMessageCount(totalUnread);
      console.log('✅ Unread message count loaded:', totalUnread);
    } catch (error) {
      console.error('❌ Error loading unread message count:', error);
      setUnreadMessageCount(0);
    }
  };

  // Track last focus time to prevent over-fetching
  const lastFocusTimeRef = useRef<number>(0);
  const FOCUS_DEBOUNCE_MS = 2000; // Minimum 2 seconds between focus refreshes

  // Handle navigation focus with useFocusEffect - with proper debouncing
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTimeRef.current;
      
      // Skip if focus happened too recently (debounce)
      if (timeSinceLastFocus < FOCUS_DEBOUNCE_MS) {
        return;
      }
      lastFocusTimeRef.current = now;
      
      if (!user?.id) return;
      
      // First load - fetch everything
      if (!hasLoadedOnce && !productionProfile) {
        loadProductionProfileData(false);
        loadUserRequests();
        loadUnreadMessageCount();
        return;
      }
      
      // Subsequent focuses - only refresh if data is stale (5+ minutes old)
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      if (lastRefreshTime < fiveMinutesAgo) {
        loadProductionProfileData(true);
      }
      
      // Refresh requests and messages (but only once per focus due to debounce)
      loadUserRequests();
      loadUnreadMessageCount();

      // Check Stripe status if needed
      if (serviceProvider?.stripe_account_id && !isStripeVerified) {
        checkStripeStatus(false);
      }
    }, [user?.id, hasLoadedOnce, productionProfile, serviceProvider?.stripe_account_id, isStripeVerified])
  );

  useEffect(() => {
    if (!serviceProvider?.stripe_account_id || isStripeVerified) {
      return;
    }

    const initialTimeout = setTimeout(() => {
      checkStripeStatus(false);
    }, 3000);

    const interval = setInterval(() => {
      checkStripeStatus(false);
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [serviceProvider?.stripe_account_id, isStripeVerified, checkStripeStatus]);

  useEffect(() => {
    if (serviceProvider?.stripe_account_id && !isStripeVerified) {
      const timeout = setTimeout(() => checkStripeStatus(false), 3000);
      const interval = setInterval(() => {
        checkStripeStatus(false);
      }, 5 * 60 * 1000); // every 5 minutes

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }
  }, [serviceProvider?.stripe_account_id, isStripeVerified, checkStripeStatus]);

  // Service provider refresh is now handled by the optimized profile service
  // No need for separate refresh logic

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout }
      ]
    );
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleComment = (postId: string, postImage?: string) => {
    setSelectedPostId(postId);
    setSelectedPostImage(postImage || '');
    setCommentModalVisible(true);
  };

  const handlePostPress = (post: any) => {
    // Navigate to detailed post view with user profile data
    navigation.navigate('PostDetail', { 
      postId: post.id,
      post: post as any,
      userProfile: {
        name: userData?.name || userProfile?.artist_name || 'Unknown User',
        role: userData?.role || 'User',
        avatar: userData?.avatar
      },
      onPostUpdate: (updatedPost: any) => {
        // Refresh profile data to get updated posts
        loadProductionProfileData(true);
      }
    });
  };

  const handleEditPost = (post: any) => {
    // Navigate to edit post screen with post data
    navigation.navigate('CreatePost', { 
      editMode: true, 
      postData: post 
    });
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await postsService.deletePost(postId);
              if (success) {
                // Refresh profile data to get updated posts
                loadProductionProfileData(true);
                Alert.alert('Success', 'Post deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  const handlePostLongPress = (postId: string) => {
    setShowPostOptions(postId);
  };

const handleDeleteNotification = (notification: ProjectNotification) => {
  Alert.alert(
    'Delete Notification',
    'Remove this notification from your list?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await NotificationService.deleteNotification(notification.id);
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
            if (!notification.is_read) {
              setUnreadNotificationCount(prev => Math.max(0, prev - 1));
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete notification. Please try again.');
          }
        },
      },
    ],
  );
};

  const handleEditProfilePicture = () => {
    Alert.alert(
      'Change Profile Picture',
      'Select how you want to update your profile picture',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Camera',
          onPress: () => {
            takeProfilePhoto();
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            pickProfileImage();
          },
        },
      ]
    );
  };

  const takeProfilePhoto = async () => {
    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickProfileImage = async () => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      console.log('Starting profile picture upload for user:', user.id);
      console.log('Image URI:', imageUri);

      // Ensure the profile-pictures bucket exists
      await ensureProfilePicturesBucketExists();

      // Create a unique filename
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Simplified path structure

      console.log('Upload path:', filePath);

      // For React Native, we need to read the file properly
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Upload using the ArrayBuffer
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', `Failed to upload image: ${uploadError.message}`);
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('Public URL generated:', publicUrl);

      // Update profile based on active profile type
      let updateResult;
      if (activeProfileType === 'artist' && userProfile?.id) {
        console.log('Updating artist profile with new photo');
        updateResult = await supabase
          .from('artist_profiles')
          .update({ profile_photo: publicUrl })
          .eq('id', userProfile.id);
      } else if (activeProfileType === 'service' && serviceProvider?.id) {
        console.log('Updating service provider profile with new photo');
        updateResult = await supabase
          .from('service_providers')
          .update({ profile_photo: publicUrl })
          .eq('id', serviceProvider.id);
      } else {
        console.log('Updating user profile with new avatar');
        updateResult = await supabase
          .from('users')
          .update({ avatar: publicUrl })
          .eq('id', user.id);
      }

      if (updateResult?.error) {
        console.error('Error updating profile:', updateResult.error);
        Alert.alert('Error', `Failed to update profile: ${updateResult.error.message}`);
        return;
      }

      console.log('Profile updated successfully');

      // Update the timestamp to force image refresh
      setProfilePicTimestamp(Date.now());

      // Update the production profile data directly
      if (productionProfile) {
        const updatedProfile = { ...productionProfile };
        
        if (activeProfileType === 'artist' && updatedProfile.artist_profile) {
          updatedProfile.artist_profile = { ...updatedProfile.artist_profile, profile_photo: publicUrl };
        } else if (activeProfileType === 'service' && updatedProfile.service_provider) {
          updatedProfile.service_provider = { ...updatedProfile.service_provider, profile_photo: publicUrl };
        }
        
        // Also update user data avatar if it exists
        if (updatedProfile.user_data) {
          updatedProfile.user_data = { ...updatedProfile.user_data, avatar: publicUrl };
        }
        
        setProductionProfile(updatedProfile);
      }

      // Update timestamp to force re-render of profile picture
      setProfilePicTimestamp(Date.now());
      
      // Update the profile picture URL immediately
      setProfilePictureUrl(`${publicUrl}?t=${Date.now()}`);
      
      // Refresh profile data to show the new picture
      await loadProductionProfileData(true);
      Alert.alert('Success', 'Profile picture updated successfully!');
      
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ensureProfilePicturesBucketExists = async () => {
    try {
      console.log('Checking if profile-pictures bucket exists...');
      
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        // Don't throw error, bucket might exist but we can't list it
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === 'profile-pictures');
      
      if (bucketExists) {
        console.log('Profile-pictures bucket already exists');
        return;
      }

      console.log('Creating profile-pictures bucket...');
      
      // Create bucket with production-ready settings
      const { error: createError } = await supabase.storage.createBucket('profile-pictures', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error('Error creating profile-pictures bucket:', createError);
        // Don't throw error - bucket might exist but we can't create it due to permissions
        // The upload will still work if the bucket exists
      } else {
        console.log('Profile-pictures bucket created successfully');
      }
    } catch (error) {
      console.error('Error ensuring profile-pictures bucket exists:', error);
      // Don't throw error, continue with upload attempt
    }
  };

  const handleDeleteServiceListing = (postId: string) => {
    Alert.alert(
      'Delete Service Listing',
      'Are you sure you want to delete this service listing? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user?.id); // Ensure user can only delete their own posts

              if (error) {
                console.error('Error deleting service listing:', error);
                Alert.alert('Error', 'Failed to delete service listing');
                return;
              }

              // Refresh profile data to get updated posts
              loadProductionProfileData(true);
              Alert.alert('Success', 'Service listing deleted successfully');
            } catch (error) {
              console.error('Error deleting service listing:', error);
              Alert.alert('Error', 'Failed to delete service listing');
            }
          },
        },
      ]
    );
  };

  const filteredPosts = posts.filter(post => {
    if (activeProfileType === 'user') {
      // Show basic user posts
      return post.post_type === 'post' ||
             post.post_type === 'text' ||
             post.post_type === 'general' ||
             post.post_type === 'user_post' ||
             post.post_type === 'content';
    } else if (activeProfileType === 'artist') {
      // Show artist-related posts (general posts and music-specific content)
      return post.post_type === 'post' ||
             post.post_type === 'text' ||
             post.post_type === 'general' ||
             post.post_type === 'user_post' ||
             post.post_type === 'content' ||
             post.post_type === 'future_release' || 
             post.post_type === 'producer_sample' || 
             post.post_type === 'artist_profile';
    } else {
      // Show service provider posts
      return post.post_type === 'service_offer' || 
             post.post_type === 'video_portfolio' ||
             (post.post_type as string) === 'service_post';
    }
  });

  // Separate portfolio posts (showcase) from service listings (for sale)
  const portfolioPosts = posts.filter(post => 
    activeProfileType === 'service' && (
      post.post_type === 'producer_sample' || 
      post.post_type === 'video_portfolio'
    )
  );

  const servicePosts = posts.filter(post => 
    activeProfileType === 'service' && (
      post.post_type === 'service_offer' ||
      (post.post_type as string) === 'service_post'
    )
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProductionProfileData(true)}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      showsVerticalScrollIndicator={false}
    >
      {/* Compact Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.headerIconButton} 
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
          {unreadMessageCount > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{unreadMessageCount > 9 ? '9+' : unreadMessageCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Compact Profile Header - Instagram Style */}
      <View style={styles.profileHeader}>
        {/* Avatar + Stats Row */}
        <View style={styles.avatarStatsRow}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfilePicture}>
            {profilePictureUrl ? (
              <Image
                source={{ uri: profilePictureUrl }}
                style={styles.avatar}
                key={`profile-pic-${activeProfileType}-${profilePicTimestamp}`}
                onError={() => setProfilePictureUrl(null)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(userData?.name || user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="add" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLbl}>Posts</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{followersCount}</Text>
              <Text style={styles.statLbl}>Followers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{followingCount}</Text>
              <Text style={styles.statLbl}>Following</Text>
            </View>
          </View>
        </View>

        {/* Name & Bio - Compact */}
        <View style={styles.nameSection}>
          <Text style={styles.displayName}>
            {activeProfileType === 'artist' 
              ? (userProfile?.artist_name || userData?.name || user?.name || 'User')
              : activeProfileType === 'service'
              ? (serviceProvider?.business_name || userData?.name || user?.name || 'User')
              : (userData?.name || user?.name || 'User')
            }
          </Text>
          <Text style={styles.roleTag}>
            {activeProfileType === 'artist' 
              ? (userData?.role || user?.role || 'Listener')
              : activeProfileType === 'service'
              ? (serviceProvider?.provider_type || 'Service Provider')
              : (userData?.role || user?.role || 'Listener')
            }
          </Text>
          {(activeProfileType === 'artist' && userProfile?.bio) && (
            <Text style={styles.bioText} numberOfLines={2}>{userProfile.bio}</Text>
          )}
          {(activeProfileType === 'service' && serviceProvider?.description) && (
            <Text style={styles.bioText} numberOfLines={2}>{serviceProvider.description}</Text>
          )}
        </View>

        {/* Profile Type Tabs - Minimal */}
        <View style={styles.typeTabs}>
          <TouchableOpacity 
            style={[styles.typeTab, activeProfileType === 'user' && styles.typeTabActive]}
            onPress={() => setActiveProfileType('user')}
          >
            <Text style={[styles.typeTabText, activeProfileType === 'user' && styles.typeTabTextActive]}>User</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeTab, activeProfileType === 'artist' && styles.typeTabActive]}
            onPress={() => setActiveProfileType('artist')}
          >
            <Text style={[styles.typeTabText, activeProfileType === 'artist' && styles.typeTabTextActive]}>Artist</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeTab, activeProfileType === 'service' && styles.typeTabActive]}
            onPress={() => setActiveProfileType('service')}
          >
            <Text style={[styles.typeTabText, activeProfileType === 'service' && styles.typeTabTextActive]}>Service</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Button - Compact */}
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            if (activeProfileType === 'user') {
              // Navigate to ProfileSettings in the parent navigator (MainStack) to hide tab header
              navigation.getParent()?.navigate('ProfileSettings');
            } else if (activeProfileType === 'artist') {
              navigation.navigate('ArtistProfile');
            } else if (activeProfileType === 'service') {
              if (serviceProvider) {
                navigation.navigate('CreateServiceProvider', { editMode: true, serviceProvider });
              } else {
                navigation.navigate('CreateServiceProvider');
              }
            }
          }}
        >
          <Text style={styles.editButtonText}>
            {activeProfileType === 'user' ? 'Edit Profile' : 
             activeProfileType === 'artist' ? (userProfile ? 'Edit Artist' : 'Create Artist') :
             (serviceProvider ? 'Edit Service' : 'Create Service')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Compact Stats Card - Only for Artist/Service */}
      {((activeProfileType === 'artist' && userProfile) || (activeProfileType === 'service' && serviceProvider)) && (
        <View style={styles.statsCard}>
          {activeProfileType === 'artist' && userProfile ? (
            <>
              <View style={styles.miniStat}>
                <Ionicons name="musical-notes" size={16} color="#3B82F6" />
                <Text style={styles.miniStatValue}>{formatLargeNumber(userProfile.total_streams || 0)}</Text>
                <Text style={styles.miniStatLabel}>Streams</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.miniStat}>
                <Ionicons name="people" size={16} color="#3B82F6" />
                <Text style={styles.miniStatValue}>{formatLargeNumber(userProfile.monthly_listeners || 0)}</Text>
                <Text style={styles.miniStatLabel}>Listeners</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.miniStat}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={styles.miniStatValue}>{formatLargeNumber(userProfile.spotify_followers || 0)}</Text>
                <Text style={styles.miniStatLabel}>Spotify</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.miniStat}>
                <Ionicons name="briefcase" size={16} color="#3B82F6" />
                <Text style={styles.miniStatValue}>0</Text>
                <Text style={styles.miniStatLabel}>Projects</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.miniStat}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.miniStatValue}>0.0</Text>
                <Text style={styles.miniStatLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.miniStat}>
                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                <Text style={styles.miniStatValue}>0</Text>
                <Text style={styles.miniStatLabel}>Reviews</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Quick Actions Row - Changes based on active profile type */}
      <View style={styles.quickActionsRow}>
        {activeProfileType === 'user' && (
          <>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>My Requests</Text>
              {userRequests.length > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{userRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.getParent()?.navigate('Notifications') || navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>Notifications</Text>
              {unreadNotificationCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('MyOrders')}
            >
              <Ionicons name="receipt-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>Orders</Text>
            </TouchableOpacity>
          </>
        )}

        {activeProfileType === 'artist' && (
          <>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.getParent()?.navigate('Notifications') || navigation.navigate('Notifications')}
            >
              <Ionicons name="heart-outline" size={18} color="#EF4444" />
              <Text style={styles.quickActionText}>Activity</Text>
              {unreadNotificationCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ArtistProfile')}
            >
              <Ionicons name="musical-notes-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>My Music</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('BrowseArtists')}
            >
              <Ionicons name="trending-up-outline" size={18} color="#F59E0B" />
              <Text style={styles.quickActionText}>Insights</Text>
            </TouchableOpacity>
          </>
        )}

        {activeProfileType === 'service' && (
          <>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ServiceProviderRequests')}
            >
              <Ionicons name="mail-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>Requests</Text>
              {notifications.filter(n => n.type === 'project_request').length > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{notifications.filter(n => n.type === 'project_request').length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.getParent()?.navigate('Notifications') || navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={18} color="#3B82F6" />
              <Text style={styles.quickActionText}>Notifications</Text>
              {unreadNotificationCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>{unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('ServiceProviderDashboard')}
            >
              <Ionicons name="wallet-outline" size={18} color="#F59E0B" />
              <Text style={styles.quickActionText}>Earnings</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Compact Requests Preview - Only show on User tab */}
      {activeProfileType === 'user' && userRequests.length > 0 && (
        <View style={styles.compactSection}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactTitle}>My Service Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyOrders')}>
              <Text style={styles.compactLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {userRequests.slice(0, 2).map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.compactItem}
              onPress={() => navigation.navigate('ProjectRequestDetails', { requestId: request.id })}
            >
              <View style={styles.compactItemLeft}>
                <Text style={styles.compactItemTitle} numberOfLines={1}>{request.service_type}</Text>
                <Text style={styles.compactItemSub}>{request.provider_business_name || 'Provider'}</Text>
              </View>
              <View style={[styles.compactStatus, { backgroundColor: request.status === 'accepted' ? '#3B82F615' : request.status === 'pending' ? '#F59E0B15' : '#6B728015' }]}>
                <Text style={[styles.compactStatusText, { color: request.status === 'accepted' ? '#3B82F6' : request.status === 'pending' ? '#F59E0B' : '#6B7280' }]}>{request.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Compact Notifications Preview - Only show on User tab */}
      {activeProfileType === 'user' && notifications.length > 0 && (
        <View style={styles.compactSection}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.compactLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {notifications.slice(0, 2).map((notification) => (
            <TouchableOpacity 
              key={notification.id}
              style={styles.compactItem}
              onPress={() => {
                if (!notification.is_read) {
                  NotificationService.markAsRead(notification.id);
                  setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                  setUnreadNotificationCount(prev => Math.max(0, prev - 1));
                }
                navigation.navigate('ProjectRequestDetails', { requestId: notification.project_request_id });
              }}
            >
              <View style={styles.compactItemLeft}>
                <Text style={[styles.compactItemTitle, !notification.is_read && styles.compactItemUnread]} numberOfLines={1}>{notification.title}</Text>
                <Text style={styles.compactItemSub} numberOfLines={1}>{notification.message}</Text>
              </View>
              {!notification.is_read && <View style={styles.compactUnreadDot} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Service Provider Incoming Requests Preview - Only show on Service tab */}
      {activeProfileType === 'service' && serviceProvider && notifications.filter(n => n.type === 'project_request').length > 0 && (
        <View style={styles.compactSection}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactTitle}>Client Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ServiceProviderRequests')}>
              <Text style={styles.compactLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {notifications.filter(n => n.type === 'project_request').slice(0, 2).map((notification) => (
            <TouchableOpacity 
              key={notification.id}
              style={styles.compactItem}
              onPress={() => {
                if (!notification.is_read) {
                  NotificationService.markAsRead(notification.id);
                  setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                  setUnreadNotificationCount(prev => Math.max(0, prev - 1));
                }
                navigation.navigate('ProjectRequestDetails', { requestId: notification.project_request_id });
              }}
            >
              <View style={styles.compactItemLeft}>
                <Text style={[styles.compactItemTitle, !notification.is_read && styles.compactItemUnread]} numberOfLines={1}>{notification.title}</Text>
                <Text style={styles.compactItemSub} numberOfLines={1}>{notification.message}</Text>
              </View>
              {!notification.is_read && <View style={styles.compactUnreadDot} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Artist Activity Preview - Only show on Artist tab */}
      {activeProfileType === 'artist' && notifications.length > 0 && (
        <View style={styles.compactSection}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.compactLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {notifications.slice(0, 2).map((notification) => (
            <TouchableOpacity 
              key={notification.id}
              style={styles.compactItem}
              onPress={() => {
                if (!notification.is_read) {
                  NotificationService.markAsRead(notification.id);
                  setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                  setUnreadNotificationCount(prev => Math.max(0, prev - 1));
                }
                if (notification.project_request_id) {
                  navigation.navigate('ProjectRequestDetails', { requestId: notification.project_request_id });
                }
              }}
            >
              <View style={styles.compactItemLeft}>
                <Text style={[styles.compactItemTitle, !notification.is_read && styles.compactItemUnread]} numberOfLines={1}>{notification.title}</Text>
                <Text style={styles.compactItemSub} numberOfLines={1}>{notification.message}</Text>
              </View>
              {!notification.is_read && <View style={styles.compactUnreadDot} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content Section */}
      <View style={styles.postsSection}>

        {/* Content based on active profile type */}
        <View style={styles.postsGrid}>
          {activeProfileType === 'user' ? (
            // User Content - Basic posts
            filteredPosts.length > 0 ? (
              <View style={styles.postsContainer}>
                <Text style={styles.sectionTitleCenter}>Your Posts</Text>
                <View style={styles.postsGridContainer}>
                  {filteredPosts.map((post, index) => (
                    <TouchableOpacity 
                      key={post.id} 
                      style={styles.postItem}
                      onPress={() => handlePostPress(post)}
                      onLongPress={() => handlePostLongPress(post.id)}
                    >
                      <View style={styles.postContentWrapper}>
                        {post.media_urls && post.media_urls.length > 0 ? (
                          post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.avi') ? (
                            <View style={styles.postVideoPreview}>
                              <Ionicons name="videocam" size={24} color="#3B82F6" />
                              <Ionicons name="play-circle" size={16} color="#FFFFFF" style={styles.playIconSmall} />
                            </View>
                          ) : post.media_urls[0].includes('.mp3') || post.media_urls[0].includes('.wav') || post.media_urls[0].includes('.m4a') ? (
                            <View style={styles.postAudioPreview}>
                              <Ionicons name="musical-notes" size={24} color="#3B82F6" />
                              <Ionicons name="play-circle" size={16} color="#FFFFFF" style={styles.playIconSmall} />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: post.media_urls[0] }}
                              style={styles.postImage}
                              resizeMode="cover"
                            />
                          )
                        ) : (
                          <View style={styles.postPlaceholder}>
                            <Ionicons name="chatbubble" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        
                        {/* Post Options Menu */}
                        {showPostOptions === post.id && (
                          <View style={styles.postOptionsMenu}>
                            <TouchableOpacity 
                              style={styles.postOptionButton}
                              onPress={() => {
                                setShowPostOptions(null);
                                handleEditPost(post);
                              }}
                            >
                              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.postOptionText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.postOptionButton, { borderBottomWidth: 0 }]}
                              onPress={() => {
                                setShowPostOptions(null);
                                handleDeletePost(post.id);
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              <Text style={[styles.postOptionText, { color: '#EF4444' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.noPostsContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <Ionicons name="camera-outline" size={40} color="#52525B" />
                </View>
                <Text style={styles.noPostsText}>No posts yet</Text>
                <Text style={styles.noPostsSubtext}>Share your music journey with the world</Text>
                <TouchableOpacity 
                  style={styles.createFirstPostButton}
                  onPress={() => navigation.navigate('Create')}
                >
                  <Text style={styles.createFirstPostButtonText}>Create Your First Post</Text>
                </TouchableOpacity>
              </View>
            )
          ) : activeProfileType === 'artist' ? (
            // Artist Content - Artist posts and music content
            filteredPosts.length > 0 ? (
              <View style={styles.postsContainer}>
                <Text style={styles.sectionTitleCenter}>Artist Posts</Text>
                <View style={styles.postsGridContainer}>
                  {filteredPosts.map((post, index) => (
                    <TouchableOpacity 
                      key={post.id} 
                      style={styles.postItem}
                      onPress={() => handlePostPress(post)}
                      onLongPress={() => handlePostLongPress(post.id)}
                    >
                      <View style={styles.postContentWrapper}>
                        {post.media_urls && post.media_urls.length > 0 ? (
                          post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.avi') ? (
                            <View style={styles.postVideoPreview}>
                              <Ionicons name="videocam" size={24} color="#3B82F6" />
                              <Ionicons name="play-circle" size={16} color="#FFFFFF" style={styles.playIconSmall} />
                            </View>
                          ) : post.media_urls[0].includes('.mp3') || post.media_urls[0].includes('.wav') || post.media_urls[0].includes('.m4a') ? (
                            <View style={styles.postAudioPreview}>
                              <Ionicons name="musical-notes" size={24} color="#3B82F6" />
                              <Ionicons name="play-circle" size={16} color="#FFFFFF" style={styles.playIconSmall} />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: post.media_urls[0] }}
                              style={styles.postImage}
                              resizeMode="cover"
                            />
                          )
                        ) : (
                          <View style={styles.postPlaceholder}>
                            <Ionicons name="musical-notes" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        
                        {/* Post Options Menu */}
                        {showPostOptions === post.id && (
                          <View style={styles.postOptionsMenu}>
                            <TouchableOpacity 
                              style={styles.postOptionButton}
                              onPress={() => {
                                setShowPostOptions(null);
                                handleEditPost(post);
                              }}
                            >
                              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.postOptionText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.postOptionButton, { borderBottomWidth: 0 }]}
                              onPress={() => {
                                setShowPostOptions(null);
                                handleDeletePost(post.id);
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              <Text style={[styles.postOptionText, { color: '#EF4444' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.noPostsContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <Ionicons name="musical-notes-outline" size={40} color="#3B82F6" />
                </View>
                <Text style={styles.noPostsText}>No artist content yet</Text>
                <Text style={styles.noPostsSubtext}>Share your music and connect with fans</Text>
                <TouchableOpacity 
                  style={styles.createFirstPostButton}
                  onPress={() => navigation.navigate('Create')}
                >
                  <Text style={styles.createFirstPostButtonText}>Create Artist Content</Text>
                </TouchableOpacity>
              </View>
            )
          ) : activeProfileType === 'service' ? (
            // Services Tab Content
            serviceProvider ? (
              <View style={styles.servicesContainer}>
                <View style={styles.serviceProviderCard}>
                  <View style={styles.serviceHeader}>
                    <View style={styles.serviceIconContainer}>
                      <Ionicons name="briefcase" size={28} color="#3B82F6" />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{serviceProvider.business_name}</Text>
                      <Text style={styles.serviceType}>{serviceProvider.provider_type?.replace('_', ' ')}</Text>
                      <Text style={styles.serviceStatus}>
                        Status: <Text style={[styles.statusText, { 
                          color: serviceProvider.status === 'approved' ? '#34C759' : 
                                serviceProvider.status === 'pending' ? '#FFB340' : '#FF3B30' 
                        }]}>
                          {serviceProvider.status ? serviceProvider.status.charAt(0).toUpperCase() + serviceProvider.status.slice(1) : 'Unknown'}
                        </Text>
                      </Text>
                    </View>
                  </View>
                  
                  {serviceProvider.description && (
                    <Text style={styles.serviceDescription}>{serviceProvider.description}</Text>
                  )}
                  
                  <View style={styles.serviceActions}>
                    <TouchableOpacity 
                      style={styles.editServiceButton}
                      onPress={() => navigation.navigate('CreateServiceProvider', { 
                        editMode: true, 
                        serviceProvider: serviceProvider,
                        onUpdate: () => {
                          // Refresh service provider data after update
                          loadProductionProfileData(true);
                        }
                      })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.editServiceText}>Edit Service</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.viewRequestsButton}
                      onPress={() => navigation.navigate('ServiceProviderRequests')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.viewRequestsText}>View Requests</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Onboarding Progress - Show if Stripe not verified */}
                {!isStripeVerified && (
                  <OnboardingProgress
                    currentStep={stripeCurrentStep}
                    businessInfoCompleted={true}
                    stripeVerificationCompleted={isStripeVerified}
                    onCheckStatus={() => checkStripeStatus(true)}
                    onCompleteStripe={async () => {
                      if (serviceProvider.stripe_onboarding_url) {
                        try {
                          const canOpen = await Linking.canOpenURL(serviceProvider.stripe_onboarding_url);
                          if (canOpen) {
                            await Linking.openURL(serviceProvider.stripe_onboarding_url);
                            Alert.alert(
                              'Complete Stripe Verification',
                              'A browser window has opened with Stripe\'s secure verification form.\n\nPlease complete all steps including:\n• Photo ID verification\n• SSN for tax reporting\n• Bank account details\n• Address verification\n\nOnce complete, return to the app and refresh your profile.',
                              [{ text: 'Got It' }]
                            );
                          } else {
                            throw new Error('Cannot open URL');
                          }
                        } catch (error) {
                          Alert.alert(
                            'Unable to Open Browser',
                            `Please copy this link and open it in your browser:\n\n${serviceProvider.stripe_onboarding_url}`,
                            [{ text: 'OK' }]
                          );
                        }
                      } else {
                        // No Stripe URL - need to create Stripe account
                        Alert.alert(
                          '⚠️ Stripe Setup Required',
                          'Your Stripe Connect account needs to be created. This will:\n\n1. Create your Stripe account\n2. Generate a secure verification link\n3. Open the browser for identity verification\n\nWould you like to proceed?',
                          [
                            {
                              text: 'Create Stripe Account',
                              onPress: async () => {
                                try {
                                  // Import at runtime to avoid circular dependency
                                  const { stripeConnectService } = await import('../services/stripeConnectService');
                                  
                                  Alert.alert('Creating Account...', 'Please wait while we set up your Stripe Connect account.');
                                  
                                  const result = await stripeConnectService.createConnectAccount(
                                    serviceProvider.id,
                                    serviceProvider.email || user?.email || '',
                                    serviceProvider.business_name,
                                    'US'
                                  );
                                  
                                  if (result.success && result.onboardingUrl) {
                                    const canOpen = await Linking.canOpenURL(result.onboardingUrl);
                                    if (canOpen) {
                                      await Linking.openURL(result.onboardingUrl);
                                      Alert.alert(
                                        'Complete Stripe Verification',
                                        'A browser window has opened. Please complete all verification steps and return to the app.',
                                        [{ text: 'Got It', onPress: () => loadProductionProfileData(true) }]
                                      );
                                    }
                                  } else {
                                    Alert.alert('Error', result.error || 'Failed to create Stripe account. Please try again or contact support.');
                                  }
                                } catch (error) {
                                  console.error('Error creating Stripe account:', error);
                                  Alert.alert('Error', 'Failed to create Stripe account. Please contact support.');
                                }
                              }
                            },
                            { text: 'Cancel', style: 'cancel' }
                          ]
                        );
                      }
                    }}
                  />
                )}
                
                {/* Service Provider Actions - Show when verified */}
                {isStripeVerified && (
                  <View style={styles.toolsSection}>
                    {/* Divider */}
                    <View style={styles.toolsDivider}>
                      <View style={styles.toolsDividerLine} />
                      <Text style={styles.toolsDividerText}>Provider Tools</Text>
                      <View style={styles.toolsDividerLine} />
                    </View>
                    
                    {/* Services */}
                    <TouchableOpacity 
                      style={styles.toolCard}
                      onPress={() => navigation.navigate('ManageServices', { serviceProvider })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIconBox, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="pricetags" size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.toolContent}>
                        <Text style={styles.toolTitle}>Services</Text>
                        <Text style={styles.toolDesc}>Create & manage listings</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                    
                    {/* Portfolio */}
                    <TouchableOpacity 
                      style={styles.toolCard}
                      onPress={() => navigation.navigate('ManagePortfolio', { serviceProvider })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIconBox, { backgroundColor: '#3B82F615' }]}>
                        <Ionicons name="images" size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.toolContent}>
                        <Text style={styles.toolTitle}>Portfolio</Text>
                        <Text style={styles.toolDesc}>Showcase your work</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                    
                    {/* Dashboard */}
                    <TouchableOpacity 
                      style={styles.toolCard}
                      onPress={() => navigation.navigate('ServiceProviderDashboard')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIconBox, { backgroundColor: '#F59E0B15' }]}>
                        <Ionicons name="stats-chart" size={20} color="#F59E0B" />
                      </View>
                      <View style={styles.toolContent}>
                        <Text style={styles.toolTitle}>Dashboard</Text>
                        <Text style={styles.toolDesc}>Analytics & insights</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                    
                    {/* Requests */}
                    <TouchableOpacity 
                      style={styles.toolCard}
                      onPress={() => navigation.navigate('ServiceProviderRequests')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.toolIconBox, { backgroundColor: '#EF444415' }]}>
                        <Ionicons name="mail" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.toolContent}>
                        <Text style={styles.toolTitle}>Requests</Text>
                        <Text style={styles.toolDesc}>Manage projects</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Service Posts (if any) */}
                {servicePosts.length > 0 && (
                  <View style={styles.servicePostsSection}>
                    <Text style={styles.serviceSectionTitle}>Service Listings</Text>
                    <View style={styles.servicePostsGrid}>
                      {servicePosts.map((post, index) => (
                        <TouchableOpacity 
                          key={post.id} 
                          style={styles.postItem}
                          onLongPress={() => handlePostLongPress(post.id)}
                          onPress={() => handlePostPress(post)}
                        >
                          <View style={styles.postContentWrapper}>
                            <View style={styles.postPlaceholder}>
                              <Ionicons name="briefcase" size={32} color="#3B82F6" />
                            </View>
                            <View style={styles.postOverlay}>
                              <Text style={styles.postTitle} numberOfLines={2}>
                                {post.title || post.description || 'Service Post'}
                              </Text>
                              <Text style={styles.postType}>
                                {post.post_type?.replace('_', ' ') || 'Post'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noServiceContainer}>
                <View style={styles.emptyStateIconContainer}>
                  <Ionicons name="briefcase-outline" size={40} color="#3B82F6" />
                </View>
                <Text style={styles.noServiceTitle}>No Service Profile</Text>
                <Text style={styles.noServiceSubtext}>
                  Create a service provider profile to offer your services
                </Text>
                <TouchableOpacity 
                  style={styles.createServiceButton}
                  onPress={() => navigation.navigate('CreateServiceProvider')}
                >
                  <Text style={styles.createServiceButtonText}>Create Service Profile</Text>
                </TouchableOpacity>
              </View>
            )
          ) : 
            // Posts Tab Content
            filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <TouchableOpacity 
                key={post.id} 
                style={styles.postItem}
                onLongPress={() => handlePostLongPress(post.id)}
                onPress={() => handlePostPress(post)}
              >
                <View style={styles.postContentWrapper}>
                  {post.media_urls && post.media_urls.length > 0 ? (
                    post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.avi') ? (
                      // Video preview
                      <View style={styles.postVideoPreview}>
                        <Ionicons name="videocam" size={32} color="#3B82F6" />
                        <Ionicons name="play-circle" size={20} color="#FFFFFF" style={styles.playIconSmall} />
                      </View>
                    ) : post.media_urls[0].includes('.mp3') || post.media_urls[0].includes('.wav') || post.media_urls[0].includes('.m4a') ? (
                      // Audio preview
                      <View style={styles.postAudioPreview}>
                        <Ionicons name="musical-notes" size={32} color="#3B82F6" />
                        <Ionicons name="play-circle" size={20} color="#FFFFFF" style={styles.playIconSmall} />
                      </View>
                    ) : (
                      // Image
                      <Image
                        source={{ uri: post.media_urls[0] }}
                        style={styles.postImage}
                      />
                    )
                  ) : (
                    <View style={styles.postPlaceholder}>
                      <Ionicons 
                        name={
                          post.post_type === 'post' || 
                          post.post_type === 'text' || 
                          post.post_type === 'general' || 
                          post.post_type === 'user_post' || 
                          post.post_type === 'content' ? 'chatbubble' :
                          post.post_type === 'future_release' ? 'musical-notes' :
                          post.post_type === 'producer_sample' ? 'disc' :
                          post.post_type === 'service_offer' ? 'briefcase' :
                          'chatbubble'
                        } 
                        size={32} 
                        color="#3B82F6" 
                      />
                    </View>
                  )}
                  <View style={styles.postOverlay}>
                    <Text style={styles.postTitle} numberOfLines={2}>
                      {post.title || post.description || 'Untitled Post'}
                    </Text>
                    <Text style={styles.postType}>
                      {post.post_type?.replace('_', ' ') || 'Post'}
                    </Text>
                  </View>
                  
                  {/* Post Options Menu */}
                  {showPostOptions === post.id && (
                    <View style={styles.postOptionsMenu}>
                      <TouchableOpacity 
                        style={styles.postOptionButton}
                        onPress={() => {
                          setShowPostOptions(null);
                          handleEditPost(post);
                        }}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.postOptionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.postOptionButton, { borderBottomWidth: 0 }]}
                        onPress={() => {
                          setShowPostOptions(null);
                          handleDeletePost(post.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={[styles.postOptionText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noPostsContainer}>
              <View style={styles.emptyStateIconContainer}>
                <Ionicons name="camera-outline" size={40} color="#52525B" />
              </View>
              <Text style={styles.noPostsText}>No posts yet</Text>
              <Text style={styles.noPostsSubtext}>
                Share your music journey with the world
              </Text>
              <TouchableOpacity 
                style={styles.createPostButton}
                onPress={() => navigation.navigate('Create')}
              >
                <Text style={styles.createPostButtonText}>Create Your First Post</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={selectedPostId}
        postImage={selectedPostImage}
      />

      {/* Overlay to close post options */}
      {showPostOptions && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={() => setShowPostOptions(null)}
          activeOpacity={1}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  // ===== NEW COMPACT STYLES =====
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1F1F1F',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '600',
    color: '#3B82F6',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    minWidth: 60,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  statLbl: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  nameSection: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  roleTag: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginTop: 4,
  },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeTabActive: {
    backgroundColor: '#3B82F6',
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: 8,
  },
  // ===== LEGACY STYLES (kept for compatibility) =====
  dmButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dmBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  dmBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  logoutButtonText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '500',
  },
  profileInfo: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 15,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  editProfilePicButton: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
    letterSpacing: 0.2,
    lineHeight: 16,
    marginTop: 4,
  },
  bioSection: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A78BFA',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  // Apple-style segmented control tabs
  profileTypeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#15151C',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 0,
    marginBottom: 20,
    marginTop: 12,
    gap: 2,
  },
  profileTypeButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
  },
  activeProfileTypeButton: {
    backgroundColor: '#3B82F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  profileTypeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    lineHeight: 20,
  },
  activeProfileTypeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  professionalInfo: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderWidth: 1,
    borderColor: '#1DB954',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  professionalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  professionalText: {
    fontSize: 12,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0,
  },
  serviceProviderButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0,
    flex: 0,
    width: 44,
    height: 44,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  disabledButtonText: {
    color: '#6B7280',
  },
  serviceProviderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  // Clean dashboard-style stats card
  musicStatsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#15151C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  postsSection: {
    paddingTop: 12,
  },
  postsTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginBottom: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  // ===== COMPACT QUICK ACTIONS =====
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  quickActionBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  quickActionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ===== COMPACT SECTIONS =====
  compactSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactLink: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  compactItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  compactItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  compactItemUnread: {
    fontWeight: '600',
  },
  compactItemSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  compactUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 1,
  },
  postItem: {
    width: (width - 4) / 3,
    height: (width - 4) / 3,
    margin: 1,
    position: 'relative',
  },
  postContentWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  postVideoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    position: 'relative',
  },
  postAudioPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
    position: 'relative',
  },
  playIconSmall: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  postTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  postType: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 8,
    fontWeight: '400',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  noPostsContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPostsText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginTop: 16,
  },
  noPostsSubtext: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
    lineHeight: 20,
  },
  createPostButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  createPostButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  postOptionsMenu: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 1001,
    minWidth: 120,
  },
  postOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  postOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  requestsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  requestCardContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  requestProviderName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  requestBudget: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: '#FBBF24',
  },
  statusBadgeResponded: {
    backgroundColor: '#3B82F6',
  },
  statusBadgeAccepted: {
    backgroundColor: '#3B82F6',
  },
  statusBadgeDeclined: {
    backgroundColor: '#EF4444',
  },
  statusBadgeCancelled: {
    backgroundColor: '#6B7280',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  notificationsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  ordersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ordersButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationsList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  unreadNotificationItem: {
    backgroundColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationEmoji: {
    fontSize: 20,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  notificationActionsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationDeleteButton: {
    marginLeft: 8,
    padding: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginTop: 4,
  },
  // Services Tab Styles
  servicesContainer: {
    width: '100%',
  },
  // Business identity card with left accent bar
  serviceProviderCard: {
    backgroundColor: '#15151C',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 0,
    borderColor: 'transparent',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  serviceType: {
    fontSize: 15,
    color: '#A78BFA',
    textTransform: 'capitalize',
    marginBottom: 6,
    fontWeight: '500',
  },
  serviceStatus: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statusText: {
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 15,
    color: '#AEAEB2',
    lineHeight: 21,
    marginBottom: 18,
  },
  // Paired action buttons with clear hierarchy
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editServiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  editServiceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewRequestsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    minHeight: 44,
  },
  viewRequestsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  toolsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  toolsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1F1F1F',
  },
  toolsDividerText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  toolIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  toolDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  servicePostsSection: {
    marginTop: 16,
  },
  serviceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  servicePostsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noServiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  noServiceTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 8,
  },
  noServiceSubtext: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 280,
  },
  createServiceButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minHeight: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  createServiceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  sectionTitleCenter: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  postsContainer: {
    paddingHorizontal: 20,
  },
  postsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  servicePostsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceCreatePostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  serviceCreatePostButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noServicePostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noServicePostsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noServicePostsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  createFirstPostButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  createFirstPostButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
  quickActionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  quickActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  serviceListingsSection: {
    marginTop: 16,
  },
  serviceListingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  serviceListingsGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  serviceListingCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  serviceListingContent: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceListingMedia: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  serviceListingImage: {
    width: '100%',
    height: '100%',
  },
  serviceVideoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  serviceAudioPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  serviceListingPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  serviceListingInfo: {
    flex: 1,
  },
  serviceListingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceListingDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 18,
  },
  serviceListingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceListingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceListingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editListingButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  deleteListingButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  noServiceListingsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noServiceListingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noServiceListingsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  createFirstListingButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstListingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#F59E0B',
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProfileScreen;