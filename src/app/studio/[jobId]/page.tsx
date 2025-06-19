import { AudioStudio } from '@/components/AudioStudio';

interface StudioPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { jobId } = await params;

  return <AudioStudio jobId={jobId} />;
} 