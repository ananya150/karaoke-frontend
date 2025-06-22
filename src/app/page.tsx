import { FileUpload } from '@/components/FileUpload';
import { Music } from 'lucide-react';
import { HighlightText } from "@/components/ui/text/highlight";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Checkered Background Pattern */}
      <div 
        className="fixed inset-0 opacity-2 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #000 25%, transparent 25%), 
            linear-gradient(-45deg, #000 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #000 75%), 
            linear-gradient(-45deg, transparent 75%, #000 75%)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px'
        }}
      />
      {/* Header */}
      <header className="w-full py-6 px-8">
        <div className="flex justify-center">
          <nav className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className=" w-[25px] h-[25px] sm:w-[30px] sm:h-[30px] md:w-[35px] md:h-[35px] lg:w-[35px] lg:h-[35px] flex flex-col justify-center items-center rounded-[100px]">
                  <Music className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 lg:h-4.5 lg:w-4.5 text-[#FD5F57] " />
                </div>
              </div>
              <a href="#" className="text-gray-900 font-satoshi font-bold hover:text-[#FD5F57] transition-colors">Home</a>
              <a href="#" className="text-gray-900 font-satoshi font-bold hover:text-[#FD5F57] transition-colors">Contact</a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Hero Section */}
          <div className="text-center mb-20 -mt-20">
            <span className="text-3xl sm:text-4xl md:text-6xl xl:text-7xl font-black font-satoshi tracking-tight">Feel like a <HighlightText className="bg-gradient-to-r from-[#FD5F57] to-yellow-200" text="Music Composer" inView /> </span>
          </div>

          {/* Upload Section */}
          <div className="w-full max-w-2xl mx-auto">
            <FileUpload />
          </div>
      </main>
    </div>
  );
}
