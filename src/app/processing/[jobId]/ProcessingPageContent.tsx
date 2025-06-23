'use client';

import React from 'react';
import { 
  Play, 
  ChevronDown,
  MicVocal,
  KeyboardMusic,
  Guitar,
  Drum,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { useJobStatus } from '@/hooks/useJobStatus';

interface ProcessingPageContentProps {
  jobId: string;
}

const Timeline = () => {
  return (
    <div className="h-[35px] bg-[#393839] flex items-end relative px-2">
      {/* Static timeline for loading state */}
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};

export function ProcessingPageContent({ jobId }: ProcessingPageContentProps) {
  const router = useRouter();
  
  // Use job status polling hook
  const { status } = useJobStatus({
    jobId,
    pollInterval: 2000, // Poll every 2 seconds
    autoRedirect: true  // Automatically redirect to studio when complete
  });
  
  // Static volume states for UI
  const vocalsVolume = [70];
  const instrumentsVolume = [70];

  return (
    <div className="h-screen text-white flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Area */}
        <div className="h-[calc(100vh-280px)] bg-black relative flex items-center justify-center">
          {/* Checkered Background Pattern */}
          <div 
            className="absolute inset-0 opacity-35 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #333 25%, transparent 25%), 
                linear-gradient(-45deg, #333 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #333 75%), 
                linear-gradient(-45deg, transparent 75%, #333 75%)
              `,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
            }}
          />
          <button onClick={() => router.push('/')} className='absolute top-6 left-4 z-20'>
            <ChevronLeft className='h-6 w-6 text-white' />
          </button>
          
          {/* Processing Text instead of Vinyl */}
          <div className="text-center relative z-10">
            <h2 className="text-4xl font-satoshi font-bold text-white mb-4">
              {status?.status === 'queued' ? 'Queued for Processing' : 'Processing File'}
            </h2>
          </div>
          </div>

        {/* Controls Bar */}
        <div className='bottom-0 fixed w-full'>
          <div className="h-14 bg-[#2A2828] flex items-center justify-between px-2">
            <div className="flex items-center space-x-4">
              <Button
                size="sm"
                className="w-6.5 h-6.5 rounded-full bg-white text-black hover:bg-gray-200"
                disabled={true}
              >
                <Play fill='#000' className="h-2 w-2" />
              </Button>
              
              <div className="text-white text-sm font-satoshi font-bold">
                Loading components...
              </div>
            </div>

            <div className="flex items-center space-x-10">
              {/* Vocals Volume Control */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#626060] font-satoshi font-bold mb-[2px]">vocals</span>
                <Slider
                  value={vocalsVolume}
                  max={100}
                  step={1}
                  className="w-20"
                  disabled={true}
                />
              </div>
              
              {/* Instruments Volume Control */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#626060] font-satoshi font-bold mb-[2px]">instruments</span>
                <Slider
                  value={instrumentsVolume}
                  max={100}
                  step={1}
                  className="w-20"
                  disabled={true}
                />
              </div>
              
              {/* Download button */}
              <div className="relative group">
                <Button className='bg-[#393939] hover:bg-[#393939]/80 w-8 h-8' disabled={true}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className='h-[240px] bg-black w-full flex'>
            {/* Sidebar */}
            <div className='w-[55px] bg-[#1A1B1D] pt-[55px] pb-8 flex flex-col items-center justify-between'>
              <button disabled>
                <MicVocal className='h-5 w-5 text-[#3E84E8]' />
              </button>
              <button disabled>
                <KeyboardMusic className='h-5 w-5 text-[#C19549]' />
              </button>
              <button disabled>
                <Guitar className='h-5 w-5 text-[#FC66F0]' />
              </button>
              <button disabled>
                <Drum className='h-5 w-5 text-[#9DF8D6]' />
              </button>
            </div>
            
            <div className='w-[calc(100%-55px)] flex flex-col'>
              {/* Timeline */}
              <div className='h-[35px] bg-[#393839] w-full'>
                <Timeline />
              </div>
              
              {/* Loading Spinner instead of Waveforms */}
              <div className='h-[210px] bg-black flex items-center justify-center'>
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-300 " />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 