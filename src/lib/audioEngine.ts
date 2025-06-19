// Audio Engine for synchronized multi-track playback
// Handles loading, playing, and controlling multiple audio stems

export interface AudioTrack {
  name: string;
  url: string;
  buffer: AudioBuffer | null;
  gainNode: GainNode | null;
  source: AudioBufferSourceNode | null;
  isMuted: boolean;
  volume: number; // 0-100
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private tracks: Map<string, AudioTrack> = new Map();
  private startTime: number = 0;
  private pausedAt: number = 0;
  private animationFrameId: number | null = null;
  private stateChangeCallback: ((state: AudioEngineState) => void) | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      // Create AudioContext with fallback for older browsers
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create master gain node
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      
      // Handle audio context state changes
      this.audioContext.addEventListener('statechange', () => {
        console.log('Audio context state:', this.audioContext?.state);
      });
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      this.updateState({ error: 'Failed to initialize audio system' });
    }
  }

  // Load audio tracks from URLs
  async loadTracks(trackUrls: Record<string, string>): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const loadPromises = Object.entries(trackUrls).map(async ([trackName, url]) => {
        try {
          console.log(`Loading track: ${trackName} from ${url}`);
          
          // Fetch audio file
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${trackName}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          // Decode audio data
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          
          // Create track object
          const track: AudioTrack = {
            name: trackName,
            url,
            buffer: audioBuffer,
            gainNode: null,
            source: null,
            isMuted: false,
            volume: 75
          };
          
          this.tracks.set(trackName, track);
          console.log(`Successfully loaded track: ${trackName}, duration: ${audioBuffer.duration}s`);
          
        } catch (error) {
          console.error(`Failed to load track ${trackName}:`, error);
          // Still create track entry but with error state
          const track: AudioTrack = {
            name: trackName,
            url,
            buffer: null,
            gainNode: null,
            source: null,
            isMuted: false,
            volume: 75
          };
          this.tracks.set(trackName, track);
          throw error;
        }
      });

      await Promise.all(loadPromises);
      
      // Get duration from the first successfully loaded track
      const firstTrack = Array.from(this.tracks.values()).find(track => track.buffer);
      const duration = firstTrack?.buffer?.duration || 0;
      
      this.updateState({ 
        isLoading: false, 
        duration,
        error: null 
      });
      
      console.log('All tracks loaded successfully');
      
    } catch (error) {
      console.error('Failed to load tracks:', error);
      this.updateState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to load audio tracks'
      });
      throw error;
    }
  }

  // Play all tracks synchronized
  async play(): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      throw new Error('Audio engine not initialized');
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      // Stop any currently playing sources
      this.stop();

      // Create and start sources for all tracks
      const currentTime = this.audioContext.currentTime;
      this.startTime = currentTime - this.pausedAt;

      for (const track of this.tracks.values()) {
        if (track.buffer) {
          // Create new source and gain nodes
          track.source = this.audioContext.createBufferSource();
          track.gainNode = this.audioContext.createGain();
          
          // Set up audio graph
          track.source.buffer = track.buffer;
          track.source.connect(track.gainNode);
          track.gainNode.connect(this.masterGainNode);
          
          // Apply current volume and mute settings
          this.updateTrackGain(track);
          
          // Start playback from current position
          track.source.start(currentTime, this.pausedAt);
          
          // Handle track end
          track.source.onended = () => {
            if (this.getState().isPlaying) {
              this.pause(); // Auto-pause when track ends
            }
          };
        }
      }

      this.updateState({ isPlaying: true });
      this.startTimeUpdates();
      
    } catch (error) {
      console.error('Failed to start playback:', error);
      this.updateState({ error: 'Failed to start playback' });
      throw error;
    }
  }

  // Pause playback
  pause(): void {
    if (!this.audioContext) return;

    // Stop all sources
    for (const track of this.tracks.values()) {
      if (track.source) {
        try {
          track.source.stop();
                 } catch {
           // Ignore errors from already stopped sources
         }
        track.source = null;
      }
    }

    // Update paused position
    if (this.startTime > 0) {
      this.pausedAt = this.audioContext.currentTime - this.startTime;
    }

    this.updateState({ isPlaying: false });
    this.stopTimeUpdates();
  }

  // Stop playback and reset to beginning
  stop(): void {
    this.pause();
    this.pausedAt = 0;
    this.updateState({ currentTime: 0 });
  }

  // Seek to specific time
  async seek(time: number): Promise<void> {
    const wasPlaying = this.getState().isPlaying;
    
    this.pause();
    this.pausedAt = Math.max(0, Math.min(time, this.getState().duration));
    this.updateState({ currentTime: this.pausedAt });
    
    if (wasPlaying) {
      await this.play();
    }
  }

  // Set track volume (0-100)
  setTrackVolume(trackName: string, volume: number): void {
    const track = this.tracks.get(trackName);
    if (track) {
      track.volume = Math.max(0, Math.min(100, volume));
      this.updateTrackGain(track);
    }
  }

  // Toggle track mute
  setTrackMuted(trackName: string, muted: boolean): void {
    const track = this.tracks.get(trackName);
    if (track) {
      track.isMuted = muted;
      this.updateTrackGain(track);
    }
  }

  // Set master volume (0-100)
  setMasterVolume(volume: number): void {
    if (this.masterGainNode) {
      const gain = (Math.max(0, Math.min(100, volume)) / 100) ** 2; // Quadratic scaling
      this.masterGainNode.gain.setValueAtTime(gain, this.audioContext?.currentTime || 0);
    }
  }

  // Get current track states
  getTrackStates(): Record<string, { volume: number; isMuted: boolean; isLoaded: boolean }> {
    const states: Record<string, { volume: number; isMuted: boolean; isLoaded: boolean }> = {};
    
    for (const [name, track] of this.tracks) {
      states[name] = {
        volume: track.volume,
        isMuted: track.isMuted,
        isLoaded: track.buffer !== null
      };
    }
    
    return states;
  }

  // Get current engine state
  getState(): AudioEngineState {
    const duration = Array.from(this.tracks.values())
      .find(track => track.buffer)?.buffer?.duration || 0;
    
    const isPlaying = this.tracks.size > 0 && Array.from(this.tracks.values())
      .some(track => track.source !== null);
    
    return {
      isPlaying,
      currentTime: this.getCurrentTime(isPlaying),
      duration,
      isLoading: false,
      error: null
    };
  }

  // Set state change callback
  setStateChangeCallback(callback: (state: AudioEngineState) => void): void {
    this.stateChangeCallback = callback;
  }

  // Clean up resources
  dispose(): void {
    this.stop();
    this.stopTimeUpdates();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.tracks.clear();
    this.audioContext = null;
    this.masterGainNode = null;
    this.stateChangeCallback = null;
  }

  // Private methods
  private updateTrackGain(track: AudioTrack): void {
    if (track.gainNode) {
      const volume = track.isMuted ? 0 : track.volume / 100;
      const gain = volume ** 2; // Quadratic scaling for more natural volume control
      track.gainNode.gain.setValueAtTime(gain, this.audioContext?.currentTime || 0);
    }
  }

  private getCurrentTime(isPlaying?: boolean): number {
    if (!this.audioContext) return this.pausedAt;
    
    // Use passed isPlaying parameter to avoid circular dependency
    const playing = isPlaying !== undefined ? isPlaying : 
      (this.tracks.size > 0 && Array.from(this.tracks.values()).some(track => track.source !== null));
    
    if (playing && this.startTime > 0) {
      return this.audioContext.currentTime - this.startTime;
    }
    
    return this.pausedAt;
  }

  private startTimeUpdates(): void {
    this.stopTimeUpdates();
    
    const updateTime = () => {
      const isPlaying = this.tracks.size > 0 && Array.from(this.tracks.values()).some(track => track.source !== null);
      const currentTime = this.getCurrentTime(isPlaying);
      const duration = Array.from(this.tracks.values()).find(track => track.buffer)?.buffer?.duration || 0;
      
      // Check if we've reached the end
      if (currentTime >= duration && duration > 0) {
        this.pause();
        this.pausedAt = duration;
        this.updateState({ currentTime: duration, isPlaying: false });
        return;
      }
      
      this.updateState({ currentTime });
      
      if (isPlaying) {
        this.animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(updateTime);
  }

  private stopTimeUpdates(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateState(partialState: Partial<AudioEngineState>): void {
    if (this.stateChangeCallback) {
      // Build state without calling getState() to avoid circular dependency
      const duration = Array.from(this.tracks.values())
        .find(track => track.buffer)?.buffer?.duration || 0;
      const isPlaying = this.tracks.size > 0 && Array.from(this.tracks.values())
        .some(track => track.source !== null);
      
      const currentState: AudioEngineState = {
        isPlaying,
        currentTime: this.getCurrentTime(isPlaying),
        duration,
        isLoading: false,
        error: null
      };
      
      const newState = { ...currentState, ...partialState };
      this.stateChangeCallback(newState);
    }
  }
} 