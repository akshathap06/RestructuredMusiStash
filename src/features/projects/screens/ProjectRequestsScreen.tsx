import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import projectRequestService, { ProjectRequest } from '../../../services/projectRequestService';
import serviceProviderService, { ServiceProviderProfile } from '../../../services/serviceProviderService';

export default function ProjectRequestsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [serviceProvider, setServiceProvider] = useState<ServiceProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's service provider profile
      try {
        const providerProfile = await serviceProviderService.getProfileByUserId(user.id);
        setServiceProvider(providerProfile);
      } catch (error) {
        console.log('User is not a service provider yet');
        setServiceProvider(null);
      }
      
      // Load requests FOR the user's service provider profile (incoming requests)
      console.log('Loading requests for user:', user.id);
      const data = await projectRequestService.getProviderProjectRequests(user.id);
      console.log('Requests loaded in My Requests screen:', data.length, data);
      setRequests(data);
      
      // Debug: Also fetch all requests to see what's in the database
      const allRequests = await projectRequestService.debugGetAllRequests();
      console.log('All requests in database (from My Requests):', allRequests.length);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load project requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'responded': return '#3B82F6';
      case 'accepted': return '#3B82F6';
      case 'declined': return '#EF4444';
      case 'cancelled': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDeleteRequest = async (requestId: string, projectDescription: string) => {
    Alert.alert(
      'Delete Request',
      `Are you sure you want to delete this request?\n\n"${projectDescription}"`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;
              
              await projectRequestService.deleteProjectRequest(requestId, user.id);
              
              // Remove the request from the local state
              setRequests(prevRequests => 
                prevRequests.filter(request => request.id !== requestId)
              );
              
              Alert.alert('Success', 'Request deleted successfully');
            } catch (error) {
              console.error('Error deleting request:', error);
              Alert.alert('Error', 'Failed to delete request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const calculateDueDate = (createdAt: string, timeline: string): Date => {
    const createdDate = new Date(createdAt);
    const timelineMatch = timeline.match(/(\d+)\s*(day|week|month)s?/i);
    
    if (timelineMatch) {
      const amount = parseInt(timelineMatch[1]);
      const unit = timelineMatch[2].toLowerCase();
      
      switch (unit) {
        case 'day':
          createdDate.setDate(createdDate.getDate() + amount);
          break;
        case 'week':
          createdDate.setDate(createdDate.getDate() + (amount * 7));
          break;
        case 'month':
          createdDate.setMonth(createdDate.getMonth() + amount);
          break;
      }
    }
    
    return createdDate;
  };

  const getDaysRemaining = (dueDate: Date): number => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDueDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderRequestCard = (request: ProjectRequest) => {
    const isAccepted = request.status === 'accepted';
    const dueDate = isAccepted ? calculateDueDate(request.updated_at || request.created_at, request.timeline || '1 week') : null;
    const daysRemaining = dueDate ? getDaysRemaining(dueDate) : null;
    
    return (
      <TouchableOpacity 
        key={request.id} 
        style={styles.requestCard}
        onPress={() => {
          // Navigate to request details
          navigation.navigate('ProjectRequestDetails', { requestId: request.id });
        }}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.serviceType}>{request.service_type}</Text>
            <Text style={styles.providerName}>From: {request.client_id}</Text>
          </View>
          <View style={styles.requestActions}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
              <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent triggering the card press
                handleDeleteRequest(request.id, request.project_description);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>
          {request.project_description}
        </Text>
        
        {/* Submission Status for Accepted Requests */}
        {isAccepted && (
          <View style={styles.submissionStatusContainer}>
            <View style={styles.submissionStatus}>
              <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
              <Text style={styles.submissionStatusText}>Work not submitted yet</Text>
            </View>
            {dueDate && (
              <View style={styles.dueDateContainer}>
                <Ionicons name="time-outline" size={16} color={daysRemaining && daysRemaining < 3 ? "#EF4444" : "#6B7280"} />
                <Text style={[styles.dueDateText, { color: daysRemaining && daysRemaining < 3 ? "#EF4444" : "#6B7280" }]}>
                  Due: {formatDueDate(dueDate)}
                  {daysRemaining !== null && (
                    <Text style={styles.daysRemainingText}>
                      {daysRemaining > 0 ? ` (${daysRemaining} days left)` : ' (OVERDUE)'}
                    </Text>
                  )}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.requestFooter}>
          <Text style={styles.date}>{formatDate(request.created_at)}</Text>
          {request.budget_range && (
            <Text style={styles.budget}>{request.budget_range}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadRequests}
        >
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Service Provider Info */}
        {serviceProvider ? (
          <View style={styles.providerInfoContainer}>
            <View style={styles.providerHeader}>
              <View style={styles.providerIconContainer}>
                <Ionicons name="briefcase" size={24} color="#3B82F6" />
              </View>
              <View style={styles.providerDetails}>
                <Text style={styles.providerBusinessName}>{serviceProvider.business_name}</Text>
                <Text style={styles.providerType}>{serviceProvider.provider_type.replace('_', ' ')}</Text>
                <Text style={styles.providerStatus}>
                  Status: <Text style={[styles.statusText, { color: serviceProvider.status === 'approved' ? '#3B82F6' : '#F59E0B' }]}>
                    {serviceProvider.status.charAt(0).toUpperCase() + serviceProvider.status.slice(1)}
                  </Text>
                </Text>
              </View>
            </View>
            <View style={styles.requestsStats}>
              <Text style={styles.statsText}>Total Requests: {requests.length}</Text>
              <Text style={styles.statsText}>
                Pending: {requests.filter(r => r.status === 'pending').length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noProviderContainer}>
            <Ionicons name="briefcase-outline" size={48} color="#6B7280" />
            <Text style={styles.noProviderTitle}>No Service Provider Profile</Text>
            <Text style={styles.noProviderSubtitle}>
              Create a service provider profile to start receiving project requests from clients.
            </Text>
            <TouchableOpacity 
              style={styles.createProviderButton}
              onPress={() => navigation.navigate('CreateServiceProvider')}
            >
              <Text style={styles.createProviderButtonText}>Create Service Provider Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Requests List */}
        {serviceProvider && (
          <>
            {requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color="#6B7280" />
                <Text style={styles.emptyTitle}>No Requests Yet</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't received any project requests yet. Keep your service provider profile updated to attract more clients!
                </Text>
              </View>
            ) : (
              <View style={styles.requestsList}>
                {requests.map(renderRequestCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  requestsList: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestInfo: {
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  serviceType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  budget: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Submission Status Styles
  submissionStatusContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionStatusText: {
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 6,
    fontWeight: '600',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  daysRemainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Service Provider Info Styles
  providerInfoContainer: {
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerBusinessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerType: {
    fontSize: 14,
    color: '#3B82F6',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  providerStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  requestsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statsText: {
    fontSize: 14,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  // No Provider Styles
  noProviderContainer: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
  },
  noProviderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noProviderSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createProviderButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createProviderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
