import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';

interface ServiceProviderOnboardingCompleteScreenProps {
  navigation: any;
  route: any;
}

const ServiceProviderOnboardingCompleteScreen: React.FC<ServiceProviderOnboardingCompleteScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const serviceData = route?.params?.serviceData || {};
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const { completeOnboarding } = useAuth();

  React.useEffect(() => {
    // Pulse animation for the success icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAddService = async () => {
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleExploreApp = async () => {
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  // Get service type display name
  const getServiceTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      producer: 'Music Producer',
      video: 'Video Editor',
      'sound-engineer': 'Sound Engineer',
      mixing: 'Mixing Engineer',
      mastering: 'Mastering Engineer',
      songwriter: 'Songwriter',
      musician: 'Session Musician',
      photographer: 'Photographer',
      designer: 'Graphic Designer',
      marketing: 'Marketing Specialist',
    };
    return types[type] || type;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.iconGradient}
          >
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're Ready to Get Hired!</Text>
          <Text style={styles.subtitle}>
            Your service profile is live and ready for bookings
          </Text>
        </View>

        {/* Stats Preview Card */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={['#1F2937', '#111827']}
            style={styles.statsGradient}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>$0</Text>
                <Text style={styles.statLabel}>Earned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Profile Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryAvatar}>
              <Ionicons name="briefcase" size={24} color="#3B82F6" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryName}>
                {serviceData.businessName || 'Your Business'}
              </Text>
              <Text style={styles.summaryType}>
                {getServiceTypeLabel(serviceData.serviceType)}
              </Text>
            </View>
          </View>
          {serviceData.tagline && (
            <Text style={styles.summaryTagline}>{serviceData.tagline}</Text>
          )}
          <View style={styles.summaryMeta}>
            {serviceData.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{serviceData.location}</Text>
              </View>
            )}
            {serviceData.basePrice && (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={14} color="#10B981" />
                <Text style={styles.metaText}>Starting at ${serviceData.basePrice}</Text>
              </View>
            )}
          </View>
        </View>

        {/* What's Next Section */}
        <View style={styles.nextSection}>
          <Text style={styles.nextTitle}>Next Steps</Text>
          <View style={styles.nextItems}>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="images-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.nextText}>Add portfolio samples to showcase your work</Text>
            </View>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="card-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.nextText}>Connect Stripe to receive payments</Text>
            </View>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="pricetag-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.nextText}>Create service packages with detailed pricing</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddService}
          >
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Add Your First Service</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleExploreApp}
          >
            <Text style={styles.secondaryButtonText}>Explore App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsGradient: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  summaryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  summaryType: {
    fontSize: 14,
    color: '#3B82F6',
  },
  summaryTagline: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  summaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  nextSection: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextItems: {
    gap: 12,
  },
  nextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ServiceProviderOnboardingCompleteScreen;

