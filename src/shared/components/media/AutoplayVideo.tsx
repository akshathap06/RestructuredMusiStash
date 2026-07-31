import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AutoplayVideoProps {
  uri: string;
  style?: any;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  maxDuration?: number; // in seconds, default 45
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  showControls?: boolean;
  resizeMode?: ResizeMode;
}

export default function AutoplayVideo({
  uri,
  style,
  shouldPlay = true,
  isLooping = true,
  isMuted = true,
  maxDuration = 45,
  onPlaybackStatusUpdate,
  showControls = true,
  resizeMode = ResizeMode.COVER,
}: AutoplayVideoProps) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(shouldPlay);
  const [isMutedState, setIsMutedState] = useState(isMuted);

  useEffect(() => {
    if (videoRef.current) {
      if (shouldPlay) {
        videoRef.current.playAsync();
      } else {
        videoRef.current.pauseAsync();
      }
    }
  }, [shouldPlay]);

  const handlePlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    
    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      
      // Auto-pause after maxDuration seconds
      if (
        playbackStatus.positionMillis && 
        playbackStatus.positionMillis >= maxDuration * 1000 &&
        !isLooping
      ) {
        videoRef.current?.pauseAsync();
        setIsPlaying(false);
      }
      
      setIsPlaying(playbackStatus.isPlaying);
    } else if (playbackStatus.error) {
      setHasError(true);
      setIsLoading(false);
      console.error('Video playback error:', playbackStatus.error);
    }

    onPlaybackStatusUpdate?.(playbackStatus);
  };

  const togglePlayPause = async () => {
    if (!videoRef.current || !status?.isLoaded) return;

    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const toggleMute = async () => {
    if (!videoRef.current || !status?.isLoaded) return;

    try {
      const newMutedState = !isMutedState;
      await videoRef.current.setIsMutedAsync(newMutedState);
      setIsMutedState(newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const formatTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasError) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Ionicons name="videocam-off" size={40} color="#6B7280" />
        <Text style={styles.errorText}>Unable to load video</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        resizeMode={resizeMode}
        shouldPlay={shouldPlay}
        isLooping={isLooping}
        isMuted={isMutedState}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={(error) => {
          console.error('Video error:', error);
          setHasError(true);
          setIsLoading(false);
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}

      {/* Controls overlay */}
      {showControls && !isLoading && (
        <View style={styles.controlsOverlay}>
          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={togglePlayPause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Mute button */}
          <TouchableOpacity
            style={styles.muteButton}
            onPress={toggleMute}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isMutedState ? 'volume-mute' : 'volume-high'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  playPauseButton: {
    position: 'absolute',
    top: -40,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  muteButton: {
    position: 'absolute',
    top: -40,
    right: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    minHeight: 200,
  },
  errorText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
