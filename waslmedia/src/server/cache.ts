import { getRedisClient } from '@/server/redis';

export async function getCachedJson<T>(key: string) {
  const raw = await getRedisClient().get(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number) {
  await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}

export async function withRedisCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>) {
  const cached = await getCachedJson<T>(key);
  if (cached) {
    return cached;
  }

  const value = await loader();
  await setCachedJson(key, value, ttlSeconds);
  return value;
}
