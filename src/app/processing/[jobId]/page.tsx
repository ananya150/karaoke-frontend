'use client';

import { ProcessingStatus } from '@/components/ProcessingStatus';
import { useJobStatus } from '@/hooks/useJobStatus';

interface ProcessingPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

function ProcessingPageContent({ jobId }: { jobId: string }) {
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

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { jobId } = await params;

  return <ProcessingPageContent jobId={jobId} />;
} 