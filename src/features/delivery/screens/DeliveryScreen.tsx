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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { PaymentDeliveryService } from '../../../services/paymentDeliveryService';
import projectRequestService from '../../../services/projectRequestService';
import ProtectedFileDownload from '../../../components/ProtectedFileDownload';
import paymentIntegrationService from '../../../services/paymentIntegrationService';

interface DeliveryScreenProps {
  route: {
    params: {
      requestId: string;
    };
  };
  navigation: any;
}

export const DeliveryScreen: React.FC<DeliveryScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { requestId } = route.params;
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);
  const [deliveredFiles, setDeliveredFiles] = useState<any[]>([]);
  const [canDownloadFiles, setCanDownloadFiles] = useState(false);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const requestData = await projectRequestService.getProjectRequest(requestId);
      setRequest(requestData);
      
      // Get workflow status
      const status = await PaymentDeliveryService.getProjectWorkflowStatus(requestId);
      setWorkflowStatus(status);
      
      // Load delivered files
      const deliveries = await PaymentDeliveryService.getProjectDeliveries(requestId);
      setDeliveredFiles(deliveries);
      
      // Check download permissions
      const downloadPermission = await paymentIntegrationService.canDownloadFiles(requestId);
      setCanDownloadFiles(downloadPermission);
      
      // Set default title
      if (requestData?.project_description) {
        setTitle(`Delivery: ${requestData.project_description}`);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
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
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFileUrls(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeFile = (index: number) => {
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDelivery = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a delivery title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (fileUrls.length === 0) {
      Alert.alert('Error', 'Please upload at least one file');
      return;
    }

    try {
      setSubmitting(true);
      
      // Create delivery record
      const deliveryId = await PaymentDeliveryService.createDelivery(
        requestId,
        title.trim(),
        description.trim(),
        fileUrls,
        deliveryNotes.trim() || undefined
      );

      Alert.alert(
        'Delivery Submitted!',
        'Your delivery has been submitted successfully. The client will be notified and can review your work.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting delivery:', error);
      Alert.alert('Error', 'Failed to submit delivery');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Submit Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Project Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Project Details</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Client:</Text>
          <Text style={styles.summaryValue}>{request.client_name || 'Client'}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service:</Text>
          <Text style={styles.summaryValue}>{request.service_type}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Description:</Text>
          <Text style={styles.summaryValue}>{request.project_description}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Timeline:</Text>
          <Text style={styles.summaryValue}>{request.timeline}</Text>
        </View>

        {workflowStatus?.payment_status === 'completed' && (
          <View style={styles.paymentStatus}>
            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            <Text style={styles.paymentStatusText}>Payment Received</Text>
          </View>
        )}
      </View>

      {/* Delivery Form */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Delivery Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Title *</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter delivery title"
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
            placeholder="Describe what you've delivered"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            placeholder="Any additional notes for the client"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            editable={!submitting}
          />
        </View>
      </View>

      {/* File Upload */}
      <View style={styles.uploadCard}>
        <Text style={styles.cardTitle}>Upload Files *</Text>
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={submitting}
          >
            <Ionicons name="image" size={20} color="#3B82F6" />
            <Text style={styles.uploadButtonText}>Add Images</Text>
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
            {fileUrls.map((url, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons 
                    name={url.includes('image') ? 'image' : 'document'} 
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

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmitDelivery}
        disabled={submitting}
      >
        {submitting ? (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submittingText}>Submitting...</Text>
          </View>
        ) : (
          <View style={styles.submitButtonContent}>
            <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Delivery</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Delivered Files Section */}
      {deliveredFiles.length > 0 && (
        <View style={styles.deliveredFilesCard}>
          <Text style={styles.cardTitle}>Delivered Files</Text>
          
          {!canDownloadFiles && (
            <View style={styles.paymentRequiredNotice}>
              <Ionicons name="lock-closed" size={20} color="#F59E0B" />
              <Text style={styles.paymentRequiredText}>
                Payment required to download files
              </Text>
            </View>
          )}

          {deliveredFiles.map((delivery, deliveryIndex) => (
            <View key={delivery.id} style={styles.deliverySection}>
              <Text style={styles.deliveryTitle}>{delivery.title}</Text>
              <Text style={styles.deliveryDescription}>{delivery.description}</Text>
              <Text style={styles.deliveryDate}>
                Delivered: {new Date(delivery.delivered_at || delivery.created_at).toLocaleDateString()}
              </Text>
              
              {delivery.file_urls && delivery.file_urls.length > 0 && (
                <View style={styles.filesContainer}>
                  {delivery.file_urls.map((fileUrl: string, fileIndex: number) => (
                    <ProtectedFileDownload
                      key={`${delivery.id}-${fileIndex}`}
                      projectRequestId={requestId}
                      fileUrl={fileUrl}
                      fileName={`${delivery.title} - File ${fileIndex + 1}`}
                      fileSize="Unknown size"
                      fileType="document"
                      onPaymentRequired={() => {
                        Alert.alert(
                          'Payment Required',
                          'Complete payment to download this file',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Make Payment', 
                              onPress: () => navigation.navigate('PaymentScreen', { requestId })
                            }
                          ]
                        );
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Guidelines */}
      <View style={styles.guidelinesCard}>
        <Text style={styles.guidelinesTitle}>Delivery Guidelines</Text>
        <Text style={styles.guidelinesText}>
          • Ensure all files are high quality and meet the client's requirements{'\n'}
          • Include all requested deliverables{'\n'}
          • Provide clear descriptions of your work{'\n'}
          • The client can request revisions after delivery{'\n'}
          • Files will be available for download after payment confirmation
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  summaryCard: {
    backgroundColor: '#1E293B',
    margin: 16,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    flex: 1,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  inputGroup: {
    marginBottom: 20,
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
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
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
  deliveredFilesCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentRequiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  paymentRequiredText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  deliverySection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  deliveryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
  },
  deliveryDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 12,
  },
  filesContainer: {
    gap: 8,
  },
});
