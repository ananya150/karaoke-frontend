'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2,
  VolumeX,
  Music,
  Download,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { JobResultsResponse } from '@/types/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface AudioStudioProps {
  jobId: string;
}

interface TrackState {
  isMuted: boolean;
  volume: number;
}

interface StudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  tracks: {
    vocals: TrackState;
    drums: TrackState;
    bass: TrackState;
    other: TrackState;
  };
}

// Mock waveform data - in a real implementation, this would be generated from the audio files
const generateMockWaveform = (duration: number, density: number = 200) => {
  const points = [];
  for (let i = 0; i < density; i++) {
    const amplitude = Math.random() * 0.8 + 0.1; // Random amplitude between 0.1 and 0.9
    points.push(amplitude);
  }
  return points;
};

const WaveformTrack = ({ 
  trackName, 
  color, 
  waveformData, 
  duration, 
  currentTime, 
  isMuted, 
  onTrackClick 
}: {
  trackName: string;
  color: string;
  waveformData: number[];
  duration: number;
  currentTime: number;
  isMuted: boolean;
  onTrackClick: () => void;
}) => {
  const getTrackIcon = (track: string) => {
    switch (track) {
      case 'vocals': return '🎤';
      case 'drums': return '🥁';
      case 'bass': return '🎸';
      case 'other': return '🎹';
      default: return '🎵';
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center h-16 bg-gray-900 border-b border-gray-700">
      {/* Track Icon */}
      <div 
        className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-opacity ${
          isMuted ? 'opacity-30' : 'opacity-100'
        }`}
        onClick={onTrackClick}
      >
        <span className="text-2xl">{getTrackIcon(trackName)}</span>
      </div>
      
      {/* Waveform */}
      <div className="flex-1 h-full relative overflow-hidden">
        <div className="flex items-center h-full px-2">
          {waveformData.map((amplitude, index) => (
            <div
              key={index}
              className={`w-1 mx-px transition-opacity ${
                isMuted ? 'opacity-30' : 'opacity-100'
              }`}
              style={{
                height: `${amplitude * 40}px`,
                backgroundColor: color,
                minHeight: '2px'
              }}
            />
          ))}
        </div>
        
        {/* Progress overlay */}
        <div 
          className="absolute top-0 left-12 h-full bg-white opacity-20 transition-all duration-100"
          style={{ 
            width: `${progressPercentage}%`,
            maxWidth: 'calc(100% - 48px)'
          }}
        />
      </div>
    </div>
  );
};

const Timeline = ({ duration, currentTime }: { duration: number; currentTime: number }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeMarkers = [];
  const interval = Math.ceil(duration / 8); // Show ~8 markers
  
  for (let i = 0; i <= duration; i += interval) {
    timeMarkers.push(i);
  }

  return (
    <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-end relative px-12">
      {timeMarkers.map((time, index) => (
        <div 
          key={index}
          className="absolute bottom-0 text-xs text-gray-400"
          style={{ left: `${12 + (time / duration) * (100 - 24)}%` }}
        >
          <div className="w-px h-4 bg-gray-600 mb-1"></div>
          {formatTime(time)}
        </div>
      ))}
      
      {/* Current time cursor */}
      <div 
        className="absolute top-0 w-px h-full bg-white shadow-lg transition-all duration-100"
        style={{ left: `${12 + (currentTime / duration) * (100 - 24)}%` }}
      >
        <div className="w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1"></div>
      </div>
    </div>
  );
};

export function AudioStudio({ jobId }: AudioStudioProps) {
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [studioState, setStudioState] = useState<StudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    tracks: {
      vocals: { isMuted: false, volume: 75 },
      drums: { isMuted: false, volume: 75 },
      bass: { isMuted: false, volume: 75 },
      other: { isMuted: false, volume: 75 },
    }
  });

  // Mock waveform data
  const [waveforms] = useState({
    vocals: generateMockWaveform(200),
    drums: generateMockWaveform(200),
    bass: generateMockWaveform(200),
    other: generateMockWaveform(200),
  });

  // Fetch job results on mount
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const jobResults = await api.getJobResults(jobId);
        setResults(jobResults);
        setStudioState(prev => ({
          ...prev,
          duration: jobResults.audio_duration || 180 // fallback to 3 minutes if not available
        }));
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

  // Playback simulation
  useEffect(() => {
    if (studioState.isPlaying) {
      intervalRef.current = setInterval(() => {
        setStudioState(prev => {
          const newTime = prev.currentTime + 0.1;
          if (newTime >= prev.duration) {
            return { ...prev, currentTime: prev.duration, isPlaying: false };
          }
          return { ...prev, currentTime: newTime };
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [studioState.isPlaying, studioState.duration]);

  const handlePlayPause = () => {
    setStudioState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  };

  const handleTrackMute = (trackName: keyof StudioState['tracks']) => {
    setStudioState(prev => ({
      ...prev,
      tracks: {
        ...prev.tracks,
        [trackName]: {
          ...prev.tracks[trackName],
          isMuted: !prev.tracks[trackName].isMuted
        }
      }
    }));
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left - 48; // Subtract left padding
    const timelineWidth = rect.width - 96; // Subtract both side paddings
    const clickPercentage = Math.max(0, Math.min(1, clickX / timelineWidth));
    const newTime = clickPercentage * studioState.duration;
    
    setStudioState(prev => ({
      ...prev,
      currentTime: newTime
    }));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDownloadUrl = (filename: string): string => {
    return api.getFileDownloadURL(jobId, filename);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Audio Studio</h2>
          <p className="text-gray-400">Fetching your processed audio files...</p>
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
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{results.original_filename}</h1>
            <p className="text-sm text-gray-400">
              {formatTime(results.audio_duration)} • {results.beat_analysis.tempo_bpm.toFixed(1)} BPM
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-green-900 text-green-400">
            {Math.round(results.file_size / 1024 / 1024)}MB
          </Badge>
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Lyrics/Content Area */}
        <div className="flex-1 bg-black flex items-center justify-center p-8">
          <div className="text-center max-w-4xl">
            <div className="text-6xl font-bold text-white mb-8 leading-tight">
              {/* This would be populated with actual lyrics/transcription */}
                             <div className="mb-4 opacity-60">It&apos;s the music</div>
               <div className="mb-4 opacity-60">that we choose</div>
               <div className="mb-8">The world is</div>
               <div className="mb-8">spinning too fast</div>
               <div className="mb-4 opacity-60">I&apos;m buying that</div>
              <div className="opacity-60">Nike shoes</div>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handlePlayPause}
              size="sm"
              className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200"
            >
              {studioState.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="text-white text-sm font-mono">
              {formatTime(studioState.currentTime)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">vocals</span>
            <Volume2 className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-400">instruments</span>
            <VolumeX className="h-4 w-4 text-gray-400" />
            
            {/* Download button */}
            <div className="relative group">
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-full right-0 mb-2 bg-gray-700 rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="space-y-1 text-xs whitespace-nowrap">
                  {Object.entries(results.download_links).map(([type, url]) => {
                    if (type.includes('stem') && url) {
                      const trackName = type.replace('_stem', '');
                      return (
                        <a
                          key={type}
                          href={getDownloadUrl(url.split('/').pop() || '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:text-blue-400"
                        >
                          {trackName} track
                        </a>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div 
          className="cursor-pointer"
          onClick={handleTimelineClick}
        >
          <Timeline duration={studioState.duration} currentTime={studioState.currentTime} />
        </div>

        {/* Waveform Tracks */}
        <div className="border-t border-gray-700">
          <WaveformTrack
            trackName="vocals"
            color="#3B82F6" // Blue
            waveformData={waveforms.vocals}
            duration={studioState.duration}
            currentTime={studioState.currentTime}
            isMuted={studioState.tracks.vocals.isMuted}
            onTrackClick={() => handleTrackMute('vocals')}
          />
          <WaveformTrack
            trackName="drums"
            color="#F97316" // Orange
            waveformData={waveforms.drums}
            duration={studioState.duration}
            currentTime={studioState.currentTime}
            isMuted={studioState.tracks.drums.isMuted}
            onTrackClick={() => handleTrackMute('drums')}
          />
          <WaveformTrack
            trackName="bass"
            color="#EC4899" // Pink
            waveformData={waveforms.bass}
            duration={studioState.duration}
            currentTime={studioState.currentTime}
            isMuted={studioState.tracks.bass.isMuted}
            onTrackClick={() => handleTrackMute('bass')}
          />
          <WaveformTrack
            trackName="other"
            color="#10B981" // Green
            waveformData={waveforms.other}
            duration={studioState.duration}
            currentTime={studioState.currentTime}
            isMuted={studioState.tracks.other.isMuted}
            onTrackClick={() => handleTrackMute('other')}
          />
        </div>
      </div>
    </div>
  );
} 