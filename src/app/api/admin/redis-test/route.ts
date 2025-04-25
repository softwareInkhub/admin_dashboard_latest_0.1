import { NextRequest, NextResponse } from 'next/server';
import { testRedisConnection } from '@/utils/redis-client';

/**
 * GET handler for testing Redis connectivity
 */
export async function GET(req: NextRequest) {
  try {
    // Test Redis connection
    const result = await testRedisConnection();
    
    // Return result with appropriate status code
    return NextResponse.json(
      result,
      { status: result.connected ? 200 : 500 }
    );
  } catch (error) {
    console.error('Error in Redis test route:', error);
    return NextResponse.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
} 