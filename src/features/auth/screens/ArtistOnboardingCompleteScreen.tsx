import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';

interface ArtistOnboardingCompleteScreenProps {
  navigation: any;
  route: any;
}

const ArtistOnboardingCompleteScreen: React.FC<ArtistOnboardingCompleteScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const artistData = route?.params?.artistData || {};
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

  const handleViewProfile = async () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            style={styles.iconGradient}
          >
            <Ionicons name="star" size={48} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Your Artist Profile is Live!</Text>
          <Text style={styles.subtitle}>
            You're all set to showcase your music to the world
          </Text>
        </View>

        {/* Profile Preview Card */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={artistData.gradientColors || ['#8B5CF6', '#EC4899', '#EF4444']}
            style={styles.previewGradient}
          >
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <View style={styles.previewAvatar}>
                  {artistData.profilePhoto ? (
                    <Image 
                      source={{ uri: artistData.profilePhoto }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {artistData.artistName?.[0] || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>
                    {artistData.artistName || 'Artist Name'}
                  </Text>
                  <Text style={styles.previewGenre}>
                    {artistData.genres?.slice(0, 2).join(', ') || 'Genre'}
                  </Text>
                </View>
              </View>
              <Text style={styles.previewBio} numberOfLines={2}>
                {artistData.bio || 'Your bio here'}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* What's Next Section */}
        <View style={styles.nextSection}>
          <Text style={styles.nextTitle}>What you can do now</Text>
          <View style={styles.nextItems}>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.nextText}>Create posts to share your music</Text>
            </View>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="people-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.nextText}>Connect with fans and collaborators</Text>
            </View>
            <View style={styles.nextItem}>
              <View style={styles.nextIcon}>
                <Ionicons name="briefcase-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.nextText}>Hire service providers for your projects</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewProfile}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>View My Profile</Text>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
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
  previewCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
  },
  previewGradient: {
    padding: 2,
  },
  previewContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 18,
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  previewGenre: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  previewBio: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  nextSection: {
    width: '100%',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
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

export default ArtistOnboardingCompleteScreen;

