import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { simplePaymentService } from '../services/simplePaymentService';

interface EarningsData {
  total_earnings: number;
  pending_payouts: number;
  total_payments: number;
}

interface PendingPayout {
  payment_id: string;
  submission_id: string;
  amount: number;
  created_at: string;
  client_name: string;
  business_name: string;
}

export default function SimpleEarningsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load total earnings
      const earningsResult = await simplePaymentService.getProviderTotalEarnings(user.id);
      if (earningsResult.success) {
        setEarnings({
          total_earnings: earningsResult.total_earnings || 0,
          pending_payouts: earningsResult.pending_payouts || 0,
          total_payments: earningsResult.total_payments || 0,
        });
      }

      // Load pending payouts
      const payoutsResult = await simplePaymentService.getProviderPendingPayouts(user.id);
      if (payoutsResult.success && payoutsResult.pending_payouts) {
        setPendingPayouts(payoutsResult.pending_payouts);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  const handleRequestPayout = async () => {
    if (!user) return;

    if (earnings?.pending_payouts === 0) {
      Alert.alert('No Payouts Available', 'You have no pending payouts to request.');
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of $${earnings?.pending_payouts?.toFixed(2)}?\n\nThis will be processed within 3-5 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: confirmPayoutRequest,
        },
      ]
    );
  };

  const confirmPayoutRequest = async () => {
    if (!user) return;

    setRequestingPayout(true);
    try {
      const result = await simplePaymentService.requestPayout(user.id, 'bank_transfer');
      
      if (result.success) {
        Alert.alert(
          'Payout Requested',
          `Your payout of $${result.total_amount?.toFixed(2)} has been requested and will be processed within 3-5 business days.`,
          [
            {
              text: 'OK',
              onPress: () => {
                loadEarningsData(); // Refresh data
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      Alert.alert('Error', 'Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEarningsSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Your Earnings</Text>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(earnings?.total_earnings || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="time" size={24} color="#F59E0B" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Pending Payout</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(earnings?.pending_payouts || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="card" size={24} color="#3B82F6" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Payments</Text>
            <Text style={styles.summaryValue}>
              {earnings?.total_payments || 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPayoutSection = () => (
    <View style={styles.payoutContainer}>
      <Text style={styles.sectionTitle}>Payout Management</Text>
      
      <View style={styles.payoutCard}>
        <View style={styles.payoutInfo}>
          <Ionicons name="bank" size={24} color="#3B82F6" />
          <View style={styles.payoutText}>
            <Text style={styles.payoutTitle}>Bank Transfer</Text>
            <Text style={styles.payoutSubtitle}>
              Payouts are processed within 3-5 business days
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.payoutButton,
            (earnings?.pending_payouts === 0 || requestingPayout) && styles.disabledButton
          ]}
          onPress={handleRequestPayout}
          disabled={earnings?.pending_payouts === 0 || requestingPayout}
        >
          {requestingPayout ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              <Text style={styles.payoutButtonText}>Request Payout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingPayouts = () => (
    <View style={styles.pendingContainer}>
      <Text style={styles.sectionTitle}>Pending Payouts</Text>
      
      {pendingPayouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
          <Text style={styles.emptyText}>No pending payouts</Text>
          <Text style={styles.emptySubtext}>
            All your earnings have been requested for payout
          </Text>
        </View>
      ) : (
        <View style={styles.payoutList}>
          {pendingPayouts.map((payout, index) => (
            <View key={payout.payment_id} style={styles.payoutItem}>
              <View style={styles.payoutItemHeader}>
                <View style={styles.payoutItemInfo}>
                  <Text style={styles.clientName}>{payout.client_name}</Text>
                  <Text style={styles.payoutDate}>{formatDate(payout.created_at)}</Text>
                </View>
                <Text style={styles.payoutAmount}>
                  {formatCurrency(payout.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
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
        <Text style={styles.headerTitle}>My Earnings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderEarningsSummary()}
        {renderPayoutSection()}
        {renderPendingPayouts()}
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
    fontSize: 20,
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
    fontSize: 16,
    marginTop: 16,
  },
  summaryContainer: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  payoutContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  payoutCard: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  payoutText: {
    flex: 1,
  },
  payoutTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  payoutSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  payoutList: {
    gap: 12,
  },
  payoutItem: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
  },
  payoutItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutItemInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  payoutDate: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  payoutAmount: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
