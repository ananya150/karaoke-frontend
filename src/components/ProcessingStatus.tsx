'use client';

import React from 'react';
import { 
  Music, 
  Mic, 
  Volume2, 
  Disc, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Play,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JobStatusResponse } from '@/types/api';
import { formatDuration, getProcessingStepLabel } from '@/lib/api';

interface ProcessingStatusProps {
  status: JobStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  retryCount: number;
  estimatedTimeRemaining: string | null;
  onRetry: () => void;
  onClearError: () => void;
  className?: string;
}

interface ProcessingStageProps {
  title: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processingTime?: number | null;
  error?: string | null;
  details?: React.ReactNode;
}

function ProcessingStage({ 
  title, 
  icon, 
  status, 
  progress, 
  processingTime,
  error,
  details 
}: ProcessingStageProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': 
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing': 
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed': 
        return <XCircle className="h-5 w-5 text-red-600" />;
      default: 
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return 'Pending';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`${getStatusColor(status)} transition-colors`}>
            {icon}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{title}</h4>
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <span className="text-sm text-gray-600">{getStatusLabel(status)}</span>
              {processingTime && status === 'completed' && (
                <span className="text-xs text-gray-500">
                  ({formatDuration(processingTime)})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'processing' && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500">{progress}% complete</p>
        </div>
      )}

      {/* Error Message */}
      {error && status === 'failed' && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stage Details */}
      {details && (
        <div className="text-sm text-gray-600 ml-8">
          {details}
        </div>
      )}
    </div>
  );
}

export function ProcessingStatus({
  status,
  isLoading,
  error,
  isPolling,
  retryCount,
  estimatedTimeRemaining,
  onRetry,
  onClearError,
  className,
}: ProcessingStatusProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Music className="h-12 w-12 text-blue-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Loading Job Status</h2>
                <p className="text-gray-600">Please wait while we fetch your processing status...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className={className}>
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base font-medium mb-4">
                {error}
              </AlertDescription>
              <div className="flex space-x-2">
                <Button onClick={onRetry} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="outline" onClick={onClearError} size="sm">
                  Dismiss
                </Button>
              </div>
            </Alert>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Retry attempt: {retryCount}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={className}>
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-gray-500">No status information available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getOverallStatusBadge = () => {
    switch (status.status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'completed_with_errors':
        return <Badge variant="destructive">Completed with Errors</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-full">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Processing Audio</CardTitle>
                  <p className="text-sm text-gray-600">
                    Job ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{status.job_id}</code>
                  </p>
                </div>
              </div>
              <div className="text-right space-y-1">
                {getOverallStatusBadge()}
                {isPolling && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Live updates
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Overall Progress</h3>
                <span className="text-sm font-medium text-gray-700">{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{getProcessingStepLabel(status.current_step)}</span>
                {estimatedTimeRemaining && (
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {estimatedTimeRemaining}
                  </span>
                )}
              </div>
            </div>

            {/* File Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">
                  {status.audio_duration ? formatDuration(status.audio_duration) : 'Unknown'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">File Size</p>
                <p className="font-semibold">
                  {(status.file_size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Tempo</p>
                <p className="font-semibold">
                  {status.tempo_bpm ? `${status.tempo_bpm.toFixed(1)} BPM` : 'Analyzing...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Stages */}
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Processing Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
                         {/* Stem Separation */}
             <ProcessingStage
               title="Audio Separation"
               icon={<Volume2 className="h-6 w-6" />}
               status={
                 status.stem_separation?.status === 'completed' ? 'completed' :
                 status.stem_separation?.status === 'processing' ? 'processing' :
                 status.stem_separation?.error ? 'failed' : 'pending'
               }
               progress={status.stem_separation?.progress || 0}
               processingTime={status.stem_separation?.processing_time}
               error={status.stem_separation?.error}
                             details={
                 status.stem_separation?.status === 'completed' ? (
                   <div className="space-y-1">
                     <p>✓ Vocals track extracted</p>
                     <p>✓ Drums track extracted</p>
                     <p>✓ Bass track extracted</p>
                     <p>✓ Other instruments extracted</p>
                   </div>
                 ) : status.stem_separation?.status === 'processing' ? (
                   <p>Separating audio into individual instrument tracks...</p>
                 ) : null
               }
            />

            <Separator />

                         {/* Transcription */}
             <ProcessingStage
               title="Vocal Transcription"
               icon={<Mic className="h-6 w-6" />}
               status={
                 status.transcription?.status === 'completed' ? 'completed' :
                 status.transcription?.status === 'processing' ? 'processing' :
                 status.transcription?.error ? 'failed' : 'pending'
               }
               progress={status.transcription?.progress || 0}
               processingTime={status.transcription?.processing_time}
               error={status.transcription?.error}
               details={
                 status.transcription?.status === 'completed' ? (
                   <div className="space-y-1">
                     <p>✓ Language: {status.transcription?.language || 'Unknown'}</p>
                     <p>✓ Words transcribed: {status.transcription?.word_count || 0}</p>
                     <p>✓ Timestamps generated</p>
                   </div>
                 ) : status.transcription?.status === 'processing' ? (
                   <p>Converting vocals to text with timestamps...</p>
                 ) : null
               }
            />

            <Separator />

                         {/* Beat Analysis */}
             <ProcessingStage
               title="Beat Analysis"
               icon={<Disc className="h-6 w-6" />}
               status={
                 status.beat_analysis?.status === 'completed' ? 'completed' :
                 status.beat_analysis?.status === 'processing' ? 'processing' :
                 status.beat_analysis?.error ? 'failed' : 'pending'
               }
               progress={status.beat_analysis?.progress || 0}
               processingTime={status.beat_analysis?.processing_time}
               error={status.beat_analysis?.error}
               details={
                 status.beat_analysis?.status === 'completed' ? (
                   <div className="space-y-1">
                     <p>✓ Tempo: {status.beat_analysis?.tempo_bpm?.toFixed(1)} BPM</p>
                     <p>✓ Time signature: {status.beat_analysis?.time_signature}</p>
                     <p>✓ Beat confidence: {((status.beat_analysis?.beat_confidence || 0) * 100).toFixed(1)}%</p>
                     <p>✓ Rhythm regularity: {((status.beat_analysis?.rhythm_regularity || 0) * 100).toFixed(1)}%</p>
                   </div>
                 ) : status.beat_analysis?.status === 'processing' ? (
                   <p>Analyzing tempo, beats, and rhythm patterns...</p>
                 ) : null
               }
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-base">
                  {error}
                </AlertDescription>
              </Alert>
              <div className="flex justify-center space-x-2 mt-4">
                <Button onClick={onRetry} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="outline" onClick={onClearError} size="sm">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Message */}
        {status.status === 'completed' && (
          <Card className="w-full max-w-4xl mx-auto border-green-200">
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Processing Complete!</h3>
                  <p className="text-gray-600">
                    Your audio has been successfully processed into separate tracks.
                  </p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Open Audio Studio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 