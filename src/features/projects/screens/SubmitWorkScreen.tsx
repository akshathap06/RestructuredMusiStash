import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import WorkSubmissionService, { WorkSubmissionData } from '../../../services/WorkSubmissionService';
import { supabase } from '../../../lib/supabase';
import { WorkSubmissionFileDownload } from '../components/WorkSubmissionFileDownload';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
}

interface PreviousSubmission {
  id: string;
  title: string;
  description: string;
  file_urls: string[];
  submitted_at: string;
  status: string;
}

export default function SubmitWorkScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { requestId, projectTitle, clientName, serviceType, agreedPrice } = route.params;

  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previousSubmissions, setPreviousSubmissions] = useState<PreviousSubmission[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(true);

  // Load previous submissions
  useEffect(() => {
    const loadPreviousSubmissions = async () => {
      try {
        setLoadingPrevious(true);
        const { data, error } = await supabase
          .from('work_submissions')
          .select('*')
          .eq('project_request_id', requestId)
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          setPreviousSubmissions(data);
          console.log('Previous submissions loaded:', data.length);
        }
      } catch (error) {
        console.error('Error loading previous submissions:', error);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPreviousSubmissions();
  }, [requestId]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'image/*', 'application/pdf', 'application/zip'],
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type.startsWith('audio/')) return 'musical-notes';
    if (type.startsWith('video/')) return 'videocam';
    if (type.startsWith('image/')) return 'image';
    if (type.includes('zip')) return 'archive';
    return 'document';
  };

  const getFileColor = (type: string): string => {
    if (type.startsWith('audio/')) return '#3B82F6';
    if (type.startsWith('video/')) return '#EC4899';
    if (type.startsWith('image/')) return '#3B82F6';
    if (type.includes('zip')) return '#F59E0B';
    return '#6B7280';
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to submit work');
      return;
    }

    if (selectedFiles.length === 0) {
      Alert.alert('Add Files', 'Please select at least one file to upload');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      const files: File[] = selectedFiles.map(f => ({
        uri: f.uri,
        name: f.name,
        type: f.type,
        size: f.size
      } as any));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const submissionData: WorkSubmissionData = {
        title: `${serviceType} Delivery`,
        description: description.trim() || 'Work delivered as agreed',
        submissionType: 'final',
        files,
        paymentAmount: agreedPrice
      };

      const result = await WorkSubmissionService.submitWork(requestId, user.id, submissionData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        Alert.alert(
          'Work Submitted! 🎉',
          'Your files have been securely uploaded. The client will be notified and can now review your work.',
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Upload Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      console.error('Error submitting work:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deliver Work</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Info */}
        <View style={styles.projectCard}>
          <View style={styles.projectIcon}>
            <Ionicons name="briefcase" size={24} color="#3B82F6" />
          </View>
          <View style={styles.projectInfo}>
            <Text style={styles.projectTitle}>{serviceType}</Text>
            <Text style={styles.projectClient}>for {clientName}</Text>
          </View>
          {agreedPrice && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>${agreedPrice}</Text>
            </View>
          )}
        </View>

        {/* Previous Submissions */}
        {loadingPrevious ? (
          <View style={styles.loadingPrevious}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.loadingPreviousText}>Loading previous submissions...</Text>
          </View>
        ) : previousSubmissions.length > 0 && (
          <View style={styles.previousSubmissionsSection}>
            <View style={styles.previousSubmissionsHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.previousSubmissionsTitle}>
                Previously Submitted ({previousSubmissions.length})
              </Text>
            </View>
            
            {previousSubmissions.map((submission, index) => (
              <View key={submission.id} style={styles.previousSubmissionCard}>
                <View style={styles.previousSubmissionHeader}>
                  <Text style={styles.previousSubmissionTitle}>{submission.title}</Text>
                  <Text style={styles.previousSubmissionDate}>
                    {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                
                {submission.description && (
                  <Text style={styles.previousSubmissionDescription} numberOfLines={2}>
                    {submission.description}
                  </Text>
                )}
                
                <View style={styles.previousFilesContainer}>
                  <Text style={styles.previousFilesLabel}>
                    {submission.file_urls?.length || 0} file{(submission.file_urls?.length || 0) !== 1 ? 's' : ''} submitted:
                  </Text>
                  {submission.file_urls?.map((fileUrl: string, fileIndex: number) => {
                    const urlParts = fileUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1]?.split('?')[0] || `File ${fileIndex + 1}`;
                    return (
                      <WorkSubmissionFileDownload
                        key={fileIndex}
                        fileUrl={fileUrl}
                        fileName={fileName}
                        submissionId={submission.id}
                        onDownloadComplete={() => console.log('File downloaded:', fileName)}
                      />
                    );
                  })}
                </View>
                
                <View style={styles.previousSubmissionStatus}>
                  <Ionicons 
                    name={submission.status === 'approved' ? 'checkmark-circle' : 'time'} 
                    size={14} 
                    color={submission.status === 'approved' ? '#10B981' : '#F59E0B'} 
                  />
                  <Text style={[
                    styles.previousSubmissionStatusText,
                    { color: submission.status === 'approved' ? '#10B981' : '#F59E0B' }
                  ]}>
                    {submission.status === 'approved' ? 'Approved' : 'Pending Review'}
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.submitMoreDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Submit Additional Files</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )}

        {/* Upload Area */}
        <TouchableOpacity 
          style={styles.uploadArea} 
          onPress={pickFiles}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="cloud-upload" size={40} color="#3B82F6" />
          </View>
          <Text style={styles.uploadTitle}>Tap to add files</Text>
          <Text style={styles.uploadSubtitle}>Audio, Video, Images, PDFs, ZIPs</Text>
        </TouchableOpacity>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <View style={styles.filesSectionHeader}>
              <Text style={styles.filesSectionTitle}>
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </Text>
              <Text style={styles.totalSize}>{formatFileSize(totalSize)}</Text>
            </View>

            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileCard}>
                <View style={[styles.fileIconContainer, { backgroundColor: getFileColor(file.type) + '20' }]}>
                  <Ionicons name={getFileIcon(file.type)} size={20} color={getFileColor(file.type)} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => removeFile(index)} 
                  style={styles.removeButton}
                  disabled={isSubmitting}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addMoreButton} 
              onPress={pickFiles}
              disabled={isSubmitting}
            >
              <Ionicons name="add" size={20} color="#3B82F6" />
              <Text style={styles.addMoreText}>Add more files</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Optional Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Add a note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Any details about this delivery..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            editable={!isSubmitting}
          />
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
          <Text style={styles.securityText}>
            Files are encrypted and securely stored. Only the client can access them after payment.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        {isSubmitting && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || selectedFiles.length === 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || selectedFiles.length === 0}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.submittingContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitButtonText}>Uploading... {uploadProgress}%</Text>
            </View>
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {selectedFiles.length > 0 
                  ? `Deliver ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
                  : 'Select files to deliver'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F620',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  projectClient: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 2,
  },
  priceTag: {
    backgroundColor: '#3B82F620',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadArea: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 40,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F615',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  uploadSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  filesSection: {
    marginTop: 24,
  },
  filesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filesSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  totalSize: {
    color: '#6B7280',
    fontSize: 14,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addMoreText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  noteSection: {
    marginTop: 24,
  },
  noteLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  securityText: {
    color: '#6B7280',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#0A0A0A',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  submittingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Previous Submissions Styles
  loadingPrevious: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingPreviousText: {
    color: '#6B7280',
    fontSize: 14,
  },
  previousSubmissionsSection: {
    marginBottom: 20,
  },
  previousSubmissionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previousSubmissionsTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  previousSubmissionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  previousSubmissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previousSubmissionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  previousSubmissionDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  previousSubmissionDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  previousFilesContainer: {
    marginTop: 8,
  },
  previousFilesLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 8,
  },
  previousSubmissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  previousSubmissionStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  submitMoreDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
});

