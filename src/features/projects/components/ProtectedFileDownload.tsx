import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import paymentIntegrationService from '../../../services/paymentIntegrationService';
import { useAuth } from '../../../contexts/AuthContext';

interface ProtectedFileDownloadProps {
  projectRequestId: string;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  fileType?: 'audio' | 'video' | 'image' | 'document';
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onPaymentRequired?: () => void;
}

export const ProtectedFileDownload: React.FC<ProtectedFileDownloadProps> = ({
  projectRequestId,
  fileUrl,
  fileName,
  fileSize,
  fileType = 'document',
  onDownloadStart,
  onDownloadComplete,
  onPaymentRequired
}) => {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);

  const getFileIcon = () => {
    switch (fileType) {
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

  const handleDownload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to download files');
      return;
    }

    try {
      setDownloading(true);
      onDownloadStart?.();

      // Check if download is authorized
      const downloadResult = await paymentIntegrationService.processFileDownload(
        projectRequestId,
        fileUrl,
        user.id
      );

      if (downloadResult.success && downloadResult.downloadUrl) {
        // Open the file for download
        const canOpen = await Linking.canOpenURL(downloadResult.downloadUrl);
        if (canOpen) {
          await Linking.openURL(downloadResult.downloadUrl);
          onDownloadComplete?.();
          
          Alert.alert(
            'Download Started',
            'Your file download has started. Check your downloads folder.'
          );
        } else {
          Alert.alert('Error', 'Unable to open download link');
        }
      } else {
        // Payment required
        setPaymentRequired(true);
        onPaymentRequired?.();
        
        Alert.alert(
          'Payment Required 💳',
          downloadResult.message || 'You need to complete payment before downloading this file.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Make Payment', 
              onPress: () => {
                // Navigate to payment screen would be handled by parent component
                onPaymentRequired?.();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to process download request');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.fileInfo}>
        <View style={styles.fileIconContainer}>
          <Ionicons 
            name={getFileIcon() as any} 
            size={24} 
            color={paymentRequired ? '#F59E0B' : '#3B82F6'} 
          />
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          {fileSize && (
            <Text style={styles.fileSize}>{fileSize}</Text>
          )}
          {paymentRequired && (
            <Text style={styles.paymentRequiredText}>Payment Required</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.downloadButton,
          paymentRequired && styles.paymentRequiredButton,
          downloading && styles.downloadingButton
        ]}
        onPress={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons 
            name={paymentRequired ? 'card' : 'download'} 
            size={20} 
            color="#FFFFFF" 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  paymentRequiredText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  downloadButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRequiredButton: {
    backgroundColor: '#F59E0B',
  },
  downloadingButton: {
    backgroundColor: '#6B7280',
  },
});

export default ProtectedFileDownload;
