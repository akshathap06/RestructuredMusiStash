import { supabase } from '../../../lib/supabase';

export interface ArtistAccount {
  id: string;
  artist_name: string;
  bio?: string;
  genre?: string[];
  profile_photo?: string;
  is_approved: boolean;
  approval_notes?: string;
  approved_at?: string;
  created_at: string;
}

export class ArtistAccountService {
  // Check if user already has an artist account
  static async userHasArtistAccount(userId: string): Promise<boolean> {
    try {
      // Direct query instead of RPC function
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Error checking artist account:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking artist account:', error);
      return false;
    }
  }

  // Get user's existing artist account details
  static async getUserArtistAccount(userId: string): Promise<ArtistAccount | null> {
    try {
      // Direct query instead of RPC function
      const { data, error } = await supabase
        .from('artist_profiles')
        .select(`
          id,
          artist_name,
          bio,
          genre,
          profile_photo,
          is_approved,
          approval_notes,
          approved_at,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error getting artist account:', error);
        return null;
      }

      if (data) {
        return {
          id: data.id,
          artist_name: data.artist_name,
          bio: data.bio,
          genre: data.genre,
          profile_photo: data.profile_photo,
          is_approved: data.is_approved || true, // Default to true if column doesn't exist
          approval_notes: data.approval_notes,
          approved_at: data.approved_at,
          created_at: data.created_at
        } as ArtistAccount;
      }

      return null;
    } catch (error) {
      console.error('Error getting artist account:', error);
      return null;
    }
  }

  // Create a new artist account
  static async createArtistAccount(artistData: {
    user_id: string;
    artist_name: string;
    bio?: string;
    genre?: string[];
    profile_photo?: string;
    banner_photo?: string;
    is_band?: boolean;
    band_type?: string;
    location?: string;
    biography?: string;
    musical_style?: string;
    influences?: string;
    monthly_listeners?: number;
    total_streams?: number;
    spotify_profile_url?: string;
    instagram_handle?: string;
    twitter_handle?: string;
    youtube_channel_id?: string;
    website_url?: string;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // CRITICAL: Ensure user exists in users table before creating artist profile
      // During OAuth signup, user creation might have timed out or failed
      console.log('🔍 Checking if user exists in database...');
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', artistData.user_id)
        .single();

      if (!existingUser || checkError) {
        console.log('🆕 User not found in database, creating now...');
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: artistData.user_id,
            name: 'User',
            email: '',
            role: 'listener',
          });

        if (createUserError && createUserError.code !== '23505') {
          console.error('Failed to create user in database:', createUserError);
          return {
            success: false,
            error: 'Failed to create your account. Please try logging out and back in.'
          };
        }
        console.log('✅ User created in database successfully');
      } else {
        console.log('✅ User already exists in database');
      }

      // Check if user already has an artist account
      const hasAccount = await this.userHasArtistAccount(artistData.user_id);
      if (hasAccount) {
        return {
          success: false,
          error: 'You already have an artist account. Only one artist account per user is allowed.'
        };
      }

      const { data, error } = await supabase
        .from('artist_profiles')
        .insert([{
          user_id: artistData.user_id,
          artist_name: artistData.artist_name,
          bio: artistData.bio,
          biography: artistData.biography,
          genre: artistData.genre,
          // Legacy base64 columns were purged from prod (49MB) — always write URLs.
          profile_photo_url: artistData.profile_photo,
          banner_photo_url: artistData.banner_photo,
          is_band: artistData.is_band || false,
          band_type: artistData.band_type,
          location: artistData.location,
          musical_style: artistData.musical_style,
          influences: artistData.influences,
          monthly_listeners: artistData.monthly_listeners || 0,
          total_streams: artistData.total_streams || 0,
          spotify_profile_url: artistData.spotify_profile_url,
          instagram_handle: artistData.instagram_handle,
          twitter_handle: artistData.twitter_handle,
          youtube_channel_id: artistData.youtube_channel_id,
          website_url: artistData.website_url,
          status: 'approved',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating artist account:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error creating artist account:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while creating your artist account.'
      };
    }
  }

  // Update existing artist account
  static async updateArtistAccount(artistId: string, updates: {
    artist_name?: string;
    bio?: string;
    genre?: string[];
    profile_photo?: string;
    banner_photo?: string;
    is_band?: boolean;
    band_type?: string;
    location?: string;
    biography?: string;
    musical_style?: string;
    influences?: string;
    monthly_listeners?: number;
    total_streams?: number;
    spotify_profile_url?: string;
    instagram_handle?: string;
    twitter_handle?: string;
    youtube_channel_id?: string;
    website_url?: string;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Filter out any fields that don't exist in the database schema
      // This prevents PGRST204 errors for columns that don't exist
      const allowedFields = [
        'artist_name', 'bio', 'biography', 'genre', 'profile_photo', 'banner_photo',
        'is_band', 'band_type', 'location', 'musical_style', 'influences',
        'monthly_listeners', 'total_streams', 'spotify_profile_url',
        'instagram_handle', 'twitter_handle', 'youtube_channel_id', 'website_url'
      ];
      
      const filteredUpdates: any = {};
      for (const key in updates) {
        if (allowedFields.includes(key) && updates[key as keyof typeof updates] !== undefined) {
          filteredUpdates[key] = updates[key as keyof typeof updates];
        }
      }
      
      const { data, error } = await supabase
        .from('artist_profiles')
        .update({
          ...filteredUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', artistId)
        .select()
        .single();

      if (error) {
        console.error('Error updating artist account:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error updating artist account:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while updating your artist account.'
      };
    }
  }
}
