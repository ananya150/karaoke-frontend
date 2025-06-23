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
// import { toast } from 'sonner'; // Commented out since toast calls are disabled

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
      
      // toast.success('Processing completed!', {
      //   description: 'Your audio has been successfully processed into separate tracks.',
      // });
      
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
      // toast.error('Failed to fetch results', {
      //   description: 'Processing completed but results could not be retrieved.',
      // });
    }
  }, [jobId, onComplete, autoRedirect, router]);

  // Handle job failure
  const handleFailure = useCallback((status: JobStatusResponse) => {
    const errorMessage = status.error_message || 'Processing failed for unknown reason';
    
    // toast.error('Processing failed', {
    //   description: errorMessage,
    // });
    
    if (onError) {
      onError(new Error(errorMessage));
    }
  }, [onError]);

    // Use refs to avoid stale closures in polling
  const isPollingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Update refs when state changes
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  // Single poll iteration
  const pollOnce = useCallback(async () => {
    console.log('🔄 POLL: Starting poll iteration, isPolling:', isPollingRef.current, 'isMounted:', isMountedRef.current);
    
    if (!isPollingRef.current || !isMountedRef.current) {
      console.log('❌ POLL: Skipping poll - not polling or not mounted');
      return;
    }
    
    try {
      console.log('📡 POLL: Fetching job status...');
      const response = await fetchStatus();
      
      if (!response || !isMountedRef.current || !isPollingRef.current) {
        console.log('❌ POLL: No response, not mounted, or polling stopped');
        return;
      }
      
      console.log('📊 POLL: Got response:', {
        status: response.status,
        progress: response.progress,
        current_step: response.current_step
      });
      
      // Check if job is complete (case-insensitive)
      const statusLower = response.status.toLowerCase();
      if (statusLower === 'completed' || statusLower === 'completed_with_errors') {
        console.log('✅ POLL: Job complete, stopping polling and redirecting');
        setIsPolling(false);
        isPollingRef.current = false; // Set ref immediately
        await handleCompletion();
        return;
      }
      
      // Check if job failed
      if (statusLower === 'failed') {
        console.log('❌ POLL: Job failed, stopping polling');
        setIsPolling(false);
        isPollingRef.current = false; // Set ref immediately
        handleFailure(response);
        return;
      }
      
      // Continue polling for any status that isn't completed or failed
      // This ensures we keep polling even for new processing steps like beat analysis
      console.log(`🔄 POLL: Job status ${response.status}, continuing to poll in ${pollInterval}ms`);
      // Schedule next poll
      if (isMountedRef.current && isPollingRef.current) {
        pollIntervalRef.current = setTimeout(pollOnce, pollInterval);
      }
      
    } catch (err) {
      // Handle polling errors with retry logic
      const currentRetryCount = retryCountRef.current;
      if (currentRetryCount < maxRetries) {
        console.warn(`Polling failed (attempt ${currentRetryCount + 1}/${maxRetries}):`, err);
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Retry with exponential backoff
        const retryDelay = Math.min(pollInterval * Math.pow(2, currentRetryCount), 30000);
        
        if (isMountedRef.current && isPollingRef.current) {
          pollIntervalRef.current = setTimeout(pollOnce, retryDelay);
        }
      } else {
        // Max retries reached
        setIsPolling(false);
        isPollingRef.current = false; // Set ref immediately
        
        const errorMessage = err instanceof Error ? err.message : 'Polling failed after maximum retries';
        setError(errorMessage);
        
        // toast.error('Connection lost', {
        //   description: 'Unable to track processing progress. You can check back later.',
        // });
      }
    }
  }, [
    fetchStatus, 
    handleCompletion, 
    handleFailure, 
    maxRetries, 
    pollInterval
  ]);

  // Start polling
  const startPolling = useCallback(() => {
    console.log('🚀 POLL: Starting polling, current isPolling:', isPollingRef.current);
    
    if (isPollingRef.current) {
      console.log('⚠️ POLL: Already polling, skipping start');
      return;
    }
    
    console.log('✅ POLL: Setting up polling');
    setIsPolling(true);
    isPollingRef.current = true; // Set ref immediately for synchronous access
    setError(null);
    setRetryCount(0);
    retryCountRef.current = 0; // Set ref immediately for synchronous access
    
    // Start first poll immediately
    console.log('🔄 POLL: Triggering first poll');
    pollOnce();
  }, [pollOnce]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    isPollingRef.current = false; // Set ref immediately for synchronous access
    
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
        
                         // Start polling if job is not complete (case-insensitive)
        console.log('🔍 INIT: Initial status check, deciding next action for status:', response.status);
        
        const statusLower = response.status.toLowerCase();
        if (statusLower === 'processing' || statusLower === 'queued') {
          console.log('🔄 INIT: Job is processing/queued, starting polling');
          startPolling();
        } else if (statusLower === 'completed' || statusLower === 'completed_with_errors') {
          console.log('✅ INIT: Job already complete, redirecting immediately');
          await handleCompletion();
        } else if (statusLower === 'failed') {
          console.log('❌ INIT: Job failed, handling failure');
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