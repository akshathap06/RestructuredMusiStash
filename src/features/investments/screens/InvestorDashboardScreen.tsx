import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { mobileCampaignService, SharePurchase, RevenueDistribution } from '../services/campaignService';
import { supabase } from '../../../lib/supabase';

const InvestorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'holdings' | 'distributions'>('holdings');

  const [purchases, setPurchases] = useState<SharePurchase[]>([]);
  const [distributions, setDistributions] = useState<RevenueDistribution[]>([]);
  const [summary, setSummary] = useState({
    total_invested: 0, total_earned: 0, active_campaigns: 0, total_shares: 0,
  });

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const portfolio = await mobileCampaignService.getPortfolio(user.id);
    setPurchases(portfolio.purchases);
    setDistributions(portfolio.distributions);
    setSummary(portfolio.summary);
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <Text style={styles.heading}>Portfolio</Text>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Invested</Text>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
            ${summary.total_invested.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Earned</Text>
          <Text style={[styles.summaryValue, { color: '#60a5fa' }]}>
            ${summary.total_earned.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Campaigns</Text>
          <Text style={styles.summaryValue}>{summary.active_campaigns}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Shares</Text>
          <Text style={styles.summaryValue}>{summary.total_shares}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'holdings' && styles.tabActive]}
          onPress={() => setTab('holdings')}
        >
          <Text style={[styles.tabText, tab === 'holdings' && styles.tabTextActive]}>Holdings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'distributions' && styles.tabActive]}
          onPress={() => setTab('distributions')}
        >
          <Text style={[styles.tabText, tab === 'distributions' && styles.tabTextActive]}>Distributions</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'holdings' ? (
        purchases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No investments yet</Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('CampaignBrowse')}
            >
              <Text style={styles.browseBtnText}>Browse Campaigns</Text>
            </TouchableOpacity>
          </View>
        ) : (
          purchases.map(p => {
            const camp = p.funding_campaigns;
            const canResell = new Date(p.resale_eligible_date) <= new Date();
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.holdingCard}
                onPress={() => navigation.navigate('CampaignDetail', { campaignId: p.campaign_id })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.holdingTitle}>{camp?.title ?? 'Campaign'}</Text>
                  <Text style={styles.holdingMeta}>
                    {p.shares_purchased} shares · ${p.price_per_share}/share · {new Date(p.purchased_at).toLocaleDateString()}
                  </Text>
                  <Text style={canResell ? styles.resaleEligible : styles.resaleLocked}>
                    {canResell ? '✓ Resale eligible' : `Locked until ${new Date(p.resale_eligible_date).toLocaleDateString()}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.holdingAmount}>${p.total_amount.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, p.payment_status === 'completed'
                    ? { backgroundColor: 'rgba(34,197,94,0.2)' }
                    : { backgroundColor: 'rgba(59,130,246,0.2)' }
                  ]}>
                    <Text style={[styles.statusBadgeText, p.payment_status === 'completed'
                      ? { color: '#22c55e' }
                      : { color: '#60a5fa' }
                    ]}>
                      {p.payment_status === 'escrow' ? 'In Escrow' : p.payment_status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )
      ) : (
        distributions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No distributions yet</Text>
          </View>
        ) : (
          distributions.map(d => (
            <View key={d.id} style={styles.holdingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.holdingTitle}>{d.funding_campaigns?.title ?? 'Campaign'}</Text>
                <Text style={styles.holdingMeta}>
                  {new Date(d.period_start).toLocaleDateString()} – {new Date(d.period_end).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.holdingAmount, { color: '#22c55e' }]}>
                  +${d.investor_share_amount.toLocaleString()}
                </Text>
                <View style={[styles.statusBadge, d.distribution_status === 'paid'
                  ? { backgroundColor: 'rgba(34,197,94,0.2)' }
                  : { backgroundColor: 'rgba(234,179,8,0.2)' }
                ]}>
                  <Text style={[styles.statusBadgeText, d.distribution_status === 'paid'
                    ? { color: '#22c55e' }
                    : { color: '#eab308' }
                  ]}>
                    {d.distribution_status === 'paid' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1216', paddingTop: 60, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, backgroundColor: '#0f1216', justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  summaryCard: {
    width: '48%', backgroundColor: '#111827', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#1f2937',
  },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1f2937', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#6b7280', fontSize: 16, marginBottom: 16 },
  browseBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  holdingCard: {
    flexDirection: 'row', backgroundColor: '#111827', borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1f2937',
    alignItems: 'center',
  },
  holdingTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  holdingMeta: { fontSize: 12, color: '#6b7280' },
  holdingAmount: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  resaleEligible: { fontSize: 11, color: '#22c55e', marginTop: 2 },
  resaleLocked: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});

export default InvestorDashboardScreen;
