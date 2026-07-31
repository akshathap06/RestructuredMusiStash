import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import ProtectedFileDownload from '../../../components/ProtectedFileDownload';
import paymentIntegrationService from '../../../services/paymentIntegrationService';
import fileTransferService from '../../../services/fileTransferService';

const { width } = Dimensions.get('window');

interface TransferFile {
  id: string;
  name: string;
  type: 'audio' | 'video' | 'image' | 'document';
  size: string;
  url: string;
  thumbnail?: string;
  duration?: string;
  uploaded_at: string;
  project_id: string;
}

interface FileTransfer {
  id: string;
  project_id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string;
  files: TransferFile[];
  payment_required: boolean;
  payment_amount?: number;
  payment_status: 'pending' | 'completed' | 'failed';
  access_expires_at?: string;
  status: 'pending' | 'delivered' | 'downloaded' | 'expired';
  created_at: string;
  updated_at: string;
}

interface FileTransferPortalScreenProps {
  navigation: any;
}

export const FileTransferPortalScreen: React.FC<FileTransferPortalScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<FileTransfer | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    loadTransfers();
  }, [activeTab]);

  const loadTransfers = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let fetchedTransfers: FileTransfer[] = [];

      if (activeTab === 'received') {
        fetchedTransfers = await fileTransferService.getReceivedTransfers(user.id);
      } else {
        fetchedTransfers = await fileTransferService.getSentTransfers(user.id);
      }

      // If no real data, show mock data for demo
      if (fetchedTransfers.length === 0) {
        const mockTransfers: FileTransfer[] = [
          {
            id: 'ft_demo_1',
            project_id: 'proj_demo_1',
            sender_id: activeTab === 'received' ? 'demo_sender' : user.id,
            receiver_id: activeTab === 'received' ? user.id : 'demo_receiver',
            title: 'Hip-Hop Beat Pack - Dark Vibes',
            description: 'Complete production package with stems, MIDI files, and samples',
            files: [
              {
                id: 'file_demo_1',
                transfer_id: 'ft_demo_1',
                name: 'Dark_Vibes_Full_Beat.wav',
                type: 'audio',
                size: 47456256, // ~45.2 MB
                url: 'https://example.com/files/dark_vibes_full.wav',
                duration: '3:24',
                download_count: 0,
                uploaded_at: new Date().toISOString()
              },
              {
                id: 'file_demo_2',
                transfer_id: 'ft_demo_1',
                name: 'Dark_Vibes_Stems.zip',
                type: 'document',
                size: 126352896, // ~120.5 MB
                url: 'https://example.com/files/dark_vibes_stems.zip',
                download_count: 0,
                uploaded_at: new Date().toISOString()
              },
              {
                id: 'file_demo_3',
                transfer_id: 'ft_demo_1',
                name: 'Cover_Art.jpg',
                type: 'image',
                size: 2202009, // ~2.1 MB
                url: 'https://example.com/files/cover_art.jpg',
                download_count: 0,
                uploaded_at: new Date().toISOString()
              }
            ],
            payment_required: true,
            payment_amount: 150.00,
            payment_status: activeTab === 'received' ? 'pending' : 'completed',
            access_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'delivered',
            download_count: 0,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        if (activeTab === 'received') {
          fetchedTransfers = mockTransfers;
        }
      }

      setTransfers(fetchedTransfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      Alert.alert('Error', 'Failed to load file transfers');
      
      // Show empty state on error
      setTransfers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePayment = async (transfer: FileTransfer) => {
    if (!transfer.payment_amount) return;

    navigation.navigate('PaymentScreen', {
      requestId: transfer.project_id,
      amount: transfer.payment_amount,
      title: transfer.title,
      description: `Payment for file transfer: ${transfer.title}`,
      onPaymentComplete: () => {
        // Refresh transfers after payment
        loadTransfers();
      }
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return 'musical-notes';
      case 'video':
        return 'videocam';
      case 'image':
        return 'image';
      default:
        return 'document';
    }
  };

  const getStatusColor = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'pending') return '#F59E0B';
    if (paymentStatus === 'completed') return '#3B82F6';
    if (status === 'expired') return '#EF4444';
    return '#6B7280';
  };

  const getStatusText = (transfer: FileTransfer) => {
    if (transfer.payment_required && transfer.payment_status === 'pending') {
      return 'Payment Required';
    }
    if (transfer.payment_status === 'completed') {
      return 'Ready for Download';
    }
    if (transfer.status === 'expired') {
      return 'Expired';
    }
    return 'Delivered';
  };

  const renderTransferCard = ({ item }: { item: FileTransfer }) => {
    const statusColor = getStatusColor(item.status, item.payment_status);
    const canDownload = item.payment_status === 'completed';

    return (
      <TouchableOpacity
        style={styles.transferCard}
        onPress={() => {
          setSelectedTransfer(item);
          setTransferModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.transferHeader}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.transferDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
        </View>

        <View style={styles.transferStats}>
          <View style={styles.statItem}>
            <Ionicons name="documents" size={16} color="#3B82F6" />
            <Text style={styles.statText}>{item.files.length} files</Text>
          </View>
          
          {item.payment_amount && (
            <View style={styles.statItem}>
              <Ionicons name="card" size={16} color="#3B82F6" />
              <Text style={styles.statText}>${item.payment_amount}</Text>
            </View>
          )}
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#9CA3AF" />
            <Text style={styles.statText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.filePreview}>
          {item.files.slice(0, 3).map((file, index) => (
            <View key={file.id} style={styles.filePreviewItem}>
              <Ionicons 
                name={getFileIcon(file.type) as any} 
                size={20} 
                color="#3B82F6" 
              />
              <Text style={styles.filePreviewName} numberOfLines={1}>
                {file.name}
              </Text>
            </View>
          ))}
          {item.files.length > 3 && (
            <Text style={styles.moreFilesText}>
              +{item.files.length - 3} more files
            </Text>
          )}
        </View>

        {!canDownload && item.payment_required && (
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => handlePayment(item)}
          >
            <Ionicons name="card" size={20} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>
              Pay ${item.payment_amount} to Access
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderTransferModal = () => {
    if (!selectedTransfer) return null;

    const canDownload = selectedTransfer.payment_status === 'completed';

    return (
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setTransferModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedTransfer.title}</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transfer Info */}
            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoTitle}>Transfer Details</Text>
              <Text style={styles.modalInfoDescription}>
                {selectedTransfer.description}
              </Text>
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Files:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedTransfer.files.length} items
                </Text>
              </View>
              
              {selectedTransfer.payment_amount && (
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Amount:</Text>
                  <Text style={styles.modalInfoValue}>
                    ${selectedTransfer.payment_amount}
                  </Text>
                </View>
              )}
              
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Status:</Text>
                <Text style={[
                  styles.modalInfoValue,
                  { color: getStatusColor(selectedTransfer.status, selectedTransfer.payment_status) }
                ]}>
                  {getStatusText(selectedTransfer)}
                </Text>
              </View>
            </View>

            {/* Payment Section */}
            {!canDownload && selectedTransfer.payment_required && (
              <View style={styles.paymentSection}>
                <View style={styles.paymentNotice}>
                  <Ionicons name="lock-closed" size={24} color="#F59E0B" />
                  <Text style={styles.paymentNoticeText}>
                    Payment required to access these files
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.modalPaymentButton}
                  onPress={() => {
                    setTransferModalVisible(false);
                    handlePayment(selectedTransfer);
                  }}
                >
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                  <Text style={styles.modalPaymentButtonText}>
                    Pay ${selectedTransfer.payment_amount} Now
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Files List */}
            <View style={styles.filesSection}>
              <Text style={styles.filesSectionTitle}>
                Files ({selectedTransfer.files.length})
              </Text>
              
              {selectedTransfer.files.map((file) => (
                <View key={file.id} style={styles.modalFileItem}>
                  <View style={styles.modalFileInfo}>
                    <View style={styles.modalFileIconContainer}>
                      <Ionicons 
                        name={getFileIcon(file.type) as any} 
                        size={24} 
                        color="#3B82F6" 
                      />
                    </View>
                    
                    <View style={styles.modalFileDetails}>
                      <Text style={styles.modalFileName}>{file.name}</Text>
                      <View style={styles.modalFileMetadata}>
                        <Text style={styles.modalFileSize}>{file.size}</Text>
                        {file.duration && (
                          <Text style={styles.modalFileDuration}>
                            • {file.duration}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {canDownload ? (
                    <ProtectedFileDownload
                      projectRequestId={selectedTransfer.project_id}
                      fileUrl={file.url}
                      fileName={file.name}
                      fileSize={file.size}
                      fileType={file.type}
                      onPaymentRequired={() => {
                        setTransferModalVisible(false);
                        handlePayment(selectedTransfer);
                      }}
                    />
                  ) : (
                    <View style={styles.lockedFileIndicator}>
                      <Ionicons name="lock-closed" size={16} color="#F59E0B" />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Access Info */}
            {canDownload && selectedTransfer.access_expires_at && (
              <View style={styles.accessInfo}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.accessInfoText}>
                  Download access expires on{' '}
                  {new Date(selectedTransfer.access_expires_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading file transfers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File Transfer Portal</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WorkSubmissionScreen')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons 
            name="download" 
            size={20} 
            color={activeTab === 'received' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'received' && styles.activeTabText
          ]}>
            Received
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={activeTab === 'sent' ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'sent' && styles.activeTabText
          ]}>
            Sent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transfers List */}
      <FlatList
        data={transfers}
        renderItem={renderTransferCard}
        keyExtractor={(item) => item.id}
        style={styles.transfersList}
        contentContainerStyle={styles.transfersListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTransfers(true)}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyStateTitle}>
              No {activeTab} transfers
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'received' 
                ? 'You haven\'t received any file transfers yet'
                : 'You haven\'t sent any file transfers yet'
              }
            </Text>
          </View>
        }
      />

      {/* Transfer Modal */}
      {renderTransferModal()}
    </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#374151',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  transfersList: {
    flex: 1,
    marginTop: 16,
  },
  transfersListContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  transferCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transferInfo: {
    flex: 1,
    marginRight: 12,
  },
  transferTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transferDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  transferStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 4,
  },
  filePreview: {
    marginBottom: 12,
  },
  filePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  filePreviewName: {
    color: '#D1D5DB',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  moreFilesText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalInfoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalInfoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInfoDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalInfoLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  modalInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentNoticeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  modalPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filesSection: {
    marginTop: 16,
  },
  filesSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalFileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalFileDetails: {
    flex: 1,
  },
  modalFileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  modalFileMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFileSize: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  modalFileDuration: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  lockedFileIndicator: {
    padding: 8,
  },
  accessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  accessInfoText: {
    color: '#D1D5DB',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
});

export default FileTransferPortalScreen;
