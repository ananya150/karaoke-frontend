import { ProcessingPageContent } from './ProcessingPageContent';

interface ProcessingPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { jobId } = await params;

  return <ProcessingPageContent jobId={jobId} />;
} 