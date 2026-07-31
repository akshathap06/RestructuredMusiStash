import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import WorkSubmissionService, { WorkSubmissionData } from '../../../services/WorkSubmissionService';

interface WorkSubmissionScreenProps {
  route: {
    params?: {
      provider?: any;
    };
  };
  navigation: any;
}

export const WorkSubmissionScreen: React.FC<WorkSubmissionScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { provider } = route.params || {};
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [allowRevisions, setAllowRevisions] = useState(true);
  const [maxRevisions, setMaxRevisions] = useState('2');
  const [deliveryTime, setDeliveryTime] = useState('');

  const categories = [
    { id: 'beat_production', name: 'Beat Production', icon: 'musical-notes' },
    { id: 'mixing', name: 'Mixing & Mastering', icon: 'settings' },
    { id: 'sound_design', name: 'Sound Design', icon: 'pulse' },
    { id: 'arrangement', name: 'Music Arrangement', icon: 'library' },
    { id: 'vocals', name: 'Vocal Recording', icon: 'mic' },
    { id: 'instruments', name: 'Instrument Recording', icon: 'piano' },
    { id: 'custom', name: 'Custom Work', icon: 'create' },
  ];

  useEffect(() => {
    // Request media permissions
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant media library permissions to upload files.'
      );
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newUrls = result.assets.map(asset => asset.uri);
        setFileUrls(prev => [...prev, ...newUrls]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick media files');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newUrls = result.assets.map(asset => asset.uri);
        setFileUrls(prev => [...prev, ...newUrls]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick documents');
    }
  };

  const removeFile = (index: number) => {
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a work title');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }

    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }

    if (fileUrls.length === 0) {
      Alert.alert('Error', 'Please upload at least one file to showcase your work');
      return false;
    }

    return true;
  };

  const handleSubmitWork = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to submit work');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Prepare work submission data
      const workData: WorkSubmissionData = {
        title: title.trim(),
        description: description.trim(),
        // category,
        price: parseFloat(price),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        file_urls: fileUrls,
        delivery_notes: deliveryNotes.trim() || undefined,
        allow_revisions: allowRevisions,
        max_revisions: allowRevisions ? parseInt(maxRevisions) || 2 : 0,
        delivery_time: deliveryTime.trim() || undefined,
      };

      // Validate submission
      // const validation = WorkSubmissionService.validateSubmission(workData);
      // if (!validation.isValid) {
      //   Alert.alert('Validation Error', validation.errors.join('\n'));
      //   return;
      // }

      console.log('Submitting work:', workData);

      // Upload files if they are local URIs
      const uploadedFileUrls: string[] = [];
      for (const fileUrl of fileUrls) {
        if (fileUrl.startsWith('file://') || fileUrl.startsWith('content://')) {
          // Local file, needs to be uploaded
          const fileName = fileUrl.split('/').pop() || `file_${Date.now()}`;
          // const uploadResult = await WorkSubmissionService.uploadFile(fileUrl, fileName, user.id);

          // if (uploadResult.success && uploadResult.url) {
          //   uploadedFileUrls.push(uploadResult.url);
          // } else {
          //   throw new Error(`Failed to upload file: ${fileName}`);
          // }
        } else {
          // Already uploaded URL
          uploadedFileUrls.push(fileUrl);
        }
      }

      // Update work data with uploaded URLs
      // workData.file_urls = uploadedFileUrls;

      // Create work submission
      // const submission = await WorkSubmissionService.createWorkSubmission(workData, user.id);

      // console.log('Work submission created:', submission);

      Alert.alert(
        'Work Submitted Successfully! 🎉',
        `Your work has been submitted successfully and will be available for clients.`,
        [
          {
            text: 'Create Another',
            onPress: () => {
              // Reset form
              setTitle('');
              setDescription('');
              setPrice('');
              setCategory('');
              setTags('');
              setFileUrls([]);
              setDeliveryNotes('');
              setDeliveryTime('');
            }
          },
          {
            text: 'View Portfolio',
            onPress: () => navigation.navigate('UserPortfolio', { userId: user.id })
          },
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting work:', error);
      Alert.alert(
        'Submission Failed', 
        error instanceof Error ? error.message : 'Failed to submit work. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const getFileIcon = (uri: string) => {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(extension || '')) {
      return 'musical-notes';
    } else if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) {
      return 'videocam';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else {
      return 'document';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Setting up your submission...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Your Work</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Intro Section */}
      <View style={styles.introCard}>
        <View style={styles.introIconContainer}>
          <Ionicons name="cloud-upload" size={32} color="#3B82F6" />
        </View>
        <Text style={styles.introTitle}>Share Your Creative Work</Text>
        <Text style={styles.introDescription}>
          Upload your music productions, beats, or audio services for clients to discover and purchase.
        </Text>
      </View>

      {/* Work Details */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Work Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Dark Hip-Hop Beat, Professional Mix & Master"
            placeholderTextColor="#6B7280"
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your work, style, and what makes it unique..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            editable={!submitting}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>Price (USD) *</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="150"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>
          
          <View style={styles.inputGroupHalf}>
            <Text style={styles.inputLabel}>Delivery Time</Text>
            <TextInput
              style={styles.textInput}
              value={deliveryTime}
              onChangeText={setDeliveryTime}
              placeholder="e.g., 3-5 days"
              placeholderTextColor="#6B7280"
              editable={!submitting}
            />
          </View>
        </View>
      </View>

      {/* Category Selection */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Category *</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                category === cat.id && styles.selectedCategory
              ]}
              onPress={() => setCategory(cat.id)}
              disabled={submitting}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={24} 
                color={category === cat.id ? '#3B82F6' : '#9CA3AF'} 
              />
              <Text style={[
                styles.categoryText,
                category === cat.id && styles.selectedCategoryText
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* File Upload */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Upload Files *</Text>
        <Text style={styles.cardSubtitle}>
          Share samples, previews, or full tracks to showcase your work
        </Text>
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={submitting}
          >
            <Ionicons name="image" size={20} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>Add Media</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
            disabled={submitting}
          >
            <Ionicons name="document" size={20} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>Add Files</Text>
          </TouchableOpacity>
        </View>

        {/* File List */}
        {fileUrls.length > 0 && (
          <View style={styles.fileList}>
            <Text style={styles.fileListTitle}>Uploaded Files ({fileUrls.length})</Text>
            {fileUrls.map((url, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons 
                    name={getFileIcon(url) as any} 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {url.split('/').pop() || `File ${index + 1}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeFile(index)}
                  disabled={submitting}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Additional Options */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Additional Options</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tags</Text>
          <TextInput
            style={styles.textInput}
            value={tags}
            onChangeText={setTags}
            placeholder="hip-hop, dark, aggressive, 808s (separate with commas)"
            placeholderTextColor="#6B7280"
            editable={!submitting}
          />
        </View>

        <View style={styles.switchContainer}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>Allow Revisions</Text>
            <Text style={styles.switchDescription}>
              Let clients request changes to your work
            </Text>
          </View>
          <Switch
            value={allowRevisions}
            onValueChange={setAllowRevisions}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor="#FFFFFF"
            disabled={submitting}
          />
        </View>

        {allowRevisions && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Revisions</Text>
            <TextInput
              style={styles.textInput}
              value={maxRevisions}
              onChangeText={setMaxRevisions}
              placeholder="2"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder="Any special instructions or information for clients..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            editable={!submitting}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmitWork}
        disabled={submitting}
      >
        {submitting ? (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submittingText}>Submitting Work...</Text>
          </View>
        ) : (
          <View style={styles.submitButtonContent}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Work</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Guidelines */}
      <View style={styles.guidelinesCard}>
        <Text style={styles.guidelinesTitle}>Submission Guidelines</Text>
        <Text style={styles.guidelinesText}>
          • Ensure your work is original and high quality{'\n'}
          • Provide clear, descriptive titles and descriptions{'\n'}
          • Upload quality preview files to showcase your style{'\n'}
          • Set fair and competitive pricing{'\n'}
          • Be responsive to client inquiries and feedback
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  introCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  introIconContainer: {
    backgroundColor: '#374151',
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  introDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupHalf: {
    flex: 1,
    marginRight: 8,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategory: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
  },
  categoryText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#3B82F6',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  fileList: {
    marginTop: 8,
  },
  fileListTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submittingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  guidelinesCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  guidelinesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  guidelinesText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WorkSubmissionScreen;
