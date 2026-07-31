import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface EarningsData {
  totalEarnings: number;
  pendingPayouts: number;
  availableBalance: number;
  completedPayouts: number;
  recentTransactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'earning' | 'payout';
  amount: number;
  status: string;
  description: string;
  date: string;
  projectTitle?: string;
}

export default function ProviderEarningsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    pendingPayouts: 0,
    availableBalance: 0,
    completedPayouts: 0,
    recentTransactions: [],
  });
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    loadEarnings();
    checkStripeStatus();
  }, []);

  const checkStripeStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('stripe_account_id, can_accept_payments')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setStripeConnected(!!data.stripe_account_id && data.can_accept_payments);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const loadEarnings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get payments where this provider was paid
      const { data: payments, error: paymentsError } = await supabase
        .from('project_payments')
        .select(`
          id,
          amount,
          platform_fee,
          status,
          created_at,
          project_requests (
            service_type,
            project_description
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
      }

      // Calculate totals
      let totalEarnings = 0;
      let pendingPayouts = 0;
      let completedPayouts = 0;
      const transactions: Transaction[] = [];

      (payments || []).forEach((payment: any) => {
        const providerAmount = payment.amount - (payment.platform_fee || 0);
        
        if (payment.status === 'completed') {
          totalEarnings += providerAmount;
          pendingPayouts += providerAmount; // Available for payout
          
          transactions.push({
            id: payment.id,
            type: 'earning',
            amount: providerAmount,
            status: payment.status,
            description: payment.project_requests?.service_type || 'Project Payment',
            date: payment.created_at,
            projectTitle: payment.project_requests?.project_description,
          });
        }
      });

      // Get payout history
      const { data: payouts, error: payoutsError } = await supabase
        .from('provider_payouts')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      (payouts || []).forEach((payout: any) => {
        if (payout.status === 'completed') {
          completedPayouts += payout.amount;
          pendingPayouts -= payout.amount;
        }
        
        transactions.push({
          id: payout.id,
          type: 'payout',
          amount: payout.amount,
          status: payout.status,
          description: 'Payout to bank',
          date: payout.created_at,
        });
      });

      // Sort transactions by date
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEarnings({
        totalEarnings,
        pendingPayouts: Math.max(0, pendingPayouts),
        availableBalance: Math.max(0, pendingPayouts),
        completedPayouts,
        recentTransactions: transactions.slice(0, 10),
      });
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!stripeConnected) {
      Alert.alert(
        'Setup Required',
        'Please complete your Stripe account setup to receive payouts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Now', onPress: () => navigation.navigate('StripeOnboarding') }
        ]
      );
      return;
    }

    if (earnings.availableBalance < 10) {
      Alert.alert('Minimum Balance', 'You need at least $10 to request a payout.');
      return;
    }

    Alert.alert(
      'Request Payout',
      `Transfer $${earnings.availableBalance.toFixed(2)} to your bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Payout',
          onPress: async () => {
            try {
              setRequestingPayout(true);

              // Create payout request
              const { data, error } = await supabase.functions.invoke('request-provider-payout', {
                body: {
                  provider_id: user?.id,
                  amount: earnings.availableBalance,
                }
              });

              if (error) throw error;

              Alert.alert(
                'Payout Requested! 💸',
                'Your payout has been initiated. Funds will arrive in your bank account within 2-3 business days.',
                [{ text: 'OK', onPress: () => loadEarnings() }]
              );
            } catch (error: any) {
              console.error('Payout error:', error);
              Alert.alert('Error', error.message || 'Failed to request payout');
            } finally {
              setRequestingPayout(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadEarnings(); }}
            tintColor="#10B981"
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${earnings.availableBalance.toFixed(2)}</Text>
          
          <TouchableOpacity
            style={[styles.payoutButton, earnings.availableBalance < 10 && styles.payoutButtonDisabled]}
            onPress={handleRequestPayout}
            disabled={requestingPayout || earnings.availableBalance < 10}
          >
            {requestingPayout ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
                <Text style={styles.payoutButtonText}>
                  {earnings.availableBalance >= 10 ? 'Get Paid' : 'Min $10 required'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <Text style={styles.statAmount}>${earnings.totalEarnings.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
            <Text style={styles.statAmount}>${earnings.completedPayouts.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Paid Out</Text>
          </View>
        </View>

        {/* Stripe Status */}
        {!stripeConnected && (
          <TouchableOpacity 
            style={styles.stripeWarning}
            onPress={() => navigation.navigate('StripeOnboarding')}
          >
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <View style={styles.stripeWarningText}>
              <Text style={styles.stripeWarningTitle}>Complete Stripe Setup</Text>
              <Text style={styles.stripeWarningDesc}>Connect your bank to receive payouts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {earnings.recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#3A3A3A" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Complete projects to start earning</Text>
            </View>
          ) : (
            earnings.recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: transaction.type === 'earning' ? '#10B98120' : '#3B82F620' }
                ]}>
                  <Ionicons 
                    name={transaction.type === 'earning' ? 'arrow-down' : 'arrow-up'} 
                    size={20} 
                    color={transaction.type === 'earning' ? '#10B981' : '#3B82F6'} 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'earning' ? '#10B981' : '#3B82F6' }
                ]}>
                  {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            Payouts are processed within 2-3 business days. A 4% platform fee is deducted from each payment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: '#10B981',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 20,
  },
  payoutButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutButtonDisabled: {
    opacity: 0.5,
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  stripeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  stripeWarningText: {
    flex: 1,
  },
  stripeWarningTitle: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
  },
  stripeWarningDesc: {
    color: '#F59E0B',
    fontSize: 13,
    opacity: 0.8,
  },
  transactionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#4B5563',
    fontSize: 14,
    marginTop: 4,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  transactionDate: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 16,
    marginBottom: 32,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
