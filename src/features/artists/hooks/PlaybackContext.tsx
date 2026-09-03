import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { Track } from '../types/experience';

/**
 * Real audio playback for the 30s previews on an artist profile.
 *
 * Tracks without an `audioUrl` are still selectable — they just report as not
 * playing rather than silently pretending to, which is what this context used
 * to do for every track.
 */

type PlaybackContextValue = {
  activeTrack: Track | null;
  isPlaying: boolean;
  /** 0..1 through the current preview. */
  progress: number;
  /** True while the audio for `activeTrack` is being fetched. */
  isLoading: boolean;
  /** The selected track has no preview audio available. */
  isUnavailable: boolean;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  playNext: (queue: Track[]) => void;
  playPrevious: (queue: Track[]) => void;
  stop: () => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  // Guards against an earlier, slower load resuming after a newer selection.
  const loadTokenRef = useRef(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => undefined);
  }, []);

  const unload = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        /* already gone */
      }
    }
  }, []);

  useEffect(() => () => void unload(), [unload]);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    const total = status.durationMillis ?? 0;
    setProgress(total > 0 ? Math.min(1, (status.positionMillis ?? 0) / total) : 0);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgress(1);
    }
  }, []);

  const playTrack = useCallback(
    (track: Track) => {
      // Tapping the current track toggles rather than restarting it.
      if (activeTrack?.id === track.id && soundRef.current) {
        void (isPlaying
          ? soundRef.current.pauseAsync()
          : soundRef.current.playAsync());
        return;
      }

      const token = ++loadTokenRef.current;
      setActiveTrack(track);
      setProgress(0);
      setIsUnavailable(false);

      if (!track.audioUrl) {
        setIsPlaying(false);
        setIsLoading(false);
        setIsUnavailable(true);
        void unload();
        return;
      }

      setIsLoading(true);
      void (async () => {
        await unload();
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: track.audioUrl! },
            { shouldPlay: true },
            onStatus,
          );
          if (token !== loadTokenRef.current) {
            // Superseded while loading — throw this one away.
            await sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
        } catch {
          if (token === loadTokenRef.current) {
            setIsUnavailable(true);
            setIsPlaying(false);
          }
        } finally {
          if (token === loadTokenRef.current) setIsLoading(false);
        }
      })();
    },
    [activeTrack?.id, isPlaying, onStatus, unload],
  );

  const togglePlayPause = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) return;
    void (isPlaying ? sound.pauseAsync() : sound.playAsync());
  }, [isPlaying]);

  const step = useCallback(
    (queue: Track[], delta: number) => {
      if (!activeTrack || queue.length === 0) return;
      const i = queue.findIndex((t) => t.id === activeTrack.id);
      const next = queue[(i + delta + queue.length) % queue.length];
      playTrack(next);
    },
    [activeTrack, playTrack],
  );

  const playNext = useCallback((queue: Track[]) => step(queue, 1), [step]);
  const playPrevious = useCallback((queue: Track[]) => step(queue, -1), [step]);

  const stop = useCallback(() => {
    loadTokenRef.current++;
    void unload();
    setIsPlaying(false);
    setActiveTrack(null);
    setProgress(0);
    setIsLoading(false);
    setIsUnavailable(false);
  }, [unload]);

  const value = useMemo(
    () => ({
      activeTrack,
      isPlaying,
      progress,
      isLoading,
      isUnavailable,
      playTrack,
      togglePlayPause,
      playNext,
      playPrevious,
      stop,
    }),
    [
      activeTrack,
      isPlaying,
      progress,
      isLoading,
      isUnavailable,
      playTrack,
      togglePlayPause,
      playNext,
      playPrevious,
      stop,
    ],
  );

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used inside a PlaybackProvider');
  return ctx;
}
