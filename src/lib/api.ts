import {
  ApiClientConfig,
  HealthResponse,
  UploadResponse,
  JobStatusResponse,
  SimpleJobStatusResponse,
  JobResultsResponse,
  FileListResponse,
  TranscriptionData,
  BeatAnalysisData,
  ErrorResponse,
  ApiError,
  NetworkError,
  ValidationError,
} from '@/types/api';

/**
 * API Client for Karaoke Backend
 * Handles all communication with the backend API
 */
export class KaraokeAPI {
  private baseURL: string;
  private timeout: number;

  constructor(config?: ApiClientConfig) {
    this.baseURL = config?.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.timeout = config?.timeout || 30000; // 30 seconds default
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses (like file downloads)
      if (options.method === 'HEAD' || response.headers.get('content-type')?.includes('audio/') || 
          response.headers.get('content-type')?.includes('application/octet-stream')) {
        return response as unknown as T;
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.error) {
          throw new ApiError(data.message, response.status, data as ErrorResponse);
        }
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed. Please check your internet connection.');
      }

      throw new NetworkError('An unexpected error occurred', error as Error);
    }
  }

  /**
   * Health Check - Check if the API is running and healthy
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.fetchWithErrorHandling<HealthResponse>('/health');
  }

  /**
   * File Upload - Upload an audio file for processing
   */
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    // Validate file before upload
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data as UploadResponse);
          } else {
            if (data.error) {
              reject(new ApiError(data.message, xhr.status, data as ErrorResponse));
            } else {
              reject(new ApiError(`HTTP ${xhr.status}: Upload failed`, xhr.status));
            }
          }
                 } catch {
           reject(new ApiError('Invalid response format', xhr.status));
         }
      };

      xhr.onerror = () => {
        reject(new NetworkError('Upload failed due to network error'));
      };

      xhr.ontimeout = () => {
        reject(new NetworkError('Upload timeout'));
      };

      xhr.timeout = this.timeout;
      xhr.open('POST', `${this.baseURL}/api/process`);
      xhr.send(formData);
    });
  }

  /**
   * Get Job Status - Get comprehensive job status and progress
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.fetchWithErrorHandling<JobStatusResponse>(`/api/status/${jobId}`);
  }

  /**
   * Get Simple Job Status - Get simplified status for quick polling
   */
  async getSimpleJobStatus(jobId: string): Promise<SimpleJobStatusResponse> {
    return this.fetchWithErrorHandling<SimpleJobStatusResponse>(`/api/status/${jobId}/simple`);
  }

  /**
   * Get Job Results - Get complete job results and processed files
   */
  async getJobResults(jobId: string): Promise<JobResultsResponse> {
    return this.fetchWithErrorHandling<JobResultsResponse>(`/api/results/${jobId}`);
  }

  /**
   * Get File List - List all available files for a job
   */
  async getFileList(jobId: string): Promise<FileListResponse> {
    return this.fetchWithErrorHandling<FileListResponse>(`/api/files/${jobId}`);
  }

  /**
   * Download File - Get download URL for a processed file
   */
  getFileDownloadURL(jobId: string, filename: string, inline = false): string {
    const params = inline ? '?inline=true' : '';
    return `${this.baseURL}/api/files/${jobId}/${filename}${params}`;
  }

  /**
   * Check File Exists - Check if a file exists without downloading
   */
  async checkFileExists(jobId: string, filename: string): Promise<boolean> {
    try {
      const response = await this.fetchWithErrorHandling<Response>(
        `/api/files/${jobId}/${filename}`,
        { method: 'HEAD' }
      );
      return (response as Response).ok;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get Transcription Data - Download and parse transcription JSON
   */
  async getTranscriptionData(jobId: string): Promise<TranscriptionData> {
    const url = this.getFileDownloadURL(jobId, 'transcription.json', true);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new ApiError('Failed to fetch transcription data', response.status);
    }
    
    return response.json() as Promise<TranscriptionData>;
  }

  /**
   * Get Beat Analysis Data - Download and parse beat analysis JSON
   */
  async getBeatAnalysisData(jobId: string): Promise<BeatAnalysisData> {
    const url = this.getFileDownloadURL(jobId, 'analysis.json', true);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new ApiError('Failed to fetch beat analysis data', response.status);
    }
    
    return response.json() as Promise<BeatAnalysisData>;
  }

  /**
   * Poll Job Status - Poll status until completion or failure
   */
  async pollJobStatus(
    jobId: string,
    onProgress?: (status: JobStatusResponse) => void,
    pollInterval = 2000 // 2 seconds
  ): Promise<JobResultsResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed' || status.status === 'completed_with_errors') {
            // Get final results
            const results = await this.getJobResults(jobId);
            resolve(results);
          } else if (status.status === 'failed') {
            reject(new ApiError(status.error_message || 'Job processing failed', 500));
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Validate File - Validate file before upload
   */
  private validateFile(file: File): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac'];

    // Check file size
    if (file.size > maxSize) {
      throw new ValidationError('File size exceeds 100MB limit');
    }

    // Check file type by MIME type
    if (!allowedTypes.some(type => file.type === type || file.type.startsWith(type))) {
      // Fallback: check by file extension
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        throw new ValidationError('Invalid file format. Supported formats: MP3, WAV, M4A, FLAC');
      }
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new ValidationError('File is empty');
    }
  }

  /**
   * Get Audio Stems URLs - Get all audio stem download URLs
   */
  getAudioStemURLs(results: JobResultsResponse): Record<string, string> {
    return {
      vocals: this.getFileDownloadURL(results.job_id, 'vocals.wav'),
      drums: this.getFileDownloadURL(results.job_id, 'drums.wav'),
      bass: this.getFileDownloadURL(results.job_id, 'bass.wav'),
      other: this.getFileDownloadURL(results.job_id, 'other.wav'),
    };
  }

  /**
   * Retry with Exponential Backoff - Utility for retrying failed requests
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except for 429 (rate limit)
        if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        // Don't retry on validation errors
        if (error instanceof ValidationError) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Export singleton instance
export const api = new KaraokeAPI();

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getProcessingStepLabel = (step: string): string => {
  const labels: Record<string, string> = {
    initializing: 'Initializing...',
    stem_separation: 'Separating Audio Tracks',
    transcription: 'Transcribing Vocals',
    beat_analysis: 'Analyzing Beat & Tempo',
    completed: 'Processing Complete',
  };
  
  return labels[step] || step;
}; 