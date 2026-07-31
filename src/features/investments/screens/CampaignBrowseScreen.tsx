import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { mobileCampaignService, FundingCampaign, CampaignType } from '../services/campaignService';

const TYPE_FILTERS: { value: CampaignType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'album', label: 'Albums' },
  { value: 'show', label: 'Shows' },
  { value: 'tour', label: 'Tours' },
  { value: 'project', label: 'Projects' },
];

const CampaignBrowseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [campaigns, setCampaigns] = useState<FundingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CampaignType | ''>('');

  const fetchCampaigns = useCallback(async () => {
    const data = await mobileCampaignService.listLiveCampaigns(typeFilter || undefined);
    setCampaigns(data);
  }, [typeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchCampaigns().finally(() => setLoading(false));
  }, [fetchCampaigns]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCampaigns();
    setRefreshing(false);
  };

  const renderCampaign = ({ item }: { item: FundingCampaign }) => {
    const pct = Math.min(100, Math.round((item.amount_raised / item.funding_goal) * 100));
    const daysLeft = item.campaign_end_date
      ? Math.max(0, Math.ceil((new Date(item.campaign_end_date).getTime() - Date.now()) / 86400000))
      : item.deadline_days;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.campaign_type}</Text>
            </View>
            {item.status === 'funded' && (
              <View style={[styles.typeBadge, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                <Text style={[styles.typeBadgeText, { color: '#22c55e' }]}>Funded</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description ?? ''}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.raised}>${item.amount_raised.toLocaleString()}</Text>
            <Text style={styles.goal}>of ${item.funding_goal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Text style={styles.statText}>${item.share_price}/share</Text>
          <Text style={styles.statText}>{item.investor_count} investors</Text>
          <Text style={styles.statText}>{daysLeft}d left</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Invest in Music</Text>
      <Text style={styles.subheading}>Browse live campaigns and buy shares</Text>

      {/* Filters */}
      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={item => item.value}
        style={styles.filterList}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterBtn, typeFilter === item.value && styles.filterBtnActive]}
            onPress={() => setTypeFilter(item.value as CampaignType | '')}
          >
            <Text style={[styles.filterText, typeFilter === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={item => item.id}
          renderItem={renderCampaign}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No live campaigns right now.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1216', paddingTop: 60, paddingHorizontal: 16 },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subheading: { fontSize: 15, color: '#9ca3af', marginBottom: 16 },
  filterList: { maxHeight: 44, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1f2937', marginRight: 8,
  },
  filterBtnActive: { backgroundColor: '#3b82f6' },
  filterText: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#111827', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#374151',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 6 },
  typeBadge: {
    backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  typeBadgeText: { color: '#60a5fa', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  description: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  progressContainer: { marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  raised: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  goal: { fontSize: 13, color: '#6b7280' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  statText: { fontSize: 12, color: '#9ca3af' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#6b7280', fontSize: 16 },
});

export default CampaignBrowseScreen;
