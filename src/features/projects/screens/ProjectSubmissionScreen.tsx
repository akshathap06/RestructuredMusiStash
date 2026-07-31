import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { TextInput, Button, Card, Chip, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectDeliveryService, { SubmissionData } from '../../../services/projectDeliveryService';

const { width } = Dimensions.get('window');

interface ProjectSubmissionScreenProps {
  route: {
    params: {
      requestId: string;
      projectTitle: string;
      clientName: string;
      serviceType: string;
      budgetRange: string;
      timeline: string;
    };
  };
  navigation: any;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
  file?: File; // For web
}

const ProjectSubmissionScreen: React.FC<ProjectSubmissionScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { requestId, projectTitle, clientName, serviceType, budgetRange, timeline } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryType, setDeliveryType] = useState<'initial' | 'revision' | 'final'>('initial');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Set default title based on project info
    setTitle(`${serviceType} - ${projectTitle}`);
  }, [serviceType, projectTitle]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'image/*', 'application/pdf'],
        multiple: true,
        copyToCacheDirectory: false
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

  const validateSubmission = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your submission');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of your work');
      return false;
    }
    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'Please select at least one file to submit');
      return false;
    }
    if (paymentAmount && (isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return false;
    }
    return true;
  };

  const submitDelivery = async () => {
    if (!validateSubmission() || !user) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Convert selected files to File objects for upload
      const files: File[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        
        try {
          if (Platform.OS === 'web' && selectedFile.file) {
            files.push(selectedFile.file);
          } else {
            // For mobile (React Native), create a FormData-compatible object
            const fileUri = selectedFile.uri;
            
            // Create a file-like object that works with React Native
            const file = {
              uri: fileUri,
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size
            } as any; // FormData will handle this properly
            
            files.push(file);
          }
          
          // Update progress for file preparation
          setUploadProgress((i + 1) / selectedFiles.length * 0.3); // 30% for file preparation
        } catch (error) {
          console.error(`Error preparing file ${selectedFile.name}:`, error);
          Alert.alert('Error', `Failed to prepare file: ${selectedFile.name}`);
          return;
        }
      }

      const submissionData: SubmissionData = {
        title: title.trim(),
        description: description.trim(),
        deliveryType,
        deliveryNotes: deliveryNotes.trim() || undefined,
        paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        files
      };

      setUploadProgress(0.3); // 30% for file prep, now starting upload

      const result = await ProjectDeliveryService.submitDelivery(
        requestId,
        user.id,
        submissionData
      );

      setUploadProgress(1); // 100% complete

      if (result.success) {
        Alert.alert(
          'Success!',
          'Your work has been submitted successfully. The client will be notified and can review your submission.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit delivery');
      }
    } catch (error) {
      console.error('Error submitting delivery:', error);
      Alert.alert('Error', 'An unexpected error occurred while submitting your work');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const totalFileSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Project Info Card */}
        <Card style={styles.projectCard}>
          <Card.Content>
            <Text style={styles.projectTitle}>{projectTitle}</Text>
            <Text style={styles.clientName}>Client: {clientName}</Text>
            <View style={styles.projectDetails}>
              <Text style={styles.detailText}>Service: {serviceType}</Text>
              <Text style={styles.detailText}>Budget: ${budgetRange}</Text>
              <Text style={styles.detailText}>Timeline: {timeline}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Submission Form */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Submit Your Work</Text>

            {/* Delivery Type Selection */}
            <Text style={styles.label}>Delivery Type</Text>
            <View style={styles.deliveryTypeContainer}>
              {['initial', 'revision', 'final'].map((type) => (
                <Chip
                  key={type}
                  mode={deliveryType === type ? 'flat' : 'outlined'}
                  selected={deliveryType === type}
                  onPress={() => setDeliveryType(type as any)}
                  style={[
                    styles.deliveryTypeChip,
                    deliveryType === type && styles.selectedChip
                  ]}
                  textStyle={deliveryType === type && styles.selectedChipText}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Chip>
              ))}
            </View>

            {/* Title Input */}
            <TextInput
              label="Submission Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              mode="outlined"
              outlineColor="#333"
              activeOutlineColor="#00D4AA"
              textColor="#FFFFFF"
              placeholder="Enter a title for your work"
              placeholderTextColor="#888"
            />

            {/* Description Input */}
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              mode="outlined"
              outlineColor="#333"
              activeOutlineColor="#00D4AA"
              textColor="#FFFFFF"
              multiline
              numberOfLines={4}
              placeholder="Describe your work, process, and any important details"
              placeholderTextColor="#888"
            />

            {/* Delivery Notes */}
            <TextInput
              label="Delivery Notes (Optional)"
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              style={styles.input}
              mode="outlined"
              outlineColor="#333"
              activeOutlineColor="#00D4AA"
              textColor="#FFFFFF"
              multiline
              numberOfLines={3}
              placeholder="Any additional notes for the client"
              placeholderTextColor="#888"
            />

            {/* Payment Amount */}
            <TextInput
              label="Payment Amount (Optional)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              style={styles.input}
              mode="outlined"
              outlineColor="#333"
              activeOutlineColor="#00D4AA"
              textColor="#FFFFFF"
              keyboardType="numeric"
              placeholder="Enter amount if different from agreed"
              placeholderTextColor="#888"
              left={<TextInput.Affix text="$" />}
            />
          </Card.Content>
        </Card>

        {/* File Upload Section */}
        <Card style={styles.formCard}>
          <Card.Content>
            <View style={styles.fileHeader}>
              <Text style={styles.sectionTitle}>Files</Text>
              <TouchableOpacity onPress={pickFiles} style={styles.addFileButton}>
                <Ionicons name="add" size={20} color="#00D4AA" />
                <Text style={styles.addFileText}>Add Files</Text>
              </TouchableOpacity>
            </View>

            {selectedFiles.length > 0 && (
              <View style={styles.fileSummary}>
                <Text style={styles.fileSummaryText}>
                  {selectedFiles.length} file(s) • {formatFileSize(totalFileSize)}
                </Text>
              </View>
            )}

            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons 
                    name={getFileIcon(file.type)} 
                    size={24} 
                    color="#00D4AA" 
                    style={styles.fileIcon}
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
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}

            {selectedFiles.length === 0 && (
              <TouchableOpacity onPress={pickFiles} style={styles.uploadPlaceholder}>
                <Ionicons name="cloud-upload-outline" size={48} color="#666" />
                <Text style={styles.uploadPlaceholderText}>
                  Tap to select files
                </Text>
                <Text style={styles.uploadHint}>
                  Supports audio, video, images, and PDFs
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Upload Progress */}
        {isSubmitting && (
          <Card style={styles.progressCard}>
            <Card.Content>
              <Text style={styles.progressText}>
                Uploading and submitting your work...
              </Text>
              <ProgressBar 
                progress={uploadProgress} 
                color="#00D4AA" 
                style={styles.progressBar}
              />
              <Text style={styles.progressPercentage}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <Button
          mode="contained"
          onPress={submitDelivery}
          disabled={isSubmitting || selectedFiles.length === 0}
          style={styles.submitButton}
          labelStyle={styles.submitButtonText}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Work'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  projectCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    color: '#00D4AA',
    marginBottom: 12,
  },
  projectDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#CCCCCC',
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  formCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  deliveryTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  deliveryTypeChip: {
    backgroundColor: '#333333',
  },
  selectedChip: {
    backgroundColor: '#00D4AA',
  },
  selectedChipText: {
    color: '#000000',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#333333',
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFileText: {
    color: '#00D4AA',
    marginLeft: 4,
    fontWeight: '500',
  },
  fileSummary: {
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileSummaryText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
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
  fileSize: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#666666',
    borderRadius: 8,
    padding: 32,
  },
  uploadPlaceholderText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 8,
  },
  uploadHint: {
    color: '#888888',
    fontSize: 12,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginBottom: 8,
  },
  progressPercentage: {
    color: '#00D4AA',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  submitButton: {
    backgroundColor: '#00D4AA',
    paddingVertical: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default ProjectSubmissionScreen;
