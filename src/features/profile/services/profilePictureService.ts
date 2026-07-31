import { supabase } from '../../../lib/supabase';

export interface ProfilePictureData {
  avatar: string | null;
  displayName: string;
  userType: 'user' | 'artist' | 'service_provider';
  isVerified: boolean;
}

/**
 * Utility service for consistent profile picture loading across the app
 * Handles fallbacks and ensures all components show profile pictures consistently
 */
export class ProfilePictureService {
  
  /**
   * Validate and process profile picture URL
   */
  private static async processProfilePictureUrl(url: string | null): Promise<string | null> {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }

    // First check if it's a valid URL format
    try {
      const urlObj = new URL(url);
      
      // Only allow http/https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.warn('⚠️ Invalid protocol for profile picture URL:', url);
        return null;
      }
      
      // If it's a Supabase storage URL, try to get a signed URL for better access
      if (urlObj.host.includes('supabase.co') && urlObj.pathname.includes('/storage/v1/object/')) {
        console.log('🔗 Processing Supabase storage URL:', url);
        
        try {
          // Extract bucket and file path from Supabase URL
          const pathParts = urlObj.pathname.split('/');
          const objectIndex = pathParts.indexOf('object');
          
          if (objectIndex !== -1 && pathParts.length > objectIndex + 2) {
            const bucket = pathParts[objectIndex + 2]; // Skip 'object' and 'public'/'private'
            const filePath = pathParts.slice(objectIndex + 3).join('/');
            
            console.log('📁 Extracted bucket:', bucket, 'path:', filePath);
            
            // Try to get a signed URL for better reliability
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, 3600); // Valid for 1 hour
            
            if (!signedUrlError && signedUrlData?.signedUrl) {
              console.log('✅ Generated signed URL for profile picture');
              return signedUrlData.signedUrl;
            } else {
              console.log('⚠️ Could not create signed URL, using original:', signedUrlError?.message);
              return url; // Fallback to original URL
            }
          }
        } catch (supabaseError) {
          console.warn('⚠️ Error processing Supabase URL, using original:', supabaseError);
          return url; // Fallback to original URL
        }
      }
      
      // For other valid URLs, return as-is
      return url;
      
    } catch (urlError) {
      console.warn('⚠️ Invalid URL format, rejecting:', url, urlError.message);
      return null;
    }
  }
  
  /**
   * Get profile picture and display info for a user
   * Prioritizes artist profile photos, then service provider, then user avatars
   */
  static async getProfilePicture(userId: string): Promise<ProfilePictureData> {
    try {
      console.log('🔍 Getting profile picture for user:', userId);
      
      // First try to get user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, avatar')
        .eq('id', userId)
        .maybeSingle();

      let avatar: string | null = null;
      let displayName = userData?.name || 'Unknown User';
      let userType: 'user' | 'artist' | 'service_provider' = 'user';
      let isVerified = false;

      console.log('👤 User data:', { name: userData?.name, avatar: userData?.avatar ? 'Has avatar' : 'No avatar' });

      // Check for artist profile (highest priority for photos)
      try {
        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('artist_name, profile_photo, is_verified, status')
          .eq('user_id', userId)
          .maybeSingle();

        if (artistProfile) {
          console.log('🎨 Found artist profile:', { 
            name: artistProfile.artist_name, 
            status: artistProfile.status,
            hasPhoto: !!artistProfile.profile_photo 
          });
          
          // If approved artist profile, use artist name and verification status
          if (artistProfile.status === 'approved') {
            displayName = artistProfile.artist_name;
            userType = 'artist';
            isVerified = artistProfile.is_verified || false;
          }
          
          // Always use artist profile photo if available (even for non-approved profiles)
          if (artistProfile.profile_photo) {
            avatar = await this.processProfilePictureUrl(artistProfile.profile_photo);
          }
        }
      } catch (error) {
        console.log('ℹ️ No artist profile found for user:', userId);
      }

      // Check for service provider profile if no artist profile photo
      if (!avatar && userType === 'user') {
        try {
          const { data: serviceProfile } = await supabase
            .from('service_providers')
            .select('business_name, profile_photo, status')
            .eq('user_id', userId)
            .maybeSingle();

          if (serviceProfile) {
            console.log('🏢 Found service provider profile:', { 
              name: serviceProfile.business_name, 
              status: serviceProfile.status,
              hasPhoto: !!serviceProfile.profile_photo 
            });
            
            userType = 'service_provider';
            
            if (serviceProfile.status === 'approved') {
              displayName = serviceProfile.business_name;
            }
            
            if (serviceProfile.profile_photo) {
              avatar = await this.processProfilePictureUrl(serviceProfile.profile_photo);
            }
          }
        } catch (error) {
          console.log('ℹ️ No service provider profile found for user:', userId);
        }
      }

      // Use user avatar as final fallback
      if (!avatar && userData?.avatar) {
        console.log('👤 Using user avatar as fallback');
        avatar = await this.processProfilePictureUrl(userData.avatar);
      }

      const result = {
        avatar,
        displayName,
        userType,
        isVerified
      };

      console.log('🎯 Profile picture result:', { 
        hasAvatar: !!avatar, 
        displayName, 
        userType, 
        isVerified 
      });

      return result;

    } catch (error) {
      console.error('❌ Error getting profile picture:', error);
      
      // Return safe fallback
      return {
        avatar: null,
        displayName: 'Unknown User',
        userType: 'user',
        isVerified: false
      };
    }
  }

  /**
   * Get profile picture URL only (lightweight version)
   */
  static async getProfilePictureUrl(userId: string): Promise<string | null> {
    const profileData = await this.getProfilePicture(userId);
    return profileData.avatar;
  }

  /**
   * Cache profile pictures for better performance
   */
  private static profileCache = new Map<string, { data: ProfilePictureData; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get profile picture with caching
   */
  static async getCachedProfilePicture(userId: string): Promise<ProfilePictureData> {
    const cached = this.profileCache.get(userId);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📋 Using cached profile picture for:', userId);
      return cached.data;
    }

    console.log('🔄 Loading fresh profile picture for:', userId);
    const profileData = await this.getProfilePicture(userId);
    
    this.profileCache.set(userId, {
      data: profileData,
      timestamp: Date.now()
    });

    return profileData;
  }

  /**
   * Clear cache for a specific user
   */
  static clearCache(userId: string): void {
    this.profileCache.delete(userId);
    console.log('🗑️ Cleared profile picture cache for:', userId);
  }

  /**
   * Clear all cached profile pictures
   */
  static clearAllCache(): void {
    this.profileCache.clear();
    console.log('🗑️ Cleared all profile picture cache');
  }
}

export default ProfilePictureService;
