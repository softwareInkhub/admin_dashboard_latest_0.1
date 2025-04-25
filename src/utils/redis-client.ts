import Redis, { RedisOptions } from 'ioredis';
import zlib from 'zlib';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Get Redis URL from environment variables
const redisUrl = process.env.REDIS_URL || '';

if (!redisUrl && !isBrowser) {
  console.error('REDIS_URL environment variable is not set. Redis caching will be disabled.');
}

// Determine if we're using Redis Cloud
const isRedisCloud = redisUrl.includes('redns.redis-cloud.com');

// Determine if TLS should be used (if URL uses rediss:// protocol)
const usesTLS = redisUrl.startsWith('rediss://');

// Only log in server environment
if (!isBrowser) {
  // Log Redis connection info (with password redacted)
  if (redisUrl) {
    console.log('Redis URL configured:', redisUrl.replace(/:\/\/.*@/, '://***@'));
    console.log('Using Redis Cloud:', isRedisCloud);
    console.log('Using TLS for Redis:', usesTLS);
  } else {
    console.log('Redis not configured. Caching will be disabled.');
  }
}

let redisClient: Redis | null = null;
let isRedisAvailable = !isBrowser && !!redisUrl; // Redis client is available if URL is configured and not in browser

/**
 * Get a Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (isBrowser) {
    throw new Error('Redis client is not available in browser environments');
  }
  
  if (!redisUrl) {
    throw new Error('Redis URL is not configured. Set the REDIS_URL environment variable.');
  }

  if (!redisClient) {
    try {
      // Configure Redis options
      const options: RedisOptions = {
        maxRetriesPerRequest: 5,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          // Retry with exponential backoff up to 10 times
          if (times > 10) {
            console.error('Redis connection failed after multiple attempts.');
            isRedisAvailable = false;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 200, 5000); // Increase delay with each retry, max 5s
          console.log(`Redis connection retry ${times} in ${delay}ms`);
          return delay;
        },
        connectTimeout: 15000, // 15 second connection timeout
      };

      // Only enable TLS if URL starts with rediss:// or if explicitly required
      if (usesTLS) {
        options.tls = {
          rejectUnauthorized: false
        };
      }

      // Create new Redis client
      redisClient = new Redis(redisUrl, options);

      // Setup event handlers
      redisClient.on('error', (err) => {
        console.error('Redis connection error:', err);
        isRedisAvailable = false;
      });

      redisClient.on('connect', () => {
        console.log('Connected to Redis');
        isRedisAvailable = true;
      });

      redisClient.on('reconnecting', () => {
        console.log('Reconnecting to Redis...');
      });

      redisClient.on('ready', () => {
        console.log('Redis connection is ready');
        isRedisAvailable = true;
      });

      // Attempt a ping to verify connection works
      redisClient.ping().then(() => {
        console.log('Redis ping successful');
      }).catch(err => {
        console.error('Redis ping failed:', err);
      });
      
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      isRedisAvailable = false;
      throw new Error(`Redis initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!redisClient) {
    throw new Error('Redis client is not initialized.');
  }

  return redisClient;
}

// Function to compress data
function compressData(data: any): Buffer {
  return zlib.gzipSync(JSON.stringify(data));
}

// Function to decompress data
function decompressData(buffer: Buffer): any {
  return JSON.parse(zlib.gunzipSync(buffer).toString());
}

/**
 * Cache large data by chunking it into smaller pieces
 * Used when a single payload is too large for Redis
 */
async function cacheDataInChunks(
  baseKey: string, 
  data: any, 
  expiryInSeconds = 3600, 
  chunkSize = 512 * 1024 // ~512KB chunks for better network efficiency
): Promise<void> {
  try {
    const jsonData = JSON.stringify(data);
    const totalLength = jsonData.length;
    const chunksCount = Math.ceil(totalLength / chunkSize);
    
    console.log(`Chunking data for key ${baseKey} into ${chunksCount} chunks of ~${(chunkSize/1024).toFixed(2)}KB each`);
    
    // Store metadata about the chunks
    const metaKey = `${baseKey}:meta`;
    const metaData = {
      chunksCount,
      totalLength,
      timestamp: Date.now()
    };
    
    // Ensure redisClient is initialized before using it
    if (!redisClient) {
      redisClient = getRedisClient();
    }

    const pipeline = redisClient.pipeline();
    
    // Cache the chunks one by one to avoid overwhelming the Redis server
    for (let i = 0; i < chunksCount; i++) {
      const chunkKey = `${baseKey}:chunk:${i}`;
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalLength);
      const chunk = compressData(jsonData.substring(start, end));
      
      pipeline.set(chunkKey, chunk, 'EX', expiryInSeconds);
      console.log(`Cached chunk ${i+1}/${chunksCount} for key ${baseKey}`);
    }
    
    await pipeline.exec();
    
    // Cache metadata
    pipeline.set(metaKey, JSON.stringify(metaData), 'EX', expiryInSeconds);
    await pipeline.exec();
  } catch (error) {
    console.error(`Error caching data in chunks for key ${baseKey}:`, error);
  }
}

/**
 * Get chunked cached data
 * Used to retrieve data that was cached in chunks
 */
