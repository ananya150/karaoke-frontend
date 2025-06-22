'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Music,
  Home,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { api } from '@/lib/api';
import { JobResultsResponse } from '@/types/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface AudioStudioProps {
  jobId: string;
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
  // Ensure duration is valid and interval is at least 1 second
  const safeDuration = Math.max(1, duration || 1);
  const interval = Math.max(1, Math.ceil(safeDuration / 8)); // Show ~8 markers
  
  // Limit the number of markers to prevent infinite loops
  const maxMarkers = 20;
  let markerCount = 0;
  
  for (let i = 0; i <= safeDuration && markerCount < maxMarkers; i += interval) {
    timeMarkers.push(i);
    markerCount++;
  }

  return (
    <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-end relative px-12">
      {timeMarkers.map((time, index) => (
        <div 
          key={index}
          className="absolute bottom-0 text-xs text-gray-400"
          style={{ left: `${12 + (time / safeDuration) * (100 - 24)}%` }}
        >
          <div className="w-px h-4 bg-gray-600 mb-1"></div>
          {formatTime(time)}
        </div>
      ))}
      
      {/* Current time cursor */}
      <div 
        className="absolute top-0 w-px h-full bg-white shadow-lg transition-all duration-100"
        style={{ left: `${12 + (currentTime / safeDuration) * (100 - 24)}%` }}
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
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);
  
  // Volume states for vocals and instruments (non-vocal tracks combined)
  const [vocalsVolume, setVocalsVolume] = useState([70]);
  const [instrumentsVolume, setInstrumentsVolume] = useState([70]);

  // Mock waveform data
  const [waveforms] = useState({
    vocals: generateMockWaveform(200),
    drums: generateMockWaveform(200),
    bass: generateMockWaveform(200),
    other: generateMockWaveform(200),
  });

  // Audio player hook
  const audioPlayer = useAudioPlayer();

  // Debug logging with render counter
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`AudioStudio render #${renderCountRef.current}:`, { 
    isLoading, 
    minLoadingComplete, 
    hasResults: !!results, 
    error,
    audioPlayerLoading: audioPlayer.isLoading 
  });

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
        }
        if (results.download_links.drums_stem) {
          trackUrls.drums = api.getFileDownloadURL(jobId, results.download_links.drums_stem.split('/').pop() || '');
        }
        if (results.download_links.bass_stem) {
          trackUrls.bass = api.getFileDownloadURL(jobId, results.download_links.bass_stem.split('/').pop() || '');
        }
        if (results.download_links.other_stem) {
          trackUrls.other = api.getFileDownloadURL(jobId, results.download_links.other_stem.split('/').pop() || '');
        }
        
        // Load audio tracks
        if (Object.keys(trackUrls).length > 0 && !isCancelled) {
          console.log('Loading audio tracks:', trackUrls);
          await audioPlayer.loadTracks(trackUrls);
          if (!isCancelled) {
            toast.success('Audio tracks loaded successfully!');
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
  }, [results, jobId]); // Remove audioPlayer from dependencies

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
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left - 48; // Subtract left padding
    const timelineWidth = rect.width - 96; // Subtract both side paddings
    const clickPercentage = Math.max(0, Math.min(1, clickX / timelineWidth));
    const newTime = clickPercentage * audioPlayer.duration;
    
    try {
      await audioPlayer.seek(newTime);
    } catch (error) {
      console.error('Failed to seek:', error);
      toast.error('Seek failed');
    }
  };

  // const getDownloadUrl = (filename: string): string => {
  //   return api.getFileDownloadURL(jobId, filename);
  // };

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
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Header */}
      {/* <div className="h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{results.original_filename}</h1>
            <p className="text-sm text-gray-400">
              {formatTime(results.audio_duration)} • {results.beat_analysis.tempo_bpm.toFixed(1)} BPM
              {audioPlayer.isLoading && (
                <span className="ml-2 text-yellow-400">• Loading audio...</span>
              )}
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
      </div> */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Lyrics/Content Area */}
        <div className="flex-1 bg-black flex items-center justify-center p-8">
          <div className="text-center max-w-4xl">
            <div className="text-6xl font-bold text-white mb-8 leading-tight">
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
        <div className="h-14 bg-[#2A2828] border-t border-gray-700 flex items-center justify-between px-2">
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
              {audioPlayer.formatTime(audioPlayer.currentTime)}
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
              {/* <div className="absolute bottom-full right-0 mb-2 bg-gray-700 rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              </div> */}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div 
          className="cursor-pointer"
          onClick={handleTimelineClick}
        >
          <Timeline duration={audioPlayer.duration} currentTime={audioPlayer.currentTime} />
        </div>

        {/* Waveform Tracks */}
        <div className="border-t border-gray-700">
          <WaveformTrack
            trackName="vocals"
            color="#3B82F6" // Blue
            waveformData={waveforms.vocals}
            duration={audioPlayer.duration}
            currentTime={audioPlayer.currentTime}
            isMuted={audioPlayer.trackStates.vocals?.isMuted || false}
            onTrackClick={() => handleTrackMute('vocals')}
          />
          <WaveformTrack
            trackName="drums"
            color="#F97316" // Orange
            waveformData={waveforms.drums}
            duration={audioPlayer.duration}
            currentTime={audioPlayer.currentTime}
            isMuted={audioPlayer.trackStates.drums?.isMuted || false}
            onTrackClick={() => handleTrackMute('drums')}
          />
          <WaveformTrack
            trackName="bass"
            color="#EC4899" // Pink
            waveformData={waveforms.bass}
            duration={audioPlayer.duration}
            currentTime={audioPlayer.currentTime}
            isMuted={audioPlayer.trackStates.bass?.isMuted || false}
            onTrackClick={() => handleTrackMute('bass')}
          />
          <WaveformTrack
            trackName="other"
            color="#10B981" // Green
            waveformData={waveforms.other}
            duration={audioPlayer.duration}
            currentTime={audioPlayer.currentTime}
            isMuted={audioPlayer.trackStates.other?.isMuted || false}
            onTrackClick={() => handleTrackMute('other')}
          />
        </div>
      </div>
    </div>
  );
} 