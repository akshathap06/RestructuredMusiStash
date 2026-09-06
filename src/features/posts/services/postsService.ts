import { supabase } from '../../../lib/supabase';

export interface Post {
  id: string;
  user_id: string;
  post_type: 'post' | 'text' | 'general' | 'user_post' | 'content' | 'artist_profile' | 'producer_sample' | 'future_release' | 'video_portfolio' | 'service_offer';
  title?: string;
  description?: string;
  content: any; // JSONB content
  media_urls?: string[];
  tags?: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields from join
  user_name?: string;
  user_avatar?: string;
  user_type?: string;
  is_verified?: boolean;
  like_count?: number;
  user_liked?: boolean;
}

export interface CreatePostData {
  post_type: Post['post_type'];
  title?: string;
  description?: string;
  content?: any;
  media_urls?: string[];
  tags?: string[];
  // Additional fields for different post types
  track_title?: string;
  artist_name?: string;
  album_name?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
  like_count?: number;
  user_liked?: boolean;
  replies?: Comment[];
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface CreateCommentData {
  post_id: string;
  content: string;
}

export class PostsService {
  /**
   * Fix media URLs to ensure they work properly
   */
  private fixMediaUrl(url: string): string {
    if (!url || !url.trim()) return '';
    
    // Already a proper URL
    if (url.startsWith('https://') && url.includes('.supabase.co/storage/v1/object/public/')) {
      return url;
    }
    
    // Remove localhost URLs (broken on mobile)
    if (url.includes('localhost')) {
      return '';
    }
    
    // Fix relative URLs 
    if (url.startsWith('/storage/v1/object/public/')) {
      const supabaseUrl = supabase.supabaseUrl.replace('https://', '').replace('.supabase.co', '');
      return `https://${supabaseUrl}.supabase.co${url}`;
    }
    
    // Return original if it looks like a valid URL, empty if not
    if (url.startsWith('http')) {
      return url;
    }
    
    return '';
  }
  /**
   * Check if posts table exists
   */
  private async checkPostsTable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.log('Posts table does not exist:', error);
      return false;
    }
  }

  /**
   * Create a new post
   */
  async createPost(userId: string, postData: CreatePostData): Promise<Post | null> {
    try {
      console.log('Creating post for user:', userId, postData);

      // Check if posts table exists
      const postsTableExists = await this.checkPostsTable();
      if (!postsTableExists) {
        console.log('Posts table does not exist, creating mock post');
        // Return a mock post for now
        return {
          id: `mock-${Date.now()}`,
          user_id: userId,
          post_type: postData.post_type,
          title: postData.title || 'Mock Post',
          description: postData.description || '',
          content: postData.content || {},
          media_urls: postData.media_urls || [],
          tags: postData.tags || [],
          is_featured: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Post;
      }

      // Prepare content based on post type
      let content = postData.content || {};
      
      // Add music-specific content for different post types
      if (postData.track_title) {
        content.track_title = postData.track_title;
      }
      if (postData.artist_name) {
        content.artist_name = postData.artist_name;
      }
      if (postData.album_name) {
        content.album_name = postData.album_name;
      }

      const insertData = {
        user_id: userId,
        post_type: postData.post_type,
        title: postData.title,
        description: postData.description,
        content: content,
        media_urls: postData.media_urls || [],
        tags: postData.tags || [],
        is_featured: false,
        is_active: true,
        post_status: 'pending', // Set to pending, edge function will update to approved/rejected
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to create post with data:', insertData);
      
      const { data, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating post:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Post created successfully:', data);

      // Call the moderation edge function to check content and update post_status
      let moderationStatus: 'approved' | 'rejected' | 'pending' = 'pending';
      try {
        // Extract text from content.text or description
        const caption = typeof content === 'object' && content?.text 
          ? content.text 
          : (postData.description || '');

        const { data: moderationResult, error: moderationError } = await supabase.functions.invoke('post-filter', {
          body: {
            post_id: data.id,
            caption: caption,
            image_urls: postData.media_urls || [],
          },
        });

        if (moderationError) {
          console.error('Error calling post-filter edge function:', moderationError);
          // Don't fail the post creation if moderation fails, just log the error
        } else {
          console.log('Post moderation completed:', moderationResult);
          if (moderationResult?.post_status) {
            moderationStatus = moderationResult.post_status;
          }
        }
      } catch (moderationError) {
        console.error('Error calling post-filter edge function:', moderationError);
        // Don't fail the post creation if moderation fails, just log the error
      }

      // Add moderation status to the returned post object
      return { ...data, _moderationStatus: moderationStatus } as Post & { _moderationStatus?: string };
    } catch (error) {
      console.error('Failed to create post:', error);
      return null;
    }
  }

  /**
   * Get posts by user ID
   */
  async getUserPosts(userId: string, limit = 20, offset = 0, currentUserId?: string): Promise<Post[]> {
    try {
      // Check if posts table exists
      const postsTableExists = await this.checkPostsTable();
      if (!postsTableExists) {
        console.log('Posts table does not exist, returning empty array');
        return [];
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('post_status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching user posts:', error);
        console.error('Error details:', error);
        // Don't throw error, return empty array instead
        return [];
      }

      // public.users is own-row only, so the author's display fields come from
      // the public_profiles view (id, name, avatar).
      const { data: authorRow } = await supabase
        .from('public_profiles')
        .select('id, name, avatar')
        .eq('id', userId)
        .maybeSingle();
      const author = (authorRow as { name?: string; avatar?: string } | null) ?? null;

      // Get like counts and user liked status for all posts
      const posts = await Promise.all(data?.map(async (post) => {
        // Get like count for this post
        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if current user liked this post
        let userLiked = false;
        if (currentUserId) {
          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .single();
          userLiked = !!userLike;
        }

        // Check if user has an artist profile OR service provider profile for display name
        let displayName = author?.name;
        let userType = 'user';
        let isVerified = false;
        let userAvatar: string | null | undefined = author?.avatar;

        try {
          // For service posts, prioritize service provider business name
          if (post.post_type === 'service_offer' || post.post_type === 'video_portfolio') {
            const { data: serviceProvider } = await supabase
              .from('service_providers')
              .select('business_name, profile_photo, is_verified, status')
              .eq('user_id', post.user_id)
              .eq('status', 'approved')
              .single();

            if (serviceProvider) {
              displayName = serviceProvider.business_name;
              userType = 'service_provider';
              isVerified = serviceProvider.is_verified || false;
              if (serviceProvider.profile_photo) {
                userAvatar = serviceProvider.profile_photo;
              }
            }
          } else {
            // For other posts, try to get approved artist profile
            const { data: artistProfile } = await supabase
              .from('artist_profiles')
              .select('artist_name, profile_photo, is_verified, status')
              .eq('user_id', post.user_id)
              .eq('status', 'approved')
              .single();

            if (artistProfile) {
              displayName = artistProfile.artist_name;
              userType = 'artist';
              isVerified = artistProfile.is_verified || false;
              if (artistProfile.profile_photo) {
                userAvatar = artistProfile.profile_photo;
              }
            } else {
              // If no approved artist profile, try to get any artist profile for the photo
              const { data: anyArtistProfile } = await supabase
                .from('artist_profiles')
                .select('profile_photo')
                .eq('user_id', post.user_id)
                .maybeSingle();
                
              if (anyArtistProfile?.profile_photo) {
                userAvatar = anyArtistProfile.profile_photo;
              }
            }
          }
        } catch (error) {
          // No profile or error, use default user info
          console.log('No profile found for user:', post.user_id);
        }

        // Final fallback: if still no avatar, use null (will show default icon)
        if (!userAvatar) {
          userAvatar = null;
          console.log('🔄 No avatar found for user:', displayName, 'Will use ProfilePictureService fallback');
        } else {
          console.log('✅ Avatar found for user:', displayName, 'URL:', userAvatar);
        }

        // Combine and validate media URLs
        let mediaUrls = post.media_urls || [];
        
        // Add image_url if it exists and isn't already in media_urls
        if (post.image_url && !mediaUrls.includes(post.image_url)) {
          mediaUrls = [post.image_url, ...mediaUrls];
        }
        
        // Add music_url if it exists and isn't already in media_urls
        if (post.music_url && !mediaUrls.includes(post.music_url)) {
          mediaUrls = [...mediaUrls, post.music_url];
        }

        // Fix and validate media URLs
        mediaUrls = mediaUrls
          .map((url: string) => this.fixMediaUrl(url))
          .filter((url: string) => url && url.trim() !== '');

        return {
          ...post,
          user_name: displayName,
          user_avatar: userAvatar,
          user_type: userType,
          is_verified: isVerified,
          like_count: likeCount || 0,
          user_liked: userLiked,
          media_urls: mediaUrls,
        };
      }) || []);

      return posts;
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      return [];
    }
  }

  /**
   * Get all posts (feed) with optimized media handling
   */
  async getAllPosts(limit = 20, offset = 0, userId?: string): Promise<Post[]> {
    try {
      // Try to use optimized view first, fallback to regular posts table
      let { data, error } = await supabase
        .from('posts_with_optimized_media')
        .select('*')
        .eq('is_active', true)
        .eq('post_status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Fallback to regular posts table if view doesn't exist
      if (error && error.code === '42P01') {
        const result = await supabase
          .from('posts')
          .select('*')
          .eq('is_active', true)
          .eq('post_status', 'approved')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      // public.users is own-row only, so display fields for every author in the
      // feed come from the public_profiles view in one batched lookup.
      const authorIds = Array.from(
        new Set((data ?? []).map((p: any) => p.user_id).filter(Boolean)),
      );
      const authorById = new Map<string, { name?: string; avatar?: string }>();
      if (authorIds.length > 0) {
        const { data: authorRows } = await supabase
          .from('public_profiles')
          .select('id, name, avatar')
          .in('id', authorIds);
        for (const a of (authorRows as any[] | null) ?? []) {
          authorById.set(a.id, { name: a.name ?? undefined, avatar: a.avatar ?? undefined });
        }
      }

      // Get like counts and user liked status for all posts
      const posts = await Promise.all(data?.map(async (post) => {
        const author = authorById.get(post.user_id) ?? null;

        // Get like count for this post
        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if current user liked this post
        let userLiked = false;
        if (userId) {
          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();
          userLiked = !!userLike;
        }

        // Check if user has an artist profile for privacy and profile photo
        let displayName = author?.name;
        let userType = 'user';
        let isVerified = false;
        let userAvatar: string | null | undefined = author?.avatar;

        try {
          // First try to get approved artist profile
          const { data: artistProfile } = await supabase
            .from('artist_profiles')
            .select('artist_name, profile_photo, is_verified, status')
            .eq('user_id', post.user_id)
            .eq('status', 'approved')
            .single();

          if (artistProfile) {
            displayName = artistProfile.artist_name;
            userType = 'artist';
            isVerified = artistProfile.is_verified || false;
            if (artistProfile.profile_photo) {
              userAvatar = artistProfile.profile_photo;
            }
          } else {
            // If no approved artist profile, try to get any artist profile for the photo
            const { data: anyArtistProfile } = await supabase
              .from('artist_profiles')
              .select('profile_photo')
              .eq('user_id', post.user_id)
              .maybeSingle();
              
            if (anyArtistProfile?.profile_photo) {
              userAvatar = anyArtistProfile.profile_photo;
            }
          }
        } catch (error) {
          // No artist profile or error, use default user info
          console.log('No artist profile found for user:', post.user_id);
        }

        // Final fallback: if still no avatar, use null (will show default icon)
        if (!userAvatar) {
          userAvatar = null;
          console.log('🔄 No avatar found for user:', displayName, 'Will use ProfilePictureService fallback');
        } else {
          console.log('✅ Avatar found for user:', displayName, 'URL:', userAvatar);
        }

        // Combine and validate media URLs
        let mediaUrls = post.media_urls || [];
        
        // Add image_url if it exists and isn't already in media_urls
        if (post.image_url && !mediaUrls.includes(post.image_url)) {
          mediaUrls = [post.image_url, ...mediaUrls];
        }
        
        // Add music_url if it exists and isn't already in media_urls
        if (post.music_url && !mediaUrls.includes(post.music_url)) {
          mediaUrls = [...mediaUrls, post.music_url];
        }

        // Fix and validate media URLs
        mediaUrls = mediaUrls
          .map((url: string) => this.fixMediaUrl(url))
          .filter((url: string) => url && url.trim() !== '');

        return {
          ...post,
          user_name: displayName,
          user_avatar: userAvatar,
          user_type: userType,
          is_verified: isVerified,
          like_count: likeCount || 0,
          user_liked: userLiked,
          media_urls: mediaUrls,
        };
      }) || []);

      return posts;
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      return [];
    }
  }

  /**
   * Get user feed (posts from followed users + featured posts)
   */
  async getUserFeed(userId: string, limit = 20, offset = 0): Promise<Post[]> {
    try {
      // For now, return all posts with like count and user liked status. Later we can implement the follow logic
      return this.getAllPosts(limit, offset, userId);
    } catch (error) {
      console.error('Failed to fetch user feed:', error);
      return [];
    }
  }

  /**
   * Helper to safely parse content from database (handles string or object)
   */
  private parseContent(content: any): any {
    if (!content) return {};
    
    // If it's already an object, check if it's corrupted (character-indexed from string spread)
    if (typeof content === 'object') {
      // Check if it looks like a corrupted character-indexed object (has numeric keys like "0", "1", etc.)
      const keys = Object.keys(content);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        // This is a corrupted object from spreading a string, try to reconstruct it
        console.log('⚠️ Detected corrupted character-indexed content, attempting to fix...');
        try {
          const reconstructedString = keys.sort((a, b) => parseInt(a) - parseInt(b))
            .map(k => content[k])
            .join('');
          const parsed = JSON.parse(reconstructedString);
          console.log('✅ Successfully reconstructed content from corrupted data');
          return parsed;
        } catch (e) {
          console.error('❌ Failed to reconstruct corrupted content:', e);
          // Return the service_info if it exists at top level (fallback)
          if (content.service_info && typeof content.service_info === 'object') {
            return { service_info: content.service_info };
          }
          return {};
        }
      }
      // Normal object, return as-is
      return content;
    }
    
    // If it's a string, parse it
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse content string:', e);
        return {};
      }
    }
    
    return {};
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, updates: Partial<CreatePostData>): Promise<Post | null> {
    try {
      // If updating content, we need to merge with existing content for JSONB fields
      let finalUpdates = { ...updates };
      
      if (updates.content) {
        // Get the existing post to merge content
        const { data: existingPost } = await supabase
          .from('posts')
          .select('content')
          .eq('id', postId)
          .single();
        
        // Parse existing content safely (handles strings and corrupted data)
        const existingContent = this.parseContent(existingPost?.content);
        const existingServiceInfo = existingContent?.service_info || {};
        
        console.log('📖 Existing content (parsed):', {
          existingContent,
          existingServiceInfo,
        });
        
        // Build the new content object (DON'T spread existingContent if it might be corrupted)
        // Just use the service_info from existing and merge with new updates
        finalUpdates.content = {
          service_info: {
            ...existingServiceInfo,
            ...updates.content.service_info,
          },
        };
        
        console.log('🔄 Merged content for update:', {
          existingServiceInfo,
          updatesServiceInfo: updates.content.service_info,
          merged: finalUpdates.content,
        });
      }
      
      const updateData = {
        ...finalUpdates,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Final update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating post:', error);
        throw error;
      }

      console.log('✅ Post updated successfully. Response:', {
        id: data.id,
        content: data.content,
        service_info: data.content?.service_info,
      });

      return data;
    } catch (error) {
      console.error('Failed to update post:', error);
      return null;
    }
  }


  /**
   * Get posts by type
   */
  async getPostsByType(postType: Post['post_type'], limit = 20, offset = 0): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey (
            name,
            avatar
          )
        `)
        .eq('post_type', postType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching posts by type:', error);
        throw error;
      }

      // Transform the data to match our interface
      const posts = data?.map(post => ({
        ...post,
        user_name: post.users?.name,
        user_avatar: post.users?.avatar,
        user_type: 'user', // Default to user type
        is_verified: false, // Default to false
        like_count: 0, // We'll implement likes later
        user_liked: false,
      })) || [];

      return posts;
    } catch (error) {
      console.error('Failed to fetch posts by type:', error);
      return [];
    }
  }

  /**
   * Create a new comment
   */
  async createComment(userId: string, commentData: CreateCommentData): Promise<Comment | null> {
    try {
      console.log('Creating comment for user:', userId, commentData);

      // Check if comments table exists
      const commentsTableExists = await this.checkCommentsTable();
      if (!commentsTableExists) {
        console.log('Comments table does not exist, creating mock comment');
        // Return a mock comment for now
        return {
          id: `mock-comment-${Date.now()}`,
          post_id: commentData.post_id,
          user_id: userId,
          content: commentData.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Comment;
      }

      // For now, we'll trust the userId passed from the authenticated context
      // In a production app, you'd want to verify the token here

      const insertData = {
        post_id: commentData.post_id,
        user_id: userId,
        content: commentData.content,
        comment_status: 'pending', // Set to pending, edge function will update to approved/rejected
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Attempting to create comment with data:', insertData);
      
      const { data, error } = await supabase
        .from('comments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating comment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // If it's an RLS error, provide helpful guidance
        if (error.code === '42501') {
          console.error('RLS Policy Error: The row-level security policy is blocking this operation.');
          console.error('Please run the fix-rls-policies.sql or disable-rls-temp.sql in your Supabase dashboard.');
        }
        
        throw error;
      }

      console.log('Comment created successfully:', data);

      // Call the moderation edge function to check content and update comment_status
      let moderationStatus: 'approved' | 'rejected' | 'pending' = 'pending';
      try {
        const { data: moderationResult, error: moderationError } = await supabase.functions.invoke('comment-filter', {
          body: {
            comment_id: data.id,
            caption: commentData.content,
          },
        });

        if (moderationError) {
          console.error('Error calling comment-filter edge function:', moderationError);
          // Don't fail the comment creation if moderation fails, just log the error
        } else {
          console.log('Comment moderation completed:', moderationResult);
          if (moderationResult?.comment_status) {
            moderationStatus = moderationResult.comment_status;
          }
        }
      } catch (moderationError) {
        console.error('Error calling comment-filter edge function:', moderationError);
        // Don't fail the comment creation if moderation fails, just log the error
      }

      // Add moderation status to the returned comment object
      return { ...data, _moderationStatus: moderationStatus } as Comment & { _moderationStatus?: string };
    } catch (error) {
      console.error('Failed to create comment:', error);
      return null;
    }
  }

  /**
   * Like or unlike a post
   */
  async togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      console.log('Toggle post like:', postId, userId);
      
      // Check if user already liked the post
      const { data: existingLike, error: checkError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing like:', checkError);
        throw checkError;
      }

      if (existingLike) {
        // Unlike: remove the like
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          throw deleteError;
        }

        // Get updated like count
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        return { liked: false, likeCount: count || 0 };
      } else {
        // Like: add the like
        const { error: insertError } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userId,
          });

        if (insertError) {
          console.error('Error adding like:', insertError);
          throw insertError;
        }

        // Get updated like count
        const { count } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);

        return { liked: true, likeCount: count || 0 };
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw error;
    }
  }

  /**
   * Like or unlike a comment
   */
  async toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      console.log('Toggle comment like:', commentId, userId);
      
      // Check if user already liked the comment
      const { data: existingLike, error: checkError } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking existing like:', checkError);
        throw checkError;
      }

      if (existingLike) {
        // Unlike: remove the like
        const { error: deleteError } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          throw deleteError;
        }

        // Get updated like count
        const { count } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId);

        return { liked: false, likeCount: count || 0 };
      } else {
        // Like: add the like
        const { error: insertError } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: userId,
          });

        if (insertError) {
          console.error('Error adding like:', insertError);
          throw insertError;
        }

        // Get updated like count
        const { count } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', commentId);

        return { liked: true, likeCount: count || 0 };
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  async getPostComments(postId: string, limit = 50, offset = 0, currentUserId?: string): Promise<Comment[]> {
    try {
      // Check if comments table exists
      const commentsTableExists = await this.checkCommentsTable();
      if (!commentsTableExists) {
        console.log('Comments table does not exist, returning empty array');
        return [];
      }

      // Try to use the optimized view first
      let { data, error } = await supabase
        .from('comments_with_users')
        .select('*')
        .eq('post_id', postId)
        .eq('comment_status', 'approved')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      // Fallback to direct table query if view doesn't exist or doesn't have comment_status column
      if (error && (error.code === '42P01' || error.code === '42703')) {
        console.log('Comments view not available or missing comment_status column, using direct table query');
        const result = await supabase
          .from('comments')
          .select(`
            *,
            users!comments_user_id_fkey (
              name,
              avatar
            )
          `)
          .eq('post_id', postId)
          .eq('is_active', true)
          .eq('comment_status', 'approved')
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get like counts and user liked status for all comments
      const comments = await Promise.all(data.map(async (comment) => {
        // Get like count for this comment
        const { count: likeCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        // Check if current user liked this comment
        let userLiked = false;
        if (currentUserId) {
          const { data: userLike, error: likeError } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', currentUserId)
            .maybeSingle();
          userLiked = !!userLike && !likeError;
        }

        return {
          ...comment,
          user_name: comment.user_name || comment.users?.name,
          user_avatar: comment.user_avatar || comment.users?.avatar,
          like_count: likeCount || 0,
          user_liked: userLiked,
          replies: [], // We'll implement replies later
        };
      }));

      return comments;
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return [];
    }
  }

  /**
   * Get artist profile by ID
   */
  async getArtistProfile(artistId: string): Promise<any> {
    try {
      console.log('Loading artist profile:', artistId);
      
      const { data, error } = await supabase
        .from('artist_profiles')
        .select(`
          *,
          users!artist_profiles_user_id_fkey (
            name,
            email,
            avatar,
            role
          )
        `)
        .eq('id', artistId)
        .eq('status', 'approved')
        .single();

      if (error) {
        console.error('Error loading artist profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch artist profile:', error);
      throw error;
    }
  }

  /**
   * Get follower count for an artist
   */
  async getFollowerCount(artistId: string): Promise<number> {
    try {
      console.log('Getting follower count for artist:', artistId);
      
      const { count, error } = await supabase
        .from('follow_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artistId);

      if (error) {
        console.error('Error getting follower count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get follower count:', error);
      return 0;
    }
  }

  /**
   * Get following count for an artist
   */
  async getFollowingCount(artistId: string): Promise<number> {
    try {
      console.log('Getting following count for artist:', artistId);
      
      const { count, error } = await supabase
        .from('follow_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', artistId);

      if (error) {
        console.error('Error getting following count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get following count:', error);
      return 0;
    }
  }

  /**
   * Check if current user is following an artist
   */
  async getFollowStatus(followerUserId: string, followedUserId: string): Promise<boolean> {
    try {
      console.log('Checking follow status:', followerUserId, '->', followedUserId);
      
      const { data, error } = await supabase
        .from('follow_relationships')
        .select('id')
        .eq('follower_id', followerUserId)
        .eq('artist_id', followedUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking follow status:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check follow status:', error);
      return false;
    }
  }

  /**
   * Follow an artist
   */
  async followArtist(followerUserId: string, followedUserId: string): Promise<boolean> {
    try {
      console.log('Following artist:', followerUserId, '->', followedUserId);
      
      const { error } = await supabase
        .from('follow_relationships')
        .insert({
          follower_id: followerUserId,
          artist_id: followedUserId,
        });

      if (error) {
        console.error('Error following artist:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to follow artist:', error);
      return false;
    }
  }

  /**
   * Unfollow an artist
   */
  async unfollowArtist(followerUserId: string, followedUserId: string): Promise<boolean> {
    try {
      console.log('Unfollowing artist:', followerUserId, '->', followedUserId);
      
      const { error } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('follower_id', followerUserId)
        .eq('artist_id', followedUserId);

      if (error) {
        console.error('Error unfollowing artist:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to unfollow artist:', error);
      return false;
    }
  }

  /**
   * Get artist posts by artist ID
   */
  async getArtistPosts(artistId: string, limit = 20, offset = 0): Promise<any[]> {
    try {
      console.log('Loading artist posts:', artistId);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey (
            name,
            avatar
          )
        `)
        .eq('user_id', artistId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error loading artist posts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch artist posts:', error);
      return [];
    }
  }

  /**
   * Check if comments table exists
   */
  private async checkCommentsTable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table doesn't exist error
        console.log('Comments table does not exist, please run the SQL schema');
        return false;
      }
      
      return !error;
    } catch (error) {
      console.log('Error checking comments table:', error);
      return false;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePost:', error);
      throw error;
    }
  }
}

export const postsService = new PostsService();
