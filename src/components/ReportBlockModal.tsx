import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderationService } from '../services/moderationService';

export interface ReportBlockModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  contentType: 'post' | 'comment' | 'message' | 'user' | 'service';
  contentId?: string;
  onUserBlocked?: (userId: string) => void;
  onReported?: () => void;
}

const reportReasons = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'fraud', label: 'Fraud or scam' },
  { id: 'copyright', label: 'Copyright infringement' },
  { id: 'other', label: 'Other' },
];

export default function ReportBlockModal({
  visible,
  onClose,
  currentUserId,
  targetUserId,
  targetUserName,
  contentType,
  contentId,
  onUserBlocked,
  onReported,
}: ReportBlockModalProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await moderationService.reportContent(
        currentUserId,
        contentType,
        selectedReason,
        `Reported ${contentType}: ${targetUserName}`,
        targetUserId,
        contentId
      );

      setShowReportModal(false);
      setSelectedReason(null);
      onClose();

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. We will review this and take appropriate action.',
          [{ text: 'OK' }]
        );
        onReported?.();
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUserName}?\n\nYou won't see their content, posts, or messages anymore. They won't be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await moderationService.blockUser(currentUserId, targetUserId);
              onClose();

              if (result.success) {
                Alert.alert(
                  'User Blocked',
                  `You have blocked ${targetUserName}. You can unblock them from Settings.`,
                  [{ text: 'OK' }]
                );
                onUserBlocked?.(targetUserId);
              } else {
                Alert.alert('Error', 'Failed to block user. Please try again.');
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'post':
        return 'Post';
      case 'service':
        return 'Service Provider';
      case 'user':
        return 'User';
      case 'comment':
        return 'Comment';
      case 'message':
        return 'Message';
      default:
        return 'Content';
    }
  };

  return (
    <>
      {/* Main Options Menu */}
      <Modal
        visible={visible && !showReportModal}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.optionsMenu}>
            <View style={styles.menuHeader}>
              <View style={styles.menuHandle} />
              <Text style={styles.menuTitle}>{targetUserName}</Text>
            </View>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowReportModal(true);
              }}
            >
              <View style={[styles.optionIcon, styles.optionIconWarning]}>
                <Ionicons name="flag-outline" size={22} color="#F59E0B" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Report {getContentTypeLabel()}</Text>
                <Text style={styles.optionSubtext}>Report inappropriate content</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, styles.optionItemDanger]}
              onPress={handleBlockUser}
            >
              <View style={[styles.optionIcon, styles.optionIconDanger]}>
                <Ionicons name="ban-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, styles.optionTextDanger]}>Block User</Text>
                <Text style={styles.optionSubtext}>Stop seeing their content</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, styles.optionItemCancel]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModal}>
            <View style={styles.reportModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedReason(null);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.reportModalTitle}>Report {getContentTypeLabel()}</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.reportModalSubtitle}>
              Why are you reporting this {contentType}?
            </Text>

            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reportReasonItem,
                  selectedReason === reason.id && styles.reportReasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <Text
                  style={[
                    styles.reportReasonText,
                    selectedReason === reason.id && styles.reportReasonTextSelected,
                  ]}
                >
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.submitReportButton,
                (!selectedReason || isSubmitting) && styles.submitReportButtonDisabled,
              ]}
              onPress={handleReport}
              disabled={!selectedReason || isSubmitting}
            >
              <Text style={styles.submitReportButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.reportFooter}>
              Your report is confidential. We will review and take appropriate action.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionItemDanger: {
    borderBottomWidth: 0,
  },
  optionItemCancel: {
    justifyContent: 'center',
    borderTopWidth: 8,
    borderTopColor: 'rgba(0, 0, 0, 0.3)',
    marginTop: 8,
    paddingVertical: 16,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  optionIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  optionTextDanger: {
    color: '#EF4444',
  },
  optionSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cancelText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Report Modal Styles
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  reportModal: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportReasonItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  reportReasonText: {
    fontSize: 15,
    color: '#E5E7EB',
  },
  reportReasonTextSelected: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  submitReportButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitReportButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  submitReportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportFooter: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});






