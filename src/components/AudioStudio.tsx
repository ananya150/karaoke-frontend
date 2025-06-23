'use client';

import React, { useState, useEffect } from 'react';
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
  Drum
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { api } from '@/lib/api';
import { JobResultsResponse } from '@/types/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import RoundedTimeline from './RoundedTimeline';

interface AudioStudioProps {
  jobId: string;
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

export function AudioStudio({ jobId }: AudioStudioProps) {
  const [results, setResults] = useState<JobResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  const [waveformVocalsFile, setWaveformVocalsFile] = useState<File | null>(null);
  const [waveformDrumsFile, setWaveformDrumsFile] = useState<File | null>(null);
  const [waveformBassFile, setWaveformBassFile] = useState<File | null>(null);
  const [waveformOtherFile, setWaveformOtherFile] = useState<File | null>(null);
  
  // Volume states for vocals and instruments (non-vocal tracks combined)
  const [vocalsVolume, setVocalsVolume] = useState([70]);
  const [instrumentsVolume, setInstrumentsVolume] = useState([70]);
  // Audio player hook
  const audioPlayer = useAudioPlayer();

  // Debug logging with render counter (disabled for performance)
  // const renderCountRef = useRef(0);
  // renderCountRef.current += 1;
  // console.log(`AudioStudio render #${renderCountRef.current}:`, { 
  //   isLoading, 
  //   minLoadingComplete, 
  //   hasResults: !!results, 
  //   error,
  //   audioPlayerLoading: audioPlayer.isLoading 
  // });

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
  }, [results, jobId, audioPlayer.loadTracks]); // Fixed: Include audioPlayer.loadTracks as dependency

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
        <div className="flex-1 bg-black relative">
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #555 25%, transparent 25%), 
                linear-gradient(-45deg, #555 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #555 75%), 
                linear-gradient(-45deg, transparent 75%, #555 75%)
              `,
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 0 15px, 15px -15px, -15px 0px'
            }}
          />
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
                waveformColor={audioPlayer.trackStates.bass?.isMuted ? "rgba(239, 158, 251, 0.5)" : "#EF9EFB"}
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