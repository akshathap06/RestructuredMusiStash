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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import WorkSubmissionService, { WorkSubmissionData } from '../../../services/WorkSubmissionService';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

export default function NewWorkSubmissionScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { requestId, projectTitle, clientName, serviceType } = route.params;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submissionType, setSubmissionType] = useState<'initial' | 'revision' | 'final'>('initial');
  const [notes, setNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Set default title
    setTitle(`${serviceType || 'Work'} - ${projectTitle}`);
  }, [serviceType, projectTitle]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets) {
        const newFiles: SelectedFile[] = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          type: asset.mimeType || 'application/octet-stream'
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to select files');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('audio/')) return 'musical-notes';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('image/')) return 'image';
    return 'document';
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }

    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select at least one file');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to submit work');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert selected files to File objects (React Native compatible)
      const files: File[] = [];
      for (const selectedFile of selectedFiles) {
        try {
          // For React Native, create a File-like object that Supabase can handle
          const fileObject = {
            uri: selectedFile.uri,
            name: selectedFile.name,
            type: selectedFile.type || 'application/octet-stream',
            size: selectedFile.size || 0
          } as any; // Cast to File type for compatibility
          
          files.push(fileObject);
        } catch (error) {
          console.error('Error processing file:', selectedFile.name, error);
          Alert.alert('Error', `Failed to process file: ${selectedFile.name}`);
          return;
        }
      }

      const submissionData: WorkSubmissionData = {
        title: title.trim(),
        description: description.trim(),
        submissionType,
        files,
        notes: notes.trim() || undefined,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined
      };

      console.log('Submitting work with data:', {
        requestId,
        providerId: user.id,
        title: submissionData.title,
        fileCount: submissionData.files.length
      });

      const result = await WorkSubmissionService.submitWork(
        requestId,
        user.id,
        submissionData
      );

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          result.message || 'Your work has been submitted successfully!',
          [
            {
              text: 'Submit Another',
              onPress: () => {
                // Reset form
                setTitle('');
                setDescription('');
                setNotes('');
                setPaymentAmount('');
                setSelectedFiles([]);
              }
            },
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          result.error || 'Failed to submit work. Please try again.',
          [
            {
              text: 'Try Again',
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting work:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Work</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Project Info */}
      <View style={styles.projectInfoCard}>
        <Text style={styles.projectTitle}>{projectTitle}</Text>
        {clientName && <Text style={styles.clientName}>Client: {clientName}</Text>}
        {serviceType && <Text style={styles.serviceType}>Service: {serviceType}</Text>}
      </View>

      {/* Submission Type */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Submission Type</Text>
        <View style={styles.typeButtons}>
          {(['initial', 'revision', 'final'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                submissionType === type && styles.selectedTypeButton
              ]}
              onPress={() => setSubmissionType(type)}
              disabled={isSubmitting}
            >
              <Text style={[
                styles.typeButtonText,
                submissionType === type && styles.selectedTypeButtonText
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Basic Info */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Work Details</Text>
        
        <Text style={styles.inputLabel}>Title *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Hip-Hop Beat Production"
          placeholderTextColor="#6B7280"
          editable={!isSubmitting}
        />

        <Text style={styles.inputLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your work, style, and what makes it unique..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
          editable={!isSubmitting}
        />

        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes for the client..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          editable={!isSubmitting}
        />

        <Text style={styles.inputLabel}>Payment Amount (USD)</Text>
        <TextInput
          style={styles.textInput}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="150"
          placeholderTextColor="#6B7280"
          keyboardType="numeric"
          editable={!isSubmitting}
        />
      </View>

      {/* File Upload */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Files *</Text>
        <Text style={styles.cardSubtitle}>
          Upload your work files (audio, video, images, or documents)
        </Text>
        
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickFiles}
          disabled={isSubmitting}
        >
          <Ionicons name="cloud-upload" size={24} color="#3B82F6" />
          <Text style={styles.uploadButtonText}>Select Files</Text>
        </TouchableOpacity>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <View style={styles.fileList}>
            <Text style={styles.fileListTitle}>Selected Files ({selectedFiles.length})</Text>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons 
                    name={getFileIcon(file.type) as any} 
                    size={20} 
                    color="#3B82F6" 
                  />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>
                      {formatFileSize(file.size)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeFile(index)}
                  disabled={isSubmitting}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
  projectInfoCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  projectTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientName: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 2,
  },
  serviceType: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
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
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTypeButton: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTypeButtonText: {
    color: '#3B82F6',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
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
  uploadButton: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  fileList: {
    marginTop: 8,
  },
  fileListTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginBottom: 32,
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
});

