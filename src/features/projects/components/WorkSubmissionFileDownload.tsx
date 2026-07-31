import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase, supabaseStorage, getDirectStorageUrl, DIRECT_SUPABASE_URL } from '../../../lib/supabase';

interface WorkSubmissionFileDownloadProps {
  fileUrl: string;
  fileName: string;
  fileType?: 'audio' | 'video' | 'image' | 'document';
  submissionId: string;
  onDownloadComplete?: () => void;
}

export const WorkSubmissionFileDownload: React.FC<WorkSubmissionFileDownloadProps> = ({
  fileUrl,
  fileName,
  fileType = 'document',
  submissionId,
  onDownloadComplete
}) => {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = () => {
    switch (fileType) {
      case 'audio':
        return 'musical-notes';
      case 'video':
        return 'videocam';
      case 'image':
        return 'image';
      default:
        return 'document';
    }
  };

  const getFileTypeEmoji = () => {
    switch (fileType) {
      case 'audio':
        return '🎵';
      case 'video':
        return '🎥';
      case 'image':
        return '📸';
      default:
        return '📄';
    }
  };

  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(extension);
  };

  const isVideoFile = (fileName: string): boolean => {
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'webm', 'm4v'];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.includes(extension);
  };

  const handleDownload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to download files');
      return;
    }

    try {
      setDownloading(true);

      console.log('Starting download:', fileName, 'from:', fileUrl);

      // Convert custom domain URL to direct Supabase URL for storage access
      const directUrl = getDirectStorageUrl(fileUrl);
      console.log('Using direct URL:', directUrl);

      // First, let's check if the file URL is accessible and get the correct URL
      let finalFileUrl = directUrl;
      try {
        console.log('Original file URL:', fileUrl);
        console.log('Direct URL (converted):', directUrl);
        
        // Extract bucket and path from any Supabase storage URL format
        // Use directUrl (the converted URL) for pattern matching
        let bucket: string | null = null;
        let filePath: string | null = null;
        
        // Handle both public and signed URL formats - check directUrl not fileUrl
        if (directUrl.includes('supabase.co/storage/v1/object/')) {
          console.log('Detected Supabase storage URL...');
          
          // Use greedy matching (.+) to capture full path
          // Could be /object/public/ or /object/sign/ or just /object/
          const publicMatch = directUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
          const signedMatch = directUrl.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/);
          
          if (publicMatch) {
            bucket = publicMatch[1];
            // For public URLs, get the full path after bucket
            const afterBucket = directUrl.split(`/public/${publicMatch[1]}/`)[1];
            filePath = afterBucket ? afterBucket.split('?')[0] : publicMatch[2];
          } else if (signedMatch) {
            bucket = signedMatch[1];
            const afterBucket = directUrl.split(`/sign/${signedMatch[1]}/`)[1];
            filePath = afterBucket ? afterBucket.split('?')[0] : signedMatch[2];
          } else {
            // Fallback: split by known patterns
            const urlParts = directUrl.split('/storage/v1/object/');
            if (urlParts.length > 1) {
              let pathPart = urlParts[1];
              // Remove 'public/' or 'sign/' prefix if present
              pathPart = pathPart.replace(/^(public|sign)\//, '');
              const parts = pathPart.split('/');
              bucket = parts[0];
              filePath = parts.slice(1).join('/').split('?')[0]; // Remove query params
            }
          }
          
          console.log('Extracted - Bucket:', bucket, 'File path:', filePath);
        }
        
        // Always try to get a fresh signed URL for Supabase files
        if (bucket && filePath) {
          console.log('Getting fresh signed URL for:', bucket, filePath);
          
          const { data: signedUrlData, error: signedUrlError } = await supabaseStorage.storage
            .from(bucket)
            .createSignedUrl(filePath, 3600); // 1 hour expiry
            
          if (!signedUrlError && signedUrlData?.signedUrl) {
            // Convert signed URL to direct Supabase URL as well
            finalFileUrl = getDirectStorageUrl(signedUrlData.signedUrl);
            console.log('✅ Got fresh signed URL:', finalFileUrl.substring(0, 100) + '...');
          } else {
            console.error('❌ Signed URL failed:', signedUrlError);
            
            // Try with decoded path (in case URL was encoded)
            const decodedPath = decodeURIComponent(filePath);
            if (decodedPath !== filePath) {
              console.log('Trying with decoded path:', decodedPath);
              const { data: retryData, error: retryError } = await supabaseStorage.storage
                .from(bucket)
                .createSignedUrl(decodedPath, 3600);
                
              if (!retryError && retryData?.signedUrl) {
                finalFileUrl = getDirectStorageUrl(retryData.signedUrl);
                console.log('✅ Got signed URL with decoded path');
              }
            }
          }
        }
        
        // Verify the URL works
        console.log('Verifying URL accessibility...');
        const headResponse = await fetch(finalFileUrl, { method: 'HEAD' });
        console.log('URL check result:', headResponse.status, headResponse.headers.get('content-type'));
        
        // Check if we're getting JSON instead of the actual file
        const contentType = headResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json') || !headResponse.ok) {
          console.error('URL verification failed, trying alternative methods...');
          
          // If we have bucket and path, try downloading directly via Supabase SDK
          if (bucket && filePath) {
            console.log('Trying direct Supabase download...');
            const { data: blobData, error: blobError } = await supabaseStorage.storage
              .from(bucket)
              .download(filePath);
              
            if (!blobError && blobData) {
              console.log('✅ Got blob data, size:', blobData.size);
              // Save blob to local file
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  const base64data = reader.result as string;
                  resolve(base64data.split(',')[1]); // Remove data URL prefix
                };
                reader.onerror = reject;
                reader.readAsDataURL(blobData);
              });
              
              const base64 = await base64Promise;
              const timestamp = Date.now();
              const fileExtension = fileName.split('.').pop() || 'file';
              const uniqueFileName = `${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}_${timestamp}.${fileExtension}`;
              const downloadPath = FileSystem.cacheDirectory + uniqueFileName;
              
              await FileSystem.writeAsStringAsync(downloadPath, base64, {
                encoding: FileSystem.EncodingType.Base64
              });
              
              console.log('✅ File saved to:', downloadPath);
              
              // Now share/save the file
              const isImage = isImageFile(fileName);
              const isVideo = isVideoFile(fileName);
              
              if (isImage || isVideo) {
                try {
                  const permission = await MediaLibrary.requestPermissionsAsync();
                  if (permission.granted) {
                    await MediaLibrary.saveToLibraryAsync(downloadPath);
                    Alert.alert(
                      'Download Complete! 🎉',
                      `${getFileTypeEmoji()} ${fileName} has been saved to your ${isImage ? 'Photos' : 'Videos'}.`,
                      [{ text: 'OK' }]
                    );
                  } else {
                    await shareFile(downloadPath, fileName);
                  }
                } catch (mediaError) {
                  await shareFile(downloadPath, fileName);
                }
              } else {
                Alert.alert(
                  'Download Complete! 📁',
                  `${getFileTypeEmoji()} ${fileName} has been downloaded.`,
                  [
                    { text: 'OK' },
                    { text: 'Share', onPress: () => shareFile(downloadPath, fileName) }
                  ]
                );
              }
              
              onDownloadComplete?.();
              setDownloading(false);
              return; // Exit early, we handled the download
            } else {
              console.error('❌ Direct download failed:', blobError);
            }
          }
          
          throw new Error('File URL is returning JSON response instead of the actual file');
        }
      } catch (urlError: any) {
        console.error('File URL processing failed:', urlError);
        Alert.alert(
          'Download Failed',
          urlError.message || 'The file appears to be inaccessible. This might be a permission issue with the file storage.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        setDownloading(false);
        return;
      }

      // Log download activity
      try {
        await supabase.rpc('log_file_download', {
          p_file_url: fileUrl,
          p_file_name: fileName,
          p_user_id: user.id,
          p_related_id: submissionId,
          p_download_type: 'work_submission'
        });
      } catch (logError) {
        console.log('Could not log download activity:', logError);
        // Don't fail the download if logging fails
      }

      // Create unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop() || 'file';
      const uniqueFileName = `${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}_${timestamp}.${fileExtension}`;
      const downloadPath = FileSystem.cacheDirectory + uniqueFileName;

      console.log('Downloading to:', downloadPath);

      // Download file to device using legacy API
      const downloadResult = await FileSystem.downloadAsync(finalFileUrl, downloadPath);
      console.log('Download result:', downloadResult);

      if (downloadResult.status === 200) {
        // Check if the downloaded file is actually valid (not JSON)
        const downloadedContentType = downloadResult.headers?.['Content-Type'] || downloadResult.headers?.['content-type'] || '';
        
        if (downloadedContentType.includes('application/json')) {
          console.error('Downloaded file is JSON, not actual file content');
          Alert.alert(
            'Download Failed',
            'The file appears to be inaccessible. This might be a permission issue with the file storage.',
            [
              { text: 'OK', style: 'default' },
              {
                text: 'Try Browser',
                onPress: () => Linking.openURL(fileUrl)
              }
            ]
          );
          return;
        }

        // Determine file type for better handling
        const isImage = isImageFile(fileName);
        const isVideo = isVideoFile(fileName);
        const isMedia = isImage || isVideo;

        if (isMedia) {
          try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            console.log('Media library permission:', permission);

            if (permission.granted) {
              // Check if file exists before trying to save
              const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
              console.log('Downloaded file info:', fileInfo);
              
              if (!fileInfo.exists) {
                throw new Error('Downloaded file does not exist');
              }
              
              const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
              console.log('Asset saved:', asset);
              Alert.alert(
                'Download Complete! 🎉',
                `${getFileTypeEmoji()} ${fileName} has been saved to your ${isImage ? 'Photos' : 'Videos'}.`,
                [
                  { text: 'OK', style: 'default' },
                  {
                    text: 'Share',
                    onPress: () => shareFile(downloadResult.uri, fileName)
                  }
                ]
              );
            } else {
              // Permission denied, offer to share instead
              Alert.alert(
                'Download Complete! 📁',
                `${fileName} has been downloaded. Would you like to share it?`,
                [
                  { text: 'OK', style: 'default' },
                  {
                    text: 'Share',
                    onPress: () => shareFile(downloadResult.uri, fileName)
                  }
                ]
              );
            }
          } catch (mediaError) {
            console.error('Media library error:', mediaError);
            // Fallback: offer to share
            Alert.alert(
              'Download Complete! 📁',
              `${fileName} has been downloaded successfully. The file is saved locally.`,
              [
                { text: 'OK', style: 'default' },
                {
                  text: 'Share',
                  onPress: () => shareFile(downloadResult.uri, fileName)
                }
              ]
            );
          }
        } else {
          // For other files (documents, audio), offer to share
          Alert.alert(
            'Download Complete! 📁',
            `${getFileTypeEmoji()} ${fileName} has been downloaded successfully.`,
            [
              { text: 'OK', style: 'default' },
              {
                text: 'Share',
                onPress: () => shareFile(downloadResult.uri, fileName)
              }
            ]
          );
        }

        onDownloadComplete?.();
      } else {
        Alert.alert('Download Failed', `Failed to download ${fileName}. Status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      
      // If download fails, try opening the URL directly
      try {
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          Alert.alert(
            'Download Alternative',
            'Direct download failed. Would you like to open the file in your browser?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open in Browser',
                onPress: () => Linking.openURL(fileUrl)
              }
            ]
          );
        } else {
          Alert.alert('Download Failed', `Failed to download ${fileName}. Please try again later.`);
        }
      } catch (linkError) {
        Alert.alert('Download Failed', `Failed to download ${fileName}. Please try again later.`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const shareFile = async (fileUri: string, fileName: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: `Share ${fileName}`
        });
      } else {
        Alert.alert('Sharing Not Available', 'File sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Failed to share the file.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.fileInfo}>
        <View style={styles.fileIconContainer}>
          <Ionicons 
            name={getFileIcon() as any} 
            size={20} 
            color="#3B82F6" 
          />
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {getFileTypeEmoji()} {fileName}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.downloadButton,
          downloading && styles.downloadingButton
        ]}
        onPress={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="download" size={16} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingButton: {
    backgroundColor: '#6B7280',
  },
});

export default WorkSubmissionFileDownload;
