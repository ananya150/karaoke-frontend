import { FileUpload } from '@/components/FileUpload';
import { Music } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="pt-16 pb-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Music className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Karaoke Studio
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your audio files into separate instrument tracks. 
            Upload any song and get vocals, drums, bass, and other instruments as individual tracks.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <FileUpload className="mb-12" />

        {/* Features Section */}
        <section className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Music className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Powered Separation</h3>
              <p className="text-gray-600 text-sm">
                Advanced machine learning separates your audio into clean, isolated tracks
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Multiple Formats</h3>
              <p className="text-gray-600 text-sm">
                Support for MP3, WAV, M4A, and FLAC files up to 100MB
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Studio Controls</h3>
              <p className="text-gray-600 text-sm">
                Professional audio controls with individual track mixing capabilities
              </p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Upload Your Audio</h4>
                <p className="text-gray-600 text-sm">Choose any audio file from your device</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">AI Processing</h4>
                <p className="text-gray-600 text-sm">Our AI separates vocals, drums, bass, and other instruments</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Studio Playback</h4>
                <p className="text-gray-600 text-sm">Mix and control each track individually in our audio studio</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            Transform your music with AI-powered audio separation
          </p>
        </div>
      </footer>
    </div>
  );
}
