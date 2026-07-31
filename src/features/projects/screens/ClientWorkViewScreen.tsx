import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useStripe } from '../../../contexts/StripeContext';
import { supabase } from '../../../lib/supabase';
import WorkSubmissionService from '../../../services/WorkSubmissionService';

// Conditionally import StripePaymentService for mobile only
let StripePaymentService: any = null;
if (Platform.OS !== 'web') {
  StripePaymentService = require('../../../services/stripePaymentService').default;
}

interface WorkSubmission {
  id: string;
  title: string;
  description: string;
  submission_type: string;
  file_urls: string[];
  file_count: number;
  status: string;
  payment_required: boolean;
  payment_amount?: number;
  payment_status: string;
  submission_notes?: string;
  client_feedback?: string;
  submitted_at: string;
  reviewed_at?: string;
  project_requests?: {
    title: string;
    service_type: string;
  };
}

export default function ClientWorkViewScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { isReady: stripeReady, isLoading: stripeLoading } = useStripe();
  const { submissionId } = route.params;
  
  const [submission, setSubmission] = useState<WorkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view submissions');
        return;
      }

      // Get client submissions and find the one we want
      const submissions = await WorkSubmissionService.getClientSubmissions(user.id);
      const foundSubmission = submissions.find(sub => sub.id === submissionId);
      
      if (foundSubmission) {
        setSubmission(foundSubmission);
      } else {
        Alert.alert('Error', 'Submission not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading submission:', error);
      Alert.alert('Error', 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = async (fileUrl: string) => {
    try {
      // Get secure URL for preview
      const secureUrl = await WorkSubmissionService.getSecureFileUrl(fileUrl, submission?.id || '');
      setPreviewFile(secureUrl);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('Error getting secure preview URL:', error);
      // Fallback to original URL
      setPreviewFile(fileUrl);
      setPreviewModalVisible(true);
    }
  };

  const handlePayment = async () => {
    if (!submission || !user) return;

    // Check if Stripe is ready
    if (!stripeReady) {
      Alert.alert(
        'Payment System Loading', 
        'Payment system is still initializing. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay $${submission.payment_amount || 0} for this work?\n\nThis will unlock the files for download and send payment to the service provider.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          style: 'default',
          onPress: async () => {
            try {
              setPaymentLoading(true);
              
              console.log('🔄 Starting payment process for submission:', submission.id);
              
              const paymentResult = await StripePaymentService.processPayment({
                paymentId: submission.payment_record_id || submission.id,
                projectRequestId: submission.project_request_id || submission.id,
                amount: submission.payment_amount || 50,
                currency: 'usd',
                clientId: user.id,
                providerId: submission.service_provider_id || '',
                description: `Payment for work: ${submission.title}`
              });
              
              if (paymentResult.success) {
                console.log('🎉 Payment successful!', paymentResult.paymentId);
                
                // Update local state immediately for better UX
                const updatedSubmission = { 
                  ...submission, 
                  payment_status: 'paid',
                  payment_amount: submission.payment_amount
                };
                setSubmission(updatedSubmission);
                setPaymentCompleted(true);
                
                Alert.alert(
                  'Payment Successful! 🎉', 
                  'Your payment has been processed successfully! The files are now unlocked for download and the service provider will receive their payment.',
                  [{ text: 'Great!', style: 'default' }]
                );
              } else {
                console.error('❌ Payment failed:', paymentResult.error);
                
                // Show user-friendly error using the service's built-in error handling
                StripePaymentService.showPaymentError(
                  new Error(paymentResult.error || 'Payment failed'),
                  () => handlePayment() // Retry callback
                );
              }
            } catch (error) {
              console.error('💥 Payment process error:', error);
              
              // Use the service's error handling for consistent UX
              StripePaymentService.showPaymentError(
                error,
                () => handlePayment() // Retry callback
              );
            } finally {
              setPaymentLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    if (submission?.payment_status !== 'paid' && !paymentCompleted) {
      Alert.alert('Payment Required', 'Please complete payment before downloading.');
      return;
    }

    try {
      console.log('Starting download for:', fileName, 'from:', fileUrl);
      
      // First, let's check if the URL is accessible
      console.log('Original file URL:', fileUrl);
      
      // Try to detect if it's a Supabase public URL and get signed URL
      let downloadUrl = fileUrl;
      if (fileUrl.includes('supabase.co/storage/v1/object/public/')) {
        console.log('Detected public Supabase URL, trying to get signed URL...');
        
        // Extract bucket and file path
        const urlParts = fileUrl.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          
          console.log('Bucket:', bucket, 'File path:', filePath);
          
          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (data?.signedUrl && !error) {
              downloadUrl = data.signedUrl;
              console.log('Got signed URL:', downloadUrl);
            } else {
              console.error('Error creating signed URL:', error);
            }
          } catch (signError) {
            console.error('Signing error:', signError);
          }
        }
      }
      
      // Check if the URL returns actual file content
      console.log('Final URL check...');
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      console.log('Final URL check:', response.status, response.headers.get('content-type'));
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        console.error('File URL returning JSON instead of file:', downloadUrl);
        
        // Try the secure file URL function
        console.log('Trying secure file URL function...');
        try {
          const secureUrl = await WorkSubmissionService.getSecureFileUrl(fileUrl, submission?.id || '');
          if (secureUrl !== fileUrl) {
            downloadUrl = secureUrl;
            console.log('Got different secure URL:', secureUrl);
          } else {
            throw new Error('Secure URL function failed');
          }
        } catch (secureError) {
          console.error('Secure URL function error:', secureError);
          throw new Error('File URL is returning JSON instead of the actual file');
        }
      }
      
      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop() || 'file';
      const uniqueFileName = `${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}_${timestamp}.${fileExtension}`;
      const downloadPath = FileSystem.cacheDirectory + uniqueFileName;
      
      console.log('Downloading to:', downloadPath);
      
      // Download file to device using the working URL
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, downloadPath);
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status === 200) {
        // Try to save to device's photo library if it's an image
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            console.log('Media library permission:', permission);
            
            if (permission.granted) {
              const asset = await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
              console.log('Asset saved:', asset);
              Alert.alert('Success!', 'Image saved to Photos app!');
            } else {
              // Fallback: Show file location
              Alert.alert('Download Complete!', `File saved to: ${downloadResult.uri}`);
            }
          } catch (mediaError) {
            console.error('Media library error:', mediaError);
            // Fallback: Show file location
            Alert.alert('Download Complete!', `File saved to: ${downloadResult.uri}`);
          }
        } else {
          // For other files, show success message
          Alert.alert('Download Complete!', `File saved to: ${downloadResult.uri}`);
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert(
        'Download Failed', 
        `The file appears to be inaccessible. This might be a permission issue with the file storage.\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };


  const handleApprove = async () => {
    if (!submission || !user) return;

    Alert.alert(
      'Approve Work',
      submission.payment_required 
        ? `Approve this work and authorize payment of $${submission.payment_amount}?`
        : 'Approve this work submission?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(true);
              
              const result = await WorkSubmissionService.approveSubmission(
                submissionId,
                user.id
              );

              if (result.success) {
                Alert.alert(
                  'Work Approved! ✅',
                  submission.payment_required 
                    ? 'Payment has been processed. The work is now approved.'
                    : 'The work has been approved successfully.',
                  [
                    {
                      text: 'OK',
                      onPress: () => loadSubmission() // Refresh
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to approve work');
              }
            } catch (error) {
              console.error('Error approving work:', error);
              Alert.alert('Error', 'Failed to approve work');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRequestRevision = () => {
    if (!submission) return;

    Alert.prompt(
      'Request Revision',
      'Please provide feedback on what changes you need:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async (feedback) => {
            if (!feedback || !feedback.trim()) {
              Alert.alert('Error', 'Please provide feedback for the revision');
              return;
            }

            try {
              setActionLoading(true);
              
              const result = await WorkSubmissionService.requestRevision(
                submissionId,
                user!.id,
                feedback.trim()
              );

              if (result.success) {
                Alert.alert(
                  'Revision Requested 🔄',
                  'Your revision request has been sent to the service provider.',
                  [
                    {
                      text: 'OK',
                      onPress: () => loadSubmission() // Refresh
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to request revision');
              }
            } catch (error) {
              console.error('Error requesting revision:', error);
              Alert.alert('Error', 'Failed to request revision');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#F59E0B';
      case 'approved': return '#3B82F6';
      case 'rejected': return '#EF4444';
      case 'revision_requested': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return 'time';
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'revision_requested': return 'refresh-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading submission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Submission Not Found</Text>
          <Text style={styles.errorText}>
            The requested submission could not be found.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Work Submission</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Submission Info Card */}
      <View style={styles.submissionCard}>
        <View style={styles.submissionHeader}>
          <View style={styles.submissionTitleContainer}>
            <Text style={styles.submissionTitle}>{submission.title}</Text>
            <View style={styles.submissionTypeTag}>
              <Text style={styles.submissionTypeText}>
                {submission.submission_type.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
              <Ionicons 
                name={getStatusIcon(submission.status) as any} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.statusText}>
                {submission.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Status Indicator */}
        {(submission.payment_status || paymentCompleted) && (
          <View style={styles.paymentStatusContainer}>
            <Ionicons 
              name={(submission.payment_status === 'paid' || paymentCompleted) ? 'checkmark-circle' : 'lock-closed'} 
              size={16} 
              color={(submission.payment_status === 'paid' || paymentCompleted) ? '#3B82F6' : '#F59E0B'} 
            />
            <Text style={[styles.paymentStatusText, { 
              color: (submission.payment_status === 'paid' || paymentCompleted) ? '#3B82F6' : '#F59E0B' 
            }]}>
              {(submission.payment_status === 'paid' || paymentCompleted) ? 'PAID' : 'PAYMENT REQUIRED'}
            </Text>
            {(submission.payment_amount || paymentCompleted) && (
              <Text style={styles.paymentAmountText}>
                ${submission.payment_amount || 0}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.submissionDescription}>{submission.description}</Text>

        {submission.submission_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Provider Notes:</Text>
            <Text style={styles.notesText}>{submission.submission_notes}</Text>
          </View>
        )}

        {submission.client_feedback && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackLabel}>Your Feedback:</Text>
            <Text style={styles.feedbackText}>{submission.client_feedback}</Text>
          </View>
        )}

        <View style={styles.submissionMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="documents" size={16} color="#3B82F6" />
            <Text style={styles.metaText}>{submission.file_count} files</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color="#3B82F6" />
            <Text style={styles.metaText}>{formatDate(submission.submitted_at)}</Text>
          </View>
          {submission.payment_amount && (
            <View style={styles.metaItem}>
              <Ionicons name="card" size={16} color="#3B82F6" />
              <Text style={styles.metaText}>${submission.payment_amount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Files Section */}
      {submission.file_urls && submission.file_urls.length > 0 && (
        <View style={styles.filesCard}>
          <Text style={styles.filesTitle}>Files ({submission.file_urls.length})</Text>
          {submission.file_urls.map((fileUrl, index) => {
            const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
            const isPaid = submission.payment_status === 'paid' || paymentCompleted;
            
            return (
              <View key={index} style={styles.fileItem}>
                <TouchableOpacity 
                  style={styles.fileInfo}
                  onPress={() => handlePreviewFile(fileUrl)}
                >
                  <Ionicons 
                    name={getFileIcon(fileUrl) as any} 
                    size={24} 
                    color="#3B82F6" 
                  />
                  <Text style={styles.fileName}>{fileName}</Text>
                </TouchableOpacity>
                
                <View style={styles.fileActions}>
                  <TouchableOpacity 
                    style={styles.fileActionButton}
                    onPress={() => handlePreviewFile(fileUrl)}
                  >
                    <Ionicons name="eye" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                  
                  {(isPaid || paymentCompleted) ? (
                    <View style={styles.fileActionButtons}>
                      <TouchableOpacity 
                        style={styles.fileActionButton}
                        onPress={() => handleDownload(fileUrl, fileName)}
                      >
                        <Ionicons name="download" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.fileActionButton}
                        onPress={() => Linking.openURL(fileUrl)}
                      >
                        <Ionicons name="open" size={20} color="#3B82F6" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.fileActionButton}
                      onPress={handlePayment}
                    >
                      <Ionicons name="lock-closed" size={20} color="#F59E0B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Action Buttons */}
      {submission.status === 'submitted' && (
        <View style={styles.actionButtons}>
          {submission.payment_required && submission.payment_status !== 'paid' && !paymentCompleted ? (
            // Payment Required Section
            <View style={styles.paymentSection}>
              <View style={styles.paymentInfo}>
                <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentTitle}>Payment Required</Text>
                  <Text style={styles.paymentDescription}>
                    Pay ${submission.payment_amount} to unlock and download files
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  (!stripeReady || stripeLoading) && styles.paymentButtonDisabled
                ]}
                onPress={handlePayment}
                disabled={paymentLoading || !stripeReady || stripeLoading}
              >
                {paymentLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : stripeLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.paymentButtonText}>
                      Initializing Payment System...
                    </Text>
                  </>
                ) : !stripeReady ? (
                  <>
                    <Ionicons name="warning" size={20} color="#FFFFFF" />
                    <Text style={styles.paymentButtonText}>
                      Payment System Unavailable
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#FFFFFF" />
                    <Text style={styles.paymentButtonText}>
                      Pay Now - ${submission.payment_amount}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.paymentNote}>
                Secure payment • Download immediately after payment
              </Text>
            </View>
          ) : (
            // Work Review Section (when paid)
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Review Submitted Work</Text>
              <Text style={styles.reviewDescription}>
                The service provider has completed the work. Please review and provide feedback.
              </Text>
              
              <View style={styles.reviewButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Approve Work</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.revisionButton]}
                  onPress={handleRequestRevision}
                  disabled={actionLoading}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Request Revision</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Payment Status - Show when paid */}
      {(submission?.payment_status === 'paid' || paymentCompleted) && (
        <View style={styles.paidStatusSection}>
          <View style={styles.paidStatusCard}>
            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            <View style={styles.paidStatusInfo}>
              <Text style={styles.paidStatusTitle}>Payment Complete</Text>
              <Text style={styles.paidStatusAmount}>${submission?.payment_amount || 0}</Text>
            </View>
          </View>
          <Text style={styles.paidStatusNote}>
            Files are now unlocked for download
          </Text>
        </View>
      )}

      {/* File Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>File Preview</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {previewFile && (
              <View style={styles.previewContainer}>
                {previewFile.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <Image 
                    source={{ uri: previewFile }} 
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Ionicons name="document" size={64} color="#3B82F6" />
                    <Text style={styles.previewText}>Preview not available</Text>
                    <Text style={styles.previewSubtext}>This file type cannot be previewed</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    padding: 32,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
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
  submissionCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  submissionHeader: {
    marginBottom: 16,
  },
  submissionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  submissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  submissionTypeTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  submissionTypeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  paymentAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginLeft: 'auto',
  },
  submissionDescription: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  notesContainer: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackContainer: {
    backgroundColor: '#1E3A8A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  feedbackLabel: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedbackText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  submissionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 6,
  },
  filesCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    marginLeft: 12,
    flex: 1,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileActionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#4B5563',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  approveButton: {
    backgroundColor: '#3B82F6',
  },
  revisionButton: {
    backgroundColor: '#F59E0B',
  },
  paymentButton: {
    backgroundColor: '#3B82F6',
  },
  bottomPaymentSection: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  testPaymentButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  paidButton: {
    backgroundColor: '#6B7280',
  },
  realPaymentButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  realPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  paidStatusButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  paidStatusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  testPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  bigPayButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bigPayButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  paymentNote: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  paymentDetails: {
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  paymentValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  previewContainer: {
    padding: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.6,
    borderRadius: 8,
  },
  previewPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  previewSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // New Payment Section Styles
  paymentSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  paymentSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentSectionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  paymentActionButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentNote: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Review Section Styles
  reviewSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  reviewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  // Paid Status Section Styles
  paidStatusSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginTop: 16,
  },
  paidStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paidStatusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paidStatusTitle: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  paidStatusAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paidStatusNote: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});

