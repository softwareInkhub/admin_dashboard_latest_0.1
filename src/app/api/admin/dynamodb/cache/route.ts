import { NextRequest, NextResponse } from 'next/server';
import { clearCacheByPattern } from '@/utils/disk-storage';

export async function POST(request: NextRequest) {
  try {
    const { pattern } = await request.json();
    
    if (!pattern) {
      return NextResponse.json(
        { error: 'Cache pattern is required' },
        { status: 400 }
      );
    }
    
    await clearCacheByPattern(pattern);
    
    return NextResponse.json({
      success: true,
      message: `Cache cleared for pattern: ${pattern}`
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 