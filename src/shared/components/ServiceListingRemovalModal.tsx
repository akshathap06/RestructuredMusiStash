import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { serviceListingService, ServiceListingStatus } from '../../services/serviceListingService';

interface ServiceListingRemovalModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  providerId: string;
  businessName: string;
  serviceCategory: string;
  onRemovalSuccess: () => void;
}

const ServiceListingRemovalModal: React.FC<ServiceListingRemovalModalProps> = ({
  visible,
  onClose,
  listingId,
  providerId,
  businessName,
  serviceCategory,
  onRemovalSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ServiceListingStatus | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (visible && listingId && providerId) {
      loadStatus();
    }
  }, [visible, listingId, providerId]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const statusData = await serviceListingService.getServiceListingStatus(listingId, providerId);
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading service listing status:', error);
      Alert.alert('Error', 'Failed to load service listing status');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    if (!status?.can_remove) {
      Alert.alert(
        'Cannot Remove Listing',
        status?.removal_reason || 'This listing cannot be removed at this time.'
      );
      return;
    }

    Alert.alert(
      'Remove Service Listing',
      `Are you sure you want to remove "${businessName}" (${serviceCategory})?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: confirmRemoval,
        },
      ]
    );
  };

  const confirmRemoval = async () => {
    setRemoving(true);
    try {
      const result = await serviceListingService.removeServiceListing(listingId, providerId);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Service listing removed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                onRemovalSuccess();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to remove service listing');
      }
    } catch (error) {
      console.error('Error removing service listing:', error);
      Alert.alert('Error', 'Failed to remove service listing');
    } finally {
      setRemoving(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return 'help-circle-outline';
    if (status.can_remove) return 'checkmark-circle-outline';
    if (status.active_requests > 0) return 'time-outline';
    if (status.paid_requests > 0) return 'shield-outline';
    return 'alert-circle-outline';
  };

  const getStatusColor = () => {
    if (!status) return '#6B7280';
    if (status.can_remove) return '#3B82F6';
    if (status.active_requests > 0) return '#F59E0B';
    if (status.paid_requests > 0) return '#EF4444';
    return '#6B7280';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Remove Service Listing</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{businessName}</Text>
            <Text style={styles.serviceCategory}>{serviceCategory}</Text>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Removal Status</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Checking status...</Text>
              </View>
            ) : status ? (
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={getStatusIcon()} 
                    size={24} 
                    color={getStatusColor()} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {status.removal_reason}
                  </Text>
                </View>

                {/* Request Counts */}
                <View style={styles.countsContainer}>
                  <View style={styles.countItem}>
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                    <Text style={styles.countLabel}>Active Projects:</Text>
                    <Text style={styles.countValue}>{status.active_requests}</Text>
                  </View>
                  
                  <View style={styles.countItem}>
                    <Ionicons name="card-outline" size={16} color="#EF4444" />
                    <Text style={styles.countLabel}>Paid Projects:</Text>
                    <Text style={styles.countValue}>{status.paid_requests}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.errorText}>Failed to load status</Text>
            )}
          </View>

          {/* Safety Information */}
          <View style={styles.safetyInfo}>
            <Text style={styles.sectionTitle}>Safety Guidelines</Text>
            <View style={styles.safetyItem}>
              <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
              <Text style={styles.safetyText}>
                You can remove listings with no active or paid projects
              </Text>
            </View>
            <View style={styles.safetyItem}>
              <Ionicons name="time" size={16} color="#F59E0B" />
              <Text style={styles.safetyText}>
                Active projects must be completed before removal
              </Text>
            </View>
            <View style={styles.safetyItem}>
              <Ionicons name="shield" size={16} color="#EF4444" />
              <Text style={styles.safetyText}>
                Paid projects are protected for customer safety
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.removeButton,
              (!status?.can_remove || removing) && styles.disabledButton
            ]}
            onPress={handleRemove}
            disabled={!status?.can_remove || removing}
          >
            {removing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.removeButtonText}>Remove Listing</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  serviceInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 16,
    color: '#3B82F6',
  },
  statusSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  statusContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  countsContainer: {
    gap: 8,
  },
  countItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  countValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  safetyInfo: {
    paddingVertical: 20,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  safetyText: {
    color: '#9CA3AF',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceListingRemovalModal;
