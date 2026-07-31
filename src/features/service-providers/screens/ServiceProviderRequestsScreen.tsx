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
import { useFocusEffect } from '@react-navigation/native';
import projectRequestService, { ProjectRequest } from '../../../services/projectRequestService';
import { supabase } from '../../../lib/supabase';

export default function ServiceProviderRequestsScreen({ navigation, route }: { navigation: any; route: any }) {
  console.log('🚀 [ServiceProviderRequestsScreen] Component mounted/rendered');
  
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workSubmissions, setWorkSubmissions] = useState<Map<string, any[]>>(new Map());
  
  // Get initial filter from route params if provided
  const initialFilter = route?.params?.filter || 'all';
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded' | 'accepted' | 'declined'>(initialFilter);

  console.log('🚀 [ServiceProviderRequestsScreen] User from auth:', user ? { id: user.id, email: user.email } : 'null');

  // Log rendering stats - MUST be at top level before any conditional returns
  useEffect(() => {
    console.log('🎨 [ServiceProviderRequestsScreen] Rendering - Requests:', requests.length, 'Loading:', loading);
  }, [requests.length, loading]);

  useEffect(() => {
    console.log('🚀 [ServiceProviderRequestsScreen] useEffect triggered, calling loadRequests');
    loadRequests();
  }, []);

  // Refresh requests when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 [ServiceProviderRequestsScreen] useFocusEffect triggered');
      console.log('🎯 [ServiceProviderRequestsScreen] User:', user ? { id: user.id, email: user.email } : 'null');
      if (user?.id) {
        console.log('🎯 [ServiceProviderRequestsScreen] Screen focused, refreshing requests for user:', user.id);
        loadRequests();
      } else {
        console.log('⚠️ [ServiceProviderRequestsScreen] No user ID, cannot load requests');
      }
    }, [user?.id])
  );

  const loadWorkSubmissionsForRequests = async (requestIds: string[]) => {
    try {
      if (requestIds.length === 0) return;
      
      console.log('🔄 Loading work submissions for requests:', requestIds);
      
      const { data, error } = await supabase
        .from('work_submissions')
        .select('*')
        .in('project_request_id', requestIds)
        .order('submitted_at', { ascending: false });
      
      if (error) {
        console.error('Error loading work submissions:', error);
        return;
      }
      
      // Group submissions by request ID
      const submissionsMap = new Map<string, any[]>();
      (data || []).forEach((submission: any) => {
        const requestId = submission.project_request_id;
        if (!submissionsMap.has(requestId)) {
          submissionsMap.set(requestId, []);
        }
        submissionsMap.get(requestId)!.push(submission);
      });
      
      console.log('✅ Work submissions loaded:', submissionsMap.size, 'requests have submissions');
      setWorkSubmissions(submissionsMap);
    } catch (error) {
      console.error('Error in loadWorkSubmissionsForRequests:', error);
    }
  };

  const loadRequests = async () => {
    if (!user) {
      console.log('⚠️ [ServiceProviderRequestsScreen] No user found');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 [ServiceProviderRequestsScreen] Loading provider requests for user:', user.id);
      console.log('🔄 [ServiceProviderRequestsScreen] User object:', { id: user.id, email: user.email, name: user.name });
      
      // Use the specific provider requests function
      console.log('🔍 [ServiceProviderRequestsScreen] About to call getProviderProjectRequests with user.id:', user.id);
      console.log('🔍 [ServiceProviderRequestsScreen] projectRequestService:', typeof projectRequestService);
      console.log('🔍 [ServiceProviderRequestsScreen] getProviderProjectRequests:', typeof projectRequestService.getProviderProjectRequests);
      
      const providerRequests = await projectRequestService.getProviderProjectRequests(user.id);
      
      console.log('✅ [ServiceProviderRequestsScreen] Provider requests loaded:', {
        count: providerRequests.length,
        requests: providerRequests.map(r => ({ 
          id: r.id, 
          service_type: r.service_type, 
          status: r.status,
          client_id: r.client_id 
        }))
      });
      
      setRequests(providerRequests);
      
      // Load work submissions for all requests
      const requestIds = providerRequests.map(r => r.id);
      await loadWorkSubmissionsForRequests(requestIds);
      
      if (providerRequests.length === 0) {
        console.log('⚠️ [ServiceProviderRequestsScreen] No requests found. Check console logs above for debugging info.');
        console.log('⚠️ [ServiceProviderRequestsScreen] Make sure to check the getProviderProjectRequests logs for detailed debugging.');
      }
    } catch (error) {
      console.error('❌ [ServiceProviderRequestsScreen] Error loading requests:', error);
      Alert.alert('Error', `Failed to load project requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const getFilteredRequests = () => {
    if (filter === 'all') return requests;
    return requests.filter(request => request.status === filter);
  };

  const getRequestCount = (status: string) => {
    return requests.filter(request => request.status === status).length;
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
    
    // Get submissions for this request
    const submissions = workSubmissions.get(request.id) || [];
    const hasSubmissions = submissions.length > 0;
    const latestSubmission = hasSubmissions ? submissions[0] : null;
    const totalFiles = submissions.reduce((acc, sub) => acc + (sub.file_urls?.length || 0), 0);
    
    return (
      <TouchableOpacity 
        key={request.id} 
        style={styles.requestCard}
        onPress={() => {
          console.log('Request clicked:', request);
          console.log('Request ID:', request.id);
          console.log('Request ID type:', typeof request.id);
          
          if (!request.id) {
            Alert.alert('Error', 'Request ID is missing');
            return;
          }
          
          navigation.navigate('ProjectRequestDetails', { requestId: request.id });
        }}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.serviceType}>{request.service_type}</Text>
            <Text style={styles.clientName}>From: {(request as any).client_name || request.client_id}</Text>
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
            {hasSubmissions ? (
              <>
                <View style={styles.submissionStatus}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.submissionStatusText, { color: '#10B981' }]}>
                    Work submitted ({submissions.length} submission{submissions.length > 1 ? 's' : ''}, {totalFiles} file{totalFiles !== 1 ? 's' : ''})
                  </Text>
                </View>
                {latestSubmission && (
                  <Text style={styles.submissionDate}>
                    Last submitted: {formatDate(latestSubmission.submitted_at || latestSubmission.created_at)}
                  </Text>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        )}
        
        <View style={styles.requestFooter}>
          <Text style={styles.date}>{formatDate(request.created_at)}</Text>
          {request.budget_range && (
            <Text style={styles.budget}>{request.budget_range}</Text>
          )}
        </View>

        {request.urgent_delivery && (
          <View style={styles.urgentBadge}>
            <Ionicons name="flash" size={12} color="#F59E0B" />
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}>
            Pending ({getRequestCount('pending')})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'responded' && styles.filterTabActive]}
          onPress={() => setFilter('responded')}
        >
          <Text style={[styles.filterTabText, filter === 'responded' && styles.filterTabTextActive]}>
            Responded ({getRequestCount('responded')})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'accepted' && styles.filterTabActive]}
          onPress={() => setFilter('accepted')}
        >
          <Text style={[styles.filterTabText, filter === 'accepted' && styles.filterTabTextActive]}>
            Accepted ({getRequestCount('accepted')})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'declined' && styles.filterTabActive]}
          onPress={() => setFilter('declined')}
        >
          <Text style={[styles.filterTabText, filter === 'declined' && styles.filterTabTextActive]}>
            Declined ({getRequestCount('declined')})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales & Leads</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            console.log('🔄 [ServiceProviderRequestsScreen] Manual refresh button pressed');
            loadRequests();
          }}
        >
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {renderFilterTabs()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trending-up-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'No Requests Yet' : `No ${filter} Requests`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'You haven\'t received any project requests yet. Keep your profile updated to attract more clients!'
                : `No requests with status "${filter}" found.`
              }
            </Text>
            <Text style={styles.debugHint}>
              💡 Check console logs for debugging info. Tap refresh to reload.
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {filteredRequests.map(renderRequestCard)}
          </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  refreshButton: {
    padding: 8,
  },
  debugHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
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
    position: 'relative',
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
  clientName: {
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
  submissionDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  urgentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 2,
  },
});
