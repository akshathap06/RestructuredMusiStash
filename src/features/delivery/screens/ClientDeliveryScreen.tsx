import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Share
} from 'react-native';
import { Button, Card, Chip, Badge, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectDeliveryService, { ProjectDelivery } from '../../../services/projectDeliveryService';

const { width } = Dimensions.get('window');

interface ClientDeliveryScreenProps {
  route: {
    params: {
      deliveryId: string;
    };
  };
  navigation: any;
}

const ClientDeliveryScreen: React.FC<ClientDeliveryScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { deliveryId } = route.params;

  const [delivery, setDelivery] = useState<ProjectDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadDeliveryDetails();
    checkDownloadPermission();
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      setLoading(true);
      const deliveryData = await ProjectDeliveryService.getDeliveryDetails(deliveryId);
      setDelivery(deliveryData);
    } catch (error) {
      console.error('Error loading delivery details:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  };

  const checkDownloadPermission = async () => {
    if (!user) return;

    try {
      setCheckingPermission(true);
      const permission = await ProjectDeliveryService.canDownloadDelivery(deliveryId, user.id);
      setCanDownload(permission);
    } catch (error) {
      console.error('Error checking download permission:', error);
      setCanDownload(false);
    } finally {
      setCheckingPermission(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDeliveryDetails(), checkDownloadPermission()]);
    setRefreshing(false);
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    if (!user || !canDownload) {
      Alert.alert('Download Not Available', 'Payment is required to download files.');
      return;
    }

    try {
      setDownloadingFiles(prev => ({ ...prev, [fileUrl]: true }));

      const result = await ProjectDeliveryService.downloadFile(
        deliveryId,
        fileUrl,
        fileName,
        user.id
      );

      if (result.success) {
        // Refresh download count
        await loadDeliveryDetails();
      } else {
        Alert.alert('Download Failed', result.error || 'Unable to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [fileUrl]: false }));
    }
  };

  const downloadAllFiles = async () => {
    if (!delivery || !user || !canDownload) return;

    Alert.alert(
      'Download All Files',
      `Download all ${delivery.fileUrls.length} files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download All',
          onPress: async () => {
            for (let i = 0; i < delivery.fileUrls.length; i++) {
              const fileUrl = delivery.fileUrls[i];
              const fileName = `${delivery.title}_file_${i + 1}`;
              await downloadFile(fileUrl, fileName);
              
              // Small delay between downloads
              if (i < delivery.fileUrls.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }
        }
      ]
    );
  };

  const approveDelivery = async () => {
    if (!user || !delivery) return;

    Alert.alert(
      'Approve Delivery',
      'Are you satisfied with this work? Approving will confirm receipt and finalize the project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const result = await ProjectDeliveryService.approveDelivery(deliveryId, user.id);
              
              if (result.success) {
                Alert.alert('Success', 'Delivery approved successfully!');
                await loadDeliveryDetails();
                await checkDownloadPermission();
              } else {
                Alert.alert('Error', result.error || 'Failed to approve delivery');
              }
            } catch (error) {
              console.error('Error approving delivery:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            }
          }
        }
      ]
    );
  };

  const requestRevision = () => {
    navigation.navigate('RequestRevision', { 
      deliveryId,
      deliveryTitle: delivery?.title 
    });
  };

  const shareDelivery = async () => {
    if (!delivery) return;

    try {
      await Share.share({
        message: `Check out this delivery: ${delivery.title}\n\nFiles: ${delivery.totalFiles}\nStatus: ${delivery.submissionStatus}`,
        title: delivery.title
      });
    } catch (error) {
      console.error('Error sharing delivery:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'submitted': return '#FF9800';
      case 'revision_requested': return '#2196F3';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'processing': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(extension || '')) return 'musical-notes';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(extension || '')) return 'videocam';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) return 'image';
    if (['pdf'].includes(extension || '')) return 'document-text';
    return 'document';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Delivery not found</Text>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Delivery Header */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerTop}>
              <View style={styles.titleContainer}>
                <Text style={styles.deliveryTitle}>{delivery.title}</Text>
                <Text style={styles.deliveryType}>
                  {delivery.deliveryType.charAt(0).toUpperCase() + delivery.deliveryType.slice(1)} Delivery
                </Text>
              </View>
              <TouchableOpacity onPress={shareDelivery} style={styles.shareButton}>
                <Ionicons name="share-outline" size={24} color="#00D4AA" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusContainer}>
              <Chip 
                icon={() => <View style={[styles.statusDot, { backgroundColor: getStatusColor(delivery.submissionStatus) }]} />}
                style={styles.statusChip}
                textStyle={styles.statusText}
              >
                {delivery.submissionStatus.replace('_', ' ').toUpperCase()}
              </Chip>
              
              {delivery.paymentRequired && (
                <Chip 
                  icon={() => <View style={[styles.statusDot, { backgroundColor: getPaymentStatusColor(delivery.paymentStatus) }]} />}
                  style={styles.statusChip}
                  textStyle={styles.statusText}
                >
                  {delivery.paymentStatus.toUpperCase()}
                </Chip>
              )}
            </View>

            <Text style={styles.description}>{delivery.description}</Text>

            {delivery.deliveryNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Delivery Notes:</Text>
                <Text style={styles.notesText}>{delivery.deliveryNotes}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Files Section */}
        <Card style={styles.filesCard}>
          <Card.Content>
            <View style={styles.filesHeader}>
              <Text style={styles.sectionTitle}>Files ({delivery.totalFiles})</Text>
              {delivery.totalSizeBytes > 0 && (
                <Text style={styles.totalSize}>
                  {formatFileSize(delivery.totalSizeBytes)}
                </Text>
              )}
            </View>

            {checkingPermission ? (
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color="#00D4AA" />
                <Text style={styles.checkingText}>Checking download permissions...</Text>
              </View>
            ) : !canDownload ? (
              <View style={styles.paymentRequiredContainer}>
                <Ionicons name="lock-closed" size={48} color="#FF9800" />
                <Text style={styles.paymentRequiredText}>
                  Payment Required
                </Text>
                <Text style={styles.paymentRequiredSubtext}>
                  Complete payment to download files
                </Text>
                {delivery.paymentAmount && (
                  <Button
                    mode="contained"
                    style={styles.payButton}
                    onPress={() => navigation.navigate('PaymentScreen', { 
                      deliveryId,
                      amount: delivery.paymentAmount 
                    })}
                  >
                    Pay ${delivery.paymentAmount}
                  </Button>
                )}
              </View>
            ) : (
              <>
                {delivery.fileUrls.length > 1 && (
                  <Button
                    mode="outlined"
                    icon="download"
                    onPress={downloadAllFiles}
                    style={styles.downloadAllButton}
                    labelStyle={styles.downloadAllText}
                  >
                    Download All Files
                  </Button>
                )}

                {delivery.fileUrls.map((fileUrl, index) => {
                  const fileName = `${delivery.title}_file_${index + 1}`;
                  const isDownloading = downloadingFiles[fileUrl];

                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.fileItem}
                      onPress={() => downloadFile(fileUrl, fileName)}
                      disabled={isDownloading}
                    >
                      <View style={styles.fileInfo}>
                        <Ionicons 
                          name={getFileIcon(fileUrl)} 
                          size={32} 
                          color="#00D4AA" 
                          style={styles.fileIcon}
                        />
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName}>{fileName}</Text>
                          <Text style={styles.fileType}>
                            {fileUrl.split('.').pop()?.toUpperCase()} File
                          </Text>
                        </View>
                      </View>
                      
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#00D4AA" />
                      ) : (
                        <Ionicons name="download-outline" size={24} color="#00D4AA" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Download Stats */}
        {delivery.downloadCount > 0 && (
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text style={styles.statsTitle}>Download Statistics</Text>
              <Text style={styles.statsText}>
                Downloaded {delivery.downloadCount} time(s)
              </Text>
              {delivery.lastDownloadedAt && (
                <Text style={styles.statsText}>
                  Last downloaded: {new Date(delivery.lastDownloadedAt).toLocaleDateString()}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {canDownload && delivery.submissionStatus === 'submitted' && (
        <View style={styles.actionContainer}>
          <Button
            mode="outlined"
            onPress={requestRevision}
            style={[styles.actionButton, styles.revisionButton]}
            labelStyle={styles.revisionButtonText}
          >
            Request Revision
          </Button>
          <Button
            mode="contained"
            onPress={approveDelivery}
            style={[styles.actionButton, styles.approveButton]}
            labelStyle={styles.approveButtonText}
          >
            Approve Work
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    borderColor: '#00D4AA',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deliveryType: {
    fontSize: 14,
    color: '#00D4AA',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  shareButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    backgroundColor: '#333333',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  description: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  notesContainer: {
    backgroundColor: '#333333',
    padding: 12,
    borderRadius: 8,
  },
  notesLabel: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  filesCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalSize: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  checkingText: {
    color: '#CCCCCC',
    marginLeft: 8,
  },
  paymentRequiredContainer: {
    alignItems: 'center',
    padding: 32,
  },
  paymentRequiredText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  paymentRequiredSubtext: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#00D4AA',
  },
  downloadAllButton: {
    borderColor: '#00D4AA',
    marginBottom: 16,
  },
  downloadAllText: {
    color: '#00D4AA',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    marginRight: 16,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileType: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  statsCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statsText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 4,
  },
  revisionButton: {
    borderColor: '#FF9800',
  },
  revisionButtonText: {
    color: '#FF9800',
  },
  approveButton: {
    backgroundColor: '#00D4AA',
  },
  approveButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
});

export default ClientDeliveryScreen;
