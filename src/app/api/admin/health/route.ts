import { NextRequest, NextResponse } from 'next/server';
import { getRedisHealth } from '@/utils/cache-utils';

// Health check endpoint
export async function GET(req: NextRequest) {
  try {
    // Check Redis health
    const redisHealth = await getRedisHealth();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      redis: redisHealth,
    }, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 