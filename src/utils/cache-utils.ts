import { getRedisClient } from './redis-client';

/**
 * Check if Redis is available
 * @returns true if Redis is available, false otherwise
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis not available:', error);
    return false;
  }
}

/**
 * Get the health status of Redis
 * @returns An object with the Redis status and latency
 */
export async function getRedisHealth(): Promise<{ available: boolean; latency?: number }> {
  try {
    const start = Date.now();
    const available = await isRedisAvailable();
    const latency = Date.now() - start;
    
    return {
      available,
      latency: available ? latency : undefined
    };
  } catch (error) {
    return { available: false };
  }
} 