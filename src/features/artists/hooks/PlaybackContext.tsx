import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Track } from '../types/experience';

type PlaybackContextValue = {
  activeTrack: Track | null;
  isPlaying: boolean;
  progress: number;
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startProgress = useCallback((durationSeconds: number) => {
    clearTimer();
    setProgress(0);
    const step = 1 / Math.max(durationSeconds, 1);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= 1) {
          clearTimer();
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
    }, 1000);
  }, []);

  const playTrack = useCallback(
    (track: Track) => {
      if (activeTrack?.id === track.id && isPlaying) {
        clearTimer();
        setIsPlaying(false);
        return;
      }
      if (activeTrack?.id === track.id && !isPlaying) {
        setIsPlaying(true);
        startProgress(track.durationSeconds * (1 - progress || 0.01));
        return;
      }
      setActiveTrack(track);
      setIsPlaying(true);
      startProgress(track.durationSeconds);
    },
    [activeTrack?.id, isPlaying, progress, startProgress],
  );

  const togglePlayPause = useCallback(() => {
    if (!activeTrack) return;
    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      startProgress(activeTrack.durationSeconds * (1 - progress || 0.01));
    }
  }, [activeTrack, isPlaying, progress, startProgress]);

  const playNext = useCallback(
    (queue: Track[]) => {
      if (!activeTrack || queue.length === 0) return;
      const idx = queue.findIndex((t) => t.id === activeTrack.id);
      const next = queue[(idx + 1) % queue.length];
      setActiveTrack(next);
      setIsPlaying(true);
      startProgress(next.durationSeconds);
    },
    [activeTrack, startProgress],
  );

  const playPrevious = useCallback(
    (queue: Track[]) => {
      if (!activeTrack || queue.length === 0) return;
      const idx = queue.findIndex((t) => t.id === activeTrack.id);
      const prev = queue[(idx - 1 + queue.length) % queue.length];
      setActiveTrack(prev);
      setIsPlaying(true);
      startProgress(prev.durationSeconds);
    },
    [activeTrack, startProgress],
  );

  const stop = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setActiveTrack(null);
    setProgress(0);
  }, []);

  const value = useMemo(
    () => ({
      activeTrack,
      isPlaying,
      progress,
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

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return ctx;
}
