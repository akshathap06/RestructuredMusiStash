import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import WorkSubmissionService from '../../../services/WorkSubmissionService';

interface ServiceOrder {
  id: string;
  project_description: string;
  service_type: string;
  status: string;
  budget_range: string;
  timeline: string;
  message: string;
  additional_requirements: string;
  urgent_delivery: boolean;
  revision_rounds: number;
  created_at: string;
  updated_at: string;
  provider_business_name?: string;
  provider_name?: string;
  service_provider_id: string;
  // Workflow details
  payment_status?: string;
  delivery_status?: string;
  latest_delivery_title?: string;
  latest_revision_feedback?: string;
}

const MyOrdersScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [workSubmissions, setWorkSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!user?.id) {
        console.log('No user ID available');
        return;
      }

      console.log('Loading orders for user:', user.id);
      console.log('User object:', user);

      // TEMPORARY: Fetch ALL project requests for debugging
      console.log('Current user ID:', user.id);
      console.log('User email:', user.email);
      
      // First, let's see ALL requests in the database
      const { data: allRequestsData, error: allRequestsError } = await supabase
        .from('project_requests')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('ALL requests in database:', allRequestsData);
      console.log('Total requests found:', allRequestsData?.length || 0);

      // Now filter for requests where user is involved
      const userRequests = (allRequestsData || []).filter(request => 
        request.client_id === user.id || request.service_provider_id === user.id
      );

      console.log('Requests where user is involved:', userRequests);
      console.log('User-involved requests found:', userRequests.length);
      
      const allRequests = userRequests;

      if (allRequestsError) {
        console.error('Error fetching all orders:', allRequestsError);
      }

      console.log('Raw orders data:', allRequests);
      console.log('Number of requests found:', allRequests.length);

      // Debug: Check all requests in database
      try {
        const { data: allRequests } = await supabase
          .from('project_requests')
          .select('id, client_id, status, service_type, created_at')
          .limit(10);
        console.log('All requests in database:', allRequests);
        console.log('Current user ID:', user.id);
        console.log('User matches:', allRequests?.filter(r => r.client_id === user.id));
      } catch (debugError) {
        console.log('Debug query failed:', debugError);
      }

      if (allRequests.length === 0) {
        console.log('No orders found for user');
        setOrders([]);
        return;
      }

      // For each request, get service provider and workflow details
      const ordersWithWorkflow = await Promise.all(
        allRequests.map(async (request) => {
          try {
            // Get service provider details
            let providerName = 'Service Provider';
            try {
              const { data: providerData } = await supabase
                .from('service_providers')
                .select('business_name')
                .eq('id', request.service_provider_id)
                .single();
              
              if (providerData?.business_name) {
                providerName = providerData.business_name;
              }
            } catch (providerError) {
              console.log('Could not fetch provider for:', request.service_provider_id);
              // Try to get provider name from a different way or use fallback
              providerName = `Provider (${request.service_provider_id?.slice(0, 8)}...)`;
            }

            // Get workflow details
            let workflowData = null;
            try {
              const { data: workflow } = await supabase
                .from('project_workflow')
                .select('*')
                .eq('request_id', request.id)
                .single();
              workflowData = workflow;
            } catch (workflowError) {
              console.log('No workflow data found for request:', request.id);
            }

            const orderData = {
              ...request,
              provider_business_name: providerName,
              provider_name: providerName,
              payment_status: workflowData?.payment_status || 'not_paid',
              delivery_status: workflowData?.delivery_status || 'not_delivered',
              latest_delivery_title: workflowData?.latest_delivery_title,
              latest_revision_feedback: workflowData?.latest_revision_feedback,
            };

            console.log('Processed order:', orderData.id, 'Provider:', providerName, 'Status:', orderData.status);
            return orderData;

          } catch (error) {
            console.error('Error processing request:', request.id, error);
            return {
              ...request,
              provider_business_name: 'Unknown Provider',
              provider_name: 'Unknown Provider',
              payment_status: 'unknown',
              delivery_status: 'unknown',
            };
          }
        })
      );

      console.log('Orders processed:', ordersWithWorkflow.length);
      console.log('First order details:', ordersWithWorkflow[0]);
      setOrders(ordersWithWorkflow);
      
      // Load work submissions for this client
      try {
        // First get ALL submissions to debug
        const { data: allSubmissions, error: submissionsError } = await supabase
          .from('work_submissions')
          .select('*')
          .order('submitted_at', { ascending: false });
          
        console.log('ALL work submissions in database:', allSubmissions);
        
        // Filter for user's submissions
        const userSubmissions = (allSubmissions || []).filter(submission => 
          submission.client_id === user.id || submission.service_provider_id === user.id
        );
        
        console.log('User work submissions:', userSubmissions);
        setWorkSubmissions(userSubmissions);
      } catch (submissionError) {
        console.error('Error loading work submissions:', submissionError);
        // Don't fail the whole load if submissions fail
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadOrders(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FCD34D';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#059669';
      case 'cancelled': return '#EF4444';
      case 'rejected': return '#F87171';
      default: return '#9CA3AF';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'in_progress': return 'play-circle-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'rejected': return 'close-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  const calculateDueDate = (createdAt: string, timeline: string) => {
    const created = new Date(createdAt);
    
    // Guard against null/undefined timeline
    if (!timeline || typeof timeline !== 'string') {
      // Default to 2 weeks if no timeline specified
      created.setDate(created.getDate() + 14);
      return created;
    }
    
    const parts = timeline.split(' ');
    const timelineNum = parseInt(parts[0]) || 14; // Default to 14 if parsing fails
    const timelineUnit = parts[1] || 'days';
    
    if (timelineUnit.includes('week')) {
      created.setDate(created.getDate() + (timelineNum * 7));
    } else if (timelineUnit.includes('day')) {
      created.setDate(created.getDate() + timelineNum);
    } else if (timelineUnit.includes('month')) {
      created.setMonth(created.getMonth() + timelineNum);
    } else {
      // Default to days if unknown unit
      created.setDate(created.getDate() + timelineNum);
    }
    
    return created;
  };

  const getDaysRemaining = (dueDate: Date) => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderOrderCard = (order: ServiceOrder) => {
    // Guard against missing data
    if (!order) return null;
    
    const dueDate = calculateDueDate(order.created_at || new Date().toISOString(), order.timeline);
    const daysRemaining = getDaysRemaining(dueDate);
    const isOverdue = daysRemaining < 0;

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => {
          // Check if there's a delivery for this order
          // For now, navigate to details - we'll add delivery checking logic
          navigation.navigate('ProjectRequestDetails', { requestId: order.id });
        }}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderTitle}>
              {formatServiceType(order.service_type)}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(order.status)} 
                size={16} 
                color={getStatusColor(order.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ProjectRequestDetails', { requestId: order.id })}>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Provider */}
        <View style={styles.providerSection}>
          <Ionicons name="person-outline" size={16} color="#3B82F6" />
          <Text style={styles.providerText}>{order.provider_business_name}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {order.project_description}
        </Text>

        {/* Key Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color="#3B82F6" />
            <Text style={styles.detailText}>Budget: ${order.budget_range || 'TBD'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.detailText}>Timeline: {order.timeline || 'TBD'}</Text>
          </View>
        </View>

        {/* Progress and Due Date (for accepted/in-progress orders) */}
        {(order.status === 'accepted' || order.status === 'in_progress') && (
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Payment</Text>
                <View style={[styles.progressDot, { 
                  backgroundColor: order.payment_status === 'paid' ? '#3B82F6' : '#6B7280' 
                }]} />
              </View>
              <View style={styles.progressLine} />
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Delivery</Text>
                <View style={[styles.progressDot, { 
                  backgroundColor: order.delivery_status === 'delivered' ? '#3B82F6' : '#6B7280' 
                }]} />
              </View>
            </View>

            {/* Due Date Warning */}
            <View style={styles.dueDateContainer}>
              <Ionicons 
                name={isOverdue ? "warning" : "calendar-outline"} 
                size={14} 
                color={isOverdue ? "#EF4444" : "#6B7280"} 
              />
              <Text style={[styles.dueDateText, { 
                color: isOverdue ? "#EF4444" : "#6B7280" 
              }]}>
                {isOverdue 
                  ? `Overdue by ${Math.abs(daysRemaining)} days`
                  : `Due in ${daysRemaining} days`
                }
              </Text>
            </View>
          </View>
        )}

        {/* Latest Update */}
        {order.latest_delivery_title && (
          <View style={styles.updateSection}>
            <Ionicons name="document-outline" size={14} color="#3B82F6" />
            <Text style={styles.updateText} numberOfLines={1}>
              Latest: {order.latest_delivery_title}
            </Text>
          </View>
        )}

        {/* Order Date */}
        <Text style={styles.orderDate}>
          Ordered on {formatDate(order.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {orders.filter(o => o.status === 'accepted' || o.status === 'in_progress').length}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {orders.filter(o => o.status === 'completed').length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      {/* Work Submissions Section */}
      {workSubmissions.length > 0 && (
        <View style={styles.submissionsSection}>
          <Text style={styles.submissionsTitle}>Work Submissions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.submissionsScrollView}
          >
            {workSubmissions.map((submission) => (
              <TouchableOpacity
                key={submission.id}
                style={styles.submissionCard}
                onPress={() => navigation.navigate('ClientWorkView', { submissionId: submission.id })}
              >
                <View style={styles.submissionHeader}>
                  <Ionicons 
                    name={submission.status === 'submitted' ? 'checkmark-circle' : 'time'} 
                    size={20} 
                    color={submission.status === 'submitted' ? '#3B82F6' : '#F59E0B'} 
                  />
                  <Text style={styles.submissionStatus}>
                    {submission.status === 'submitted' ? 'Submitted' : 'Pending'}
                  </Text>
                </View>
                <Text style={styles.submissionTitle}>{submission.title}</Text>
                <Text style={styles.submissionDescription} numberOfLines={2}>
                  {submission.description}
                </Text>
                <View style={styles.submissionDetails}>
                  <Text style={styles.submissionFiles}>
                    {submission.file_count} file(s)
                  </Text>
                  {submission.payment_amount && (
                    <Text style={styles.submissionPayment}>
                      ${submission.payment_amount}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Orders List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {orders.length > 0 ? (
          <>
            {orders.map(renderOrderCard)}
            <View style={styles.bottomPadding} />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtext}>
              When you request services from providers, they'll appear here
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('ServiceProviders')}
            >
              <Text style={styles.browseButtonText}>Browse Service Providers</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  providerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  providerText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  progressSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    height: 2,
    backgroundColor: '#374151',
    flex: 2,
    marginHorizontal: 8,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  updateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  updateText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    flex: 1,
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
  // Work submissions styles
  submissionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  submissionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  submissionsScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  submissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    borderWidth: 1,
    borderColor: '#374151',
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  submissionStatus: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  submissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  submissionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  submissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submissionFiles: {
    color: '#3B82F6',
    fontSize: 12,
  },
  submissionPayment: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MyOrdersScreen;
