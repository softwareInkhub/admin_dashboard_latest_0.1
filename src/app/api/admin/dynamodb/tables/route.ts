import { NextRequest, NextResponse } from 'next/server';
import { listTables } from '@/utils/dynamodb-service';
import {
  getCachedTablesList,
  cacheTablesList,
  invalidateAllCache
} from '@/utils/dynamodb-cache-service';

// List DynamoDB tables
export async function GET(req: NextRequest) {
  try {
    // Check for force refresh flag
    const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
    
    // Try to get tables from cache first
    let tables;
    if (!forceRefresh) {
      tables = await getCachedTablesList();
    }
    
    // If not in cache or forcing refresh, fetch from DynamoDB
    if (!tables) {
      tables = await listTables();
      // Cache the results
      await cacheTablesList(tables);
    }
    
    return NextResponse.json({ tables }, { status: 200 });
  } catch (error) {
    console.error('Error listing tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

// Clear all DynamoDB cache
export async function DELETE(req: NextRequest) {
  try {
    await invalidateAllCache();
    return NextResponse.json({ message: 'All DynamoDB cache cleared' }, { status: 200 });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
} 