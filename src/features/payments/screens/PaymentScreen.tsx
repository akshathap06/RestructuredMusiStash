import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { PaymentDeliveryService, ProjectPayment } from '../../../services/paymentDeliveryService';
import projectRequestService from '../../../services/projectRequestService';
import { useStripe } from '../../../contexts/StripeContext';

// Conditionally import StripePaymentService for mobile only
let StripePaymentService: any = null;
if (Platform.OS !== 'web') {
  StripePaymentService = require('../services/stripePaymentService').default;
}

interface PaymentScreenProps {
  route: {
    params: {
      requestId: string;
    };
  };
  navigation: any;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { isReady: stripeReady } = useStripe();
  const { requestId } = route.params;
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState(0);
  const [agreement, setAgreement] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<ProjectPayment | null>(null);

  // Fee calculation (4% platform fee)
  const platformFee = Math.round(amount * 0.04 * 100) / 100;
  const totalAmount = amount + platformFee;

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const requestData = await projectRequestService.getProjectRequest(requestId);
      const agreementData = await projectRequestService.getProjectAgreement(requestId);
      
      setRequest(requestData);
      setAgreement(agreementData);
      
      if (agreementData?.final_price && !isNaN(parseFloat(agreementData.final_price))) {
        setAmount(parseFloat(agreementData.final_price));
      }
      
      // Load existing payment record if any
      const active = await PaymentDeliveryService.getActivePayment(requestId);
      if (active) setPaymentRecord(active);
    } catch (error) {
      console.error('Error loading payment details:', error);
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const ensurePaymentRecord = async (): Promise<ProjectPayment> => {
    if (!user?.id) throw new Error('Please log in to continue');
    if (!amount || amount <= 0) throw new Error('Invalid amount');

    if (paymentRecord && ['pending', 'processing'].includes(paymentRecord.status)) {
      return paymentRecord;
    }

    const existing = await PaymentDeliveryService.getActivePayment(requestId);
    if (existing) {
      setPaymentRecord(existing);
      return existing;
    }

    const newPayment = await PaymentDeliveryService.createPayment(
      requestId,
      amount,
      user.id,
      request.service_provider_id
    );
    setPaymentRecord(newPayment);
    return newPayment;
  };

  const handlePayment = async () => {
    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the terms to continue');
      return;
    }

    if (Platform.OS === 'web' || !StripePaymentService) {
      Alert.alert('Not Available', 'Payments are only available in the mobile app');
      return;
    }

    if (!stripeReady) {
      Alert.alert('Please Wait', 'Payment system is initializing...');
      return;
    }

    try {
      setProcessing(true);

      const activePayment = await ensurePaymentRecord();
      await PaymentDeliveryService.updatePaymentStatus(activePayment.id, 'processing');

      const paymentResult = await StripePaymentService.processPayment({
        paymentId: activePayment.id,
        projectRequestId: requestId,
        amount: totalAmount,
        currency: 'usd',
        clientId: user?.id || '',
        providerId: request?.service_provider_id || '',
        description: `Payment for ${request?.service_type || 'project'}`,
      });

      if (paymentResult.success) {
        await PaymentDeliveryService.updatePaymentStatus(activePayment.id, 'completed', paymentResult.paymentId);
        
        Alert.alert(
          'Payment Successful! 🎉',
          'Your payment has been processed. The provider will begin work shortly.',
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } else {
        await PaymentDeliveryService.updatePaymentStatus(activePayment.id, 'failed');
        Alert.alert('Payment Failed', paymentResult.error || 'Please try again');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canPay = amount > 0 && termsAccepted && stripeReady && !processing;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Service Info */}
        <View style={styles.serviceCard}>
          <Text style={styles.serviceName}>{request?.service_type}</Text>
          <Text style={styles.providerName}>by {request?.provider_name || 'Service Provider'}</Text>
        </View>

        {/* Amount Display */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>${totalAmount.toFixed(2)}</Text>
          <Text style={styles.amountBreakdown}>
            ${amount.toFixed(2)} + ${platformFee.toFixed(2)} fee
          </Text>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.securityText}>Secure payment via Stripe</Text>
        </View>

        {/* Terms Checkbox */}
        <TouchableOpacity 
          style={styles.termsRow} 
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the terms of service
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, !canPay && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={!canPay}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay ${totalAmount.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          Payment is held until work is delivered
        </Text>
      </View>
    </SafeAreaView>
  );
};

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
  loadingText: {
    color: '#6B7280',
    marginTop: 12,
    fontSize: 16,
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
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  serviceCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  serviceName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  providerName: {
    color: '#6B7280',
    fontSize: 15,
  },
  amountCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  amountLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  amountBreakdown: {
    color: '#6B7280',
    fontSize: 14,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  securityText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  termsText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  payButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  payButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footerNote: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
