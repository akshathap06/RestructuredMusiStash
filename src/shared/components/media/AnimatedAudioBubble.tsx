/**
 * AnimatedAudioBubble.tsx
 * 
 * A beautiful, liquid-feeling glowing blob that gently deforms and pulses
 * when audio is playing. Uses React Native's built-in Animated API.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity, PanResponder, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

type AnimatedAudioBubbleProps = {
  isPlaying: boolean;           // true while the audio is playing
  isLoading?: boolean;          // true while audio is loading
  size?: number;                // outer diameter, default ~230
  primaryColor?: string;        // default "#32D5FF" (neon bluish)
  secondaryColor?: string;      // default "#0F172A" (dark background)
  label?: string;               // text under the bubble, e.g. "Audio Track"
  onPress?: () => void;         // callback when bubble is pressed
  // Progress bar props
  progress?: number;            // 0-1 value for current position
  duration?: number;            // total duration in milliseconds
  currentTime?: number;         // current position in milliseconds
  onSeek?: (position: number) => void; // callback when user seeks (0-1)
  showProgressBar?: boolean;    // whether to show the progress bar
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SIZE = Math.min(SCREEN_WIDTH * 0.55, 230);
const DEFAULT_PRIMARY = '#32D5FF';    // Neon cyan/blue
const DEFAULT_SECONDARY = '#0F172A';  // Dark background

// ============================================================================
// COMPONENT
// ============================================================================

export const AnimatedAudioBubble: React.FC<AnimatedAudioBubbleProps> = ({
  isPlaying,
  isLoading = false,
  size = DEFAULT_SIZE,
  primaryColor = DEFAULT_PRIMARY,
  secondaryColor = DEFAULT_SECONDARY,
  label,
  onPress,
  progress = 0,
  duration = 0,
  currentTime = 0,
  onSeek,
  showProgressBar = true,
}) => {
  const progressBarRef = useRef<View>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  // Format time (milliseconds to mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle seek on progress bar tap/drag
  const handleSeek = (event: GestureResponderEvent, layoutWidth: number) => {
    if (!onSeek || layoutWidth === 0) return;
    const { locationX } = event.nativeEvent;
    const seekPosition = Math.max(0, Math.min(1, locationX / layoutWidth));
    onSeek(seekPosition);
  };
  // Animation values
  const outerScale = useRef(new Animated.Value(1)).current;
  const middleScale = useRef(new Animated.Value(1)).current;
  const innerScale = useRef(new Animated.Value(1)).current;
  const outerOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const middleOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const idleBreath = useRef(new Animated.Value(1)).current;
  
  // Animation references for cleanup
  const playingAnimations = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Stop any existing animations
    playingAnimations.current.forEach(anim => anim.stop());
    playingAnimations.current = [];

    if (isPlaying) {
      // ===== PLAYING STATE: Energetic pulsing animations =====
      
      // Outer layer pulse
      const outerPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(outerScale, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerScale, {
            toValue: 0.95,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Middle layer pulse (different timing for organic feel)
      const middlePulse = Animated.loop(
        Animated.sequence([
          Animated.timing(middleScale, {
            toValue: 0.94,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(middleScale, {
            toValue: 1.06,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Inner layer pulse (fastest for energy)
      const innerPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(innerScale, {
            toValue: 1.1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerScale, {
            toValue: 0.92,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Outer position wobble
      const outerWobble = Animated.loop(
        Animated.sequence([
          Animated.timing(outerOffset, {
            toValue: { x: 6, y: -4 },
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerOffset, {
            toValue: { x: -5, y: 6 },
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerOffset, {
            toValue: { x: 0, y: 0 },
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Middle position wobble (opposite direction)
      const middleWobble = Animated.loop(
        Animated.sequence([
          Animated.timing(middleOffset, {
            toValue: { x: -4, y: 5 },
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(middleOffset, {
            toValue: { x: 5, y: -3 },
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Glow pulse
      const glowPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.7,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.35,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Start all animations
      playingAnimations.current = [outerPulse, middlePulse, innerPulse, outerWobble, middleWobble, glowPulse];
      playingAnimations.current.forEach(anim => anim.start());

    } else {
      // ===== PAUSED STATE: Return to calm =====
      Animated.parallel([
        Animated.timing(outerScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(middleScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(innerScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(outerOffset, { toValue: { x: 0, y: 0 }, duration: 800, useNativeDriver: true }),
        Animated.timing(middleOffset, { toValue: { x: 0, y: 0 }, duration: 800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ]).start();
    }

    // Subtle idle breathing (always active)
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(idleBreath, {
          toValue: 1.02,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(idleBreath, {
          toValue: 0.98,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathAnimation.start();

    return () => {
      playingAnimations.current.forEach(anim => anim.stop());
      breathAnimation.stop();
    };
  }, [isPlaying]);

  // Combine scale animations
  const outerCombinedScale = Animated.multiply(outerScale, idleBreath);
  const middleCombinedScale = Animated.multiply(middleScale, idleBreath);
  const innerCombinedScale = Animated.multiply(innerScale, idleBreath);

  // Derived sizes
  const outerGlowSize = size * 1.4;
  const outerSize = size;
  const middleSize = size * 0.78;
  const innerSize = size * 0.55;
  const iconSize = size * 0.22;

  return (
    <View style={[styles.container, { width: size, height: size + (label ? 50 : 0) }]}>
      <TouchableOpacity 
        style={styles.bubbleWrapper}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Layer 1: Outer glow (very soft, diffuse) */}
        <Animated.View
          style={[
            styles.circleBase,
            {
              width: outerGlowSize,
              height: outerGlowSize,
              borderRadius: outerGlowSize / 2,
              backgroundColor: primaryColor,
              opacity: Animated.multiply(glowOpacity, 0.3),
              transform: [
                { scale: outerCombinedScale },
                { translateX: outerOffset.x },
                { translateY: outerOffset.y },
              ],
              shadowColor: primaryColor,
              shadowOpacity: 0.8,
              shadowRadius: 50,
              elevation: 20,
            },
          ]}
        />
        
        {/* Layer 2: Outer circle */}
        <Animated.View
          style={[
            styles.circleBase,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              opacity: glowOpacity,
              transform: [
                { scale: outerCombinedScale },
                { translateX: outerOffset.x },
                { translateY: outerOffset.y },
              ],
              overflow: 'hidden',
            },
          ]}
        >
          <LinearGradient
            colors={[`${primaryColor}40`, `${primaryColor}15`, 'transparent']}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: outerSize / 2 }]}
          />
          <View style={[styles.circleBorder, { borderColor: `${primaryColor}50` }]} />
        </Animated.View>
        
        {/* Layer 3: Middle circle - main body */}
        <Animated.View
          style={[
            styles.circleBase,
            {
              width: middleSize,
              height: middleSize,
              borderRadius: middleSize / 2,
              transform: [
                { scale: middleCombinedScale },
                { translateX: middleOffset.x },
                { translateY: middleOffset.y },
              ],
              overflow: 'hidden',
              shadowColor: primaryColor,
              shadowOpacity: 0.5,
              shadowRadius: 30,
              elevation: 15,
            },
          ]}
        >
          <LinearGradient
            colors={[`${primaryColor}60`, `${primaryColor}30`, `${secondaryColor}90`]}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={[StyleSheet.absoluteFill, { borderRadius: middleSize / 2 }]}
          />
          <View style={[styles.circleBorder, { borderColor: `${primaryColor}40` }]} />
        </Animated.View>
        
        {/* Layer 4: Inner circle - bright core */}
        <Animated.View
          style={[
            styles.circleBase,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              transform: [{ scale: innerCombinedScale }],
              overflow: 'hidden',
              shadowColor: primaryColor,
              shadowOpacity: 0.7,
              shadowRadius: 20,
              elevation: 10,
            },
          ]}
        >
          <LinearGradient
            colors={[`${primaryColor}90`, `${primaryColor}50`, `${secondaryColor}70`]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: innerSize / 2 }]}
          />
        </Animated.View>
        
        {/* Play/Pause Icon in center */}
        <Animated.View 
          style={[
            styles.iconContainer, 
            { transform: [{ scale: idleBreath }] }
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingDots}>
              <View style={[styles.loadingDot, { backgroundColor: '#FFFFFF' }]} />
              <View style={[styles.loadingDot, { backgroundColor: '#FFFFFF', opacity: 0.7 }]} />
              <View style={[styles.loadingDot, { backgroundColor: '#FFFFFF', opacity: 0.4 }]} />
            </View>
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={iconSize}
              color="#FFFFFF"
              style={isPlaying ? {} : { marginLeft: iconSize * 0.15 }}
            />
          )}
        </Animated.View>
      </TouchableOpacity>
      
      {/* Progress Bar */}
      {showProgressBar && (isPlaying || progress > 0) && (
        <View 
          style={styles.progressBarContainer}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
        >
          <Text style={[styles.timeText, { color: primaryColor }]}>
            {formatTime(currentTime)}
          </Text>
          
          <TouchableOpacity
            style={styles.progressBarWrapper}
            activeOpacity={0.9}
            onPress={(e) => handleSeek(e, progressBarWidth - 80)} // 80 = time labels width
          >
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={[primaryColor, `${primaryColor}80`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, progress * 100)}%` }
                ]}
              />
              {/* Seek thumb */}
              <View 
                style={[
                  styles.seekThumb,
                  { 
                    left: `${Math.min(100, progress * 100)}%`,
                    backgroundColor: primaryColor,
                    shadowColor: primaryColor,
                  }
                ]}
              />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.timeText, { color: `${primaryColor}80` }]}>
            {formatTime(duration)}
          </Text>
        </View>
      )}

      {/* Label under bubble */}
      {label && !showProgressBar && (
        <View style={styles.labelContainer}>
          <Ionicons name="musical-notes" size={14} color={primaryColor} style={styles.labelIcon} />
          <Text style={[styles.label, { color: primaryColor }]}>{label}</Text>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBase: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: 1000,
  },
  iconContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Progress bar styles
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 16,
    gap: 8,
  },
  progressBarWrapper: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'center',
  },
});

export default AnimatedAudioBubble;
