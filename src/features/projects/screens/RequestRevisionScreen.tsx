import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectDeliveryService from '../../../services/projectDeliveryService';

interface RequestRevisionScreenProps {
  route: {
    params: {
      deliveryId: string;
      deliveryTitle: string;
    };
  };
  navigation: any;
}

export const RequestRevisionScreen: React.FC<RequestRevisionScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { user } = useAuth();
  const { deliveryId, deliveryTitle } = route.params;
  
  const [revisionNotes, setRevisionNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: '#3B82F6', icon: 'leaf' },
    { value: 'normal', label: 'Normal Priority', color: '#F59E0B', icon: 'time' },
    { value: 'high', label: 'High Priority', color: '#EF4444', icon: 'flame' },
    { value: 'urgent', label: 'Urgent', color: '#DC2626', icon: 'warning' },
  ];

  const handleSubmitRevision = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to request revisions');
      return;
    }

    if (!revisionNotes.trim()) {
      Alert.alert('Error', 'Please provide revision notes explaining what changes you need');
      return;
    }

    if (revisionNotes.trim().length < 10) {
      Alert.alert('Error', 'Please provide more detailed revision notes (at least 10 characters)');
      return;
    }

    try {
      setSubmitting(true);

      const result = await ProjectDeliveryService.requestRevision(
        deliveryId,
        user.id,
        revisionNotes.trim(),
        priority
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to request revision');
      }

      Alert.alert(
        'Revision Requested! 🔄',
        'Your revision request has been sent to the service provider. They will be notified and can respond with an updated delivery.',
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('MyOrders')
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error requesting revision:', error);
      Alert.alert(
        'Request Failed',
        error instanceof Error ? error.message : 'Failed to request revision. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityInfo = (priorityValue: string) => {
    return priorityOptions.find(option => option.value === priorityValue) || priorityOptions[1];
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Revision</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="refresh-circle" size={32} color="#F59E0B" />
          <Text style={styles.infoTitle}>Request Changes</Text>
        </View>
        <Text style={styles.infoDescription}>
          Use this form to request specific changes to the delivered work. Be clear and detailed 
          about what modifications you need.
        </Text>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryLabel}>Delivery:</Text>
          <Text style={styles.deliveryName}>{deliveryTitle}</Text>
        </View>
      </View>

      {/* Priority Selection */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Priority Level</Text>
        <Text style={styles.cardSubtitle}>
          Set the urgency level for this revision request
        </Text>
        
        <View style={styles.priorityGrid}>
          {priorityOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.priorityButton,
                priority === option.value && styles.selectedPriority,
                { borderColor: option.color }
              ]}
              onPress={() => setPriority(option.value as any)}
              disabled={submitting}
            >
              <Ionicons 
                name={option.icon as any} 
                size={20} 
                color={priority === option.value ? option.color : '#9CA3AF'} 
              />
              <Text style={[
                styles.priorityText,
                priority === option.value && { color: option.color }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Revision Notes */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Revision Notes *</Text>
        <Text style={styles.cardSubtitle}>
          Provide detailed feedback about what changes you need
        </Text>
        
        <TextInput
          style={styles.textArea}
          value={revisionNotes}
          onChangeText={setRevisionNotes}
          placeholder="Example: Please adjust the bass levels to be less prominent, add more reverb to the vocals, and extend the outro by 30 seconds..."
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={8}
          editable={!submitting}
          textAlignVertical="top"
        />
        
        <View style={styles.characterCount}>
          <Text style={styles.characterCountText}>
            {revisionNotes.length} characters
          </Text>
          {revisionNotes.length < 10 && (
            <Text style={styles.characterCountWarning}>
              (minimum 10 characters)
            </Text>
          )}
        </View>
      </View>

      {/* Guidelines */}
      <View style={styles.guidelinesCard}>
        <Text style={styles.guidelinesTitle}>💡 Revision Guidelines</Text>
        <Text style={styles.guidelinesText}>
          • Be specific about what needs to be changed{'\n'}
          • Provide clear examples or references when possible{'\n'}
          • Explain the reasoning behind your requested changes{'\n'}
          • Be respectful and constructive in your feedback{'\n'}
          • Consider the original project scope and timeline
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmitRevision}
        disabled={submitting || !revisionNotes.trim() || revisionNotes.trim().length < 10}
      >
        {submitting ? (
          <View style={styles.submittingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.submittingText}>Sending Request...</Text>
          </View>
        ) : (
          <View style={styles.submitButtonContent}>
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Send Revision Request</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Priority Info */}
      <View style={styles.priorityInfoCard}>
        <Text style={styles.priorityInfoTitle}>Priority Levels</Text>
        <View style={styles.priorityInfoList}>
          <View style={styles.priorityInfoItem}>
            <Ionicons name="leaf" size={16} color="#3B82F6" />
            <Text style={styles.priorityInfoText}>
              <Text style={styles.priorityInfoLabel}>Low:</Text> Minor adjustments, flexible timeline
            </Text>
          </View>
          <View style={styles.priorityInfoItem}>
            <Ionicons name="time" size={16} color="#F59E0B" />
            <Text style={styles.priorityInfoText}>
              <Text style={styles.priorityInfoLabel}>Normal:</Text> Standard revisions, regular timeline
            </Text>
          </View>
          <View style={styles.priorityInfoItem}>
            <Ionicons name="flame" size={16} color="#EF4444" />
            <Text style={styles.priorityInfoText}>
              <Text style={styles.priorityInfoLabel}>High:</Text> Important changes needed soon
            </Text>
          </View>
          <View style={styles.priorityInfoItem}>
            <Ionicons name="warning" size={16} color="#DC2626" />
            <Text style={styles.priorityInfoText}>
              <Text style={styles.priorityInfoLabel}>Urgent:</Text> Critical issues requiring immediate attention
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
  infoCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  infoDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryLabel: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  deliveryName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  priorityGrid: {
    gap: 12,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPriority: {
    backgroundColor: '#1E293B',
  },
  priorityText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  textArea: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    height: 150,
    textAlignVertical: 'top',
  },
  characterCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCountText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  characterCountWarning: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 8,
  },
  guidelinesCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
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
  submitButton: {
    backgroundColor: '#F59E0B',
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
  priorityInfoCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  priorityInfoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  priorityInfoList: {
    gap: 8,
  },
  priorityInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priorityInfoText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  priorityInfoLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default RequestRevisionScreen;