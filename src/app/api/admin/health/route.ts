import { NextResponse } from 'next/server';
import { getCacheStats } from '@/utils/cache-utils';

// Health check endpoint
export async function GET() {
  try {
    const cacheStats = await getCacheStats();
    
    return NextResponse.json({
      status: 'healthy',
      cache: {
        stats: cacheStats || {
          hits: 0,
          misses: 0,
          timestamp: Date.now()
        }
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
} 