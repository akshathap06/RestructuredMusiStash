import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { Card, Chip, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import ProjectDeliveryService, { ProjectDelivery } from '../../../services/projectDeliveryService';

interface ClientDeliveryListScreenProps {
  navigation: any;
}

const ClientDeliveryListScreen: React.FC<ClientDeliveryListScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const clientDeliveries = await ProjectDeliveryService.getClientDeliveries(user.id);
      setDeliveries(clientDeliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'submitted': return '#FF9800';
      case 'revision_requested': return '#2196F3';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'processing': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderDeliveryItem = ({ item }: { item: ProjectDelivery }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ClientDelivery', { deliveryId: item.id })}
    >
      <Card style={styles.deliveryCard}>
        <Card.Content>
          <View style={styles.deliveryHeader}>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.deliveryDate}>
                Submitted {formatDate(item.submittedAt)}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <Chip 
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.submissionStatus) + '20' }]}
                textStyle={[styles.statusText, { color: getStatusColor(item.submissionStatus) }]}
              >
                {item.submissionStatus.replace('_', ' ').toUpperCase()}
              </Chip>
            </View>
          </View>

          <Text style={styles.deliveryDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.deliveryDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="folder-outline" size={16} color="#00D4AA" />
              <Text style={styles.detailText}>
                {item.totalFiles} file{item.totalFiles !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="download-outline" size={16} color="#00D4AA" />
              <Text style={styles.detailText}>
                {item.downloadCount} download{item.downloadCount !== 1 ? 's' : ''}
              </Text>
            </View>

            {item.deliveryType !== 'initial' && (
              <View style={styles.detailItem}>
                <Ionicons name="repeat-outline" size={16} color="#00D4AA" />
                <Text style={styles.detailText}>
                  Rev {item.revisionNumber}
                </Text>
              </View>
            )}
          </View>

          {item.paymentRequired && (
            <View style={styles.paymentInfo}>
              <Chip 
                style={[styles.paymentChip, { backgroundColor: getPaymentStatusColor(item.paymentStatus) + '20' }]}
                textStyle={[styles.paymentText, { color: getPaymentStatusColor(item.paymentStatus) }]}
                icon={() => <Ionicons name="card-outline" size={14} color={getPaymentStatusColor(item.paymentStatus)} />}
              >
                {item.paymentAmount ? `$${item.paymentAmount} - ` : ''}{item.paymentStatus.toUpperCase()}
              </Chip>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Loading your deliveries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={deliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4AA"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="inbox-outline" size={64} color="#666666" />
            <Text style={styles.emptyTitle}>No Deliveries Yet</Text>
            <Text style={styles.emptySubtitle}>
              When service providers submit work for your projects, you'll see them here.
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  listContainer: {
    padding: 16,
  },
  deliveryCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 16,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryInfo: {
    flex: 1,
    marginRight: 12,
  },
  deliveryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deliveryDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 16,
  },
  deliveryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  paymentInfo: {
    marginTop: 8,
  },
  paymentChip: {
    alignSelf: 'flex-start',
    height: 28,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ClientDeliveryListScreen;
