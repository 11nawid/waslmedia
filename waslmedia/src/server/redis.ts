import IORedis from 'ioredis';
import { getRedisUrl } from '@/server/utils/runtime-config';

declare global {
  var __waslmediaRedisClient: IORedis | undefined;
  var __waslmediaRedisSubscriber: IORedis | undefined;
}

function createRedisConnection() {
  return new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

export function getRedisClient() {
  if (!globalThis.__waslmediaRedisClient) {
    globalThis.__waslmediaRedisClient = createRedisConnection();
  }

  return globalThis.__waslmediaRedisClient;
}

export function getRedisSubscriber() {
  if (!globalThis.__waslmediaRedisSubscriber) {
    globalThis.__waslmediaRedisSubscriber = createRedisConnection();
  }

  return globalThis.__waslmediaRedisSubscriber;
}
