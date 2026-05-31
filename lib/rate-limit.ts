import redis from "./redis";

export async function rateLimit(
  ip: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const key = `ratelimit:${ip}`;
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
}
