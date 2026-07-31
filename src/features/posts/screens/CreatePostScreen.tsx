import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { postsService } from '../../../services/postsService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { MediaUploadService, MediaFile } from '../../../services/mediaUploadService';

export default function CreatePostScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [musicAlbum, setMusicAlbum] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Service listing specific states
  const [isServiceListing, setIsServiceListing] = useState(false);
  const [isPortfolioMode, setIsPortfolioMode] = useState(false);
  const [serviceProvider, setServiceProvider] = useState<any>(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [pricingType, setPricingType] = useState<'flat' | 'hourly' | 'range' | 'custom'>('flat');
  const [priceValue, setPriceValue] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceCustom, setPriceCustom] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [postData, setPostData] = useState<any>(null);

  // Initialize edit mode or service listing mode
  useEffect(() => {
    if (route?.params?.editMode && route?.params?.postData) {
      setIsEditMode(true);
      setPostData(route.params.postData);
      const post = route.params.postData;
      
      if (post.post_type === 'service_offer') {
        setIsServiceListing(true);
        setServiceTitle(post.title || '');
        setServiceDescription(post.description || '');
        
        // Parse content - handle string, object, and corrupted data
        let parsedContent = post.content;
        
        // If content is a string, parse it
        if (typeof parsedContent === 'string') {
          try {
            parsedContent = JSON.parse(parsedContent);
          } catch (e) {
            console.error('Failed to parse content string:', e);
            parsedContent = {};
          }
        }
        
        // If content is corrupted (character-indexed from string spread), try to fix it
        if (parsedContent && typeof parsedContent === 'object') {
          const keys = Object.keys(parsedContent);
          if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            console.log('⚠️ Detected corrupted content in edit mode, attempting to fix...');
            try {
              const reconstructedString = keys.sort((a, b) => parseInt(a) - parseInt(b))
                .map(k => parsedContent[k])
                .join('');
              parsedContent = JSON.parse(reconstructedString);
              console.log('✅ Fixed corrupted content:', parsedContent);
            } catch (e) {
              console.error('❌ Failed to fix corrupted content:', e);
              // Use service_info at top level as fallback
              if (parsedContent.service_info && typeof parsedContent.service_info === 'object') {
                parsedContent = { service_info: parsedContent.service_info };
              } else {
                parsedContent = {};
              }
            }
          }
        }
        
        const serviceInfo = parsedContent?.service_info || {};
        const priceMin = serviceInfo.price_min;
        const priceMax = serviceInfo.price_max;
        const pricingTypeFromPost = serviceInfo.pricing_type || 'flat';
        
        console.log('🔍 Loading post for edit - serviceInfo:', {
          serviceInfo,
          priceMin,
          priceMax,
          pricingType: pricingTypeFromPost,
          priceMinType: typeof priceMin,
          priceMinValue: priceMin,
        });
        
        setPricingType(pricingTypeFromPost);
        
        // Better handling of price values - check for null, undefined, NaN explicitly
        if (pricingTypeFromPost === 'flat' || pricingTypeFromPost === 'hourly') {
          // Only set if we have a valid number > 0
          if (priceMin != null && !isNaN(priceMin) && priceMin > 0) {
            console.log('✅ Loading price value:', priceMin);
            setPriceValue(priceMin.toString());
          } else {
            console.log('⚠️ Price value is invalid:', priceMin);
            setPriceValue('');
          }
        } else if (pricingTypeFromPost === 'range') {
          if (priceMin != null && !isNaN(priceMin) && priceMin > 0) {
            setPriceMin(priceMin.toString());
          } else {
            setPriceMin('');
          }
          if (priceMax != null && !isNaN(priceMax) && priceMax > 0) {
            setPriceMax(priceMax.toString());
          } else {
            setPriceMax('');
          }
        } else {
          setPriceCustom(serviceInfo.price_custom || '');
        }
        
        setDeliveryDays(serviceInfo.delivery_days?.toString() || '');
      } else if (post.post_type === 'video_portfolio') {
        setIsPortfolioMode(true);
        setServiceTitle(post.title || '');
        setServiceDescription(post.description || '');
      }
      
      setContent(post.description || '');
      setMusicTitle(post.title || '');
      setHashtags(post.tags || []);
      
      if (post.media_urls && post.media_urls.length > 0) {
        const existingMedia = post.media_urls.map((url: string, index: number) => {
          let type: 'image' | 'audio' | 'video' = 'image';
          if (url.includes('.mp3') || url.includes('.wav') || url.includes('.m4a') || url.includes('.aac')) {
            type = 'audio';
          } else if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.m4v')) {
            type = 'video';
          }
          return { type, uri: url, name: `existing-${type}-${index + 1}` };
        });
        setSelectedMedia(existingMedia);
      }
    }
    
    if (route?.params?.serviceListingMode) {
      setIsServiceListing(true);
      setServiceProvider(route.params.serviceProvider);
    }
    
    if (route?.params?.portfolioMode) {
      setIsPortfolioMode(true);
      if (route.params.serviceProvider) {
        setServiceProvider(route.params.serviceProvider);
      }
    }
  }, [route?.params]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      await MediaLibrary.requestPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const pickImage = async () => {
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Library', onPress: selectFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const takePhoto = async () => {
    try {
      const currentImages = selectedMedia.filter(media => media.type === 'image');
      if (currentImages.length >= 7) {
        Alert.alert('Limit', 'Maximum 7 images allowed');
        return;
      }

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedMedia(prev => [...prev, {
          type: 'image' as const,
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          width: asset.width,
          height: asset.height,
        }]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const selectFromLibrary = async () => {
    try {
      const currentImages = selectedMedia.filter(media => media.type === 'image');
      if (currentImages.length >= 7) {
        Alert.alert('Limit', 'Maximum 7 images allowed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.slice(0, 7 - currentImages.length).map(asset => ({
          type: 'image' as const,
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          width: asset.width,
          height: asset.height,
        }));
        setSelectedMedia(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const pickAudio = async () => {
    try {
      const currentAudio = selectedMedia.filter(media => media.type === 'audio');
      if (currentAudio.length >= 5) {
        Alert.alert('Limit', 'Maximum 5 audio files allowed');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newAudio = result.assets.slice(0, 5 - currentAudio.length).map(asset => ({
          type: 'audio' as const,
          uri: asset.uri,
          name: asset.name || `audio_${Date.now()}.mp3`,
        }));
        setSelectedMedia(prev => [...prev, ...newAudio]);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const currentVideos = selectedMedia.filter(media => media.type === 'video');
      if (currentVideos.length >= 5) {
        Alert.alert('Limit', 'Maximum 5 videos allowed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newVideos = result.assets.slice(0, 5 - currentVideos.length).map(asset => ({
          type: 'video' as const,
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          width: asset.width,
          height: asset.height,
        }));
        setSelectedMedia(prev => [...prev, ...newVideos]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim();
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
      if (cleanTag.length > 0 && /^[a-zA-Z0-9_]+$/.test(cleanTag)) {
        setHashtags([...hashtags, cleanTag]);
        setHashtagInput('');
      }
    }
  };

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    // Validation
    if (isServiceListing) {
      if (!serviceTitle.trim() || !serviceDescription.trim()) {
        Alert.alert('Required', 'Please fill in title and description');
        return;
      }
      if ((pricingType === 'flat' || pricingType === 'hourly') && (!priceValue || parseFloat(priceValue) <= 0)) {
        Alert.alert('Required', 'Please enter a valid price');
        return;
      }
      if (pricingType === 'range' && (!priceMin || !priceMax || parseFloat(priceMin) >= parseFloat(priceMax))) {
        Alert.alert('Required', 'Please enter a valid price range');
        return;
      }
    } else if (!content.trim() && selectedMedia.length === 0) {
      Alert.alert('Required', 'Please add content or media');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    try {
      setIsPosting(true);

      let uploadedMediaUrls: string[] = [];
      if (selectedMedia.length > 0) {
        setUploadProgress({ completed: 0, total: selectedMedia.length });
        
        const uploadResult = await MediaUploadService.uploadMultipleMediaFiles(
          selectedMedia,
          user.id,
          undefined,
          (completed, total) => setUploadProgress({ completed, total })
        );

        uploadedMediaUrls = uploadResult.urls;
        setUploadProgress(null);
      }

      let postType: any = 'post';
      if (isServiceListing) postType = 'service_offer';
      else if (isPortfolioMode) postType = 'video_portfolio';
      
      // Helper function to safely parse price values
      const safeParsePrice = (value: string): number | null => {
        if (!value || value.trim() === '') return null;
        const parsed = parseFloat(value.trim());
        return isNaN(parsed) || parsed < 0 ? null : parsed;
      };

      const parsedPriceValue = safeParsePrice(priceValue);
      const parsedPriceMin = safeParsePrice(priceMin);
      const parsedPriceMax = safeParsePrice(priceMax);

      console.log('💰 Saving service post with pricing:', {
        pricingType,
        priceValue,
        parsedPriceValue,
        priceMin,
        parsedPriceMin,
        priceMax,
        parsedPriceMax,
        priceCustom,
      });

      const newPostData = isServiceListing ? {
        post_type: postType,
        title: serviceTitle,
        description: serviceDescription,
        content: {
          service_info: {
            provider_type: serviceProvider?.provider_type,
            business_name: serviceProvider?.business_name,
            description: serviceDescription,
            pricing_type: pricingType,
            price_min: pricingType === 'flat' || pricingType === 'hourly' 
              ? parsedPriceValue 
              : (pricingType === 'range' ? parsedPriceMin : null),
            price_max: pricingType === 'range' ? parsedPriceMax : null,
            price_custom: pricingType === 'custom' && priceCustom?.trim() ? priceCustom.trim() : null,
            delivery_days: deliveryDays && !isNaN(parseInt(deliveryDays)) ? parseInt(deliveryDays) : null,
          },
          // Store media dimensions for adaptive display
          media_dimensions: selectedMedia
            .filter(m => m.width && m.height)
            .map(m => ({ width: m.width, height: m.height })),
        },
        media_urls: uploadedMediaUrls,
        tags: hashtags,
      } : {
        post_type: postType,
        title: isPortfolioMode ? (musicTitle || 'Portfolio Item') : (musicTitle || 'New Post'),
        description: content,
        content: {
          text: content,
          music_info: !isPortfolioMode && (musicTitle || musicArtist || musicAlbum) ? {
            track_title: musicTitle,
            artist_name: musicArtist,
            album_name: musicAlbum,
          } : undefined,
          // Store media dimensions for adaptive display (portrait/landscape/square)
          media_dimensions: selectedMedia
            .filter(m => m.width && m.height)
            .map(m => ({ width: m.width, height: m.height })),
        },
        media_urls: uploadedMediaUrls,
        tags: hashtags,
      };

      let result;
      if (isEditMode && postData) {
        console.log('💾 Updating post with data:', JSON.stringify(newPostData, null, 2));
        result = await postsService.updatePost(postData.id, newPostData);
        if (result) {
          console.log('✅ Post updated successfully. Saved data:', {
            id: result.id,
            content: result.content,
            service_info: result.content?.service_info,
          });
        } else {
          console.error('❌ Post update returned null');
        }
      } else {
        try {
          result = await postsService.createPost(user.id, newPostData);
        } catch (error: any) {
          if (error.message?.includes('post_type_check')) {
            for (const altType of ['text', 'general', 'user_post', 'content'] as const) {
              try {
                result = await postsService.createPost(user.id, { ...newPostData, post_type: altType });
                break;
              } catch { continue; }
            }
          }
          if (!result) throw error;
        }
      }

      if (result) {
        // Check moderation status if it's a new post (not edit mode)
        const moderationStatus = (result as any)?._moderationStatus;
        const isRejected = moderationStatus === 'rejected';
        
        const alertTitle = isRejected ? 'Content Guidelines' : 'Success';
        const alertMessage = isRejected 
          ? 'Your post doesn\'t follow our content guidelines and has been rejected. Please review and try again.'
          : `Post ${isEditMode ? 'updated' : 'created'}!`;
        
        Alert.alert(alertTitle, alertMessage, [{
          text: 'OK',
          onPress: () => {
            setContent('');
            setSelectedMedia([]);
            setHashtags([]);
            navigation.goBack();
          },
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const getTitle = () => {
    if (isEditMode) return 'Edit';
    if (isServiceListing) return 'List Service';
    return 'New Post';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <TouchableOpacity 
          style={[styles.postBtn, isPosting && styles.postBtnDisabled]} 
          onPress={handlePost}
          disabled={isPosting}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postBtnText}>
              {uploadProgress ? `${uploadProgress.completed}/${uploadProgress.total}` : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isServiceListing ? (
            <>
              {/* Service Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Professional Mixing & Mastering"
                  placeholderTextColor="#4B5563"
                  value={serviceTitle}
                  onChangeText={setServiceTitle}
                />
              </View>
              
              {/* Service Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your service..."
                  placeholderTextColor="#4B5563"
                  value={serviceDescription}
                  onChangeText={setServiceDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              
              {/* Pricing */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pricing</Text>
                <View style={styles.pricingTabs}>
                  {(['flat', 'hourly', 'range', 'custom'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.pricingTab, pricingType === type && styles.pricingTabActive]}
                      onPress={() => setPricingType(type)}
                    >
                      <Text style={[styles.pricingTabText, pricingType === type && styles.pricingTabTextActive]}>
                        {type === 'flat' ? 'Fixed' : type === 'hourly' ? '/hr' : type === 'range' ? 'Range' : 'Custom'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {(pricingType === 'flat' || pricingType === 'hourly') && (
                  <View style={styles.priceInputRow}>
                    <Text style={styles.priceCurrency}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0.00"
                      placeholderTextColor="#4B5563"
                      value={priceValue}
                      onChangeText={setPriceValue}
                      keyboardType="numeric"
                    />
                    {pricingType === 'hourly' && <Text style={styles.priceUnit}>/hour</Text>}
                  </View>
                )}
                
                {pricingType === 'range' && (
                  <View style={styles.priceRangeRow}>
                    <View style={styles.priceInputRow}>
                      <Text style={styles.priceCurrency}>$</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Min"
                        placeholderTextColor="#4B5563"
                        value={priceMin}
                        onChangeText={setPriceMin}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={styles.priceTo}>—</Text>
                    <View style={styles.priceInputRow}>
                      <Text style={styles.priceCurrency}>$</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Max"
                        placeholderTextColor="#4B5563"
                        value={priceMax}
                        onChangeText={setPriceMax}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}
                
                {pricingType === 'custom' && (
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Starting from $X, Custom quotes"
                    placeholderTextColor="#4B5563"
                    value={priceCustom}
                    onChangeText={setPriceCustom}
                  />
                )}
              </View>
              
              {/* Delivery Time */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery (days)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3"
                  placeholderTextColor="#4B5563"
                  value={deliveryDays}
                  onChangeText={setDeliveryDays}
                  keyboardType="numeric"
                />
              </View>
            </>
          ) : (
            <>
              {/* Content */}
              <TextInput
                style={[styles.contentInput]}
                placeholder="What's on your mind?"
                placeholderTextColor="#4B5563"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
              
              {/* Music Info (Optional) */}
              <View style={styles.optionalSection}>
                <Text style={styles.optionalLabel}>Music Info (optional)</Text>
                <View style={styles.musicInputs}>
                  <TextInput
                    style={styles.musicInput}
                    placeholder="Track"
                    placeholderTextColor="#4B5563"
                    value={musicTitle}
                    onChangeText={setMusicTitle}
                  />
                  <TextInput
                    style={styles.musicInput}
                    placeholder="Artist"
                    placeholderTextColor="#4B5563"
                    value={musicArtist}
                    onChangeText={setMusicArtist}
                  />
                </View>
              </View>
            </>
          )}

          {/* Hashtags */}
          <View style={styles.hashtagSection}>
            <View style={styles.hashtagInputRow}>
              <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
              <TextInput
                style={styles.hashtagInput}
                placeholder="Add hashtag"
                placeholderTextColor="#4B5563"
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={addHashtag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.hashtagAddBtn} onPress={addHashtag}>
                <Ionicons name="add" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            {hashtags.length > 0 && (
              <View style={styles.hashtagList}>
                {hashtags.map((tag, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.hashtagChip}
                    onPress={() => removeHashtag(index)}
                  >
                    <Text style={styles.hashtagText}>#{tag}</Text>
                    <Ionicons name="close" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Media Preview */}
          {selectedMedia.length > 0 && (
            <View style={styles.mediaPreviewSection}>
              <View style={styles.mediaHeader}>
                <Text style={styles.mediaCount}>
                  {selectedMedia.length} file{selectedMedia.length > 1 ? 's' : ''}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMedia([])}>
                  <Text style={styles.clearAll}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedMedia.map((media, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {media.type === 'image' ? (
                      <Image source={{ uri: media.uri }} style={styles.mediaThumb} />
                    ) : (
                      <View style={styles.mediaPlaceholder}>
                        <Ionicons 
                          name={media.type === 'audio' ? 'musical-notes' : 'videocam'} 
                          size={24} 
                          color="#3B82F6" 
                        />
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.mediaRemove}
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Bottom Media Bar */}
        <View style={[styles.mediaBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickAudio}>
            <Ionicons name="musical-notes-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F1F1F',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  contentInput: {
    fontSize: 17,
    color: '#FFFFFF',
    minHeight: 120,
    marginBottom: 20,
    lineHeight: 24,
  },
  optionalSection: {
    marginBottom: 20,
  },
  optionalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  musicInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  musicInput: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  pricingTabs: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  pricingTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  pricingTabActive: {
    backgroundColor: '#3B82F6',
  },
  pricingTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  pricingTabTextActive: {
    color: '#FFFFFF',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  priceUnit: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceTo: {
    fontSize: 16,
    color: '#4B5563',
  },
  hashtagSection: {
    marginBottom: 20,
  },
  hashtagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  hashtagInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 12,
    marginLeft: 8,
  },
  hashtagAddBtn: {
    padding: 6,
  },
  hashtagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F615',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  hashtagText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  mediaPreviewSection: {
    marginBottom: 20,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  clearAll: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  mediaItem: {
    position: 'relative',
    marginRight: 10,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#000000',
  },
  mediaBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
