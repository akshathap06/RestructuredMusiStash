import React, { useState, useEffect } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfilePictureService from '../services/profilePictureService';

interface ProfilePictureProps {
  userId?: string;
  userName?: string;
  avatarUrl?: string;
  size?: number;
  style?: ImageStyle | ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  userId,
  userName,
  avatarUrl,
  size = 40,
  style,
  showBorder = false,
  borderColor = '#3B82F6',
  borderWidth = 2,
  onLoad,
  onError,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        let finalUrl: string | null = null;
        let name = userName || 'U';
        
        // Priority: avatarUrl > ProfilePictureService lookup > null (fallback icon)
        if (avatarUrl && avatarUrl.trim() !== '') {
          // Validate URL format before using
          if (isValidUrl(avatarUrl)) {
            finalUrl = avatarUrl;
            console.log('🖼️ Using provided avatar URL:', finalUrl);
          } else {
            console.log('⚠️ Invalid avatar URL format, rejecting:', avatarUrl);
          }
        } 
        
        if (!finalUrl && userId) {
          console.log('🔍 Looking up profile picture for user:', userId);
          try {
            const profileData = await ProfilePictureService.getCachedProfilePicture(userId);
            
            if (profileData.avatar) {
              // Validate service-provided URL as well
              if (isValidUrl(profileData.avatar)) {
                finalUrl = profileData.avatar;
                console.log('🖼️ Using ProfilePictureService URL:', finalUrl);
              } else {
                console.log('⚠️ ProfilePictureService returned invalid URL, rejecting:', profileData.avatar);
              }
            }
            
            name = profileData.displayName;
          } catch (serviceError) {
            console.error('❌ ProfilePictureService error:', serviceError);
          }
        }
        
        setImageUrl(finalUrl);
        setDisplayName(name);
        console.log('🎯 Final profile picture state:', { 
          finalUrl: finalUrl ? 'Has URL' : 'No URL', 
          name, 
          willShowIcon: !finalUrl 
        });
        
      } catch (error) {
        console.error('❌ Error loading profile picture:', error);
        setImageUrl(null);
        setHasError(true);
        setDisplayName(userName || 'U');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfilePicture();
  }, [userId, userName, avatarUrl]);

  // Helper function to validate URLs
  const isValidUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Handle image load errors better
  const handleImageError = (error: any) => {
    console.error('❌ Profile picture failed to load:', error.nativeEvent?.error || 'Unknown error');
    console.log('🔄 Attempted URL:', imageUrl);
    setHasError(true);
    setImageUrl(null);
    onError?.(error);
  };

  const containerStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: 'hidden' as const,
      backgroundColor: '#2C2C2E', // Dark background
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    showBorder && {
      borderWidth: borderWidth,
      borderColor: borderColor,
    },
    style,
  ];

  const imageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const iconSize = Math.max(16, size * 0.4);
  const textSize = Math.max(12, size * 0.3);

  // Show loading state
  if (isLoading) {
    return (
      <View style={containerStyle}>
        <Ionicons name="person" size={iconSize} color="#3B82F6" />
      </View>
    );
  }

  // Show image if we have a valid URL and no error
  if (imageUrl && !hasError && isValidUrl(imageUrl)) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={imageStyle}
          onLoad={() => {
            console.log('✅ ProfilePicture loaded successfully:', imageUrl);
            onLoad?.();
          }}
          onError={handleImageError}
        />
      </View>
    );
  }

  // Show fallback icon/initial
  const initial = displayName?.charAt(0)?.toUpperCase() || userName?.charAt(0)?.toUpperCase() || 'U';
  
  return (
    <View style={containerStyle}>
      {displayName ? (
        <Text style={{ 
          fontSize: textSize, 
          fontWeight: '600', 
          color: '#FFFFFF' 
        }}>
          {initial}
        </Text>
      ) : (
        <Ionicons name="person" size={iconSize} color="#3B82F6" />
      )}
    </View>
  );
};

export default ProfilePicture;
