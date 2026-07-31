import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceProviderProfile } from '../../../services/serviceProviderService';
import { useAuth } from '../../../contexts/AuthContext';
import projectRequestService from '../../../services/projectRequestService';

interface ContactServiceProviderScreenProps {
  route: {
    params: {
      provider: ServiceProviderProfile;
      specificService?: any;
      initialMessage?: string;
    };
  };
  navigation: any;
}

export default function ContactServiceProviderScreen({ route, navigation }: ContactServiceProviderScreenProps) {
  const { provider, specificService, initialMessage } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [priceOption, setPriceOption] = useState<'accept' | 'offer'>('accept');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [urgentDelivery, setUrgentDelivery] = useState(false);
  const [revisionRounds, setRevisionRounds] = useState('2');

  // Format price from service data
  const formatServicePrice = (service: any): string => {
    if (!service) return 'Contact for pricing';
    
    console.log('💰 formatServicePrice called with:', {
      pricing_type: service.pricing_type,
      base_price: service.base_price,
      price_min: service.price_min,
      price_max: service.price_max,
      price_custom: service.price_custom,
    });
    
    const pricingType = service.pricing_type || 'flat';
    const priceValue = service.base_price || service.price_min;
    
    if (pricingType === 'custom' && service.price_custom) {
      return service.price_custom;
    } else if (pricingType === 'range' && service.price_min && service.price_max) {
      return `$${service.price_min} - $${service.price_max}`;
    } else if (pricingType === 'hourly' && priceValue) {
      return `$${priceValue}/hour`;
    } else if (priceValue && priceValue > 0) {
      // Flat pricing or any other type with a price value
      return `$${priceValue}`;
    }
    
    return 'Contact for pricing';
  };

  const servicePrice = specificService ? formatServicePrice(specificService) : 'Contact for pricing';
  const serviceBasePrice = specificService?.base_price || specificService?.price_min || 0;

  const handleSendRequest = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to send a request');
      return;
    }

    if (!specificService) {
      Alert.alert('Error', 'Service information is missing');
      return;
    }

    if (priceOption === 'offer' && !offeredPrice.trim()) {
      Alert.alert('Error', 'Please enter your offered price');
      return;
    }

    try {
      setLoading(true);
      
      // Determine final price
      const finalPrice = priceOption === 'accept' 
        ? serviceBasePrice 
        : parseFloat(offeredPrice.replace(/[^0-9.]/g, '')) || 0;

      // Create project request using the service
      // Use provider.id first, fallback to provider.user_id if needed
      // The service will validate and find the correct provider ID
      const serviceProviderId = provider.id || provider.user_id;
      
      console.log('🔍 [ContactServiceProvider] Creating request with provider:', {
        providerId: provider.id,
        providerUserId: provider.user_id,
        providerBusinessName: provider.business_name,
        usingId: serviceProviderId
      });
      
      if (!serviceProviderId) {
        Alert.alert('Error', 'Provider information is missing. Please go back and try again.');
        return;
      }
      
      const requestData = {
        service_provider_id: serviceProviderId, // Will be validated by the service
        service_type: specificService.service_name || 'Custom Service',
        project_description: specificService.service_description || '',
        budget_range: priceOption === 'accept' 
          ? servicePrice 
          : `$${finalPrice}`,
        timeline: undefined,
        additional_requirements: additionalRequirements.trim() || undefined,
        urgent_delivery: urgentDelivery,
        revision_rounds: parseInt(revisionRounds) || 2,
        message: initialMessage || undefined,
      };

      console.log('🔍 [ContactServiceProvider] Request data being sent:', requestData);

      const createdRequest = await projectRequestService.createProjectRequest(requestData, user.id);
      console.log('✅ [ContactServiceProvider] Request created:', {
        requestId: createdRequest.id,
        serviceProviderId: createdRequest.service_provider_id,
        clientId: createdRequest.client_id,
        serviceType: createdRequest.service_type
      });
      
      Alert.alert(
        'Request Sent!',
        `Your service request has been sent to ${provider.business_name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back with a flag to refresh
              navigation.navigate('ServiceProviderDetail', {
                provider: provider,
                refreshRequests: true
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Contact {provider.business_name}</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderServiceSection = () => {
    if (!specificService) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        <View style={styles.serviceContainer}>
          <Text style={styles.serviceName}>{specificService.service_name || 'Service'}</Text>
          {specificService.service_description && (
            <Text style={styles.serviceSubtitle}>{specificService.service_description}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderPriceSection = () => {
    if (!specificService) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        
        <View style={styles.priceDisplayContainer}>
          <Text style={styles.priceLabel}>Provider's Listed Price:</Text>
          <Text style={styles.priceValue}>{servicePrice}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Price Option *</Text>
          <View style={styles.priceOptions}>
            <TouchableOpacity
              style={[
                styles.priceOption,
                priceOption === 'accept' && styles.priceOptionSelected
              ]}
              onPress={() => setPriceOption('accept')}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color={priceOption === 'accept' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text style={[
                styles.priceOptionText,
                priceOption === 'accept' && styles.priceOptionTextSelected
              ]}>
                Accept Listed Price
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priceOption,
                priceOption === 'offer' && styles.priceOptionSelected
              ]}
              onPress={() => setPriceOption('offer')}
            >
              <Ionicons 
                name="cash-outline" 
                size={20} 
                color={priceOption === 'offer' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text style={[
                styles.priceOptionText,
                priceOption === 'offer' && styles.priceOptionTextSelected
              ]}>
                Offer Different Price
              </Text>
            </TouchableOpacity>
          </View>

          {priceOption === 'offer' && (
            <View style={styles.offerPriceInput}>
              <Text style={styles.inputLabel}>Your Offered Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter your price"
                  placeholderTextColor="#9CA3AF"
                  value={offeredPrice}
                  onChangeText={setOfferedPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderAdditionalDetailsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Additional Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Additional Requirements</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Any specific requirements or preferences..."
          placeholderTextColor="#9CA3AF"
          value={additionalRequirements}
          onChangeText={setAdditionalRequirements}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.preferenceItem}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Urgent Delivery</Text>
          <Text style={styles.preferenceDescription}>
            Rush delivery available for additional fee
          </Text>
        </View>
        <Switch
          value={urgentDelivery}
          onValueChange={setUrgentDelivery}
          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          thumbColor={urgentDelivery ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Revision Rounds Included</Text>
        <TextInput
          style={styles.input}
          placeholder="2"
          placeholderTextColor="#9CA3AF"
          value={revisionRounds}
          onChangeText={setRevisionRounds}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderServiceSection()}
        {renderPriceSection()}
        {renderAdditionalDetailsSection()}
      </ScrollView>

      <View style={styles.sendButtonContainer}>
        <TouchableOpacity 
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  serviceContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    position: 'relative',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  serviceIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
    marginRight: 8,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E293B',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#1E293B',
    textAlignVertical: 'top',
  },
  priceDisplayContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  priceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  priceOptions: {
    gap: 12,
    marginBottom: 16,
  },
  priceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#374151',
    gap: 12,
  },
  priceOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  priceOptionText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  priceOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offerPriceInput: {
    marginTop: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  sendButtonContainer: {
    padding: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
