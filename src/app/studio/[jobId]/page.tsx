import { Music } from 'lucide-react';

interface StudioPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { jobId } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-green-600 p-3 rounded-full">
              <Music className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Audio Studio
          </h1>
          <p className="text-gray-600 mb-8">
            Job ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{jobId}</code>
          </p>
                     <p className="text-gray-500">
             This page will be implemented in Step 4 of our development process.
             <br />
             Here you&apos;ll find the audio studio interface for playing back and mixing the separated tracks.
           </p>
        </div>
      </div>
    </div>
  );
} 