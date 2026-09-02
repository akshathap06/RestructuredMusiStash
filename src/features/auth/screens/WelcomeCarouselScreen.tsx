import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface WelcomeCarouselScreenProps {
  navigation: any;
}

interface SlideData {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  highlight: string;
  description: string;
  gradient: string[];
}

const slides: SlideData[] = [
  {
    id: '1',
    icon: 'sparkles',
    title: "The World's First",
    highlight: 'AI-Powered Artist Investment Marketplace',
    description: 'Where music meets opportunity. Discover, invest in, and support the next generation of musical talent.',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: '2',
    icon: 'people',
    title: 'For Investors',
    highlight: 'Discover Tomorrow\'s Stars Today',
    description: 'Browse AI-curated artist profiles, track performance metrics, and be part of their journey from the ground up.',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    id: '3',
    icon: 'musical-notes',
    title: 'For Artists',
    highlight: 'Your Music, Your Career, Your Control',
    description: 'Build your profile, connect with investors and fans, and access professional services to elevate your sound.',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    id: '4',
    icon: 'briefcase',
    title: 'For Professionals',
    highlight: 'Connect With Artists Who Need You',
    description: 'Producers, engineers, designers — offer your services directly to artists ready to invest in their careers.',
    gradient: ['#43e97b', '#38f9d7'],
  },
];

const WelcomeCarouselScreen: React.FC<WelcomeCarouselScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Check if user has already seen welcome screen
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        // TODO: Re-enable this check for production
        // For now, always show the carousel for testing
        /*
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
        if (hasSeenWelcome === 'true') {
          navigation.replace('Intro');
          return;
        }
        */
        setIsLoading(false);
      } catch (error) {
        console.warn('Error checking welcome status:', error);
        setIsLoading(false);
      }
    };
    checkWelcomeStatus();
  }, [navigation]);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Mark onboarding as seen and navigate to intro
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      navigation.replace('Intro');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    navigation.replace('Intro');
  };

  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.contentContainer, { transform: [{ scale }], opacity }]}>
          {/* Icon with gradient background */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={item.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name={item.icon} size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Highlight with gradient text */}
          <MaskedView
            maskElement={
              <Text style={styles.highlight}>{item.highlight}</Text>
            }
          >
            <LinearGradient
              colors={item.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.highlight, { opacity: 0 }]}>{item.highlight}</Text>
            </LinearGradient>
          </MaskedView>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: index === currentIndex ? '#4A90E2' : '#FFFFFF',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Show loading while checking status
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#111111']}
        style={styles.background}
      />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../../assets/brand/lockup-reversed.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        scrollEventThrottle={16}
      />

      {/* Pagination dots */}
      {renderPagination()}

      {/* Bottom button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons 
              name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'} 
              size={20} 
              color="#FFFFFF" 
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 120,
    marginBottom: 50,
  },
  logoImage: {
    width: width * 0.55,
    height: 45,
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: 340,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  highlight: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WelcomeCarouselScreen;

