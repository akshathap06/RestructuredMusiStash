export interface Post {
  id: string;
  user_id: string;
  post_type: string;
  title?: string;
  description?: string;
  content: any;
  media_urls: string[];
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
  user_type?: string;
  is_verified?: boolean;
  like_count?: number;
  user_liked?: boolean;
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

export interface CreateCommentData {
  post_id: string;
  content: string;
}

export interface UserSocialProfile {
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
  professional_info?: any;
  stats?: any;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  user_id: string;
  artist_name: string;
  bio?: string;
  genre?: string;
  location?: string;
  profile_photo?: string;
  banner_photo?: string;
  monthly_listeners?: number;
  total_streams?: number;
  spotify_followers?: number;
  is_verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}
