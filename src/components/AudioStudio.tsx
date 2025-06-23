'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Music,
  Home,
  Loader2,
  ChevronDown,
  MicVocal,
  KeyboardMusic,
  Guitar,
  Drum,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { api } from '@/lib/api';
import { JobResultsResponse } from '@/types/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import RoundedTimeline from './RoundedTimeline';
import { useRouter } from 'next/navigation';

interface AudioStudioProps {
  jobId: string;
}

interface BeatData {
  tempo_bpm: number;
  time_signature: string;
  beat_times: number[];
  confidence: number;
  rhythm_regularity: number;
}

const Timeline = ({ duration, currentTime }: { duration: number; currentTime: number }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (mins === 0) {
      return `${secs}s`;
    } else if (secs === 0) {
      return `${mins}m`;
    } else {
      return `${mins}m ${secs}s`;
    }
  };

  const timeMarkers = [];
  // Ensure duration is valid and interval is at least 1 second
  const safeDuration = Math.max(1, duration || 1);
  const interval = 30; // Show ~8 markers
  
  // Limit the number of markers to prevent infinite loops
  const maxMarkers = 20;
  let markerCount = 0;
  
  for (let i = 0; i <= safeDuration && markerCount < maxMarkers; i += interval) {
    timeMarkers.push(i);
    markerCount++;
  }

  return (
    <div className="h-[35px] bg-[#393839] flex items-end relative px-2 hover:bg-[#434343] transition-colors">
      {timeMarkers.map((time, index) => (
        <div 
          key={index}
          className="absolute top-1.5 text-xs text-[#656565] font-satoshi font-bold pointer-events-none"
          style={{ left: `${1 + (time / safeDuration) * (100)}%` }}
        >
          {formatTime(time)}
        </div>
      ))}
      
      {/* Current time cursor */}
      <div 
        className="absolute top-2 w-[3px] h-[210px] rounded-full bg-white shadow-lg transition-all duration-100 pointer-events-none"
        style={{ left: `${1 + (currentTime / safeDuration) * (100)}%` }}
      >
      </div>
      
      {/* Clickable overlay for better UX */}
      <div className="absolute inset-0 bg-transparent hover:bg-white/5 transition-colors" />
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BeatGrid = ({ beatData, currentTime }: { beatData: BeatData | null; currentTime: number }) => {
  // Debug logging
  console.log('BeatGrid render:', { 
    hasBeatData: !!beatData, 
    currentTime, 
    beatDataKeys: beatData ? Object.keys(beatData) : null,
    beatTimesLength: beatData?.beat_times?.length || 0
  });

  if (!beatData) {
    console.log('BeatGrid: No beat data available');
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white/50 text-lg">Loading beat visualization...</div>
      </div>
    );
  }

  // Create a grid of cells - let's say 12x8 for a nice visual
  const rows = 8;
  const cols = 12;
  const totalCells = rows * cols;

  // Find the current beat index based on current time
  const getCurrentBeatIndex = () => {
    if (!beatData.beat_times.length) {
      console.log('BeatGrid: No beat times available');
      return -1;
    }
    
    console.log('BeatGrid: Searching for beat at time:', currentTime, 'in beats:', beatData.beat_times.slice(0, 5));
    
    for (let i = 0; i < beatData.beat_times.length; i++) {
      if (currentTime < beatData.beat_times[i]) {
        console.log('BeatGrid: Current beat index:', i - 1);
        return i - 1;
      }
    }
    const lastIndex = beatData.beat_times.length - 1;
    console.log('BeatGrid: Using last beat index:', lastIndex);
    return lastIndex;
  };

  const currentBeatIndex = getCurrentBeatIndex();
  
  // Calculate which cells should be active based on current beat
  // We'll create a wave pattern that spreads from center
  const getActiveCells = () => {
    const activeCells = new Set<number>();
    
    console.log('BeatGrid: Getting active cells for beat index:', currentBeatIndex);
    
    if (currentBeatIndex >= 0 && currentBeatIndex < beatData.beat_times.length) {
      const beatTime = beatData.beat_times[currentBeatIndex];
      const timeSinceBeat = currentTime - beatTime;
      const nextBeatTime = beatData.beat_times[currentBeatIndex + 1];
      const beatDuration = nextBeatTime ? nextBeatTime - beatTime : 60 / beatData.tempo_bpm;
      
      console.log('BeatGrid: Beat timing:', {
        beatTime,
        timeSinceBeat,
        beatDuration,
        threshold: beatDuration * 0.3,
        shouldShow: timeSinceBeat < beatDuration * 0.3
      });
      
      // Only show active pattern for a short time after each beat
      if (timeSinceBeat < beatDuration * 0.3) {
        const centerRow = Math.floor(rows / 2);
        const centerCol = Math.floor(cols / 2);
        
        // Create expanding circle pattern
        const radius = Math.floor((timeSinceBeat / (beatDuration * 0.3)) * Math.max(rows, cols));
        
        console.log('BeatGrid: Creating pattern with radius:', radius, 'center:', centerRow, centerCol);
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const distance = Math.sqrt(
              Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
            );
            
            if (distance <= radius && distance >= radius - 2) {
              activeCells.add(row * cols + col);
            }
          }
        }
        
        console.log('BeatGrid: Active cells count:', activeCells.size);
      }
    }
    
    return activeCells;
  };

  const activeCells = getActiveCells();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Debug overlay */}
      <div className="absolute top-4 right-4 text-white/90 text-xs font-mono bg-black/50 p-2 rounded z-10">
        <div>🎵 BEAT DEBUG</div>
        <div>Current Time: {currentTime.toFixed(2)}s</div>
        <div>Beat Index: {currentBeatIndex}/{beatData.beat_times.length}</div>
        <div>Active Cells: {activeCells.size}</div>
        <div>BPM: {beatData.tempo_bpm}</div>
        <div>Has Beats: {beatData.beat_times.length > 0 ? 'YES' : 'NO'}</div>
      </div>
      
      <div 
        className="w-full h-full grid gap-1 p-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {Array.from({ length: totalCells }, (_, index) => {
          const isActive = activeCells.has(index);
          return (
            <div
              key={index}
              className={`
                rounded-sm transition-all duration-200 ease-out border
                ${isActive 
                  ? 'bg-blue-500/80 shadow-lg shadow-blue-500/50 scale-110 border-blue-300' 
                  : 'bg-gray-800/30 hover:bg-gray-700/50 border-gray-700/50'
                }
              `}
              style={{
                opacity: isActive ? Math.max(0.8, beatData.confidence) : 0.4,
              }}
            />
          );
        })}
      </div>
      
      {/* Beat info overlay */}
      <div className="absolute top-4 left-4 text-white/70 text-sm font-mono bg-black/50 p-2 rounded">
        <div>BPM: {beatData.tempo_bpm.toFixed(1)}</div>
        <div>Time: {beatData.time_signature}</div>
        <div>Beat: {currentBeatIndex + 1}/{beatData.beat_times.length}</div>
        <div>Confidence: {(beatData.confidence * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};

const VinylDisc = ({ results, audioPlayer }: { 
  results: JobResultsResponse | null; 
  audioPlayer: ReturnType<typeof useAudioPlayer>
}) => {
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number>(null);
  const lastTimeRef = useRef(Date.now());

  // Debug logging
  console.log('VinylDisc render:', { 
    hasResults: !!results, 
    isPlaying: audioPlayer.isPlaying,
    rotation: rotationRef.current,
    coverImagePath: results?.audio_metadata?.cover_image_path,
    audioMetadata: results?.audio_metadata
  });

  // Handle vinyl rotation animation
  useEffect(() => {
    const animate = () => {
      if (audioPlayer.isPlaying) {
        const now = Date.now();
        const deltaTime = now - lastTimeRef.current;
        lastTimeRef.current = now;
        
        // Rotate at 33⅓ RPM = 0.556 revolutions per second = 200 degrees per second
        const degreesPerSecond = 100;
        const rotationDelta = (degreesPerSecond * deltaTime) / 1000;
        rotationRef.current += rotationDelta;
        
        // Keep rotation within 0-360 degrees
        if (rotationRef.current >= 360) {
          rotationRef.current -= 360;
        }
        
        // Apply rotation to the vinyl disc
        const vinylElement = document.getElementById('vinyl-disc');
        if (vinylElement) {
          vinylElement.style.transform = `rotate(${rotationRef.current}deg)`;
        }
      } else {
        // Update lastTimeRef even when paused to prevent jumps when resuming
        lastTimeRef.current = Date.now();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioPlayer.isPlaying]);

  // Load cover image
  useEffect(() => {
    if (!results?.audio_metadata?.cover_image_path) {
      console.log('VinylDisc: No cover image path available');
      return;
    }

    const loadCoverImage = async () => {
      try {
        const coverImagePath = results.audio_metadata?.cover_image_path;
        if (!coverImagePath) return;
        
        const filename = coverImagePath.split('/').pop() || '';
        const imageUrl = api.getFileDownloadURL(results.job_id, filename);
        console.log('VinylDisc: Loading cover image from:', imageUrl);
        setCoverImageUrl(imageUrl);
      } catch (error) {
        console.error('VinylDisc: Failed to load cover image:', error);
      }
    };

    loadCoverImage();
  }, [results]);

  if (!results) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white/50 text-lg">Loading vinyl disc...</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Vinyl Record */}
      <div className="relative">
        {/* Outer vinyl disc */}
        <div 
          id="vinyl-disc"
          className="w-72 h-72 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-black border-4 border-gray-700 shadow-2xl"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%),
              conic-gradient(from 0deg, #2a2a2a 0deg, #1a1a1a 90deg, #2a2a2a 180deg, #1a1a1a 270deg, #2a2a2a 360deg)
            `,
            transform: `rotate(${rotationRef.current}deg)`
          }}
        >
          {/* Vinyl grooves */}
          <div className="absolute inset-4 rounded-full border border-gray-600/30"></div>
          <div className="absolute inset-8 rounded-full border border-gray-600/20"></div>
          <div className="absolute inset-12 rounded-full border border-gray-600/20"></div>
          <div className="absolute inset-16 rounded-full border border-gray-600/10"></div>
          
          {/* Center label area */}
          <div className="absolute inset-11 rounded-full bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-700 flex items-center justify-center">
            {/* Album cover */}
            {coverImageUrl ? (
              <img 
                src={coverImageUrl} 
                alt="Album Cover"
                className="w-44 h-44 rounded-full object-cover shadow-lg"
                onError={(e) => {
                  console.error('VinylDisc: Cover image failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-36 h-36 rounded-full bg-gray-800 flex items-center justify-center">
                <Music className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Center hole */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black border-2 border-gray-600"></div>
        </div>
        
        {/* Reflection effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
      </div>

      {/* Track info overlay */}
      <div className="absolute top-1.5 left-10 text-white/80 text-sm font-mono bg-black/50 p-4 rounded-lg backdrop-blur-sm">
        <div className="text-lg font-satoshi font-bold mb-1">{results.audio_metadata?.title?.split('-')[0] || 'Unknown Title'}</div>
        {/* <div className="text-base mb-1">{results.audio_metadata?.artist || 'Unknown Artist'}</div> */}
        {/* <div className="text-sm text-white/60">{results.audio_metadata?.album || 'Unknown Album'}</div> */}
        {/* <div className="text-xs text-white/50 mt-2">
          {results.audio_metadata?.year && `${results.audio_metadata.year} • `}
          {results.audio_metadata?.genre || 'Unknown Genre'}
        </div> */}
      </div>

      {/* Status indicator */}
      {/* <div className="absolute top-8 right-8 text-white/70 text-sm font-mono bg-black/50 p-2 rounded">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${audioPlayer.isPlaying ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{audioPlayer.isPlaying ? 'Playing' : 'Paused'}</span>
        </div>
        <div className="text-xs text-white/50 mt-1">
          RPM: {audioPlayer.isPlaying ? '33⅓' : '0'}
        </div>
        <div className="text-xs text-white/40 mt-1">
          Angle: {Math.round(rotationRef.current)}°
        </div>
      </div> */}
    </div>
  );
};

export function AudioStudio({ jobId }: AudioStudioProps) {
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  const [, setBeatData] = useState<BeatData | null>(null);

  const [waveformVocalsFile, setWaveformVocalsFile] = useState<File | null>(null);
  const [waveformDrumsFile, setWaveformDrumsFile] = useState<File | null>(null);
  const [waveformBassFile, setWaveformBassFile] = useState<File | null>(null);
  const [waveformOtherFile, setWaveformOtherFile] = useState<File | null>(null);

  const router = useRouter();
  
  // Volume states for vocals and instruments (non-vocal tracks combined)
  const [vocalsVolume, setVocalsVolume] = useState([70]);
  const [instrumentsVolume, setInstrumentsVolume] = useState([70]);
  // Audio player hook
  const audioPlayer = useAudioPlayer();

  // Minimum loading time to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 1000); // Minimum 1 second loading

    return () => clearTimeout(timer);
  }, []);

  // Fetch job results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const jobResults = await api.getJobResults(jobId);
        setResults(jobResults);
        console.log('----------------------------------------')
        console.log(jobResults)
        console.log('----------------------------------------')
      } catch (err) {
        console.error('Failed to fetch job results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audio files');
        toast.error('Failed to load audio files', {
          description: 'Please check if the processing completed successfully.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  // Load audio tracks when results are available
  useEffect(() => {
    console.log('Audio loading effect triggered:', { hasResults: !!results, jobId });
    if (!results) {
      console.log('No results, skipping audio loading');
      return;
    }

    console.log('Results available, checking download links:', results.download_links);
    console.log('Full results object:', results);
    let isCancelled = false;

    const loadAudioTracks = async () => {
      try {
        // Prepare track URLs for audio loading
        const trackUrls: Record<string, string> = {};
        
        if (results.download_links.vocals_stem) {
          trackUrls.vocals = api.getFileDownloadURL(jobId, results.download_links.vocals_stem.split('/').pop() || '');
          fetch(trackUrls.vocals)
          .then(r => r.blob())
          .then(blob => {
            if (!isCancelled) {
              const f = new File([blob], 'waveform.mp3', { type: blob.type });
              setWaveformVocalsFile(f);
            }
          })
          .catch(err => console.error('Waveform fetch failed:', err));
        }
        if (results.download_links.drums_stem) {
          trackUrls.drums = api.getFileDownloadURL(jobId, results.download_links.drums_stem.split('/').pop() || '');
          fetch(trackUrls.drums)
          .then(r => r.blob())
          .then(blob => {
            if (!isCancelled) {
              const f = new File([blob], 'waveform.mp3', { type: blob.type });
              setWaveformDrumsFile(f);
            }
          })
          .catch(err => console.error('Waveform fetch failed:', err));
        }
        if (results.download_links.bass_stem) {
          trackUrls.bass = api.getFileDownloadURL(jobId, results.download_links.bass_stem.split('/').pop() || '');
          fetch(trackUrls.bass)
          .then(r => r.blob())
          .then(blob => {
            if (!isCancelled) {
              const f = new File([blob], 'waveform.mp3', { type: blob.type });
              setWaveformBassFile(f);
            }
          })
          .catch(err => console.error('Waveform fetch failed:', err));
        }
        if (results.download_links.other_stem) {
          trackUrls.other = api.getFileDownloadURL(jobId, results.download_links.other_stem.split('/').pop() || '');
          fetch(trackUrls.other)
          .then(r => r.blob())
          .then(blob => {
            if (!isCancelled) {
              const f = new File([blob], 'waveform.mp3', { type: blob.type });
              setWaveformOtherFile(f);
            }
          })
          .catch(err => console.error('Waveform fetch failed:', err));
        }
        
        // Load audio tracks
        if (Object.keys(trackUrls).length > 0 && !isCancelled) {
          console.log('Loading audio tracks:', trackUrls);
          console.log('AudioPlayer instance:', audioPlayer);
          console.log('AudioPlayer loadTracks method:', typeof audioPlayer.loadTracks);
          
          await audioPlayer.loadTracks(trackUrls);
          
          if (!isCancelled) {
            console.log('Audio tracks loaded, checking states:', audioPlayer.trackStates);
            // toast.success('Audio tracks loaded successfully!');
          }
        } else {
          console.warn('No audio track URLs found. Available download links:', Object.keys(results.download_links));
          if (!isCancelled) {
            toast.error('No audio tracks available', {
              description: 'The processed audio files could not be found.'
            });
          }
        }
        
      } catch (audioError) {
        if (!isCancelled) {
          console.error('Failed to load audio tracks:', audioError);
          toast.error('Failed to load audio tracks', {
            description: 'Audio playback may not work properly.'
          });
        }
      }
    };

    loadAudioTracks();

    return () => {
      isCancelled = true;
    };
  }, [results, jobId, audioPlayer.loadTracks]); // Fixed: Include audioPlayer.loadTracks as dependency

  // Fetch beat analysis data
  useEffect(() => {
    const fetchBeatData = async () => {
      console.log('🎵 Beat data fetch triggered. Results:', {
        hasResults: !!results,
        downloadLinks: results?.download_links,
        beatBeatsLink: results?.download_links?.beat_beats,
        beatAnalysis: results?.beat_analysis
      });
      
      if (!results?.download_links.beat_beats) {
        console.log('❌ No beat_beats download link available');
        return;
      }
      
      try {
        const filename = results.download_links.beat_beats.split('/').pop() || '';
        const beatUrl = api.getFileDownloadURL(jobId, filename);
        console.log('🎵 Fetching beat data from URL:', beatUrl);
        
        const response = await fetch(beatUrl);
        console.log('🎵 Beat data fetch response:', {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🎵 Raw beat data received:', data);
        console.log('🎵 Beat data type:', typeof data);
        console.log('🎵 Beat data structure:', {
          isArray: Array.isArray(data),
          keys: typeof data === 'object' ? Object.keys(data) : null,
          length: Array.isArray(data) ? data.length : null
        });
        
        // Extract beat times - handle different possible formats
        let beatTimes: number[] = [];
        if (Array.isArray(data)) {
          beatTimes = data;
          console.log('🎵 Beat times from array:', beatTimes.slice(0, 10));
        } else if (data.beat_times && Array.isArray(data.beat_times)) {
          beatTimes = data.beat_times;
          console.log('🎵 Beat times from object.beat_times:', beatTimes.slice(0, 10));
        } else if (data.beats && Array.isArray(data.beats)) {
          beatTimes = data.beats;
          console.log('🎵 Beat times from object.beats:', beatTimes.slice(0, 10));
        } else {
          console.warn('⚠️ Could not find beat times in data structure');
        }
        
        // The API returns beat_times array and other beat analysis data
        const beatData = {
          tempo_bpm: results.beat_analysis?.tempo_bpm || 120,
          time_signature: results.beat_analysis?.time_signature || '4/4',
          beat_times: beatTimes,
          confidence: results.beat_analysis?.beat_confidence || 0.8,
          rhythm_regularity: results.beat_analysis?.rhythm_regularity || 0.8
        };
        
        console.log('🎵 Final beat data object:', beatData);
        console.log('🎵 Beat times sample:', beatData.beat_times.slice(0, 20));
        
        setBeatData(beatData);
        // toast.success(`Beat visualization loaded! Found ${beatTimes.length} beats`);
        
      } catch (error) {
        console.error('❌ Failed to load beat data:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null
        });
        toast.error('Failed to load beat visualization: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    fetchBeatData();
  }, [results, jobId]);

  const handlePlayPause = async () => {
    console.log('Play button clicked. Current state:', {
      isPlaying: audioPlayer.isPlaying,
      duration: audioPlayer.duration,
      currentTime: audioPlayer.currentTime,
      trackStates: audioPlayer.trackStates,
      isLoading: audioPlayer.isLoading,
      error: audioPlayer.error
    });
    

    
    try {
      // Check if any tracks are loaded
      const loadedTracks = Object.values(audioPlayer.trackStates).filter(state => state.isLoaded);
      if (loadedTracks.length === 0) {
        console.warn('No audio tracks loaded, cannot play');
        toast.error('No audio tracks loaded', {
          description: 'Please wait for audio tracks to load or check if processing completed successfully.'
        });
        return;
      }

      if (audioPlayer.isPlaying) {
        console.log('Pausing audio...');
        audioPlayer.pause();
      } else {
        console.log('Starting audio playback...');
        await audioPlayer.play();
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      toast.error('Playback failed', {
        description: 'Please check if audio tracks are loaded properly.'
      });
    }
  };

  const handleTrackMute = (trackName: string) => {
    console.log('Track mute clicked:', trackName, 'Current state:', audioPlayer.trackStates[trackName]);
    audioPlayer.toggleTrackMuted(trackName);
    console.log('After mute toggle:', audioPlayer.trackStates[trackName]);
  };

  const handleTimelineClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click if duration is not loaded yet
    if (!audioPlayer.duration || audioPlayer.duration <= 0) {
      console.warn('Cannot seek: duration not available');
      toast.warning('Please wait for audio to load');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickPercentage = Math.max(0, Math.min(1, clickX / timelineWidth));
    const newTime = clickPercentage * audioPlayer.duration;
    
    console.log('Timeline click:', {
      clickX,
      timelineWidth,
      clickPercentage,
      newTime,
      duration: audioPlayer.duration,
      currentTime: audioPlayer.currentTime
    });
    
    try {
      await audioPlayer.seek(newTime);
    } catch (error) {
      console.error('Failed to seek:', error);
      toast.error('Seek failed', {
        description: error instanceof Error ? error.message : 'Unable to jump to selected position'
      });
    }
  };

  // const getDownloadUrl = (filename: string): string => {
  //   return api.getFileDownloadURL(jobId, filename);
  // };

  // Debug audio player time updates
  useEffect(() => {
    console.log('🎶 Audio player time update:', {
      currentTime: audioPlayer.currentTime,
      duration: audioPlayer.duration,
      isPlaying: audioPlayer.isPlaying,
      trackStates: Object.keys(audioPlayer.trackStates).map(key => ({
        track: key,
        isLoaded: audioPlayer.trackStates[key]?.isLoaded,
        isMuted: audioPlayer.trackStates[key]?.isMuted
      }))
    });
  }, [audioPlayer.currentTime, audioPlayer.isPlaying]);

  if (isLoading || !minLoadingComplete) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Audio Studio</h2>
          <p className="text-gray-400">
            {isLoading ? 'Fetching your processed audio files...' : 'Preparing audio interface...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900 p-4 rounded-full w-fit mx-auto mb-4">
            <Music className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Studio</h2>
          <p className="text-gray-400 mb-4">{error || 'Unable to load audio files'}</p>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen text-white flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Lyrics/Content Area */}
        <div className="h-[calc(100vh-280px)] bg-black relative flex items-center justify-center">
          {/* Checkered Background Pattern */}
          <div 
            className="absolute inset-0 opacity-35 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #333 25%, transparent 25%), 
                linear-gradient(-45deg, #333 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #333 75%), 
                linear-gradient(-45deg, transparent 75%, #333 75%)
              `,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
            }}
          />
          <button onClick={() => router.push('/')} className='absolute top-6 left-4 z-20'>
            <ChevronLeft className='h-6 w-6 text-white' />
          </button>
          <VinylDisc results={results} audioPlayer={audioPlayer} />
          {/* <BeatGrid beatData={beatData} currentTime={audioPlayer.currentTime} /> */}
        </div>

        {/* Controls Bar */}
        <div className='bottom-0 fixed w-full'>

          <div className="h-14 bg-[#2A2828] flex items-center justify-between px-2">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handlePlayPause}
                size="sm"
                className="w-6.5 h-6.5 rounded-full bg-white text-black hover:bg-gray-200"
                disabled={audioPlayer.isLoading}
              >
                {audioPlayer.isLoading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : audioPlayer.isPlaying ? (
                  <Pause fill='#000' className="h-2 w-2" />
                ) : (
                  <Play fill='#000' className="h-2 w-2" />
                )}
              </Button>
              
              <div className="text-white text-sm font-satoshi font-bold">
                {audioPlayer.formatTime(audioPlayer.currentTime)} / {audioPlayer.formatTime(audioPlayer.duration)}
              </div>
            </div>

            <div className="flex items-center space-x-10">
              {/* Vocals Volume Control */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#626060] font-satoshi font-bold mb-[2px]">vocals</span>
                              <Slider
                value={vocalsVolume}
                onValueChange={(value) => {
                  setVocalsVolume(value);
                  audioPlayer.setTrackVolume('vocals', value[0] / 100);
                }}
                max={100}
                step={1}
                className="w-20"
              />
              </div>
              
              {/* Instruments Volume Control */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#626060] font-satoshi font-bold mb-[2px]">instruments</span>
                              <Slider
                value={instrumentsVolume}
                onValueChange={(value) => {
                  setInstrumentsVolume(value);
                  // Set volume for all non-vocal tracks
                  audioPlayer.setTrackVolume('drums', value[0] / 100);
                  audioPlayer.setTrackVolume('bass', value[0] / 100);
                  audioPlayer.setTrackVolume('other', value[0] / 100);
                }}
                max={100}
                step={1}
                className="w-20"
              />
              </div>
              
              {/* Download button */}
              <div className="relative group">
                <Button className='bg-[#393939] hover:bg-[#393939]/80 w-8 h-8'>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        <div className='h-[240px] bg-black w-full flex'>
          {/* Sidebar */}
          <div className='w-[55px] bg-[#1A1B1D] pt-[55px] pb-8 flex flex-col items-center justify-between'>
            <button onClick={() => handleTrackMute('vocals')}>
              <MicVocal  className='h-5 w-5 text-[#3E84E8]' />
            </button>
            <button onClick={() => handleTrackMute('other')}>
              <KeyboardMusic  className='h-5 w-5 text-[#C19549]' />
            </button>
            <button onClick={() => handleTrackMute('bass')}>
              <Guitar className='h-5 w-5 text-[#FC66F0]' />
            </button>
            <button onClick={() => handleTrackMute('drums')}>
              <Drum className='h-5 w-5 text-[#9DF8D6]' />
            </button>
              
          </div>
          <div className='w-[calc(100%-55px)] flex flex-col'>
            {/* Timeline */}
            <div 
              className='h-[35px] bg-[#393839] w-full cursor-pointer'
              onClick={handleTimelineClick}
            >
              <Timeline duration={audioPlayer.duration} currentTime={audioPlayer.currentTime} />
            </div>
            {/* Waveform */}
            <div className='h-[210px] bg-black flex flex-col items-center justify-between pt-4 pb-8 px-4'>
             {/* <RoundedTimeline file={waveformVocalsFile} /> */}
             <RoundedTimeline
                file={waveformVocalsFile}
                containerColor={audioPlayer.trackStates.vocals?.isMuted ? "#030C3D" : "#0561F0"} 
                waveformColor={audioPlayer.trackStates.vocals?.isMuted ? "#18253D" : "#8DAFFF"}  
                barRadius={26}
                silenceRms={0.005}
                bucketMs={10}
              />
             <RoundedTimeline
                file={waveformOtherFile}
                containerColor={audioPlayer.trackStates.other?.isMuted ? "#3F1704" : "#FD7F00"} 
                waveformColor={audioPlayer.trackStates.other?.isMuted ? "#3B281B" : "#FCC28C"}
                barRadius={26}
                silenceRms={0.005}
                bucketMs={10}
              />
             <RoundedTimeline
                file={waveformBassFile}
                containerColor={audioPlayer.trackStates.bass?.isMuted ? "#6B0661" : "#DD2DF9"}
                waveformColor={audioPlayer.trackStates.bass?.isMuted ? "rgba(239, 158, 251, 0.3)" : "#EF9EFB"}
                barRadius={26}
                silenceRms={0.005}
                bucketMs={10}
              />
             <RoundedTimeline
                file={waveformDrumsFile}
                containerColor={audioPlayer.trackStates.drums?.isMuted ? "#4ef5c366" : "#4EF5C3"} 
                waveformColor={audioPlayer.trackStates.drums?.isMuted ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.7)"}
                barRadius={26}
                silenceRms={0.005}
                bucketMs={10}
              />
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
} 