import { cacheData, getCachedData, deleteCachedData, clearCacheByPattern } from './disk-storage';

// Cache TTL configuration
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL || '3600', 10);

/**
 * Cache data with a key and optional TTL
 */
export async function cache(key: string, data: any, ttl: number = DEFAULT_TTL): Promise<void> {
  await cacheData(key, data, ttl);
}

/**
 * Get cached data by key
 */
export async function getCached<T>(key: string): Promise<T | null> {
  return await getCachedData<T>(key);
}

/**
 * Delete cached data by key
 */
export async function deleteCached(key: string): Promise<void> {
  await deleteCachedData(key);
}

/**
 * Clear cache by pattern
 */
export async function clearCache(pattern: string): Promise<void> {
  await clearCacheByPattern(pattern);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  timestamp: number;
}> {
  const stats = await getCachedData<{
    hits: number;
    misses: number;
    timestamp: number;
  }>('cache:stats') || {
    hits: 0,
    misses: 0,
    timestamp: Date.now()
  };
  
  return stats;
}

/**
 * Track cache hit
 */
export async function trackCacheHit(): Promise<void> {
  const stats = await getCacheStats();
  stats.hits++;
  await cache('cache:stats', stats);
}

/**
 * Track cache miss
 */
export async function trackCacheMiss(): Promise<void> {
  const stats = await getCacheStats();
  stats.misses++;
  await cache('cache:stats', stats);
} 