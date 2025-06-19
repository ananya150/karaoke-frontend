// API Response Types for Karaoke Backend

// Health Check Types
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    redis: 'connected' | 'disconnected';
    celery: 'active' | 'inactive';
  };
}

// Job Status Types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';
export type ProcessingStep = 'initializing' | 'stem_separation' | 'transcription' | 'beat_analysis' | 'completed';

export interface ProcessingStageStatus {
  status: JobStatus;
  progress: number;
  processing_time?: number | null;
  error?: string | null;
}

export interface StemSeparationStatus extends ProcessingStageStatus {
  vocals_path?: string;
  drums_path?: string;
  bass_path?: string;
  other_path?: string;
}

export interface TranscriptionStatus extends ProcessingStageStatus {
  transcription_path?: string;
  language?: string;
  word_count?: number;
}

export interface BeatAnalysisStatus extends ProcessingStageStatus {
  tempo_bpm?: number;
  beat_count?: number;
  time_signature?: string;
  beat_confidence?: number;
  rhythm_regularity?: number;
}

// File Upload Response
export interface UploadResponse {
  job_id: string;
  status: JobStatus;
  message: string;
  estimated_time: string;
  file_info: {
    filename: string;
    size: number;
    format: string;
  };
}

// Job Status Response (Full)
export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  current_step: ProcessingStep;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
  processing_time?: number;
  error_message?: string | null;
  
  stem_separation: StemSeparationStatus;
  transcription: TranscriptionStatus;
  beat_analysis: BeatAnalysisStatus;
  
  audio_duration?: number;
  tempo_bpm?: number;
  beat_count?: number;
  file_size: number;
}

// Job Status Response (Simple)
export interface SimpleJobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  current_step: ProcessingStep;
  error_message?: string | null;
}

// Results Response
export interface StemSeparationResult {
  vocals_path: string;
  drums_path: string;
  bass_path: string;
  other_path: string;
  processing_time: number;
  separation_model: string;
}

export interface TranscriptionResult {
  transcription_path: string;
  language: string;
  word_count: number;
  processing_time: number;
  confidence: number;
}

export interface BeatAnalysisResult {
  tempo_bpm: number;
  beat_count: number;
  time_signature: string;
  beat_confidence: number;
  rhythm_regularity: number;
  analysis_json: string;
  beats_json: string;
  onsets_json: string;
  processing_time: number;
}

export interface JobResultsResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  created_at: string;
  completed_at: string;
  total_processing_time: number;
  
  original_filename: string;
  audio_duration: number;
  file_size: number;
  
  stem_separation: StemSeparationResult;
  transcription: TranscriptionResult;
  beat_analysis: BeatAnalysisResult;
  
  output_files: string[];
  download_links: {
    vocals_stem: string;
    drums_stem: string;
    bass_stem: string;
    other_stem: string;
    transcription: string;
    beat_analysis: string;
    beat_beats: string;
  };
}

// File List Response
export interface FileInfo {
  filename: string;
  category: 'stem_separation' | 'transcription' | 'beat_analysis';
  size: number;
  mime_type: string;
  download_url: string;
  preview_url: string;
}

export interface FileListResponse {
  job_id: string;
  file_count: number;
  files: FileInfo[];
}

// Error Response
export interface ErrorResponse {
  error: true;
  message: string;
  status_code: number;
}

// Transcription Data Structure
export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  words: TranscriptionWord[];
}

export interface TranscriptionData {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
}

// Beat Analysis Data Structure
export interface BeatAnalysisData {
  tempo_bpm: number;
  time_signature: string;
  beat_times: number[];
  confidence: number;
  rhythm_regularity: number;
}

// API Client Types
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
}

// Custom Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
} 