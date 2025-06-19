'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Music, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { api, formatFileSize } from '@/lib/api';
import { ApiError, NetworkError, ValidationError } from '@/types/api';
import { toast } from 'sonner';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Supported file types for display
  const supportedFormats = ['MP3', 'WAV', 'M4A', 'FLAC'];
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

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  }, [validateFile]);

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
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.flac,audio/*"
              onChange={handleInputChange}
              className="hidden"
              disabled={isUploading}
            />

            {/* Upload Icon and Text */}
            <div className="space-y-4">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Music className="h-12 w-12 text-blue-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">Uploading...</p>
                    <p className="text-sm text-gray-500">Please wait while we upload your file</p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">File Selected</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                                     <div className="flex justify-center space-x-2">
                     <Button 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleUpload();
                       }} 
                       disabled={isUploading}
                     >
                       Process
                     </Button>
                     <Button 
                       variant="outline" 
                       onClick={(e) => {
                         e.stopPropagation();
                         clearSelection();
                       }} 
                       disabled={isUploading}
                     >
                       <X className="h-4 w-4 mr-1" />
                       Clear
                     </Button>
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop your audio file here
                    </p>
                    <p className="text-sm text-gray-500">
                      or <span className="text-blue-600 font-medium">browse</span> to select
                    </p>
                  </div>
                  <Button variant="outline" onClick={openFileDialog}>
                    Choose File
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Requirements */}
          <div className="mt-6 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Supported Formats:</p>
              <div className="flex flex-wrap gap-2">
                {supportedFormats.map((format) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Maximum file size: 100MB</p>
              <p>• Processing time: 2-5 minutes depending on file length</p>
              <p>• Your file will be processed into separate audio tracks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 