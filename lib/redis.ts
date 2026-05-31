import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis | undefined };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(url, {
    // Don't attempt to connect until the first command is issued.
    // This prevents ioredis from crashing next build when Redis isn't running locally.
    lazyConnect: true,
    // Limit reconnection noise in logs — back off after 3 retries.
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    enableOfflineQueue: false,
  });

  // Suppress unhandled 'error' events so a missing Redis instance doesn't
  // crash the Next.js build or Node process. Callers should handle rejections.
  client.on('error', () => {
    // Intentionally silent — errors surface as rejected promises at call sites.
  });

  return client;
}

export const redis: Redis =
  globalForRedis.redis ?? (globalForRedis.redis = createRedisClient());

export default redis;
