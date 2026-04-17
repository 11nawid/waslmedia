import { createHmac, timingSafeEqual } from 'node:crypto';
import { appConfig } from '@/config/app';
import { parseStorageUrl } from '@/lib/storage/shared';
import { getMediaTokenSecret } from '@/server/utils/runtime-config';

const ASSET_TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

interface ProtectedAssetPayload {
  bucket: string;
  objectKey: string;
  exp: number;
}

const LEGACY_ASSET_URL_MAP: Record<string, string> = {
  '/placeholders/default-avatar.svg': appConfig.defaultProfilePictureUrl,
  '/placeholders/default-banner.svg': appConfig.defaultBannerUrl,
  '/placeholders/default-thumbnail.svg': appConfig.defaultThumbnailUrl,
  '/waslmedia-icon.png': appConfig.brandLogoUrl,
  '/studio.png': appConfig.studioLogoUrl,
  '/waslmedia-ai-icon.png': appConfig.aiIconUrl,
};

function signValue(value: string) {
  return createHmac('sha256', getMediaTokenSecret()).update(value).digest('base64url');
}

function encodePayload(payload: ProtectedAssetPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function decodePayload(token: string) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ProtectedAssetPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildAccessKey(token: string) {
  return signValue(`asset:${token}`).slice(0, 32);
}

function getStableExpiry(ttlMs: number) {
  return Math.ceil(Date.now() / ttlMs) * ttlMs;
}

export function verifyProtectedAssetRequest(token: string | null | undefined, accessKey: string | null | undefined) {
  if (!token || !accessKey) {
    return null;
  }

  const expectedAccessKey = buildAccessKey(token);
  if (accessKey !== expectedAccessKey) {
    return null;
  }

  return decodePayload(token);
}

export function buildProtectedAssetUrl(bucket: string, objectKey: string) {
  const token = encodePayload({
    bucket,
    objectKey,
    exp: getStableExpiry(ASSET_TOKEN_TTL_MS),
  });
  const accessKey = buildAccessKey(token);
  return `/api/media/asset?token=${encodeURIComponent(token)}&k=${encodeURIComponent(accessKey)}`;
}

export function buildProtectedAssetUrlFromStorageUrl(fileUrl?: string | null) {
  const parsed = parseStorageUrl(fileUrl || '');
  if (!parsed) {
    return fileUrl || '';
  }

  return buildProtectedAssetUrl(parsed.bucket, parsed.objectKey);
}

export function resolveStoredAssetUrl(fileUrl?: string | null, fallback = '') {
  const value = fileUrl?.trim() || '';

  if (!value) {
    return fallback;
  }

  const legacyReplacement = LEGACY_ASSET_URL_MAP[value];
  if (legacyReplacement) {
    return legacyReplacement;
  }

  const protectedUrl = buildProtectedAssetUrlFromStorageUrl(value);
  if (protectedUrl && protectedUrl !== value) {
    return protectedUrl;
  }

  if (value.startsWith('storage://')) {
    return fallback;
  }

  return value;
}
