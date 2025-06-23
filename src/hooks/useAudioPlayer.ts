import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine, AudioEngineState } from '@/lib/audioEngine';

export interface UseAudioPlayerOptions {
  trackUrls?: Record<string, string>;
  autoLoad?: boolean;
}

export interface UseAudioPlayerReturn {
  // State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  
  // Track states
  trackStates: Record<string, { volume: number; isMuted: boolean; isLoaded: boolean }>;
  
  // Controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => Promise<void>;
  
  // Track controls
  setTrackVolume: (trackName: string, volume: number) => void;
  setTrackMuted: (trackName: string, muted: boolean) => void;
  toggleTrackMuted: (trackName: string) => void;
  setMasterVolume: (volume: number) => void;
  
  // Loading
  loadTracks: (trackUrls: Record<string, string>) => Promise<void>;
  
  // Utility
  formatTime: (seconds: number) => string;
  isTrackLoaded: (trackName: string) => boolean;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  
  // Audio engine instance (persisted across renders)
  const audioEngineRef = useRef<AudioEngine | null>(null);
  
  // Debug: Track hook renders (disabled for performance)
  // const hookRenderCount = useRef(0);
  // hookRenderCount.current += 1;
  // console.log(`useAudioPlayer hook render #${hookRenderCount.current}`);
  
  // State from audio engine
  const [engineState, setEngineState] = useState<AudioEngineState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null
  });
  
  // Track states
  const [trackStates, setTrackStates] = useState<Record<string, { volume: number; isMuted: boolean; isLoaded: boolean }>>({});
  
  // Initialize audio engine
  useEffect(() => {
    if (!audioEngineRef.current) {
      console.log('Initializing new AudioEngine instance');
      audioEngineRef.current = new AudioEngine();
      
      // Set up state change callback with proper throttling
      let lastUpdate = 0;
      let lastIsPlaying = false;
      
      audioEngineRef.current.setStateChangeCallback((newState) => {
        const now = Date.now();
        
        // Check if play/pause state actually changed
        const isPlayingChanged = lastIsPlaying !== newState.isPlaying;
        
        // Only update immediately for actual play/pause changes, otherwise throttle
        if (isPlayingChanged) {
          lastIsPlaying = newState.isPlaying;
          lastUpdate = now; // Reset throttle timer
          setEngineState(newState);
          if (audioEngineRef.current) {
            setTrackStates(audioEngineRef.current.getTrackStates());
          }
        } else if (now - lastUpdate > 100) {
          // Throttle time updates to 10fps to reduce re-renders
          lastUpdate = now;
          setEngineState(newState);
          // Only update track states occasionally to reduce renders
          if (now % 500 < 100 && audioEngineRef.current) {
            setTrackStates(audioEngineRef.current.getTrackStates());
          }
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (audioEngineRef.current) {
        console.log('Disposing AudioEngine instance');
        audioEngineRef.current.dispose();
        audioEngineRef.current = null;
      }
    };
  }, []);
  
  // Auto-load tracks if provided (disabled for now to prevent re-render loops)
  // useEffect(() => {
  //   if (trackUrls && autoLoad && audioEngineRef.current && Object.keys(trackUrls).length > 0) {
  //     loadTracks(trackUrls).catch((error) => {
  //       console.error('Failed to auto-load tracks:', error);
  //     });
  //   }
  // }, [trackUrls, autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Control functions
  const play = useCallback(async (): Promise<void> => {
    if (!audioEngineRef.current) {
      throw new Error('Audio engine not initialized');
    }
    
    try {
      await audioEngineRef.current.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }, []);
  
  const pause = useCallback((): void => {
    if (audioEngineRef.current) {
      audioEngineRef.current.pause();
    }
  }, []);
  
  const stop = useCallback((): void => {
    if (audioEngineRef.current) {
      audioEngineRef.current.stop();
    }
  }, []);
  
  const seek = useCallback(async (time: number): Promise<void> => {
    if (!audioEngineRef.current) {
      throw new Error('Audio engine not initialized');
    }
    
    try {
      await audioEngineRef.current.seek(time);
    } catch (error) {
      console.error('Failed to seek audio:', error);
      throw error;
    }
  }, []);
  
  const setTrackVolume = useCallback((trackName: string, volume: number): void => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setTrackVolume(trackName, volume);
      // Update local track states
      setTrackStates(audioEngineRef.current.getTrackStates());
    }
  }, []);
  
  const setTrackMuted = useCallback((trackName: string, muted: boolean): void => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setTrackMuted(trackName, muted);
      // Update local track states
      setTrackStates(audioEngineRef.current.getTrackStates());
    }
  }, []);
  
  const toggleTrackMuted = useCallback((trackName: string): void => {
    const currentState = trackStates[trackName];
    if (currentState) {
      setTrackMuted(trackName, !currentState.isMuted);
    }
  }, [trackStates, setTrackMuted]);
  
  const setMasterVolume = useCallback((volume: number): void => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMasterVolume(volume);
    }
  }, []);
  
  const loadTracks = useCallback(async (trackUrls: Record<string, string>): Promise<void> => {
    if (!audioEngineRef.current) {
      throw new Error('Audio engine not initialized');
    }
    
    try {
      await audioEngineRef.current.loadTracks(trackUrls);
      // Update track states after loading
      setTrackStates(audioEngineRef.current.getTrackStates());
    } catch (error) {
      console.error('Failed to load tracks:', error);
      throw error;
    }
  }, []);
  
  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const isTrackLoaded = useCallback((trackName: string): boolean => {
    return trackStates[trackName]?.isLoaded || false;
  }, [trackStates]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (engineState.isPlaying) {
            pause();
          } else {
            play().catch(console.error);
          }
          break;
        case 'ArrowLeft':
          if (event.shiftKey) {
            event.preventDefault();
            const newTime = Math.max(0, engineState.currentTime - 10);
            seek(newTime).catch(console.error);
          }
          break;
        case 'ArrowRight':
          if (event.shiftKey) {
            event.preventDefault();
            const newTime = Math.min(engineState.duration, engineState.currentTime + 10);
            seek(newTime).catch(console.error);
          }
          break;
        case 'Home':
          event.preventDefault();
          seek(0).catch(console.error);
          break;
        case 'End':
          event.preventDefault();
          seek(engineState.duration).catch(console.error);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [engineState.isPlaying, engineState.currentTime, engineState.duration, play, pause, seek]);
  
  return {
    // State
    isPlaying: engineState.isPlaying,
    currentTime: engineState.currentTime,
    duration: engineState.duration,
    isLoading: engineState.isLoading,
    error: engineState.error,
    trackStates,
    
    // Controls
    play,
    pause,
    stop,
    seek,
    
    // Track controls
    setTrackVolume,
    setTrackMuted,
    toggleTrackMuted,
    setMasterVolume,
    
    // Loading
    loadTracks,
    
    // Utility
    formatTime,
    isTrackLoaded
  };
} 