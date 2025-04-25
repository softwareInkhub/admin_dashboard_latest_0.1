import { NextRequest, NextResponse } from 'next/server';
import { 
  getCacheStats, 
  invalidateAllCache 
} from '@/utils/dynamodb-cache-service';
import { getRedisStatus } from '@/utils/redis-client';

// Get cache statistics and status
export async function GET(req: NextRequest) {
  try {
    const cacheStats = await getCacheStats();
    const isRedisAvailable = getRedisStatus();
    
    return NextResponse.json({
      redis: {
        status: isRedisAvailable ? 'connected' : 'disconnected'
      },
      stats: cacheStats || {
        hits: 0,
        misses: 0,
        timestamp: Date.now(),
        tableStats: {}
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching cache stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch cache statistics',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Clear all DynamoDB cache
export async function DELETE(req: NextRequest) {
  try {
    await invalidateAllCache();
    
    return NextResponse.json({
      message: 'All DynamoDB cache successfully cleared'
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error clearing all cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 