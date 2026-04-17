import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { sanitizeFileName } from '@/lib/storage/shared';
import { getMediaTokenSecret } from '@/server/utils/runtime-config';
import type { UploadMediaKind } from '@/lib/video-upload/rules';

const UPLOAD_INTENT_TTL_MS = 1000 * 60 * 5;

const allowedBuckets = {
  videos: { prefix: 'videos', allowDelete: false },
  thumbnails: { prefix: 'thumbnails', allowDelete: true },
  profile: { prefix: 'profile', allowDelete: true },
  banners: { prefix: 'banners', allowDelete: true },
  postimages: { prefix: 'posts', allowDelete: true },
  freeaudio: { prefix: 'audio', allowDelete: true },
  feedback: { prefix: 'feedback', allowDelete: false },
} as const;

type AllowedBucket = keyof typeof allowedBuckets;

interface UploadIntentPayload {
  userId: string;
  bucket: AllowedBucket;
  objectKey: string;
  mediaKind?: UploadMediaKind | null;
  exp: number;
}

function signValue(value: string) {
  return createHmac('sha256', getMediaTokenSecret()).update(value).digest('base64url');
}

function encodePayload(payload: UploadIntentPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${signValue(body)}`;
}

function decodePayload(token: string) {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }

  const expected = signValue(body);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as UploadIntentPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    if (!payload.userId || !payload.bucket || !payload.objectKey) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function readUploadIntent(token: string) {
  return decodePayload(token);
}

export function isAllowedUploadBucket(bucket: string): bucket is AllowedBucket {
  return bucket in allowedBuckets;
}

export function createUploadIntent(params: {
  userId: string;
  bucket: string;
  filename: string;
  mediaKind?: UploadMediaKind | null;
}) {
  if (!isAllowedUploadBucket(params.bucket)) {
    throw new Error('INVALID_STORAGE_BUCKET');
  }

  const safeName = sanitizeFileName(params.filename || 'upload.bin');
  const objectKey = `${params.userId}/${allowedBuckets[params.bucket].prefix}/${Date.now()}_${randomUUID()}_${safeName}`;

  return {
    bucket: params.bucket,
    objectKey,
    token: encodePayload({
      userId: params.userId,
      bucket: params.bucket,
      objectKey,
      mediaKind: params.mediaKind || null,
      exp: Date.now() + UPLOAD_INTENT_TTL_MS,
    }),
  };
}

export function verifyUploadIntent(token: string, userId: string) {
  const payload = decodePayload(token);
  if (!payload || payload.userId !== userId) {
    return null;
  }

  if (!isAllowedUploadBucket(payload.bucket)) {
    return null;
  }

  return payload;
}

export function canDeleteStorageObject(params: { userId: string; bucket: string; objectKey: string }) {
  if (!isAllowedUploadBucket(params.bucket)) {
    return false;
  }

  const config = allowedBuckets[params.bucket];
  return config.allowDelete && params.objectKey.startsWith(`${params.userId}/`);
}
