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

    console.log('=== PLAY CALLED ===');
    console.log('Current pausedAt:', this.pausedAt);
    console.log('AudioContext state:', this.audioContext.state);

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      await this.audioContext.resume();
      console.log('Audio context resumed, new state:', this.audioContext.state);
    }

    try {
      // Stop any currently playing sources without resetting position
      console.log('Stopping existing sources...');
      let existingCount = 0;
      for (const track of this.tracks.values()) {
        if (track.source) {
          try {
            track.source.stop(0);
            existingCount++;
          } catch {
            // Ignore errors from already stopped sources
          }
          track.source = null;
        }
      }
      console.log(`Stopped ${existingCount} existing sources`);

      // Create and start sources for all tracks
      const currentTime = this.audioContext.currentTime;
      this.startTime = currentTime - this.pausedAt;
      
      console.log('Starting playback:', {
        currentTime,
        pausedAt: this.pausedAt,
        startTime: this.startTime,
        resumingFrom: this.pausedAt
      });

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

      console.log('Setting isPlaying: true and starting time updates...');
      this.updateState({ isPlaying: true });
      this.startTimeUpdates();
      console.log('=== PLAY COMPLETE ===');
      
    } catch (error) {
      console.error('Failed to start playback:', error);
      this.updateState({ error: 'Failed to start playback' });
      throw error;
    }
  }

  // Pause playback
  pause(): void {
    if (!this.audioContext) return;

    console.log('=== PAUSE CALLED ===');
    console.log('Current startTime:', this.startTime);
    console.log('Current audioContext.currentTime:', this.audioContext.currentTime);
    console.log('Sources before stopping:', Array.from(this.tracks.values()).map(t => ({ name: t.name, hasSource: !!t.source })));

    // Update paused position first
    if (this.startTime > 0) {
      this.pausedAt = this.audioContext.currentTime - this.startTime;
      console.log('Calculated pausedAt:', this.pausedAt);
    }

    // Stop all sources immediately
    let stoppedCount = 0;
    for (const track of this.tracks.values()) {
      if (track.source) {
        try {
          track.source.stop(0); // Stop immediately with 0 delay
          console.log(`Stopped source for track: ${track.name}`);
          stoppedCount++;
        } catch (error) {
          console.warn(`Failed to stop source for track ${track.name}:`, error);
        }
        track.source = null;
      }
    }
    
    console.log(`Stopped ${stoppedCount} sources`);
    console.log('Sources after stopping:', Array.from(this.tracks.values()).map(t => ({ name: t.name, hasSource: !!t.source })));

    // Stop time updates first
    this.stopTimeUpdates();
    console.log('Time updates stopped');
    
    // Force the state update with explicit isPlaying: false
    this.updateState({ 
      isPlaying: false,
      currentTime: this.pausedAt 
    });
    
    console.log('State updated to paused, pausedAt:', this.pausedAt);
    console.log('=== PAUSE COMPLETE ===');
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
    const duration = this.getState().duration;
    
    console.log('=== SEEK CALLED ===');
    console.log('Seek to time:', time);
    console.log('Was playing:', wasPlaying);
    console.log('Duration:', duration);
    
    // Set the new position (clamp to valid range)
    this.pausedAt = Math.max(0, Math.min(time, duration));
    console.log('Set pausedAt to:', this.pausedAt);
    
    if (wasPlaying) {
      // If playing, seek without changing play state
      await this.seekWhilePlaying(this.pausedAt);
    } else {
      // If paused, use normal pause method and just update position
      console.log('Seeking while paused - maintaining paused state');
      this.pause();
      this.updateState({ currentTime: this.pausedAt });
    }
    
    console.log('=== SEEK COMPLETE ===');
  }

  // Internal method to seek while maintaining playback
  private async seekWhilePlaying(newTime: number): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      throw new Error('Audio engine not initialized');
    }

    console.log('Seeking while playing to:', newTime);

    // Temporarily stop time updates to prevent interference
    this.stopTimeUpdates();

    // Stop current sources silently
    for (const track of this.tracks.values()) {
      if (track.source) {
        try {
          track.source.stop(0);
        } catch {
          // Ignore errors
        }
        track.source = null;
      }
    }

    // Create new sources starting from the new position
    // Add a small delay to ensure clean audio context state
    const startDelay = 0.01; // 10ms delay
    const currentTime = this.audioContext.currentTime + startDelay;
    this.startTime = currentTime - newTime;

    let sourcesCreated = 0;
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
        
        // Validate seek position against buffer length
        const bufferDuration = track.buffer.duration;
        const safeSeekTime = Math.min(newTime, bufferDuration - 0.1); // Leave 0.1s buffer
        
        console.log(`Starting track ${track.name}: seekTime=${newTime}, bufferDuration=${bufferDuration}, safeSeekTime=${safeSeekTime}`);
        
        // Start playback from new position
        track.source.start(currentTime, safeSeekTime);
        sourcesCreated++;
        
        // Don't set onended callback during seek - will be set by normal play() method
        // The time updates will handle end-of-track detection
        track.source.onended = null;
      }
    }

    console.log(`Created ${sourcesCreated} new sources at position ${newTime}`);
    
    // Update current time immediately but keep isPlaying: true
    console.log('Updating state with isPlaying: true and currentTime:', newTime);
    this.updateState({ currentTime: newTime, isPlaying: true });
    console.log('State update complete');
    
    // Restart time updates
    this.startTimeUpdates();
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
    console.log('startTimeUpdates() called');
    this.stopTimeUpdates();
    
    let updateCount = 0;
    const updateTime = () => {
      updateCount++;
      const isPlaying = this.tracks.size > 0 && Array.from(this.tracks.values()).some(track => track.source !== null);
      const currentTime = this.getCurrentTime(isPlaying);
      const duration = Array.from(this.tracks.values()).find(track => track.buffer)?.buffer?.duration || 0;
      
      // Debug first few updates
      if (updateCount <= 5) {
        console.log(`Time update ${updateCount}:`, {
          isPlaying,
          currentTime,
          duration,
          startTime: this.startTime,
          pausedAt: this.pausedAt,
          audioContextCurrentTime: this.audioContext?.currentTime
        });
      }
      
      // Check if we've reached the end
      if (currentTime >= duration && duration > 0) {
        console.log('Reached end of track, pausing');
        this.pause();
        this.pausedAt = duration;
        this.updateState({ currentTime: duration, isPlaying: false });
        return;
      }
      
      this.updateState({ currentTime });
      
      if (isPlaying) {
        this.animationFrameId = requestAnimationFrame(updateTime);
      } else {
        console.log('Stopped time updates because isPlaying is false');
      }
    };
    
    console.log('Starting first time update...');
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
      
      // Only calculate isPlaying if not explicitly provided in partialState
      const calculatedIsPlaying = this.tracks.size > 0 && Array.from(this.tracks.values())
        .some(track => track.source !== null);
      const isPlaying = partialState.isPlaying !== undefined ? partialState.isPlaying : calculatedIsPlaying;
      
      // Debug logging for seek operations
      if (partialState.isPlaying !== undefined) {
        console.log('updateState called with explicit isPlaying:', partialState.isPlaying);
        console.log('calculatedIsPlaying:', calculatedIsPlaying);
        console.log('final isPlaying:', isPlaying);
        console.log('sources exist:', Array.from(this.tracks.values()).map(t => ({ name: t.name, hasSource: !!t.source })));
      }
      
      const currentState: AudioEngineState = {
        isPlaying,
        currentTime: this.getCurrentTime(isPlaying),
        duration,
        isLoading: false,
        error: null
      };
      
      const newState = { ...currentState, ...partialState };
      
      // Debug final state
      if (partialState.isPlaying !== undefined) {
        console.log('Final state sent to callback:', newState);
      }
      
      this.stateChangeCallback(newState);
    }
  }
} 