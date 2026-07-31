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
import { supabase } from '../../../lib/supabase';
import projectRequestService, { ProjectRequest } from '../../../services/projectRequestService';
import { serviceListingService } from '../../../services/serviceListingService';
import ServiceListingRemovalModal from '../../../components/ServiceListingRemovalModal';

export default function ServiceProviderDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [serviceProvider, setServiceProvider] = useState<any>(null);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{ label: string; value: number }[]>([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    total: 0,
    accepted: 0,
    pending: 0,
    conversion: 0,
    avgResponse: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showRemovalModal, setShowRemovalModal] = useState(false);

  useEffect(() => {
    loadServiceProviderData();
  }, []);

  const loadServiceProviderData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: providerData, error: providerError } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (providerError) {
        console.error('Error fetching service provider:', providerError);
        Alert.alert('Error', 'Failed to load service provider data');
        return;
      }

      setServiceProvider(providerData);

      const providerRequests = await projectRequestService.getProviderProjectRequests(user.id);
      setRequests(providerRequests);
      computeAnalytics(providerRequests);

    } catch (error) {
      console.error('Error loading service provider data:', error);
      Alert.alert('Error', 'Failed to load service provider data');
    } finally {
      setLoading(false);
    }
  };

  const computeAnalytics = (requestList: ProjectRequest[]) => {
    const total = requestList.length;
    const accepted = requestList.filter(req => req.status === 'accepted').length;
    const pending = requestList.filter(req => req.status === 'pending').length;
    const conversion = total ? Math.round((accepted / total) * 100) : 0;

    const responded = requestList.filter(req => req.status !== 'pending');
    const avgResponseMs = responded.length
      ? responded.reduce((sum, req) => {
          const created = new Date(req.created_at).getTime();
          const updated = new Date(req.updated_at).getTime();
          return sum + Math.max(0, updated - created);
        }, 0) / responded.length
      : 0;
    const avgResponseHours = Math.max(1, Math.round(avgResponseMs / (1000 * 60 * 60)));

    const now = new Date();
    const monthMap = new Map<string, { label: string; value: number }>();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthMap.set(key, {
        label: date.toLocaleString('default', { month: 'short' }),
        value: 0,
      });
    }

    requestList.forEach(req => {
      const created = new Date(req.created_at);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (monthMap.has(key)) {
        monthMap.get(key)!.value += 1;
      }
    });

    setMonthlyStats(Array.from(monthMap.values()));
    setSummaryMetrics({
      total,
      accepted,
      pending,
      conversion,
      avgResponse: avgResponseHours,
    });
  };

  const renderPerformanceMetrics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Requests</Text>
          <Text style={styles.metricValue}>{summaryMetrics.total}</Text>
          <Text style={styles.metricHint}>{summaryMetrics.accepted} converted</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Conversion Rate</Text>
          <Text style={styles.metricValue}>{summaryMetrics.conversion}%</Text>
          <Text style={styles.metricHint}>Accepted vs total</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Avg. Response</Text>
          <Text style={styles.metricValue}>{summaryMetrics.avgResponse}h</Text>
          <Text style={styles.metricHint}>Time to reply</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending Leads</Text>
          <Text style={styles.metricValue}>{summaryMetrics.pending}</Text>
          <Text style={styles.metricHint}>Needs action</Text>
        </View>
      </View>
    </View>
  );

  const renderRequestsChart = () => {
    if (!monthlyStats.length) return null;
    const maxValue = Math.max(...monthlyStats.map(item => item.value), 1);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Requests Trend</Text>
        </View>
        <View style={styles.chartContainer}>
          {monthlyStats.map(item => (
            <View key={item.label} style={styles.chartColumn}>
              <View style={styles.chartBarShell}>
                <View
                  style={[
                    styles.chartBarFill,
                    { height: `${(item.value / maxValue) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.label}</Text>
              <Text style={styles.chartValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
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

  const getRequestCount = (status: string) => {
    return requests.filter(request => request.status === status).length;
  };

  const handleRemoveService = () => {
    setShowRemovalModal(true);
  };

  const handleRemovalSuccess = () => {
    // Refresh the data after successful removal
    loadServiceProviderData();
  };

  const renderServiceInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Service</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemoveService}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceIcon}>
            <Ionicons name="musical-notes" size={24} color="#3B82F6" />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceProvider?.business_name || 'Service Provider'}</Text>
            <Text style={styles.serviceDescription}>{serviceProvider?.description || 'Professional music services'}</Text>
          </View>
        </View>
        <View style={styles.serviceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{requests.length}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getRequestCount('accepted')}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{getRequestCount('pending')}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Get accepted projects that need work submission
  const acceptedProjects = requests.filter(req => req.status === 'accepted');
  const pendingSubmissions = acceptedProjects.length;

  const handleSubmitWork = () => {
    if (acceptedProjects.length === 0) {
      Alert.alert(
        'No Projects Ready', 
        'You don\'t have any accepted projects waiting for work submission.\n\nAccept a project request first to start delivering work.'
      );
      return;
    }
    
    if (acceptedProjects.length === 1) {
      // Navigate directly to the single project's submission
      const project = acceptedProjects[0];
      navigation.navigate('SubmitWorkScreen', {
        requestId: project.id,
        projectTitle: project.service_type,
        clientName: 'Client',
        serviceType: project.service_type,
        agreedPrice: project.budget_range,
      });
    } else {
      // Multiple projects - navigate to requests filtered by accepted
      navigation.navigate('ServiceProviderRequests', { filter: 'accepted' });
    }
  };

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('ServiceProviderRequests')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="trending-up" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionTitle}>Sales & Leads</Text>
          <Text style={styles.actionSubtitle}>{summaryMetrics.total} requests</Text>
          {summaryMetrics.pending > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{summaryMetrics.pending} new</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('SimpleEarnings')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="wallet" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionTitle}>My Earnings</Text>
          <Text style={styles.actionSubtitle}>View & withdraw</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => {
            if (serviceProvider?.id) {
              navigation.navigate('ServiceProviderDetail', { provider: serviceProvider });
            } else {
              Alert.alert('Error', 'Service provider profile not found');
            }
          }}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
            <Ionicons name="person-circle" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionTitle}>My Profile</Text>
          <Text style={styles.actionSubtitle}>Edit & preview</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={handleSubmitWork}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="cloud-upload" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionTitle}>Submit Work</Text>
          <Text style={styles.actionSubtitle}>Deliver to clients</Text>
          {pendingSubmissions > 0 && (
            <View style={[styles.actionBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.actionBadgeText}>{pendingSubmissions} ready</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentRequests = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ServiceProviderRequests')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trending-up-outline" size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Requests Yet</Text>
          <Text style={styles.emptySubtitle}>
            Keep your profile updated to attract more clients!
          </Text>
        </View>
      ) : (
        <View style={styles.requestsList}>
          {requests.slice(0, 3).map((request) => (
            <TouchableOpacity 
              key={request.id} 
              style={styles.requestCard}
              onPress={() => navigation.navigate('ProjectRequestDetails', { requestId: request.id })}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.serviceType}>{request.service_type}</Text>
                  <Text style={styles.clientName}>From: Client</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.description} numberOfLines={2}>
                {request.project_description}
              </Text>
              
              <View style={styles.requestFooter}>
                <Text style={styles.date}>{formatDate(request.created_at)}</Text>
                {request.budget_range && (
                  <Text style={styles.budget}>{request.budget_range}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        <Text style={styles.headerTitle}>My Services</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderPerformanceMetrics()}
        {renderRequestsChart()}
        {renderServiceInfo()}
        {renderQuickActions()}
        {renderRecentRequests()}
      </ScrollView>

      {/* Service Listing Removal Modal */}
      {serviceProvider && (
        <ServiceListingRemovalModal
          visible={showRemovalModal}
          onClose={() => setShowRemovalModal(false)}
          listingId={serviceProvider.id}
          providerId={user?.id || ''}
          businessName={serviceProvider.business_name || 'Service Provider'}
          serviceCategory={serviceProvider.service_category || 'Music Services'}
          onRemovalSuccess={handleRemovalSuccess}
        />
      )}
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
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  serviceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 120,
    position: 'relative',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#1E1E28',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    flexBasis: '48%',
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricHint: {
    color: '#6B7280',
    fontSize: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 10,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  chartBarShell: {
    height: 120,
    width: 18,
    borderRadius: 8,
    backgroundColor: '#1E1E28',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2F2F3F',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  chartLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 6,
  },
  chartValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
});
