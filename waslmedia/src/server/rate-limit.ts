import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { getRedisClient } from '@/server/redis';

function getRequestKeyPart(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'anonymous';
}

export async function enforceRateLimit(
  request: NextRequest,
  config: {
    key: string;
    limit: number;
    windowSeconds: number;
    discriminator?: string;
  }
) {
  const redis = getRedisClient();
  const base = config.discriminator || getRequestKeyPart(request);
  const requestHash = createHash('sha256').update(base).digest('hex');
  const redisKey = `ratelimit:${config.key}:${requestHash}`;
  const windowMs = config.windowSeconds * 1000;
  const now = Date.now();

  const results = await redis
    .multi()
    .incr(redisKey)
    .pexpire(redisKey, windowMs, 'NX')
    .pttl(redisKey)
    .exec();

  const count = Number(results?.[0]?.[1] ?? 0);
  const ttl = Number(results?.[2]?.[1] ?? windowMs);

  return {
    allowed: count <= config.limit,
    remaining: Math.max(config.limit - count, 0),
    resetAt: new Date(now + Math.max(ttl, 0)).toISOString(),
  };
}
