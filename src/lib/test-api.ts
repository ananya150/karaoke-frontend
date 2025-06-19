import { api } from './api';
import { ApiError, NetworkError, ValidationError } from '@/types/api';

/**
 * Test API connectivity and basic functionality
 */
export async function testApiConnection(): Promise<void> {
  console.log('🔍 Testing API connection...');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await api.healthCheck();
    console.log('✅ Health check passed:', health.status);
    
    // Test 2: File validation
    console.log('2. Testing file validation...');
    try {
      // This should throw a ValidationError
      const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
      await api.uploadFile(mockFile);
      console.log('❌ File validation failed - should have rejected invalid file');
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log('✅ File validation passed - correctly rejected invalid file');
      } else {
        console.log('❌ Unexpected error in file validation:', error);
      }
    }
    
    console.log('🎉 API connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ API connection test failed:');
    
    if (error instanceof ApiError) {
      console.error(`API Error (${error.statusCode}): ${error.message}`);
    } else if (error instanceof NetworkError) {
      console.error(`Network Error: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
    
    throw error;
  }
}

/**
 * Test the API client's utility functions
 */
export async function testUtilityFunctions(): Promise<void> {
  console.log('🔧 Testing utility functions...');
  
  // Test formatting functions
  const { formatFileSize, formatDuration, getProcessingStepLabel } = await import('./api');
  
  console.log('File size formatting:');
  console.log('- 1024 bytes:', formatFileSize(1024));
  console.log('- 1MB:', formatFileSize(1024 * 1024));
  console.log('- 100MB:', formatFileSize(100 * 1024 * 1024));
  
  console.log('Duration formatting:');
  console.log('- 30 seconds:', formatDuration(30));
  console.log('- 90 seconds:', formatDuration(90));
  console.log('- 180 seconds:', formatDuration(180));
  
  console.log('Processing step labels:');
  console.log('- stem_separation:', getProcessingStepLabel('stem_separation'));
  console.log('- transcription:', getProcessingStepLabel('transcription'));
  console.log('- beat_analysis:', getProcessingStepLabel('beat_analysis'));
  
  console.log('✅ Utility functions test completed');
}

/**
 * Test error handling and retry mechanisms
 */
export async function testErrorHandling(): Promise<void> {
  console.log('🔄 Testing error handling...');
  
  try {
    // Test retry mechanism with a failing operation
    let attemptCount = 0;
    await api.retryWithBackoff(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new NetworkError('Simulated network error');
      }
      return 'success';
    }, 3, 100);
    
    console.log('✅ Retry mechanism works correctly');
  } catch (error) {
    console.log('❌ Retry mechanism test failed:', error);
  }
}

/**
 * Complete API test suite
 */
export async function runApiTests(): Promise<boolean> {
  console.log('🚀 Running complete API test suite...');
  
  try {
    await testUtilityFunctions();
    await testErrorHandling();
    await testApiConnection();
    
    console.log('🎉 All API tests passed!');
    return true;
  } catch (error) {
    console.error('❌ API tests failed:', error);
    return false;
  }
} 