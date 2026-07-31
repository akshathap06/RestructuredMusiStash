import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectDeliveryService from '../../../services/projectDeliveryService';
import { supabase } from '../../../lib/supabase';

interface DeliveryPreviewScreenProps {
  route: {
    params: {
      deliveryId: string;
      projectRequestId?: string;
    };
  };
  navigation: any;
}

interface DeliveryPreview {
  id: string;
  title: string;
  description: string;
  delivery_type: 'initial' | 'revision' | 'final';
  revision_number: number;
  total_files: number;
  submission_status: string;
  payment_status: string;
  payment_required: boolean;
  payment_amount?: number;
  submitted_at: string;
  delivery_notes?: string;
  can_download: boolean;
  file_urls?: string[];
}

export const DeliveryPreviewScreen: React.FC<DeliveryPreviewScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { user } = useAuth();
  const { deliveryId } = route.params;
  
  const [delivery, setDelivery] = useState<DeliveryPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadDeliveryPreview();
  }, [deliveryId]);

  const loadDeliveryPreview = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view deliveries');
        return;
      }

      // Call the preview function
      const { data, error } = await supabase.rpc('get_delivery_preview', {
        p_delivery_id: deliveryId,
        p_user_id: user.id
      });

      if (error) {
        console.error('Error loading delivery preview:', error);
        Alert.alert('Error', `Failed to load delivery: ${error.message}`);
        return;
      }

      if (!data.success) {
        Alert.alert('Error', data.error || 'Failed to load delivery');
        return;
      }

      // Get full delivery details for file URLs
      const deliveryDetails = await ProjectDeliveryService.getDeliveryDetails(deliveryId);
      
      setDelivery({
        ...data.delivery,
        file_urls: deliveryDetails?.file_urls || []
      });
    } catch (error) {
      console.error('Error loading delivery preview:', error);
      Alert.alert('Error', 'Failed to load delivery preview');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndPay = async () => {
    if (!delivery || !user) return;

    Alert.alert(
      'Approve Delivery',
      delivery.payment_required 
        ? `Approve this delivery and authorize payment of $${delivery.payment_amount}?`
        : 'Approve this delivery? This will mark it as complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setApproving(true);
              
              const { data, error } = await supabase.rpc('approve_and_pay_delivery', {
                p_delivery_id: deliveryId,
                p_client_id: user.id,
                p_payment_intent_id: delivery.payment_required ? `payment_${Date.now()}` : null
              });

              if (error) {
                throw error;
              }

              if (!data.success) {
                throw new Error(data.error || 'Failed to approve delivery');
              }

              Alert.alert(
                'Delivery Approved! ✅',
                delivery.payment_required 
                  ? 'Payment processed successfully. You can now download the files.'
                  : 'Delivery approved successfully. You can now download the files.',
                [
                  {
                    text: 'Download Files',
                    onPress: () => handleDownloadFiles()
                  },
                  {
                    text: 'OK',
                    onPress: () => loadDeliveryPreview() // Refresh
                  }
                ]
              );
            } catch (error) {
              console.error('Error approving delivery:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to approve delivery');
            } finally {
              setApproving(false);
            }
          }
        }
      ]
    );
  };

  const handleDownloadFiles = async () => {
    if (!delivery || !user || !delivery.file_urls) return;

    if (!delivery.can_download) {
      Alert.alert(
        'Download Not Available',
        delivery.payment_required && delivery.payment_status !== 'completed'
          ? 'Please approve and complete payment first.'
          : 'Download is not available yet.'
      );
      return;
    }

    try {
      setDownloading(true);

      // Download each file
      for (let i = 0; i < delivery.file_urls.length; i++) {
        const fileUrl = delivery.file_urls[i];
        const fileName = `delivery_file_${i + 1}`;
        
        const result = await ProjectDeliveryService.downloadFile(
          deliveryId,
          fileUrl,
          fileName,
          user.id
        );

        if (!result.success) {
          console.warn(`Failed to download file ${i + 1}:`, result.error);
        }
      }

      Alert.alert(
        'Download Complete! 📁',
        `${delivery.file_urls.length} file(s) have been downloaded.`
      );
    } catch (error) {
      console.error('Error downloading files:', error);
      Alert.alert('Error', 'Failed to download files');
    } finally {
      setDownloading(false);
    }
  };

  const handleRequestRevision = () => {
    if (!delivery) return;

    navigation.navigate('RequestRevision', {
      deliveryId: delivery.id,
      deliveryTitle: delivery.title
    });
  };

  const handlePreviewFile = async (fileUrl: string, index: number) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Preview Not Available', 'Cannot preview this file type on your device.');
      }
    } catch (error) {
      console.error('Error opening file preview:', error);
      Alert.alert('Error', 'Failed to preview file');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#F59E0B';
      case 'approved': return '#3B82F6';
      case 'revision_requested': return '#EF4444';
      case 'completed': return '#3B82F6';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return 'time';
      case 'approved': return 'checkmark-circle';
      case 'revision_requested': return 'refresh';
      case 'completed': return 'checkmark-done-circle';
      case 'pending': return 'hourglass';
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading delivery...</Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Delivery Not Found</Text>
        <Text style={styles.errorText}>
          The requested delivery could not be found or you don't have access to it.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
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
        <Text style={styles.headerTitle}>Delivery Preview</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Delivery Info Card */}
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryTitleContainer}>
            <Text style={styles.deliveryTitle}>{delivery.title}</Text>
            <View style={styles.deliveryTypeTag}>
              <Text style={styles.deliveryTypeText}>
                {delivery.delivery_type.toUpperCase()}
                {delivery.revision_number > 0 && ` #${delivery.revision_number}`}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.submission_status) }]}>
              <Ionicons 
                name={getStatusIcon(delivery.submission_status) as any} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.statusText}>
                {delivery.submission_status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.deliveryDescription}>{delivery.description}</Text>

        {delivery.delivery_notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Delivery Notes:</Text>
            <Text style={styles.notesText}>{delivery.delivery_notes}</Text>
          </View>
        )}

        <View style={styles.deliveryMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="documents" size={16} color="#3B82F6" />
            <Text style={styles.metaText}>{delivery.total_files} files</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color="#3B82F6" />
            <Text style={styles.metaText}>{formatDate(delivery.submitted_at)}</Text>
          </View>
          {delivery.payment_amount && (
            <View style={styles.metaItem}>
              <Ionicons name="card" size={16} color="#3B82F6" />
              <Text style={styles.metaText}>${delivery.payment_amount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Files Section */}
      {delivery.file_urls && delivery.file_urls.length > 0 && (
        <View style={styles.filesCard}>
          <Text style={styles.filesTitle}>Files ({delivery.file_urls.length})</Text>
          {delivery.file_urls.map((fileUrl, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.fileItem}
              onPress={() => handlePreviewFile(fileUrl, index)}
            >
              <View style={styles.fileInfo}>
                <Ionicons 
                  name={getFileIcon(fileUrl) as any} 
                  size={24} 
                  color="#3B82F6" 
                />
                <Text style={styles.fileName}>
                  {fileUrl.split('/').pop() || `File ${index + 1}`}
                </Text>
              </View>
              <Ionicons name="eye" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {delivery.submission_status === 'submitted' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApproveAndPay}
              disabled={approving}
            >
              {approving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>
                    {delivery.payment_required ? `Approve & Pay $${delivery.payment_amount}` : 'Approve Delivery'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.revisionButton]}
              onPress={handleRequestRevision}
              disabled={approving}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Request Revision</Text>
            </TouchableOpacity>
          </>
        )}

        {delivery.can_download && (
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={handleDownloadFiles}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Download Files</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Info */}
      {delivery.payment_required && (
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Ionicons name="card" size={24} color="#3B82F6" />
            <Text style={styles.paymentTitle}>Payment Information</Text>
          </View>
          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Amount:</Text>
              <Text style={styles.paymentValue}>${delivery.payment_amount}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status:</Text>
              <View style={[styles.paymentStatusBadge, { 
                backgroundColor: getStatusColor(delivery.payment_status) 
              }]}>
                <Text style={styles.paymentStatusText}>
                  {delivery.payment_status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          {delivery.payment_status === 'pending' && (
            <Text style={styles.paymentNote}>
              💡 Approve the delivery to authorize payment and unlock file downloads.
            </Text>
          )}
        </View>
      )}
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
  deliveryCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  deliveryHeader: {
    marginBottom: 16,
  },
  deliveryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deliveryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  deliveryTypeTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deliveryTypeText: {
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
  deliveryDescription: {
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
  deliveryMeta: {
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
  downloadButton: {
    backgroundColor: '#3B82F6',
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
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentNote: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default DeliveryPreviewScreen;
