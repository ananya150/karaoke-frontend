'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  JobStatusResponse, 
  JobResultsResponse,
  ApiError,
  NetworkError 
} from '@/types/api';
import { toast } from 'sonner';

interface UseJobStatusOptions {
  jobId: string;
  pollInterval?: number;
  maxRetries?: number;
  onComplete?: (results: JobResultsResponse) => void;
  onError?: (error: Error) => void;
  autoRedirect?: boolean;
}

interface UseJobStatusReturn {
  status: JobStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  retryCount: number;
  estimatedTimeRemaining: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  retry: () => void;
  clearError: () => void;
}

export function useJobStatus({
  jobId,
  pollInterval = 2000,
  maxRetries = 10,
  onComplete,
  onError,
  autoRedirect = true,
}: UseJobStatusOptions): UseJobStatusReturn {
  const router = useRouter();
  
  // State management
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);

  // Refs for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Calculate estimated time remaining
  const calculateEstimatedTime = useCallback((status: JobStatusResponse): string | null => {
    if (!status.processing_time || status.progress === 0) return null;
    
    const elapsedTime = status.processing_time;
    const progressRatio = status.progress / 100;
    const estimatedTotalTime = elapsedTime / progressRatio;
    const remainingTime = estimatedTotalTime - elapsedTime;
    
    if (remainingTime <= 0) return null;
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  }, []);

  // Fetch job status
  const fetchStatus = useCallback(async (): Promise<JobStatusResponse | null> => {
    try {
      const response = await api.getJobStatus(jobId);
      
      if (!isMountedRef.current) return null;
      
      // Debug log to see the actual response structure
      console.log('Job Status Response:', response);
      
      setStatus(response);
      setError(null);
      setRetryCount(0);
      
      // Calculate estimated time
      const estimatedTime = calculateEstimatedTime(response);
      setEstimatedTimeRemaining(estimatedTime);
      
      return response;
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      let errorMessage = 'Failed to fetch job status';
      
      if (err instanceof ApiError) {
        errorMessage = err.message;
        if (err.statusCode === 404) {
          errorMessage = 'Job not found. It may have been deleted or expired.';
        }
      } else if (err instanceof NetworkError) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      throw err;
    }
  }, [jobId, calculateEstimatedTime]);

  // Handle job completion
  const handleCompletion = useCallback(async () => {
    try {
      // Fetch final results
      const results = await api.getJobResults(jobId);
      
      if (!isMountedRef.current) return;
      
      toast.success('Processing completed!', {
        description: 'Your audio has been successfully processed into separate tracks.',
      });
      
      // Call completion callback
      if (onComplete) {
        onComplete(results);
      }
      
      // Auto-redirect to studio page
      if (autoRedirect) {
        router.push(`/studio/${jobId}`);
      }
      
    } catch (err) {
      console.error('Failed to fetch results:', err);
      toast.error('Failed to fetch results', {
        description: 'Processing completed but results could not be retrieved.',
      });
    }
  }, [jobId, onComplete, autoRedirect, router]);

  // Handle job failure
  const handleFailure = useCallback((status: JobStatusResponse) => {
    const errorMessage = status.error_message || 'Processing failed for unknown reason';
    
    toast.error('Processing failed', {
      description: errorMessage,
    });
    
    if (onError) {
      onError(new Error(errorMessage));
    }
  }, [onError]);

  // Single poll iteration
  const pollOnce = useCallback(async () => {
    if (!isPolling || !isMountedRef.current) return;
    
    try {
      const response = await fetchStatus();
      
      if (!response || !isMountedRef.current) return;
      
             // Check if job is complete
       if (response.status === 'completed' || response.status === 'completed_with_errors') {
         setIsPolling(false);
         await handleCompletion();
         return;
       }
      
      // Check if job failed
      if (response.status === 'failed') {
        setIsPolling(false);
        handleFailure(response);
        return;
      }
      
      // Continue polling for processing/queued status
      if (response.status === 'processing' || response.status === 'queued') {
        // Schedule next poll
        if (isMountedRef.current && isPolling) {
          pollIntervalRef.current = setTimeout(pollOnce, pollInterval);
        }
      }
      
    } catch (err) {
      // Handle polling errors with retry logic
      if (retryCount < maxRetries) {
        console.warn(`Polling failed (attempt ${retryCount + 1}/${maxRetries}):`, err);
        
        // Retry with exponential backoff
        const retryDelay = Math.min(pollInterval * Math.pow(2, retryCount), 30000);
        
        if (isMountedRef.current && isPolling) {
          pollIntervalRef.current = setTimeout(pollOnce, retryDelay);
        }
      } else {
        // Max retries reached
        setIsPolling(false);
        
        const errorMessage = err instanceof Error ? err.message : 'Polling failed after maximum retries';
        setError(errorMessage);
        
        toast.error('Connection lost', {
          description: 'Unable to track processing progress. You can check back later.',
        });
      }
    }
  }, [
    isPolling, 
    fetchStatus, 
    handleCompletion, 
    handleFailure, 
    retryCount, 
    maxRetries, 
    pollInterval
  ]);

  // Start polling
  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    setError(null);
    setRetryCount(0);
    
    // Start first poll immediately
    pollOnce();
  }, [isPolling, pollOnce]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Retry after error
  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    startPolling();
  }, [startPolling]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial data fetch and polling start
  useEffect(() => {
    let mounted = true;
    isMountedRef.current = true;
    
    const initialize = async () => {
      if (!mounted) return;
      
      setIsLoading(true);
      
      try {
        const response = await fetchStatus();
        
        if (!mounted || !response) return;
        
                 // Start polling if job is not complete
         if (response.status === 'processing' || response.status === 'queued') {
           startPolling();
         } else if (response.status === 'completed' || response.status === 'completed_with_errors') {
           await handleCompletion();
         } else if (response.status === 'failed') {
           handleFailure(response);
         }
        
      } catch (err) {
        console.error('Failed to initialize job status:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
      isMountedRef.current = false;
      
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
      }
    };
  }, [jobId, fetchStatus, startPolling, handleCompletion, handleFailure]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    isLoading,
    error,
    isPolling,
    retryCount,
    estimatedTimeRemaining,
    startPolling,
    stopPolling,
    retry,
    clearError,
  };
} 