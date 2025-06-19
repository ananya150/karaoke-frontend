'use client';

import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Volume1,
  Headphones,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TrackControlsProps {
  trackName: string;
  displayName: string;
  volume: number;
  isMuted: boolean;
  isLoaded: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;

}

interface AudioControlsProps {
  // Master controls
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
  
  // Track states
  trackStates: Record<string, { volume: number; isMuted: boolean; isLoaded: boolean }>;
  
  // Track control handlers
  onTrackVolumeChange: (trackName: string, volume: number) => void;
  onTrackMuteToggle: (trackName: string) => void;
  
  // Display options
  showMasterControls?: boolean;
  showIndividualControls?: boolean;
  compact?: boolean;
}

const TrackControls: React.FC<TrackControlsProps> = ({
  trackName,
  displayName,
  volume,
  isMuted,
  isLoaded,
  onVolumeChange,
  onMuteToggle
}) => {
  const getVolumeIcon = (vol: number, muted: boolean) => {
    if (muted || vol === 0) return VolumeX;
    if (vol < 50) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon(volume, isMuted);

  const getTrackEmoji = (track: string) => {
    switch (track) {
      case 'vocals': return '🎤';
      case 'drums': return '🥁';
      case 'bass': return '🎸';
      case 'other': return '🎹';
      default: return '🎵';
    }
  };

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Track Icon */}
      <div className="flex items-center justify-center w-8 h-8">
        <span className="text-lg">{getTrackEmoji(trackName)}</span>
      </div>
      
      {/* Track Name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </span>
          {!isLoaded && (
            <Badge variant="secondary" className="text-xs">
              Loading...
            </Badge>
          )}
        </div>
      </div>
      
      {/* Volume Control */}
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMuteToggle}
          className={`p-1 h-8 w-8 ${isMuted ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}
          disabled={!isLoaded}
        >
          <VolumeIcon className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 max-w-24">
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={(value) => onVolumeChange(value[0])}
            max={100}
            step={1}
            disabled={!isLoaded}
            className="w-full"
          />
        </div>
        
        <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
          {isMuted ? '0' : Math.round(volume)}
        </span>
      </div>
    </div>
  );
};

export function AudioControls({
  masterVolume = 100,
  onMasterVolumeChange,
  trackStates,
  onTrackVolumeChange,
  onTrackMuteToggle,
  showMasterControls = true,
  showIndividualControls = true,
  compact = false
}: AudioControlsProps) {
  const trackDisplayNames: Record<string, string> = {
    vocals: 'Vocals',
    drums: 'Drums',
    bass: 'Bass',
    other: 'Other Instruments'
  };



  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            {showMasterControls && onMasterVolumeChange && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Master Volume</h4>
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-gray-600" />
                  <Slider
                    value={[masterVolume]}
                    onValueChange={(value) => onMasterVolumeChange(value[0])}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {Math.round(masterVolume)}
                  </span>
                </div>
              </div>
            )}
            
            {showIndividualControls && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Track Controls</h4>
                <div className="space-y-2">
                  {Object.entries(trackStates).map(([trackName, state]) => (
                    <TrackControls
                      key={trackName}
                      trackName={trackName}
                      displayName={trackDisplayNames[trackName] || trackName}
                      volume={state.volume}
                      isMuted={state.isMuted}
                      isLoaded={state.isLoaded}
                      onVolumeChange={(volume) => onTrackVolumeChange(trackName, volume)}
                      onMuteToggle={() => onTrackMuteToggle(trackName)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Headphones className="h-5 w-5" />
          <span>Audio Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Volume */}
        {showMasterControls && onMasterVolumeChange && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                Master Volume
              </h4>
              <Badge variant="secondary" className="text-xs">
                {Math.round(masterVolume)}%
              </Badge>
            </div>
            <div className="flex items-center space-x-3">
              <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Slider
                value={[masterVolume]}
                onValueChange={(value) => onMasterVolumeChange(value[0])}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        )}
        
        {/* Individual Track Controls */}
        {showIndividualControls && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
              Track Controls
            </h4>
            <div className="space-y-2">
              {Object.entries(trackStates).map(([trackName, state]) => (
                <TrackControls
                  key={trackName}
                  trackName={trackName}
                  displayName={trackDisplayNames[trackName] || trackName}
                  volume={state.volume}
                  isMuted={state.isMuted}
                  isLoaded={state.isLoaded}
                  onVolumeChange={(volume) => onTrackVolumeChange(trackName, volume)}
                  onMuteToggle={() => onTrackMuteToggle(trackName)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                Object.keys(trackStates).forEach(trackName => {
                  onTrackMuteToggle(trackName);
                });
              }}
            >
              Toggle All
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Object.values(trackStates).filter(state => state.isLoaded).length} / {Object.keys(trackStates).length} tracks loaded
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 