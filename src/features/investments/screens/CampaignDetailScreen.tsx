import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { mobileCampaignService, FundingCampaign } from '../services/campaignService';

const CampaignDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { campaignId } = route.params;

  const [campaign, setCampaign] = useState<FundingCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileCampaignService.getCampaign(campaignId).then(c => {
      setCampaign(c);
      setLoading(false);
    });
  }, [campaignId]);

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
        <Text style={styles.emptyText}>Campaign not found</Text>
      </View>
    );
  }

  const contract = campaign.campaign_contracts?.[0];
  const pct = Math.min(100, Math.round((campaign.amount_raised / campaign.funding_goal) * 100));
  const daysLeft = campaign.campaign_end_date
    ? Math.max(0, Math.ceil((new Date(campaign.campaign_end_date).getTime() - Date.now()) / 86400000))
    : campaign.deadline_days;
  const sharesAvailable = campaign.total_shares - campaign.shares_sold;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{campaign.campaign_type}</Text>
          </View>
          {campaign.status === 'live' && (
            <View style={[styles.badge, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <Text style={[styles.badgeText, { color: '#22c55e' }]}>Live</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{campaign.title}</Text>
        <Text style={styles.description}>{campaign.description}</Text>
      </View>

      {/* Funding Progress */}
      <View style={styles.section}>
        <Text style={styles.amountRaised}>${campaign.amount_raised.toLocaleString()}</Text>
        <Text style={styles.goal}>of ${campaign.funding_goal.toLocaleString()} ({pct}%)</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{campaign.investor_count}</Text>
            <Text style={styles.statLabel}>Investors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{daysLeft}</Text>
            <Text style={styles.statLabel}>Days Left</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sharesAvailable}</Text>
            <Text style={styles.statLabel}>Shares Left</Text>
          </View>
        </View>
      </View>

      {/* Terms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Investment Terms</Text>
        <View style={styles.termsGrid}>
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Share Price</Text>
            <Text style={styles.termValue}>${campaign.share_price}</Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Rev Share / $10</Text>
            <Text style={[styles.termValue, { color: '#60a5fa' }]}>{campaign.revenue_share_rate}%</Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Distribution</Text>
            <Text style={styles.termValue}>{contract?.distribution_frequency ?? 'Quarterly'}</Text>
          </View>
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Duration</Text>
            <Text style={styles.termValue}>{contract?.contract_duration_months ?? 24} months</Text>
          </View>
        </View>
      </View>

      {/* Risk Factors */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#f87171' }]}>Risk Disclosures</Text>
        {(contract?.risk_factors ?? []).slice(0, 3).map((risk: string, i: number) => (
          <View key={i} style={styles.riskItem}>
            <Text style={styles.riskBullet}>!</Text>
            <Text style={styles.riskText}>{risk}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.paperNote}>
        Paper trading simulation only. No real money, securities, ownership, or financial returns are being offered.
      </Text>

      {/* Paper trade CTA (replaces legacy SharePurchase when paper trading is on) */}
      {campaign.status === 'live' && sharesAvailable > 0 && (
        <TouchableOpacity
          style={styles.investButton}
          onPress={() =>
            navigation.navigate('PaperTrade', {
              projectId: campaign.id,
              projectTitle: campaign.title,
              artistName: campaign.title,
              fundingGoal: campaign.funding_goal,
            })
          }
          activeOpacity={0.8}
          accessibilityLabel="Simulate paper backing"
        >
          <Text style={styles.investButtonText}>Simulate Backing</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1216' },
  loadingContainer: { flex: 1, backgroundColor: '#0f1216', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
  header: { padding: 20, paddingTop: 60 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#60a5fa', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  description: { fontSize: 15, color: '#9ca3af', lineHeight: 22 },
  section: { padding: 20, borderTopWidth: 1, borderTopColor: '#1f2937' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  amountRaised: { fontSize: 28, fontWeight: '800', color: '#22c55e' },
  goal: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  termsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termItem: {
    width: '48%', backgroundColor: '#1f2937', borderRadius: 12,
    padding: 12,
  },
  termLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  termValue: { fontSize: 18, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  riskItem: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  riskBullet: { color: '#f87171', fontWeight: '700', fontSize: 14, marginTop: 1 },
  riskText: { flex: 1, fontSize: 13, color: '#9ca3af', lineHeight: 18 },
  investButton: {
    margin: 20, backgroundColor: '#8B5CF6', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  investButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  paperNote: { marginHorizontal: 20, marginTop: 8, fontSize: 12, color: '#9ca3af', lineHeight: 18 },
});

export default CampaignDetailScreen;
