import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = new Redis(REDIS_URL);

/**
 * Get parsed JSON data from Redis cache
 */
export async function getCacheJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`[RedisCache] Failed to get key "${key}":`, e);
    return null;
  }
}

/**
 * Store data as JSON in Redis cache with TTL
 */
export async function setCacheJson(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (e) {
    console.error(`[RedisCache] Failed to set key "${key}":`, e);
  }
}

/**
 * Delete a specific key or list of keys from Redis cache
 */
export async function delCacheKeys(...keys: string[]): Promise<void> {
  try {
    if (keys.length === 0) return;
    const validKeys = keys.filter(Boolean);
    if (validKeys.length > 0) {
      await redisClient.del(...validKeys);
    }
  } catch (e) {
    console.error(`[RedisCache] Failed to del keys:`, e);
  }
}

/**
 * Invalidate keys by wildcard pattern (e.g. "cache:history:channelId:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const stream = redisClient.scanStream({
      match: pattern,
      count: 100
    });

    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    });
  } catch (e) {
    console.error(`[RedisCache] Failed to invalidate pattern "${pattern}":`, e);
  }
}
