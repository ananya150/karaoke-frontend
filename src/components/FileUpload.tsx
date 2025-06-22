'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Music, AlertCircle, FileSearch, X, Loader } from 'lucide-react';
import { MagneticButton } from '@/components/ui/buttons/magnetic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, formatFileSize } from '@/lib/api';
import { ApiError, NetworkError, ValidationError } from '@/types/api';
import { toast } from 'sonner';
import { parseBlob } from 'music-metadata';


interface FileUploadProps {
  onUploadSuccess?: (jobId: string) => void;
  className?: string;
}

export function FileUpload({ onUploadSuccess, className }: FileUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ , setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const maxFileSize = 100 * 1024 * 1024; // 100MB

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.flac'];

    // Check file size
    if (file.size > maxFileSize) {
      return 'File size exceeds 100MB limit';
    }

    // Check file type
    if (!allowedTypes.some(type => file.type === type || file.type.startsWith(type))) {
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        return 'Invalid file format. Supported formats: MP3, WAV, M4A, FLAC';
      }
    }

    // Check if file is empty
    if (file.size === 0) {
      return 'File is empty';
    }

    return null;
  }, [maxFileSize]);

  // Extract cover art from audio file
  const extractCoverArt = useCallback(async (file: File) => {
    try {
      const metadata = await parseBlob(file);
      const picture = metadata.common.picture?.[0];
      
      if (picture) {
        const blob = new Blob([picture.data], { type: picture.format });
        const imageUrl = URL.createObjectURL(blob);
        setCoverImageUrl(imageUrl);
      } else {
        setCoverImageUrl(null);
      }
    } catch (error) {
      console.error('Error extracting cover art:', error);
      setCoverImageUrl(null);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setCoverImageUrl(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
    extractCoverArt(file);
  }, [validateFile, extractCoverArt]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await api.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      toast.success('File uploaded successfully!', {
        description: `Processing started. Job ID: ${result.job_id}`,
      });

      // Navigate to processing page or call success callback
      if (onUploadSuccess) {
        onUploadSuccess(result.job_id);
      } else {
        router.push(`/processing/${result.job_id}`);
      }

    } catch (err) {
      let errorMessage = 'Upload failed';

      if (err instanceof ValidationError) {
        errorMessage = err.message;
      } else if (err instanceof NetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err instanceof ApiError) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error('Upload failed', {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, onUploadSuccess, router]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    setCoverImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Open file dialog
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={className}>
      <div className="w-[250px] h-[325px] mx-auto">
        {/* Outer Container */}
        <div className="bg-white/90 h-[325px] backdrop-blur-sm border border-gray-200 shadow-lg rounded-[50px]">
          {/* Upload Area - Inner dashed container */}
          <div
            className={`
              relative border-2 border-dashed rounded-[25px] w-[200px] h-[200px] mt-[25px] ml-[25px] p-8 text-center transition-all duration-300 mb-8
              ${isDragOver ? 'border-gray-300 bg-gray-600' : 'border-gray/50 hover:border-gray-300'}
              ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
              bg-transparent
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={selectedFile ? undefined : openFileDialog}
          >
            {/* Clear button - Top right corner */}
            {selectedFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="absolute top-3 right-3 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors z-10"
                disabled={isUploading}
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            )}
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.flac,audio/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />

            {/* Upload Content */}
            <div className="space-y-4 w-full h-full">
              {isUploading ? (
                <div className="w-full h-full flex justify-center items-center ">
                  <Loader className='animate-spin w-4 h-4' />
                </div>
              ) : selectedFile ? (
                <div className="space-y-4 mt-4">
                  <div className="flex justify-center">
                    {coverImageUrl ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={coverImageUrl} 
                          alt="Album cover" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Music className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                                      <div>
                      <p className="text-gray-700 font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-gray-500 text-xs">{formatFileSize(selectedFile.size)}</p>
                    </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full">
                      <FileSearch className="h-12 w-12 text-black" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px]  font-satoshi font-medium ">
                      drop a music file
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Browse/Proceed Button - Outside the dashed area */}
          <div className="flex justify-center">
            {selectedFile ? (
              <MagneticButton 
                className='w-[200px] rounded-full bg-[#FD5F57] hover:bg-[#FD5F57]/80'
                onClick={isUploading ? undefined : handleUpload}
              >
                {isUploading ? 'Processing...' : 'Proceed'}
              </MagneticButton>
            ) : (
              <MagneticButton 
                className='w-[200px] rounded-full'
                onClick={openFileDialog}
                disabled={isUploading}
              >
                Browse
              </MagneticButton>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mt-6 border-red-200 bg-red-50" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Supported formats */}
        {/* <div className="mt-4 text-center">
          <div className="flex justify-center space-x-3 text-xs text-gray-400">
            <span>MP3</span>
            <span>WAV</span>
            <span>M4A</span>
            <span>FLAC</span>
          </div>
        </div> */}
      </div>
    </div>
  );
} 