import { cacheData, getCachedData, deleteCachedData, clearCacheByPattern, getCachedDataBatch } from './disk-storage';
import { createHash as cryptoCreateHash } from 'crypto';

// Cache keys
const CACHE_KEYS = {
  TABLE_LIST: 'dynamodb:tables',
  TABLE_DETAILS: (tableName: string) => `dynamodb:table:${tableName}:details`,
  TABLE_ITEMS: (tableName: string, params: string) => 
    `dynamodb:table:${tableName}:items:${params}`,
  QUERY_RESULTS: (tableName: string, queryHash: string) => 
    `dynamodb:table:${tableName}:query:${queryHash}`,
  CACHE_STATS: 'dynamodb:cache:stats',
  STALE_FLAG: (key: string) => `${key}:stale` // New key for stale flags
};

// Cache TTL configuration from environment or defaults
const DEFAULT_TTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10);
const TABLE_LIST_TTL = parseInt(process.env.TABLE_LIST_TTL || '1800', 10); // 30 minutes for table list
const TABLE_DETAILS_TTL = parseInt(process.env.TABLE_DETAILS_TTL || '3600', 10); // 1 hour for table details
const TABLE_ITEMS_TTL = parseInt(process.env.TABLE_ITEMS_TTL || '1800', 10); // 30 minutes for table items
const QUERY_RESULTS_TTL = parseInt(process.env.QUERY_RESULTS_TTL || '900', 10); // 15 minutes for query results
const STATS_TTL = parseInt(process.env.STATS_TTL || '86400', 10); // 24 hours for cache stats
const STALE_TTL = parseInt(process.env.STALE_TTL || '43200', 10); // 12 hours for stale data

// Stale-while-revalidate threshold (percentage of TTL at which data is considered stale but usable)
const STALE_THRESHOLD = parseFloat(process.env.STALE_THRESHOLD || '0.75'); // Default 75% of TTL

// Cache statistics tracking
interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number; // New: Track stale cache hits
  timestamp: number;
  tableStats: {
    [tableName: string]: {
      hits: number;
      misses: number;
      staleHits: number; // New: Track stale cache hits per table
    }
  }
}

/**
 * Check if data is stale based on timestamp and TTL
 */
function isDataStale(timestamp: number, ttl: number): boolean {
  const age = (Date.now() - timestamp) / 1000; // Age in seconds
  return age > (ttl * STALE_THRESHOLD);
}

/**
 * Track cache hit
 */
export async function trackCacheHit(tableName: string, isStale: boolean = false) {
  try {
    const stats = await getCachedData<CacheStats>(CACHE_KEYS.CACHE_STATS) || {
      hits: 0,
      misses: 0,
      staleHits: 0,
      timestamp: Date.now(),
      tableStats: {}
    };
    
    if (isStale) {
      stats.staleHits++;
    } else {
      stats.hits++;
    }
    
    if (!stats.tableStats[tableName]) {
      stats.tableStats[tableName] = { hits: 0, misses: 0, staleHits: 0 };
    }
    
    if (isStale) {
      stats.tableStats[tableName].staleHits++;
    } else {
      stats.tableStats[tableName].hits++;
    }
    
    await cacheData(CACHE_KEYS.CACHE_STATS, stats, STATS_TTL);
  } catch (error) {
    console.error('Error tracking cache hit:', error);
  }
}

/**
 * Track cache miss
 */
