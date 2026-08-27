import { supabase } from '../../../lib/supabase';

export interface MediaFile {
  type: 'image' | 'audio' | 'video';
  uri: string;
  name: string;
  mimeType?: string;
  /** Original image width (for adaptive display) */
  width?: number;
  /** Original image height (for adaptive display) */
  height?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class MediaUploadService {
  /**
   * Upload a single media file to Supabase Storage
   */
  static async uploadMediaFile(
    mediaFile: MediaFile,
    userId: string,
    postId?: string
  ): Promise<UploadResult> {
    try {
      console.log('Uploading media file:', mediaFile.name);

      // Determine file extension
      const fileExt = mediaFile.uri.split('.').pop()?.toLowerCase() || 
        (mediaFile.type === 'image' ? 'jpg' : 
         mediaFile.type === 'audio' ? 'mp3' : 'mp4');

      // Create unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileName = postId 
        ? `${userId}/posts/${postId}/${mediaFile.type}_${timestamp}_${randomId}.${fileExt}`
        : `${userId}/posts/${mediaFile.type}_${timestamp}_${randomId}.${fileExt}`;

      // Fetch the file and convert to array buffer
      const response = await fetch(mediaFile.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Use the existing bucket structure with fallbacks
      const bucketName = await this.getBucketNameForMediaType(mediaFile.type);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, uint8Array, {
          contentType: mediaFile.mimeType || this.getMimeType(mediaFile.type, fileExt),
          upsert: true
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('Media file uploaded successfully:', publicUrl);
      return {
        success: true,
        url: publicUrl
      };

    } catch (error) {
      console.error('Error uploading media file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload multiple media files
   */
  static async uploadMultipleMediaFiles(
    mediaFiles: MediaFile[],
    userId: string,
    postId?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      
      try {
        const result = await this.uploadMediaFile(mediaFile, userId, postId);
        
        if (result.success && result.url) {
          urls.push(result.url);
        } else {
          errors.push(`Failed to upload ${mediaFile.name}: ${result.error}`);
        }
        
        // Report progress
        onProgress?.(i + 1, mediaFiles.length);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to upload ${mediaFile.name}: ${errorMessage}`);
        onProgress?.(i + 1, mediaFiles.length);
      }
    }

    return { urls, errors };
  }

  /**
   * Get appropriate bucket name for media type with fallbacks
   */
  private static async getBucketNameForMediaType(mediaType: 'image' | 'audio' | 'video'): Promise<string> {
    // Define bucket preferences with fallbacks
    const bucketOptions = {
      'image': ['post-media', 'media'],
      'audio': ['provider-audios', 'provider-audio', 'media', 'post-media'],
      'video': ['provider-videos', 'media', 'post-media']
    };

    const preferredBuckets = bucketOptions[mediaType] || ['media', 'post-media'];

    try {
      // Check which buckets exist
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.warn('Could not list buckets, using fallback:', error);
        return preferredBuckets[0]; // Use first preference as fallback
      }

      const existingBucketNames = buckets.map(b => b.name);
      
      // Find the first preferred bucket that exists
      for (const bucketName of preferredBuckets) {
        if (existingBucketNames.includes(bucketName)) {
          console.log(`Using bucket for ${mediaType}: ${bucketName}`);
          return bucketName;
        }
      }

      // If none of the preferred buckets exist, use the first available one or default
      console.warn(`No preferred buckets found for ${mediaType}, using fallback: ${preferredBuckets[0]}`);
      return preferredBuckets[0];
      
    } catch (error) {
      console.error('Error determining bucket name:', error);
      return preferredBuckets[0]; // Fallback to first preference
    }
  }

  /**
   * Get MIME type based on file type and extension
   */
  private static getMimeType(type: string, extension: string): string {
    switch (type) {
      case 'image':
        switch (extension.toLowerCase()) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'gif':
            return 'image/gif';
          case 'webp':
            return 'image/webp';
          default:
            return 'image/jpeg';
        }
      case 'audio':
        switch (extension.toLowerCase()) {
          case 'mp3':
            return 'audio/mpeg';
          case 'wav':
            return 'audio/wav';
          case 'm4a':
            return 'audio/mp4';
          case 'aac':
            return 'audio/aac';
          default:
            return 'audio/mpeg';
        }
      case 'video':
        switch (extension.toLowerCase()) {
          case 'mp4':
            return 'video/mp4';
          case 'mov':
            return 'video/quicktime';
          case 'avi':
            return 'video/x-msvideo';
          case 'webm':
            return 'video/webm';
          default:
            return 'video/mp4';
        }
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Delete media file from storage
   */
  static async deleteMediaFile(url: string): Promise<boolean> {
    try {
      // Extract bucket and file path from URL
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        console.error('Invalid storage URL format:', url);
        return false;
      }

      const [bucketAndPath] = urlParts[1].split('/');
      const filePath = urlParts[1].substring(bucketAndPath.length + 1);

      const { error } = await supabase.storage
        .from(bucketAndPath)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting media file:', error);
        return false;
      }

      console.log('Media file deleted successfully:', url);
      return true;
    } catch (error) {
      console.error('Error deleting media file:', error);
      return false;
    }
  }

  /**
   * Check if storage buckets exist and create them if needed
   */
  static async ensureStorageBucketsExist(): Promise<void> {
    const buckets = ['post-media', 'provider-audios', 'provider-videos'];
    
    for (const bucketName of buckets) {
      try {
        // Check if bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error listing buckets:', listError);
          continue;
        }

        const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
          // Create bucket
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: this.getAllowedMimeTypes(bucketName),
            fileSizeLimit: this.getFileSizeLimit(bucketName)
          });

          if (createError) {
            console.error(`Error creating bucket ${bucketName}:`, createError);
          } else {
            console.log(`Bucket ${bucketName} created successfully`);
          }
        }
      } catch (error) {
        console.error(`Error ensuring bucket ${bucketName} exists:`, error);
      }
    }
  }

  private static getAllowedMimeTypes(bucketName: string): string[] {
    switch (bucketName) {
      case 'post-media':
        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      case 'provider-audios':
        return ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'];
      case 'provider-videos':
        return ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      default:
        return [];
    }
  }

  private static getFileSizeLimit(bucketName: string): number {
    switch (bucketName) {
      case 'post-media':
        return 10 * 1024 * 1024; // 10MB
      case 'provider-audios':
        return 50 * 1024 * 1024; // 50MB
      case 'provider-videos':
        return 100 * 1024 * 1024; // 100MB
      default:
        return 10 * 1024 * 1024;
    }
  }
}

export const mediaUploadService = MediaUploadService;
