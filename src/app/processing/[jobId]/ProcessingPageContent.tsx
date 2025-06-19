'use client';

import { ProcessingStatus } from '@/components/ProcessingStatus';
import { useJobStatus } from '@/hooks/useJobStatus';

interface ProcessingPageContentProps {
  jobId: string;
}

export function ProcessingPageContent({ jobId }: ProcessingPageContentProps) {
  const {
    status,
    isLoading,
    error,
    isPolling,
    retryCount,
    estimatedTimeRemaining,
    retry,
    clearError,
  } = useJobStatus({ jobId });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <ProcessingStatus
          status={status}
          isLoading={isLoading}
          error={error}
          isPolling={isPolling}
          retryCount={retryCount}
          estimatedTimeRemaining={estimatedTimeRemaining}
          onRetry={retry}
          onClearError={clearError}
        />
      </div>
    </div>
  );
} 