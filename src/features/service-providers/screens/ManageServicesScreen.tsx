import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import postsService, { Post } from '../../../services/postsService';
import { supabase } from '../../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { stripeConnectService } from '../../payments/services/stripeConnectService';

interface ManageServicesScreenProps {
  navigation: any;
  route?: any;
}

export default function ManageServicesScreen({ navigation, route }: ManageServicesScreenProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<{
    canAcceptPayments: boolean;
    stripeAccountId: string | null;
    onboardingUrl: string | null;
    isChecking: boolean;
  }>({
    canAcceptPayments: false,
    stripeAccountId: null,
    onboardingUrl: null,
    isChecking: true,
  });
  const serviceProvider = route?.params?.serviceProvider;

  // Check Stripe verification status
  const checkStripeStatus = async () => {
    if (!serviceProvider?.id) {
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('stripe_account_id, can_accept_payments, stripe_onboarding_url')
        .eq('id', serviceProvider.id)
        .single();

      if (error) {
        console.error('Error checking Stripe status:', error);
        setStripeStatus(prev => ({ ...prev, isChecking: false }));
        return;
      }

      setStripeStatus({
        canAcceptPayments: data?.can_accept_payments || false,
        stripeAccountId: data?.stripe_account_id || null,
        onboardingUrl: data?.stripe_onboarding_url || null,
        isChecking: false,
      });
    } catch (error) {
      console.error('Error in checkStripeStatus:', error);
      setStripeStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Load Stripe status on mount
  useEffect(() => {
    checkStripeStatus();
  }, [serviceProvider?.id]);

  const handleStripeOnboarding = async () => {
    if (stripeStatus.onboardingUrl) {
      // Open existing onboarding URL
      try {
        await Linking.openURL(stripeStatus.onboardingUrl);
        Alert.alert(
          'Complete Stripe Setup',
          'Please complete all verification steps in the browser. Once done, return to the app and pull down to refresh.',
          [{ text: 'Got It' }]
        );
      } catch (error) {
        Alert.alert('Error', 'Could not open Stripe onboarding. Please try again.');
      }
    } else if (serviceProvider) {
      // Create new Stripe account
      Alert.alert(
        'Setup Payment Account',
        'To list services and accept payments, you need to set up your Stripe account. This includes identity verification and bank account details.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Up Stripe',
            onPress: async () => {
              try {
                const result = await stripeConnectService.createConnectAccount(
                  serviceProvider.id,
                  serviceProvider.email || user?.email || '',
                  serviceProvider.business_name
                );

                if (result.success && result.onboardingUrl) {
                  await Linking.openURL(result.onboardingUrl);
                  Alert.alert(
                    'Complete Verification',
                    'Please complete all steps in the browser. Return here when done.',
                    [{ text: 'OK' }]
                  );
                  // Refresh status after a delay
                  setTimeout(checkStripeStatus, 3000);
                } else {
                  Alert.alert('Error', result.error || 'Failed to create Stripe account');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to start Stripe setup. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const loadServices = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    // Also refresh Stripe status
    checkStripeStatus();
    try {
      console.log('Loading services for user:', user.id);
      
      // Direct query to posts table for service_offer posts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_type', 'service_offer')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading services:', error);
        throw error;
      }

      const servicePosts = (postsData || []).map(post => {
        // Parse content - handle string, object, and corrupted data
        let parsedContent = post.content;
        
        // If content is a string, parse it
        if (typeof parsedContent === 'string') {
          try {
            parsedContent = JSON.parse(parsedContent);
          } catch (e) {
            console.error('Failed to parse content string:', e);
            parsedContent = {};
          }
        }
        
        // If content is corrupted (character-indexed from string spread), try to fix it
        if (parsedContent && typeof parsedContent === 'object') {
          const keys = Object.keys(parsedContent);
          if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
            console.log('⚠️ Detected corrupted content for post:', post.id);
            try {
              const reconstructedString = keys.sort((a, b) => parseInt(a) - parseInt(b))
                .map(k => parsedContent[k])
                .join('');
              parsedContent = JSON.parse(reconstructedString);
              console.log('✅ Fixed corrupted content:', parsedContent);
            } catch (e) {
              console.error('❌ Failed to fix corrupted content:', e);
              // Use service_info at top level as fallback
              if (parsedContent.service_info && typeof parsedContent.service_info === 'object') {
                parsedContent = { service_info: parsedContent.service_info };
              } else {
                parsedContent = {};
              }
            }
          }
        }
        
        // Debug: log the service_info for each post
        const serviceInfo = parsedContent?.service_info || {};
        console.log('📦 Loaded service post:', {
          id: post.id,
          title: post.title,
          serviceInfo,
          pricingType: serviceInfo.pricing_type,
          priceMin: serviceInfo.price_min,
          priceMax: serviceInfo.price_max,
          priceCustom: serviceInfo.price_custom,
        });
        
        return {
          ...post,
          content: parsedContent, // Use the fixed content
          user_name: post.user_name || 'You',
          user_avatar: post.user_avatar || null,
        };
      });

      console.log('✅ Loaded services:', servicePosts.length);
      setServices(servicePosts);
    } catch (error: any) {
      console.error('Error loading services:', error);
      const errorMessage = error?.message || 'Unable to load your services right now.';
      Alert.alert('Error', errorMessage);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadServices();
    }, [user?.id])
  );

  const handleDelete = (post: Post) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await postsService.deletePost(post.id);
              if (success) {
                loadServices();
              } else {
                Alert.alert('Error', 'Failed to delete service listing.');
              }
            } catch (error) {
              console.error('Error deleting service:', error);
              Alert.alert('Error', 'Failed to delete service listing.');
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
      serviceListingMode: true,
    });
  };

  const handleCreate = () => {
    // Check if Stripe is verified before allowing service creation
    if (!stripeStatus.canAcceptPayments) {
      Alert.alert(
        '⚠️ Stripe Setup Required',
        'You need to complete your Stripe payment setup before listing services. This ensures you can receive payments from clients.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up Stripe', onPress: handleStripeOnboarding },
        ]
      );
      return;
    }

    navigation.navigate('CreatePost', {
      serviceListingMode: true,
      serviceProvider,
    });
  };

  const renderServiceCard = (service: Post) => {
    const info = service.content?.service_info || {};
    const pricingType = info.pricing_type || 'flat';
    
    console.log('🎨 Rendering service card:', {
      id: service.id,
      title: service.title,
      pricingType,
      priceMin: info.price_min,
      priceMax: info.price_max,
      priceCustom: info.price_custom,
      priceMinType: typeof info.price_min,
    });
    
    // Properly format pricing based on type
    // Convert price_min to number if it's a string
    const priceMinNum = info.price_min != null ? Number(info.price_min) : null;
    const priceMaxNum = info.price_max != null ? Number(info.price_max) : null;
    
    let priceLabel = 'Contact for pricing';
    
    // Check custom pricing first
    if (pricingType === 'custom' && info.price_custom && info.price_custom.trim()) {
      priceLabel = info.price_custom.trim();
    } 
    // Range pricing
    else if (pricingType === 'range' && priceMinNum != null && !isNaN(priceMinNum) && priceMinNum > 0 && 
             priceMaxNum != null && !isNaN(priceMaxNum) && priceMaxNum > 0) {
      priceLabel = `$${priceMinNum} - $${priceMaxNum}`;
    } 
    // Hourly pricing
    else if (pricingType === 'hourly' && priceMinNum != null && !isNaN(priceMinNum) && priceMinNum > 0) {
      priceLabel = `$${priceMinNum}/hour`;
    } 
    // Flat pricing (default)
    else if ((pricingType === 'flat' || !pricingType || pricingType === '') && 
             priceMinNum != null && !isNaN(priceMinNum) && priceMinNum > 0) {
      priceLabel = `$${priceMinNum}`;
    } 
    // Fallback: if we have any valid price_min, show it
    else if (priceMinNum != null && !isNaN(priceMinNum) && priceMinNum > 0) {
      priceLabel = `$${priceMinNum}`;
    }
    
    console.log('💰 Final price label calculation:', {
      pricingType,
      priceMin: info.price_min,
      priceMinNum,
      priceMax: info.price_max,
      priceMaxNum,
      priceCustom: info.price_custom,
      finalLabel: priceLabel,
    });
    
    const timeline = info.delivery_days ? `${info.delivery_days} day turnaround` : 'Flexible timeline';

    return (
      <View key={service.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {service.title || info.service_title || service.description || 'Service Listing'}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleEdit(service)}>
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(service)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {service.description || 'Professional service offering'}
        </Text>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="pricetag" size={14} color="#3B82F6" />
            <Text style={styles.metaText}>{priceLabel}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="time" size={14} color="#F59E0B" />
            <Text style={styles.metaText}>{timeline}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Updated {new Date(service.updated_at).toLocaleDateString()}
          </Text>
          <Text style={styles.statusText}>
            {service.is_active ? 'Active' : 'Hidden'}
          </Text>
        </View>
      </View>
    );
  };

  // Render Stripe status banner
  const renderStripeStatusBanner = () => {
    if (stripeStatus.isChecking) {
      return null;
    }

    if (stripeStatus.canAcceptPayments) {
      return (
        <View style={styles.stripeBannerSuccess}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.stripeBannerTextSuccess}>
            Stripe verified - You can accept payments
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.stripeBannerWarning} onPress={handleStripeOnboarding}>
        <View style={styles.stripeBannerContent}>
          <Ionicons name="warning" size={24} color="#F59E0B" />
          <View style={styles.stripeBannerTextContainer}>
            <Text style={styles.stripeBannerTitle}>Complete Payment Setup</Text>
            <Text style={styles.stripeBannerTextWarning}>
              Set up Stripe to list services and receive payments
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {renderStripeStatusBanner()}
      
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Your Services</Text>
          <Text style={styles.subtitle}>Create, edit, or remove service listings</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !stripeStatus.canAcceptPayments && styles.primaryButtonDisabled
          ]} 
          onPress={handleCreate}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your services...</Text>
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="briefcase-outline" size={32} color="#3B82F6" />
          </View>
          <Text style={styles.emptyTitle}>No services listed yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first offer to start accepting client requests.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCreate}>
            <Text style={styles.secondaryButtonText}>Create Service Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        services.map(renderServiceCard)
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
  // Stripe Status Banners
  stripeBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  stripeBannerTextSuccess: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  stripeBannerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  stripeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  stripeBannerTextContainer: {
    flex: 1,
  },
  stripeBannerTitle: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  stripeBannerTextWarning: {
    color: '#FCD34D',
    fontSize: 13,
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
  primaryButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
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
    marginBottom: 8,
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
    marginBottom: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F1F2C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '500',
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

