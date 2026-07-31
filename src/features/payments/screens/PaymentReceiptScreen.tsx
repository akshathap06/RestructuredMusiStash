import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import paymentIntegrationService, { PaymentReceipt } from '../../../services/paymentIntegrationService';

interface PaymentReceiptScreenProps {
  route: {
    params: {
      paymentIntentId: string;
    };
  };
  navigation: any;
}

export const PaymentReceiptScreen: React.FC<PaymentReceiptScreenProps> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { paymentIntentId } = route.params;
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    loadReceiptDetails();
  }, [paymentIntentId]);

  const loadReceiptDetails = async () => {
    try {
      setLoading(true);
      const receiptData = await paymentIntegrationService.getPaymentReceipt(paymentIntentId);
      setReceipt(receiptData);
    } catch (error) {
      console.error('Error loading receipt:', error);
      Alert.alert('Error', 'Failed to load receipt details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receipt) return;

    try {
      setDownloadingPDF(true);
      const pdfUrl = await paymentIntegrationService.downloadReceiptPDF(receipt.id);
      
      if (pdfUrl) {
        Alert.alert(
          'PDF Ready',
          'Your receipt PDF has been generated successfully.',
          [
            { text: 'Share', onPress: () => shareReceipt(pdfUrl) },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF receipt');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const shareReceipt = async (pdfUrl?: string) => {
    try {
      const shareContent = {
        message: `Payment Receipt #${receipt?.receipt_number}\n\nTransaction completed on ${receipt?.issued_at ? new Date(receipt.issued_at).toLocaleDateString() : 'N/A'}\nAmount: $${receipt?.amount.toFixed(2)}\n\nMusistash Platform Receipt`,
        url: pdfUrl || undefined,
      };

      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      card: 'Credit/Debit Card',
      paypal: 'PayPal',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading receipt...</Text>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="receipt-outline" size={64} color="#6B7280" />
        <Text style={styles.errorTitle}>Receipt Not Found</Text>
        <Text style={styles.errorText}>Unable to locate this payment receipt</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Receipt</Text>
        <TouchableOpacity onPress={() => shareReceipt()}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Receipt Header */}
      <View style={styles.receiptHeader}>
        <View style={styles.receiptIconContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        </View>
        <Text style={styles.receiptTitle}>Payment Successful</Text>
        <Text style={styles.receiptAmount}>${receipt.amount.toFixed(2)}</Text>
        <Text style={styles.receiptDate}>
          {new Date(receipt.issued_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      {/* Receipt Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Transaction Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Receipt Number:</Text>
          <Text style={styles.detailValue}>{receipt.receipt_number}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method:</Text>
          <Text style={styles.detailValue}>{formatPaymentMethod(receipt.payment_method)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{receipt.transaction_id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Currency:</Text>
          <Text style={styles.detailValue}>{receipt.currency.toUpperCase()}</Text>
        </View>
      </View>

      {/* Project Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Project Information</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Type:</Text>
          <Text style={styles.detailValue}>{receipt.project_details.service_type}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue}>{receipt.project_details.description}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Timeline:</Text>
          <Text style={styles.detailValue}>{receipt.project_details.timeline}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Agreed Price:</Text>
          <Text style={styles.detailValue}>${receipt.project_details.agreed_price.toFixed(2)}</Text>
        </View>
      </View>

      {/* Fee Breakdown */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Fee Breakdown</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Amount:</Text>
          <Text style={styles.detailValue}>${(receipt.amount - receipt.transaction_fee).toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction Fee:</Text>
          <Text style={styles.detailValue}>${receipt.transaction_fee.toFixed(2)}</Text>
        </View>
        
        <View style={[styles.detailRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Paid:</Text>
          <Text style={styles.totalValue}>${receipt.amount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Provider Receives:</Text>
          <Text style={[styles.detailValue, { color: '#10B981' }]}>${receipt.net_amount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Legal Notice */}
      <View style={styles.legalCard}>
        <Text style={styles.legalTitle}>Legal Information</Text>
        <Text style={styles.legalText}>
          This receipt serves as proof of payment for services requested through the Musistash platform. 
          Terms and conditions were accepted at the time of payment.
        </Text>
        
        <View style={styles.legalRow}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.legalItemText}>Terms & Conditions Accepted</Text>
        </View>
        
        <View style={styles.legalRow}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.legalItemText}>Secure Payment Processed</Text>
        </View>
        
        <View style={styles.legalRow}>
          <Ionicons name="document-text" size={16} color="#10B981" />
          <Text style={styles.legalItemText}>Legal Disclaimer Acknowledged</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleDownloadPDF}
          disabled={downloadingPDF}
        >
          {downloadingPDF ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="document" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.pdfButtonText}>
            {downloadingPDF ? 'Generating...' : 'Download PDF'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => shareReceipt()}
        >
          <Ionicons name="share-outline" size={20} color="#3B82F6" />
          <Text style={styles.shareButtonText}>Share Receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          For support or questions about this transaction, please contact us at support@musistash.com
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 32,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  receiptIconContainer: {
    marginBottom: 16,
  },
  receiptTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  receiptAmount: {
    color: '#10B981',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  receiptDate: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legalCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  legalTitle: {
    color: '#92400E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legalText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legalItemText: {
    color: '#92400E',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaymentReceiptScreen;
