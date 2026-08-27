import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';

const { width } = Dimensions.get('window');

interface RoleSelectionScreenProps {
  navigation: any;
  route?: any;
}

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ navigation, route }) => {
  const userName = route?.params?.userName || 'there';
  const { completeOnboarding } = useAuth();

  const handleListenerSelect = async () => {
    // Complete onboarding and go to main app
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleArtistSelect = () => {
    navigation.navigate('ArtistOnboarding');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.successIcon}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconGradient}
            >
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Welcome to MusiStash!</Text>
          <Text style={styles.subtitle}>
            Let's personalize your experience. What brings you here?
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          {/* Listener Card */}
          <TouchableOpacity 
            style={styles.card}
            onPress={handleListenerSelect}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1F2937', '#111827']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="musical-notes" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>I'm a Listener</Text>
                <Text style={styles.cardDescription}>
                  Browse artists and discover music
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Artist Card */}
          <TouchableOpacity 
            style={styles.card}
            onPress={handleArtistSelect}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1F2937', '#111827']}
              style={styles.cardGradient}
            >
              <View style={styles.cardIcon}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="star" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>I'm an Artist</Text>
                <Text style={styles.cardDescription}>
                  Create artist profile, showcase music, get discovered
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What you can do on MusiStash</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={styles.featureText}>Discover talented artists</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={styles.featureText}>Support and follow your favorite artists</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={styles.featureText}>Grow your career in the music industry</Text>
            </View>
          </View>
        </View>

        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  cardIcon: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  featuresContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default RoleSelectionScreen;

