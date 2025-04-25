import { NextRequest, NextResponse } from 'next/server';
import { listTables, getTableDetails } from '@/utils/dynamodb-service';
import { prefetchPopularData, getCacheStats } from '@/utils/dynamodb-cache-service';

/**
 * API endpoint to warm up the cache by prefetching data for frequently accessed tables
 * This can be called manually or via a scheduled job
 */
export async function POST(req: NextRequest) {
  try {
    // Get the warmup mode - can be "popular" or "all"
    const { mode = 'popular', tablesToWarm = [] } = await req.json().catch(() => ({}));
    
    if (mode === 'all') {
      // Get all tables
      const tables = await listTables();
      console.log(`Warming cache for all ${tables.length} tables`);
      
      // Cache table list
      const results = await Promise.all(tables.map(async (tableName) => {
        try {
          console.log(`Prefetching data for table ${tableName}`);
          const details = await getTableDetails(tableName);
          return { tableName, success: true };
        } catch (error) {
          console.error(`Error prefetching data for table ${tableName}:`, error);
          return { tableName, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }));
      
      return NextResponse.json({
        message: `Cache warming completed for ${results.filter(r => r.success).length} of ${tables.length} tables`,
        results
      });
    } else if (mode === 'specified' && Array.isArray(tablesToWarm) && tablesToWarm.length > 0) {
      // Warm specific tables
      console.log(`Warming cache for ${tablesToWarm.length} specified tables`);
      
      const results = await Promise.all(tablesToWarm.map(async (tableName) => {
        try {
          console.log(`Prefetching data for table ${tableName}`);
          const details = await getTableDetails(tableName);
          return { tableName, success: true };
        } catch (error) {
          console.error(`Error prefetching data for table ${tableName}:`, error);
          return { tableName, success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }));
      
      return NextResponse.json({
        message: `Cache warming completed for ${results.filter(r => r.success).length} of ${tablesToWarm.length} specified tables`,
        results
      });
    } else {
      // Default: prefetch popular tables based on access statistics
      await prefetchPopularData(listTables, getTableDetails);
      
      // Get current cache stats for the response
      const stats = await getCacheStats();
      
      return NextResponse.json({
        message: 'Cache warming completed for popular tables',
        cacheStats: stats ? {
          hits: stats.hits,
          misses: stats.misses,
          staleHits: stats.staleHits,
          popularTables: Object.entries(stats.tableStats)
            .map(([tableName, tableStats]) => ({
              tableName,
              hits: tableStats.hits,
              misses: tableStats.misses,
              staleHits: tableStats.staleHits,
              total: tableStats.hits + tableStats.misses + tableStats.staleHits
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
        } : null
      });
    }
  } catch (error) {
    console.error('Error warming cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to warm cache',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 