async function trackCacheMiss(tableName: string) {
  try {
    const stats = await getCachedData<CacheStats>(CACHE_KEYS.CACHE_STATS) || {
      hits: 0,
      misses: 0,
      staleHits: 0,
      timestamp: Date.now(),
      tableStats: {}
    };
    
    stats.misses++;
    
    if (!stats.tableStats[tableName]) {
      stats.tableStats[tableName] = { hits: 0, misses: 0, staleHits: 0 };
    }
    
    stats.tableStats[tableName].misses++;
    
    await cacheData(CACHE_KEYS.CACHE_STATS, stats, STATS_TTL);
  } catch (error) {
    console.error('Error tracking cache miss:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  return await getCachedData<CacheStats>(CACHE_KEYS.CACHE_STATS);
}

/**
 * Create a hash of the provided value for use in cache keys
 */
export function createHash(value: any): string {
  const stringValue = typeof value === 'string' 
    ? value 
    : JSON.stringify(value);
  
  return cryptoCreateHash('md5')
    .update(stringValue)
    .digest('hex');
}

/**
 * Get a stable identifier for a DynamoDB item
 * Uses the primary key if available, otherwise creates a hash of the full item
 */
export function getItemIdentifier(item: any, keyFields: string[] = []): string {
  if (!item) return '';
  
  // First try to use primary key fields if available
  if (keyFields.length > 0) {
    const keyValues = keyFields.map(field => {
      const fieldValue = item[field];
      return fieldValue ? String(fieldValue) : '';
    });
    
    // Only use key fields if all are present
    if (keyValues.every(value => value !== '')) {
      return createHash(keyValues.join(':'));
    }
  }
  
  // Next try common id fields
  const commonIdFields = ['id', 'ID', 'Id', 'itemId', 'uuid', 'key'];
  for (const field of commonIdFields) {
    if (item[field] && typeof item[field] === 'string') {
      return createHash(item[field]);
    }
  }
  
  // Last resort: hash the entire item
  return createHash(item);
}

/**
 * Mark a cached item as stale without removing it
 * This allows for stale-while-revalidate pattern
 */
async function markCacheAsStale(cacheKey: string): Promise<void> {
  try {
    const staleKey = CACHE_KEYS.STALE_FLAG(cacheKey);
    await cacheData(staleKey, { markedStaleAt: Date.now() }, STALE_TTL);
    console.log(`Marked cache key ${cacheKey} as stale`);
  } catch (error) {
    console.error(`Error marking cache as stale for key ${cacheKey}:`, error);
  }
}

/**
 * Check if a cache key is marked as stale
 */
async function isCacheStale(cacheKey: string): Promise<boolean> {
  try {
    const staleKey = CACHE_KEYS.STALE_FLAG(cacheKey);
    const staleData = await getCachedData<{ markedStaleAt: number }>(staleKey);
    return !!staleData;
  } catch (error) {
    console.error(`Error checking if cache is stale for key ${cacheKey}:`, error);
    return false;
  }
}

/**
 * Cache DynamoDB tables list
 */
export async function cacheTablesList(tables: any[]): Promise<void> {
  await cacheData(CACHE_KEYS.TABLE_LIST, {
    data: tables,
    timestamp: Date.now()
  }, TABLE_LIST_TTL);
}

/**
 * Get cached DynamoDB tables list
 */
export async function getCachedTablesList(): Promise<any[] | null> {
  const cachedData = await getCachedData<{ data: any[]; timestamp: number }>(CACHE_KEYS.TABLE_LIST);
  if (!cachedData) return null;
  
  // No tracking for table list
  return cachedData.data;
}

/**
 * Normalize table details to ensure consistent structure
 */
function normalizeTableDetails(details: any): any {
  if (!details) return null;
  
  // Ensure critical fields are present
  return {
    ...details,
    TableName: details.TableName || 'Unknown',
    TableStatus: details.TableStatus || 'ACTIVE',
    ItemCount: typeof details.ItemCount === 'number' ? details.ItemCount : 0,
    TableSizeBytes: typeof details.TableSizeBytes === 'number' ? details.TableSizeBytes : 0,
    CreationDateTime: details.CreationDateTime || new Date().toISOString(),
  };
}

/**
 * Cache table details
 */
export async function cacheTableDetails(tableName: string, details: any): Promise<void> {
  // Normalize before caching
  const normalizedDetails = normalizeTableDetails(details);
  const key = CACHE_KEYS.TABLE_DETAILS(tableName);
  
  await cacheData(key, {
    data: normalizedDetails,
    timestamp: Date.now()
  }, TABLE_DETAILS_TTL);
  
  // Clear any stale marker
  const staleKey = CACHE_KEYS.STALE_FLAG(key);
  await deleteCachedData(staleKey);
}

/**
 * Get cached table details with stale-while-revalidate support
 */
export async function getCachedTableDetails(
  tableName: string
): Promise<any | null> {
  const key = CACHE_KEYS.TABLE_DETAILS(tableName);
  const cachedData = await getCachedData<{ data: any; timestamp: number }>(key);
  
  if (!cachedData) {
    await trackCacheMiss(tableName);
    return null;
  }
  
  const isStale = isDataStale(cachedData.timestamp, TABLE_DETAILS_TTL) || 
                  await isCacheStale(key);
  
  // Track appropriate cache hit type
  await trackCacheHit(tableName, isStale);
  
  // If stale, mark for background refresh but still return the data
  if (isStale) {
    console.log(`Using stale cache data for table details ${tableName}`);
    await markCacheAsStale(key);
  }
  
  // Normalize after retrieval from cache
  return normalizeTableDetails(cachedData.data);
}

/**
 * Cache DynamoDB table items with metadata
 */
export async function cacheTableItems(
  tableName: string,
  params: any,
  items: any[],
  lastEvaluatedKey?: any,
  keyFields: string[] = []
): Promise<void> {
  if (!items || items.length === 0) {
    console.log(`No items to cache for table ${tableName}`);
    return;
  }
  
  try {
    // Generate a consistent hash for the parameters
    const paramsHash = createHash(params);
    const baseKey = CACHE_KEYS.TABLE_ITEMS(tableName, paramsHash);
    
    // Store metadata about this collection
    const metadata = {
      tableName,
      params,
      paramsHash,
      count: items.length,
      lastEvaluatedKey,
      timestamp: Date.now(),
      keyFields
    };
    
    // Cache the metadata
    const metadataKey = `${baseKey}:metadata`;
    await cacheData(metadataKey, metadata, TABLE_ITEMS_TTL);
    
    // Cache the full items collection in one go for small datasets
    if (items.length <= 100) {
      // Store all items together for small datasets (better performance)
      await cacheData(`${baseKey}:all`, {
        items,
        timestamp: Date.now()
      }, TABLE_ITEMS_TTL);
    } else {
      // Cache the item IDs
      const itemIds = items.map(item => getItemIdentifier(item, keyFields));
      const idsKey = `${baseKey}:ids`;
      await cacheData(idsKey, itemIds, TABLE_ITEMS_TTL);
      
      // Cache individual items
      const cachePromises = items.map(async (item) => {
        const itemId = getItemIdentifier(item, keyFields);
        if (!itemId) {
          console.warn(`Unable to generate ID for item`, item);
          return;
        }
        
        const itemKey = `${baseKey}:item:${itemId}`;
        await cacheData(itemKey, item, TABLE_ITEMS_TTL);
      });
      
      // Wait for all items to be cached
      await Promise.all(cachePromises);
    }
    
    // Clear any stale marker
    const staleKey = CACHE_KEYS.STALE_FLAG(baseKey);
    await deleteCachedData(staleKey);
    
    console.log(`Cached ${items.length} items for table ${tableName} with hash ${paramsHash}`);
  } catch (error) {
    console.error(`Error caching items for table ${tableName}:`, error);
  }
}

/**
 * Retrieve cached table items with stale-while-revalidate support
 */
export async function getCachedTableItems(
  tableName: string,
  params: any,
  keyFields: string[] = []
): Promise<{ 
  items: any[]; 
  lastEvaluatedKey: any; 
  timestamp: number;
  isStale?: boolean; 
} | null> {
  try {
    const paramsHash = createHash(params);
    const baseKey = CACHE_KEYS.TABLE_ITEMS(tableName, paramsHash);
    
    // Check if this cache is marked as stale
    const isStale = await isCacheStale(baseKey);
    
    // Try to get the full items collection for small datasets first
    const allItemsKey = `${baseKey}:all`;
    const allItemsData = await getCachedData<{ items: any[]; timestamp: number }>(allItemsKey);
    
    if (allItemsData) {
      // Check if data is stale based on age
      const dataStale = isDataStale(allItemsData.timestamp, TABLE_ITEMS_TTL);
      const isDataStaleOverall = isStale || dataStale;
      
      if (isDataStaleOverall) {
        await markCacheAsStale(baseKey);
        await trackCacheHit(tableName, true);
        console.log(`Using stale cache data for table items ${tableName} (all items collection)`);
      } else {
        await trackCacheHit(tableName, false);
      }
      
      // Check if we have metadata for this collection to get lastEvaluatedKey
      const metadataKey = `${baseKey}:metadata`;
      const metadata = await getCachedData<any>(metadataKey);
      
      return {
        items: allItemsData.items,
        lastEvaluatedKey: metadata?.lastEvaluatedKey,
        timestamp: allItemsData.timestamp,
        isStale: isDataStaleOverall
      };
    }
    
    // Check if we have metadata for this collection
    const metadataKey = `${baseKey}:metadata`;
    const metadata = await getCachedData(metadataKey);
    
    if (!metadata || typeof metadata !== 'object') {
      console.log(`No cached metadata found for table ${tableName} with hash ${paramsHash}`);
      await trackCacheMiss(tableName);
      return null;
    }
    
    // Ensure metadata has the required properties
    const typedMetadata = metadata as {
      tableName: string;
      params: any;
      paramsHash: string;
      count: number;
      lastEvaluatedKey?: any;
      timestamp: number;
      keyFields: string[];
    };
    
    // Check if data is stale based on age
    const dataStale = isDataStale(typedMetadata.timestamp, TABLE_ITEMS_TTL);
    const isDataStaleOverall = isStale || dataStale;
    
    // Get the item IDs
    const idsKey = `${baseKey}:ids`;
    const itemIds = await getCachedData(idsKey);
    
    if (!itemIds || !Array.isArray(itemIds)) {
      console.log(`No cached item IDs found for table ${tableName} with hash ${paramsHash}`);
      await trackCacheMiss(tableName);
      return null;
    }
    
    // Prepare item keys for batch retrieval
    const itemKeys = itemIds.map(itemId => `${baseKey}:item:${itemId}`);
    
    // Retrieve all items in a single batch operation
    const items = await getCachedDataBatch<any>(itemKeys);
    
    // Filter out any missing items
    const validItems = items.filter(item => item !== null);
    
    if (validItems.length !== itemIds.length) {
      console.warn(`Some items are missing from cache: ${validItems.length}/${itemIds.length} available`);
      
      // If too many items are missing, consider the cache invalid
      if (validItems.length < itemIds.length * 0.9) { // 90% threshold
        await trackCacheMiss(tableName);
        return null;
      }
    }
    
    if (isDataStaleOverall) {
      await markCacheAsStale(baseKey);
      await trackCacheHit(tableName, true);
      console.log(`Using stale cache data for table items ${tableName}`);
    } else {
      await trackCacheHit(tableName, false);
    }
    
    return {
      items: validItems,
      lastEvaluatedKey: typedMetadata.lastEvaluatedKey,
      timestamp: typedMetadata.timestamp,
      isStale: isDataStaleOverall
    };
  } catch (error) {
    console.error(`Error retrieving cached items for table ${tableName}:`, error);
    await trackCacheMiss(tableName);
    return null;
  }
}

/**
 * Cache query results
 */
export async function cacheQueryResults(
  tableName: string,
  queryParams: any,
  results: {
    items: any[];
    lastEvaluatedKey: any;
    count: number;
  }
): Promise<void> {
  const queryHash = createHash(queryParams);
  const key = CACHE_KEYS.QUERY_RESULTS(tableName, queryHash);
  
  await cacheData(key, {
    ...results,
    timestamp: Date.now()
  }, QUERY_RESULTS_TTL);
  
  // Clear any stale marker
  const staleKey = CACHE_KEYS.STALE_FLAG(key);
  await deleteCachedData(staleKey);
}

/**
 * Get cached query results with stale-while-revalidate support
 */
export async function getCachedQueryResults(
  tableName: string,
  queryParams: any
): Promise<{
  items: any[];
  lastEvaluatedKey: any;
  count: number;
  timestamp: number;
  isStale?: boolean;
} | null> {
  const queryHash = createHash(queryParams);
  const key = CACHE_KEYS.QUERY_RESULTS(tableName, queryHash);
  
  const cachedData = await getCachedData(key);
  if (!cachedData) {
    await trackCacheMiss(tableName);
    return null;
  }
  
  // Ensure data has the correct shape before returning
  if (typeof cachedData === 'object' && cachedData !== null) {
    const typedData = cachedData as {
      items: any[];
      lastEvaluatedKey: any;
      count: number;
      timestamp: number;
    };
    
    // Check if data is stale
    const isStale = isDataStale(typedData.timestamp, QUERY_RESULTS_TTL) || 
                    await isCacheStale(key);
    
    if (isStale) {
      await markCacheAsStale(key);
      await trackCacheHit(tableName, true);
      console.log(`Using stale query result cache for table ${tableName}`);
    } else {
      await trackCacheHit(tableName, false);
    }
    
    return {
      ...typedData,
      isStale
    };
  }
  
  await trackCacheMiss(tableName);
  return null;
}

/**
 * Prefetch and cache popular tables
 * This can be called on a schedule to warm the cache
 */
export async function prefetchPopularData(
  fetchTablesFunction: () => Promise<string[]>,
  fetchTableDetailsFunction: (tableName: string) => Promise<any>
): Promise<void> {
  try {
    // Get cache stats to find popular tables
    const stats = await getCacheStats();
    if (!stats || !stats.tableStats) {
      console.log('No cache statistics available for prefetching');
      return;
    }
    
    // Sort tables by access frequency (hits + misses)
    const sortedTables = Object.entries(stats.tableStats)
      .map(([tableName, tableStats]) => ({
        tableName,
        accessCount: tableStats.hits + tableStats.misses + tableStats.staleHits
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5); // Get top 5 most accessed tables
    
    if (sortedTables.length === 0) {
      // If no access stats, fetch all tables
      const tables = await fetchTablesFunction();
      
      // Cache table list
      await cacheTablesList(tables);
      
      // Cache details for a few tables
      for (const tableName of tables.slice(0, 3)) {
        const details = await fetchTableDetailsFunction(tableName);
        await cacheTableDetails(tableName, details);
      }
      
      return;
    }
    
    // Prefetch and cache data for popular tables
    for (const { tableName } of sortedTables) {
      // Check if cache is stale or missing
      const key = CACHE_KEYS.TABLE_DETAILS(tableName);
      const cachedData = await getCachedData(key);
      const isStale = !cachedData || await isCacheStale(key);
      
      if (isStale) {
        console.log(`Prefetching data for popular table: ${tableName}`);
        const details = await fetchTableDetailsFunction(tableName);
        await cacheTableDetails(tableName, details);
      }
    }
    
    console.log(`Prefetched data for ${sortedTables.length} popular tables`);
  } catch (error) {
    console.error('Error during prefetch of popular data:', error);
  }
}

/**
 * Invalidate all cache for a specific table
 */
export async function invalidateTableCache(tableName: string): Promise<void> {
  await clearCacheByPattern(`dynamodb:table:${tableName}:*`);
}

/**
 * Invalidate all DynamoDB cache
 */
export async function invalidateAllCache(): Promise<void> {
  await clearCacheByPattern('dynamodb:*');
} 