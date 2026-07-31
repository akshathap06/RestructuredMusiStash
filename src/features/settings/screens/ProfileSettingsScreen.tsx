import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { ProfilePictureService } from '../../profile/services/profilePictureService';

const DAYS_BETWEEN_NAME_CHANGES = 30;

export default function ProfileSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [lastNameChange, setLastNameChange] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Get user data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('name, email, avatar, last_name_change')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        return;
      }

      if (userData) {
        setName(userData.name || '');
        setOriginalName(userData.name || '');
        setEmail(userData.email || '');
        setLastNameChange(userData.last_name_change ? new Date(userData.last_name_change) : null);
      }

      // Get profile picture
      const profileData = await ProfilePictureService.getProfilePicture(user.id);
      setAvatar(profileData.avatar);

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysUntilNameChange = (): number | null => {
    if (!lastNameChange) return null;
    
    const now = new Date();
    const nextChangeDate = new Date(lastNameChange);
    nextChangeDate.setDate(nextChangeDate.getDate() + DAYS_BETWEEN_NAME_CHANGES);
    
    const diffTime = nextChangeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : null;
  };

  const canChangeName = (): boolean => {
    const daysLeft = getDaysUntilNameChange();
    return daysLeft === null || daysLeft <= 0;
  };

  const handleSaveName = async () => {
    if (!user?.id || !name.trim()) return;

    if (name.trim() === originalName) {
      Alert.alert('No Changes', 'Your name is the same as before.');
      return;
    }

    if (!canChangeName()) {
      const daysLeft = getDaysUntilNameChange();
      Alert.alert(
        'Cannot Change Name',
        `You can only change your name once every ${DAYS_BETWEEN_NAME_CHANGES} days. Please wait ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`
      );
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters long.');
      return;
    }

    Alert.alert(
      'Confirm Name Change',
      `Change your name to "${name.trim()}"?\n\nNote: You can only change your name once every ${DAYS_BETWEEN_NAME_CHANGES} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Name',
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error } = await supabase
                .from('users')
                .update({
                  name: name.trim(),
                  last_name_change: new Date().toISOString(),
                })
                .eq('id', user.id);

              if (error) {
                console.error('Error updating name:', error);
                Alert.alert('Error', 'Failed to update name. Please try again.');
                return;
              }

              setOriginalName(name.trim());
              setLastNameChange(new Date());
              
              Alert.alert('Success', 'Your name has been updated!');
            } catch (error) {
              console.error('Error saving name:', error);
              Alert.alert('Error', 'Failed to save changes.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    if (!user?.id) return;

    setIsUploadingPhoto(true);
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update user avatar in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Error', 'Failed to update profile picture.');
        return;
      }

      // Clear profile picture cache
      ProfilePictureService.clearCache(user.id);
      
      // Update local state
      setAvatar(publicUrl);
      
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const daysLeft = getDaysUntilNameChange();
  const nameHasChanged = name.trim() !== originalName;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#6B7280" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change photo</Text>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                !canChangeName() && styles.inputDisabled
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#6B7280"
              editable={canChangeName()}
              maxLength={50}
            />
          </View>
          
          {daysLeft && daysLeft > 0 ? (
            <View style={styles.warningContainer}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>
                You can change your name again in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              You can change your name once every {DAYS_BETWEEN_NAME_CHANGES} days
            </Text>
          )}

          {nameHasChanged && canChangeName() && (
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveName}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Name</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Email Section (Read Only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
              placeholder="Email"
              placeholderTextColor="#6B7280"
            />
          </View>
          <Text style={styles.helperText}>
            Email cannot be changed
          </Text>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id?.substring(0, 8)}...
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputDisabled: {
    color: '#6B7280',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  helperText: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#F59E0B',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
});

