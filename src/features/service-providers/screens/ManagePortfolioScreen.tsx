import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import postsService, { Post } from '../../../services/postsService';
import { supabase } from '../../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

interface ManagePortfolioScreenProps {
  navigation: any;
  route?: any;
}

export default function ManagePortfolioScreen({ navigation, route }: ManagePortfolioScreenProps) {
  const { user } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const serviceProvider = route?.params?.serviceProvider;

  const loadPortfolio = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading portfolio for user:', user.id);
      
      // Direct query to posts table for video_portfolio posts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_type', 'video_portfolio')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading portfolio:', error);
        throw error;
      }

      const portfolioPosts = (postsData || []).map(post => ({
        ...post,
        user_name: post.user_name || 'You',
        user_avatar: post.user_avatar || null,
      }));

      console.log('Loaded portfolio items:', portfolioPosts.length);
      setPortfolioItems(portfolioPosts);
    } catch (error: any) {
      console.error('Error loading portfolio:', error);
      const errorMessage = error?.message || 'Unable to load your portfolio items.';
      Alert.alert('Error', errorMessage);
      setPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPortfolio();
    }, [user?.id])
  );

  const handleDelete = (post: Post) => {
    Alert.alert(
      'Delete Portfolio Item',
      'Are you sure you want to delete this portfolio entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await postsService.deletePost(post.id);
              if (success) {
                loadPortfolio();
              } else {
                Alert.alert('Error', 'Failed to delete portfolio item.');
              }
            } catch (error) {
              console.error('Error deleting portfolio:', error);
              Alert.alert('Error', 'Failed to delete portfolio item.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (post: Post) => {
    navigation.navigate('CreatePost', {
      editMode: true,
      postData: post,
      portfolioMode: true,
    });
  };

  const handleCreate = () => {
    navigation.navigate('CreatePost', {
      portfolioMode: true,
      serviceProvider,
    });
  };

  const renderMediaPreview = (post: Post) => {
    const firstMedia = post.media_urls && post.media_urls[0];
    if (!firstMedia) {
      return (
        <View style={styles.mediaPlaceholder}>
          <Ionicons name="image-outline" size={32} color="#3B82F6" />
        </View>
      );
    }

    const isVideo = firstMedia.includes('.mp4') || firstMedia.includes('.mov');
    const isAudio = firstMedia.includes('.mp3') || firstMedia.includes('.wav') || firstMedia.includes('.m4a');

    if (isAudio) {
      return (
        <View style={[styles.mediaPlaceholder, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
          <Ionicons name="musical-notes" size={28} color="#3B82F6" />
        </View>
      );
    }

    if (isVideo) {
      return (
        <View style={styles.videoPreview}>
          <Ionicons name="play-circle" size={36} color="#FFFFFF" />
        </View>
      );
    }

    return <Image source={{ uri: firstMedia }} style={styles.mediaImage} />;
  };

  const renderPortfolioCard = (item: Post) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title || 'Portfolio Item'}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.mediaContainer}>{renderMediaPreview(item)}</View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {item.description || 'Showcase of your creative work'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>Updated {new Date(item.updated_at).toLocaleDateString()}</Text>
        <Text style={styles.statusText}>{item.is_active ? 'Visible' : 'Hidden'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Portfolio</Text>
          <Text style={styles.subtitle}>Highlight your best work</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your portfolio...</Text>
        </View>
      ) : portfolioItems.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="images-outline" size={32} color="#3B82F6" />
          </View>
          <Text style={styles.emptyTitle}>No portfolio items yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload visuals, audio, or video examples of your work to build trust with clients.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCreate}>
            <Text style={styles.secondaryButtonText}>Add Portfolio Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        portfolioItems.map(renderPortfolioCard)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#16161C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F1F2C',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  cardDescription: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  mediaContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1F1F2C',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  videoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  statusText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#272738',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F2C',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

