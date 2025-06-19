'use client';

import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Headphones
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

export interface TrackControlProps {
  trackName: string;
  displayName: string;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  isPlaying: boolean;

  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onPlayPause: () => void;
  disabled?: boolean;
}

export function TrackControl({
  trackName,
  displayName,
  volume,
  isMuted,
  isSolo,
  isPlaying,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onPlayPause,
  disabled = false,
}: TrackControlProps) {
  const getTrackIcon = (track: string) => {
    switch (track) {
      case 'vocals':
        return '🎤';
      case 'drums':
        return '🥁';
      case 'bass':
        return '🎸';
      case 'other':
        return '🎹';
      default:
        return '🎵';
    }
  };

  return (
    <Card className={`w-full transition-all duration-200 ${
      isSolo ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    } ${isMuted ? 'opacity-60' : ''} ${disabled ? 'opacity-40' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Track Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getTrackIcon(trackName)}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{displayName}</h3>
                <p className="text-sm text-gray-500 capitalize">{trackName}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              {isSolo && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  SOLO
                </Badge>
              )}
              {isMuted && (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  MUTED
                </Badge>
              )}
            </div>
          </div>

          {/* Play/Pause Button */}
          <div className="flex justify-center">
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              onClick={onPlayPause}
              disabled={disabled}
              className="w-full"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Volume</span>
              <span className="text-sm text-gray-500">{Math.round(volume)}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <VolumeX className="h-4 w-4 text-gray-400" />
              <Slider
                value={[volume]}
                onValueChange={(value) => onVolumeChange(value[0])}
                max={100}
                step={1}
                disabled={disabled}
                className="flex-1"
              />
              <Volume2 className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="sm"
              onClick={onMuteToggle}
              disabled={disabled}
              className="flex-1"
            >
              {isMuted ? (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Mute
                </>
              )}
            </Button>
            <Button
              variant={isSolo ? "secondary" : "outline"}
              size="sm"
              onClick={onSoloToggle}
              disabled={disabled}
              className="flex-1"
            >
              <Headphones className="h-4 w-4 mr-2" />
              {isSolo ? 'Unsolo' : 'Solo'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 