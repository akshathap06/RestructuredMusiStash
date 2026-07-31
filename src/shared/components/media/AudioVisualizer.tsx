import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AudioVisualizerProps {
  isPlaying?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showPlayButton?: boolean;
  isLoading?: boolean;
  title?: string;
  duration?: string;
}

// Circular Orb Visualizer (ChatGPT-style)
export const AudioOrbVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying = false,
  onPress,
  size = 'medium',
  style,
  showPlayButton = true,
  isLoading = false,
  title,
  duration,
}) => {
  // Animation values for the orb
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const waveAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  // Sizes
  const sizeMap = {
    small: { container: 120, orb: 80 },
    medium: { container: 200, orb: 140 },
    large: { container: 280, orb: 200 },
  };

  const currentSize = sizeMap[size];

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: isPlaying ? 1.15 : 1.05,
          duration: isPlaying ? 800 : 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: isPlaying ? 800 : 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isPlaying]);

  // Rotation animation
  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: isPlaying ? 3000 : 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();
    return () => rotate.stop();
  }, [isPlaying]);

  // Glow animation
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: isPlaying ? 0.8 : 0.4,
          duration: isPlaying ? 600 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: isPlaying ? 0.4 : 0.2,
          duration: isPlaying ? 600 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [isPlaying]);

  // Wave ring animations
  useEffect(() => {
    const animations = waveAnims.map((anim, index) => {
      const delay = index * 150;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (isPlaying) {
      animations.forEach((a) => a.start());
    }

    return () => animations.forEach((a) => a.stop());
  }, [isPlaying]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.orbContainer, { width: currentSize.container, height: currentSize.container }, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Background glow rings (wave effect) */}
      {isPlaying &&
        waveAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveRing,
              {
                width: currentSize.orb + 20,
                height: currentSize.orb + 20,
                borderRadius: (currentSize.orb + 20) / 2,
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: currentSize.orb + 40,
            height: currentSize.orb + 40,
            borderRadius: (currentSize.orb + 40) / 2,
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main orb with gradient */}
      <Animated.View
        style={[
          styles.orbWrapper,
          {
            width: currentSize.orb,
            height: currentSize.orb,
            borderRadius: currentSize.orb / 2,
            transform: [{ scale: pulseAnim }, { rotate: rotation }],
          },
        ]}
      >
        <LinearGradient
          colors={isPlaying ? ['#06B6D4', '#3B82F6', '#3B82F6', '#EC4899'] : ['#4B5563', '#374151', '#1F2937']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.orbGradient, { borderRadius: currentSize.orb / 2 }]}
        >
          {/* Inner shine */}
          <View style={[styles.innerShine, { width: currentSize.orb * 0.4, height: currentSize.orb * 0.4 }]} />
          
          {/* Play/Pause icon */}
          {showPlayButton && (
            <View style={styles.iconContainer}>
              {isLoading ? (
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                  <Ionicons name="reload" size={currentSize.orb * 0.25} color="rgba(255,255,255,0.9)" />
                </Animated.View>
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={currentSize.orb * 0.3}
                  color="rgba(255,255,255,0.95)"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              )}
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Title and duration */}
      {(title || duration) && (
        <View style={styles.infoContainer}>
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {duration && <Text style={styles.duration}>{duration}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Waveform Bar Visualizer (Alternative style)
export const AudioWaveformVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying = false,
  onPress,
  style,
  showPlayButton = true,
  isLoading = false,
}) => {
  const barCount = 20;
  const barAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    const animations = barAnims.map((anim, index) => {
      const randomDuration = 300 + Math.random() * 400;
      const randomDelay = index * 50;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(randomDelay),
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (isPlaying) {
      animations.forEach((a) => a.start());
    } else {
      // Reset to idle state
      barAnims.forEach((anim) => {
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => animations.forEach((a) => a.stop());
  }, [isPlaying]);

  return (
    <TouchableOpacity
      style={[styles.waveformContainer, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f0f23']}
        style={styles.waveformBackground}
      >
        {/* Waveform bars */}
        <View style={styles.barsContainer}>
          {barAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  transform: [
                    {
                      scaleY: anim,
                    },
                  ],
                  backgroundColor: isPlaying
                    ? index % 2 === 0
                      ? '#3B82F6'
                      : '#06B6D4'
                    : '#4B5563',
                },
              ]}
            />
          ))}
        </View>

        {/* Center play button */}
        {showPlayButton && (
          <View style={styles.waveformPlayButton}>
            {isLoading ? (
              <Ionicons name="reload" size={28} color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFFFFF"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Circular Waveform (Ring style)
export const AudioRingVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying = false,
  onPress,
  size = 'medium',
  style,
  showPlayButton = true,
  isLoading = false,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringAnims = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0))
  ).current;

  const sizeMap = {
    small: 100,
    medium: 160,
    large: 220,
  };

  const currentSize = sizeMap[size];

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: isPlaying ? 2000 : 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotate.start();
    return () => rotate.stop();
  }, [isPlaying]);

  useEffect(() => {
    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: isPlaying ? 1.1 : 1.02,
          duration: isPlaying ? 500 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: isPlaying ? 500 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    scale.start();
    return () => scale.stop();
  }, [isPlaying]);

  // Ring pulse animations
  useEffect(() => {
    const animations = ringAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 400),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    });

    if (isPlaying) {
      animations.forEach((a) => a.start());
    }

    return () => animations.forEach((a) => a.stop());
  }, [isPlaying]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.ringContainer, { width: currentSize, height: currentSize }, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Expanding rings */}
      {isPlaying &&
        ringAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.expandingRing,
              {
                width: currentSize * 0.6,
                height: currentSize * 0.6,
                borderRadius: (currentSize * 0.6) / 2,
                borderColor: index === 0 ? '#3B82F6' : index === 1 ? '#06B6D4' : '#EC4899',
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

      {/* Main ring */}
      <Animated.View
        style={[
          styles.mainRing,
          {
            width: currentSize * 0.7,
            height: currentSize * 0.7,
            borderRadius: (currentSize * 0.7) / 2,
            transform: [{ rotate: rotation }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isPlaying ? ['#3B82F6', '#06B6D4', '#EC4899', '#3B82F6'] : ['#374151', '#4B5563', '#374151']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ringGradient, { borderRadius: (currentSize * 0.7) / 2 }]}
        />
      </Animated.View>

      {/* Inner circle with icon */}
      <View
        style={[
          styles.innerCircle,
          {
            width: currentSize * 0.5,
            height: currentSize * 0.5,
            borderRadius: (currentSize * 0.5) / 2,
          },
        ]}
      >
        {showPlayButton && (
          <>
            {isLoading ? (
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="reload" size={currentSize * 0.15} color="#FFFFFF" />
              </Animated.View>
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={currentSize * 0.18}
                color="#FFFFFF"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Orb Visualizer Styles
  orbContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  waveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  orbWrapper: {
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  orbGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerShine: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  duration: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  // Waveform Visualizer Styles
  waveformContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  waveformBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    gap: 3,
  },
  bar: {
    width: 4,
    height: 80,
    borderRadius: 2,
  },
  waveformPlayButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Ring Visualizer Styles
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandingRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  mainRing: {
    position: 'absolute',
    overflow: 'hidden',
  },
  ringGradient: {
    flex: 1,
  },
  innerCircle: {
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default AudioOrbVisualizer;

