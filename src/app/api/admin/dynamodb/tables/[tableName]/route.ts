import { NextRequest, NextResponse } from 'next/server';
import { getTableDetails, scanTable } from '@/utils/dynamodb-service';
import { KeySchemaElement } from '@aws-sdk/client-dynamodb';
import {
  getCachedTableDetails,
  cacheTableDetails,
  getCachedTableItems,
  cacheTableItems,
  invalidateTableCache
} from '@/utils/dynamodb-cache-service';

// Define a consistent interface for items data
interface ItemsData {
  items: any[];
  lastEvaluatedKey: any;
  totalCount?: number;
  scannedCount?: number;
  timestamp: number;
  isStale?: boolean;
}

// Get details and items for a specific table
export async function GET(
  req: NextRequest,
  { params }: { params: { tableName: string } }
) {
  const { tableName } = params;
  
  // Get pagination parameters from URL
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 250;
  
  // Get last evaluated key for pagination if provided
  const lastKeyParam = searchParams.get('lastKey');
  let lastEvaluatedKey = undefined;
  
  if (lastKeyParam) {
    try {
      lastEvaluatedKey = JSON.parse(decodeURIComponent(lastKeyParam));
    } catch (error) {
      console.error('Error parsing lastKey parameter:', error);
    }
  }

  // Check for force refresh flag
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  try {
    // Prepare response object
    let response: any = {};
    let backgroundRefreshPromises: Promise<any>[] = [];
    
    // Get table details (from cache if available and not forcing refresh)
    let details;
    let detailsAreStale = false;
    
    if (!forceRefresh) {
      const cachedDetails = await getCachedTableDetails(tableName);
      if (cachedDetails) {
        details = cachedDetails;
        console.log(`[DATA SOURCE] Table details loaded from DISK CACHE`);
        
        // Check if details metadata indicates the data is stale
        if (cachedDetails.isStale) {
          detailsAreStale = true;
        }
      }
    }
    
    // If details not in cache or forcing refresh, fetch from DynamoDB
    if (!details) {
      console.log(`[DATA SOURCE] Table details fetched from DYNAMODB`);
      details = await getTableDetails(tableName);
      // Cache the details for future requests
      await cacheTableDetails(tableName, details);
    } else if (detailsAreStale) {
      // If details are stale, schedule a background refresh
      backgroundRefreshPromises.push(
        (async () => {
          try {
            console.log(`[BACKGROUND] Refreshing stale table details for ${tableName}`);
            const freshDetails = await getTableDetails(tableName);
            await cacheTableDetails(tableName, freshDetails);
            console.log(`[BACKGROUND] Successfully refreshed table details for ${tableName}`);
          } catch (error) {
            console.error(`[BACKGROUND] Error refreshing table details for ${tableName}:`, error);
          }
        })()
      );
    }
    
    // Make sure all expected fields are available
    if (details) {
      details = {
        ...details,
        ItemCount: details.ItemCount !== undefined ? details.ItemCount : 0,
        TableSizeBytes: details.TableSizeBytes !== undefined ? details.TableSizeBytes : 0,
        CreationDateTime: details.CreationDateTime || null
      };
    }
    
    response.table = details;
    
    // For items, use pagination parameters as cache key components
    const cacheParams = { limit };
    if (lastEvaluatedKey) {
      Object.assign(cacheParams, { lastKey: JSON.stringify(lastEvaluatedKey) });
    }
    
    // Always try to get items from cache first, unless forcing refresh
    let itemsData: ItemsData | null = null;
    let itemsAreStale = false;
    
    if (!forceRefresh) {
      const cachedData = await getCachedTableItems(tableName, cacheParams);
      if (cachedData) {
        console.log(`[DATA SOURCE] Items loaded from DISK CACHE`);
        itemsData = {
          ...cachedData,
          totalCount: cachedData.items.length,
          scannedCount: cachedData.items.length
        };
        
        // Check if items are stale
        if (cachedData.isStale) {
          itemsAreStale = true;
        }
      }
    }
    
    // Only fetch from DynamoDB if:
    // 1. Force refresh is requested
    // 2. No data in cache
    // 3. Cache data is invalid/empty
    if (forceRefresh || !itemsData || !itemsData.items || itemsData.items.length === 0) {
      try {
        console.log(`[DATA SOURCE] Items fetched from DYNAMODB`);
        const { items, lastEvaluatedKey: newLastKey, count, scannedCount } = 
          await scanTable(tableName, limit, lastEvaluatedKey);
        
        // Check if we have a reasonable amount of data before caching
        const estimatedSize = JSON.stringify(items).length;
        const sizeInMB = estimatedSize / (1024 * 1024);
        
        itemsData = {
          items,
          lastEvaluatedKey: newLastKey,
          totalCount: count,
          scannedCount,
          timestamp: Date.now()
        };
        
        // Always try to cache the data if it's not too large
        const cacheThreshold = 3; // 3MB
        
        if (sizeInMB < cacheThreshold) {
          await cacheTableItems(
            tableName, 
            cacheParams,
            items,
            newLastKey,
            details?.KeySchema?.map((key: KeySchemaElement) => key.AttributeName || '') || []
          );
        } else {
          console.warn(`Data too large to cache (${sizeInMB.toFixed(2)}MB) for table ${tableName}, exceeds ${cacheThreshold}MB threshold`);
        }
      } catch (scanError) {
        console.error(`Error scanning table ${tableName}:`, scanError);
        throw scanError;
      }
    } else if (itemsAreStale) {
      // If items are stale, schedule a background refresh
      backgroundRefreshPromises.push(
        (async () => {
          try {
            console.log(`[BACKGROUND] Refreshing stale items for ${tableName}`);
            const { items, lastEvaluatedKey: newLastKey, count, scannedCount } = 
              await scanTable(tableName, limit, lastEvaluatedKey);
              
            // Only update cache if we got a successful response
            if (items && items.length > 0) {
              await cacheTableItems(
                tableName, 
                cacheParams,
                items,
                newLastKey,
                details?.KeySchema?.map((key: KeySchemaElement) => key.AttributeName || '') || []
              );
              console.log(`[BACKGROUND] Successfully refreshed ${items.length} items for ${tableName}`);
            }
          } catch (error) {
            console.error(`[BACKGROUND] Error refreshing items for ${tableName}:`, error);
          }
        })()
      );
    }
    
    // Add items data to response
    Object.assign(response, {
      items: itemsData.items,
      itemCount: itemsData.items.length,
      totalCount: itemsData.totalCount,
      scannedCount: itemsData.scannedCount || itemsData.totalCount,
      lastEvaluatedKey: itemsData.lastEvaluatedKey,
      hasMoreItems: !!itemsData.lastEvaluatedKey,
      limit,
      fromCache: !forceRefresh && !!itemsData,
      cacheStatus: itemsAreStale ? 'stale' : (detailsAreStale ? 'partially-stale' : 'fresh'),
      cacheInfo: {
        detailsTimestamp: details?.timestamp ? new Date(details.timestamp).toISOString() : null,
        itemsTimestamp: itemsData?.timestamp ? new Date(itemsData.timestamp).toISOString() : null
      }
    });
    
    // Return response immediately, let background tasks complete independently
    const responseObj = NextResponse.json(response, { status: 200 });
    
    // Fire and forget background refresh tasks
    if (backgroundRefreshPromises.length > 0) {
      // Use Promise.all but don't await it
      Promise.all(backgroundRefreshPromises)
        .catch(error => console.error('[BACKGROUND] Error in background refresh tasks:', error));
    }
    
    return responseObj;
  } catch (error) {
    console.error(`Error getting table ${tableName}:`, error);
    
    // Provide more specific error messages based on the error type
    let statusCode = 500;
    let errorMessage = `Failed to fetch table ${tableName}`;
    
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      
      // Add specific handling for different error types
      if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        errorMessage = `Cache file not found for table ${tableName}. This may be the first time accessing this table.`;
        // Don't change status code, so the client can retry
      } else if (error.message.includes('AccessDenied') || error.message.includes('UnrecognizedClientException')) {
        errorMessage = `AWS access denied. Please check your AWS credentials.`;
        statusCode = 403;
      } else if (error.message.includes('ResourceNotFoundException')) {
        errorMessage = `Table "${tableName}" not found in DynamoDB.`;
        statusCode = 404;
      } else if (error.message.includes('ValidationException')) {
        errorMessage = `Invalid request: ${error.message}`;
        statusCode = 400;
      }
    }
    
    // Add debugging information in development environment
    const debugInfo = process.env.NODE_ENV === 'development' 
      ? { stack: error instanceof Error ? error.stack : undefined }
      : undefined;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(debugInfo ? { debug: debugInfo } : {})
      },
      { status: statusCode }
    );
  }
}

// Endpoint to invalidate cache for a table
export async function DELETE(
  req: NextRequest,
  { params }: { params: { tableName: string } }
) {
  const { tableName } = params;
  
  try {
    await invalidateTableCache(tableName);
    
    return NextResponse.json({
      message: `Cache for table ${tableName} successfully invalidated`
    }, { status: 200 });
  } catch (error) {
    console.error(`Error invalidating cache for table ${tableName}:`, error);
    return NextResponse.json(
      { error: `Failed to invalidate cache for table ${tableName}` },
      { status: 500 }
    );
  }
} 