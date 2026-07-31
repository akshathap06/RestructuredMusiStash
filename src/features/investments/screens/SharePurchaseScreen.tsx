import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { mobileCampaignService, FundingCampaign, InvestorProfile, PaymentMethod } from '../services/campaignService';
import { supabase } from '../../../lib/supabase';

const SharePurchaseScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { campaignId } = route.params;

  const [campaign, setCampaign] = useState<FundingCampaign | null>(null);
  const [investor, setInvestor] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [shares, setShares] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('apple_pay');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [camp, { data: { user } }] = await Promise.all([
        mobileCampaignService.getCampaign(campaignId),
        supabase.auth.getUser(),
      ]);
      setCampaign(camp);
      if (user) {
        const profile = await mobileCampaignService.getOrCreateInvestorProfile(user.id);
        setInvestor(profile);
      }
      setLoading(false);
    };
    init();
  }, [campaignId]);

  const totalCost = (campaign?.share_price ?? 0) * shares;
  const sharesAvailable = campaign ? campaign.total_shares - campaign.shares_sold : 0;

  const handlePurchase = async () => {
    if (!campaign || !investor || !acknowledged) return;

    if (investor.kyc_status !== 'verified') {
      Alert.alert('Verification Required', 'Complete identity verification before investing.');
      return;
    }

    setPurchasing(true);
    try {
      await mobileCampaignService.purchaseShares(campaign.id, investor.id, shares, paymentMethod);

      Alert.alert(
        'Shares Purchased',
        `You bought ${shares} share${shares > 1 ? 's' : ''} in "${campaign.title}" for $${totalCost.toLocaleString()}. Funds are held in escrow.`,
        [{ text: 'View Portfolio', onPress: () => navigation.navigate('InvestorDashboard') }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to purchase shares');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#6b7280' }}>Campaign not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.heading}>Buy Shares</Text>
      <Text style={styles.subheading}>{campaign.title}</Text>

      {/* Share Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Number of Shares</Text>
        <View style={styles.shareSelector}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => setShares(Math.max(1, shares - 1))}
          >
            <Text style={styles.shareBtnText}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.shareInput}
            value={String(shares)}
            onChangeText={t => {
              const n = parseInt(t) || 1;
              setShares(Math.max(1, Math.min(sharesAvailable, n)));
            }}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => setShares(Math.min(sharesAvailable, shares + 1))}
          >
            <Text style={styles.shareBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>${campaign.share_price}/share · {sharesAvailable} available</Text>
      </View>

      {/* Cost Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{shares} share{shares > 1 ? 's' : ''} × ${campaign.share_price}</Text>
          <Text style={styles.summaryValue}>${totalCost.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 8 }]}>
          <Text style={styles.summaryLabel}>Revenue share / $10</Text>
          <Text style={[styles.summaryValue, { color: '#60a5fa' }]}>{campaign.revenue_share_rate}%</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentMethod === 'apple_pay' && styles.paymentBtnActive]}
            onPress={() => setPaymentMethod('apple_pay')}
          >
            <Text style={[styles.paymentBtnText, paymentMethod === 'apple_pay' && styles.paymentBtnTextActive]}>
               Apple Pay
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentMethod === 'card' && styles.paymentBtnActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text style={[styles.paymentBtnText, paymentMethod === 'card' && styles.paymentBtnTextActive]}>
              Card
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Risk Acknowledgement */}
      <TouchableOpacity
        style={styles.ackRow}
        onPress={() => setAcknowledged(!acknowledged)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
          {acknowledged && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.ackText}>
          I understand this is a high-risk investment. I may lose my entire investment,
          and these securities cannot be resold for one year.
        </Text>
      </TouchableOpacity>

      {/* Purchase Button */}
      <TouchableOpacity
        style={[styles.purchaseButton, (!acknowledged || purchasing) && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={!acknowledged || purchasing}
        activeOpacity={0.8}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.purchaseButtonText}>Invest ${totalCost.toLocaleString()}</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.escrowNote}>
        Funds held in escrow until campaign reaches minimum target
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1216', paddingTop: 60, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, backgroundColor: '#0f1216', justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subheading: { fontSize: 16, color: '#9ca3af', marginBottom: 24 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, color: '#9ca3af', marginBottom: 8, fontWeight: '600' },
  shareSelector: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1f2937',
    justifyContent: 'center', alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  shareInput: {
    width: 80, height: 44, borderRadius: 12, backgroundColor: '#1f2937',
    color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '700',
  },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  summaryCard: {
    backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 20,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: '#9ca3af' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#fff' },
  paymentRow: { flexDirection: 'row', gap: 12 },
  paymentBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1f2937', alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  paymentBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  paymentBtnText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  paymentBtnTextActive: { color: '#fff' },
  ackRow: { flexDirection: 'row', gap: 12, marginBottom: 24, alignItems: 'flex-start' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: '#4b5563', justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ackText: { flex: 1, fontSize: 13, color: '#9ca3af', lineHeight: 18 },
  purchaseButton: {
    backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: { opacity: 0.5 },
  purchaseButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  escrowNote: { textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 12 },
});

export default SharePurchaseScreen;