async function getCachedDataFromChunks<T>(baseKey: string): Promise<T | null> {
  try {
    // Get metadata
    const metaKey = `${baseKey}:meta`;
    let metaData: { chunksCount: number; totalLength: number; timestamp: number; } | null = null;
    
    // Fetch metadata
    if (isRedisAvailable) {
      const redis = getRedisClient();
      const metaString = await redis.get(metaKey);
      if (metaString) {
        metaData = JSON.parse(metaString);
      }
    }
    
    if (!metaData) return null;
    
    console.log(`Found chunked data for key ${baseKey} with ${metaData.chunksCount} chunks`);
    
    // Get all chunk keys
    const chunkKeys = Array.from({ length: metaData.chunksCount }, (_, i) => `${baseKey}:chunk:${i}`);
    let chunks: (string | null)[] = [];
    
    if (isRedisAvailable) {
      const redis = getRedisClient();
      chunks = await redis.mget(...chunkKeys);
    }
    
    if (chunks.includes(null)) {
      console.warn(`Missing some chunks for key ${baseKey}`);
      return null;
    }
    
    // Join chunks and parse
    const jsonData = chunks.join('');
    
    try {
      return JSON.parse(jsonData) as T;
    } catch (parseError) {
      console.error(`Error parsing chunked data for key ${baseKey}:`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`Error getting chunked cached data for key ${baseKey}:`, error);
    return null;
  }
}

/**
 * Cache data with an expiration time
 */
export async function cacheData(key: string, data: any, expiryInSeconds = 3600): Promise<void> {
  if (!isRedisAvailable) return;
  
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);
    
    // Check if data is too large (Redis generally has a 512MB limit, but we'll be conservative)
    const isLargePayload = jsonString.length > 1024 * 1024; // 1MB threshold
    
    if (isLargePayload) {
      console.warn(`Large payload detected (${(jsonString.length/1024/1024).toFixed(2)}MB) for key: ${key}`);
      
      // For very large payloads (>10MB), use chunking
      if (jsonString.length > 10 * 1024 * 1024) {
        console.log(`Using chunking for key ${key} due to size (${(jsonString.length/1024/1024).toFixed(2)}MB)`);
        await cacheDataInChunks(key, data, expiryInSeconds);
        return;
      }
    }
    
    if (isRedisAvailable) {
      const redis = getRedisClient();
      await redis.set(key, jsonString, 'EX', expiryInSeconds);
      console.log(`Successfully cached data for key: ${key} (${jsonString.length} bytes)`);
    }
  } catch (error) {
    console.error(`Error caching data for key ${key}:`, error);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    isRedisAvailable = false;
  }
}

/**
 * Get cached data
 * @returns The cached data or null if not found
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;
  
  try {
    // First check if this is chunked data
    const metaKey = `${key}:meta`;
    let data: string | null = null;
    
    // Try to get metadata to see if it's chunked
    if (isRedisAvailable) {
      const redis = getRedisClient();
      const metaData = await redis.get(metaKey);
      
      // If metadata exists, get chunked data
      if (metaData) {
        return await getCachedDataFromChunks<T>(key);
      }
      
      // Otherwise get normally
      data = await redis.get(key);
    }
    
    if (!data) return null;
    
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error retrieving cached data for key ${key}:`, error);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
    }
    isRedisAvailable = false;
    return null;
  }
}

/**
 * Get multiple cached data items at once using MGET
 * @param keys Array of cache keys to retrieve
 * @returns Array of cached data items in the same order as the input keys
 */
export async function getCachedDataBatch<T>(keys: string[]): Promise<(T | null)[]> {
  if (!isRedisAvailable) return keys.map(() => null);
  
  try {
    if (isRedisAvailable) {
      const redis = getRedisClient();
      const results = await redis.mget(...keys);
      
      return results.map((result, index) => {
        if (!result) return null;
        try {
          return JSON.parse(result) as T;
        } catch (error) {
          console.error(`Error parsing cached data for key ${keys[index]}:`, error);
          return null;
        }
      });
    }
    return keys.map(() => null);
  } catch (error) {
    console.error('Error retrieving batch cached data:', error);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
    }
    isRedisAvailable = false;
    return keys.map(() => null);
  }
}

/**
 * Delete cached data by key
 */
export async function deleteCachedData(key: string): Promise<void> {
  if (!isRedisAvailable) return;
  
  try {
    if (isRedisAvailable) {
      const redis = getRedisClient();
      await redis.del(key);
    }
  } catch (error) {
    console.error('Error deleting cached data:', error);
    isRedisAvailable = false;
  }
}

/**
 * Clear cache with a pattern
 * @param pattern The key pattern to match (e.g., "table:*")
 */
export async function clearCacheByPattern(pattern: string): Promise<void> {
  if (!isRedisAvailable) return;
  
  try {
    if (isRedisAvailable) {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error('Error clearing cache by pattern:', error);
    isRedisAvailable = false;
  }
}

/**
 * Check Redis connection status
 */
export function getRedisStatus(): boolean {
  return isRedisAvailable;
}

/**
 * Test Redis connection and report status
 */
export async function testRedisConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    if (isBrowser) {
      return { 
        connected: false, 
        message: 'Redis connections are not available in browser environments' 
      };
    }

    // Attempt to get a client
    const redis = getRedisClient();
    
    // Ping the server to verify connection
    const pong = await redis.ping();
    
    if (pong === 'PONG') {
      return { 
        connected: true, 
        message: 'Successfully connected to Redis' 
      };
    } else {
      return { 
        connected: false, 
        message: `Redis ping returned unexpected response: ${pong}`
      };
    }
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return { 
      connected: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred while testing Redis connection' 
    };
  }
} 