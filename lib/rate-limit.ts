import redis from "./redis";
import { logger } from "./logger";

export async function rateLimit(
  ip: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const key = `ratelimit:${ip}`;
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    const ttl = await redis.ttl(key);
    
    return {
      success: current <= limit,
      limit,
      remaining: Math.max(0, limit - current),
      reset: Date.now() + (ttl * 1000)
    };
  } catch (error) {
    logger.warn({ err: error }, "[RateLimit] Redis unreachable, bypassing rate limit.");
    // Fail open if Redis is down
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + (windowSeconds * 1000)
    };
  }
}
