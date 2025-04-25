import { NextResponse } from 'next/server';
import { clearCacheByPattern } from '@/utils/disk-storage';

export async function POST() {
  try {
    // Clear all Pinterest-related cache entries
    await clearCacheByPattern('pinterest:*');
    
    return NextResponse.json({
      success: true,
      message: 'Pinterest cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing Pinterest cache:', error);
    return NextResponse.json(
      { message: 'Failed to clear Pinterest cache', success: false },
      { status: 500 }
    );
  }
} 