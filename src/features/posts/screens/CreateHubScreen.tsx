import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface UserProfiles {
  hasArtistProfile: boolean;
  hasServiceProvider: boolean;
  artistProfileData?: any;
  serviceProviderData?: any;
}

export default function CreateHubScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfiles>({
    hasArtistProfile: false,
    hasServiceProvider: false,
  });

  useEffect(() => {
    if (user) {
      loadUserProfiles();
    }
  }, [user]);

  const loadUserProfiles = async () => {
    try {
      setLoading(true);

      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      const { data: serviceProvider } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      setProfiles({
        hasArtistProfile: !!artistProfile,
        hasServiceProvider: !!(serviceProvider && serviceProvider.length > 0),
        artistProfileData: artistProfile,
        serviceProviderData: serviceProvider?.[0],
      });
    } catch (error) {
      console.error('Error loading user profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    navigation.navigate('CreatePost');
  };

  const handleCreateServiceListing = () => {
    if (!profiles.hasServiceProvider) {
      Alert.alert(
        'Service Provider Required',
        'Create a service provider account first to list services.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Account', onPress: () => navigation.navigate('CreateServiceProvider') },
        ]
      );
      return;
    }
    navigation.navigate('CreatePost', { 
      serviceListingMode: true,
      serviceProvider: profiles.serviceProviderData 
    });
  };

  const handleCreateArtistProfile = () => {
    navigation.navigate('CreateArtist');
  };

  const handleCreateServiceProvider = () => {
    navigation.navigate('CreateServiceProvider');
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create</Text>
          <Text style={styles.subtitle}>What would you like to share?</Text>
        </View>

        {/* Main Options */}
        <View style={styles.optionsContainer}>
          {/* Create Post */}
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={handleCreatePost}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="create-outline" size={22} color="#3B82F6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Create Post</Text>
              <Text style={styles.optionDesc}>Share thoughts, music, or updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#4B5563" />
          </TouchableOpacity>

          {/* List a Service */}
          <TouchableOpacity 
            style={[styles.optionCard, !profiles.hasServiceProvider && styles.optionCardDim]}
            onPress={handleCreateServiceListing}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: profiles.hasServiceProvider ? '#3B82F615' : '#6B728015' }]}>
              <Ionicons 
                name="briefcase-outline" 
                size={22} 
                color={profiles.hasServiceProvider ? '#3B82F6' : '#6B7280'} 
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, !profiles.hasServiceProvider && styles.optionTitleDim]}>
                List a Service
              </Text>
              <Text style={styles.optionDesc}>
                {profiles.hasServiceProvider ? 'Create a marketplace listing' : 'Requires service account'}
              </Text>
            </View>
            {profiles.hasServiceProvider ? (
              <Ionicons name="chevron-forward" size={20} color="#4B5563" />
            ) : (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color="#F59E0B" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Set up your profiles</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Profile Setup Options */}
        <View style={styles.setupContainer}>
          {/* Artist Profile */}
          <TouchableOpacity 
            style={styles.setupCard}
            onPress={handleCreateArtistProfile}
            activeOpacity={0.7}
          >
            <View style={styles.setupLeft}>
              <View style={[styles.setupIcon, { backgroundColor: '#EC489915' }]}>
                <Ionicons name="musical-notes" size={20} color="#EC4899" />
              </View>
              <View>
                <Text style={styles.setupTitle}>Artist Profile</Text>
                <Text style={styles.setupDesc}>Share music & connect with fans</Text>
              </View>
            </View>
            {profiles.hasArtistProfile ? (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark" size={14} color="#3B82F6" />
              </View>
            ) : (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Set up</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Service Provider */}
          <TouchableOpacity 
            style={styles.setupCard}
            onPress={handleCreateServiceProvider}
            activeOpacity={0.7}
          >
            <View style={styles.setupLeft}>
              <View style={[styles.setupIcon, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="storefront" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.setupTitle}>Service Provider</Text>
                <Text style={styles.setupDesc}>Offer professional services</Text>
              </View>
            </View>
            {profiles.hasServiceProvider ? (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark" size={14} color="#3B82F6" />
              </View>
            ) : (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Set up</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Footer */}
        <View style={styles.statusFooter}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.statusText}>User</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: profiles.hasArtistProfile ? '#3B82F6' : '#374151' }]} />
              <Text style={styles.statusText}>Artist</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: profiles.hasServiceProvider ? '#3B82F6' : '#374151' }]} />
              <Text style={styles.statusText}>Provider</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 16,
  },
  optionCardDim: {
    opacity: 0.7,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionTitleDim: {
    color: '#9CA3AF',
  },
  optionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1F1F1F',
  },
  dividerText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setupContainer: {
    gap: 10,
    marginBottom: 32,
  },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  setupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  setupDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  completeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F615',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3B82F615',
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  statusFooter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
