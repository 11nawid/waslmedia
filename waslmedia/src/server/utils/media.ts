import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_TOKEN_TTL_MS = 5 * 60 * 1000;
const STREAM_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const mediaSecret = process.env.MEDIA_TOKEN_SECRET || process.env.AUTH_SECRET || 'waslmedia-media-secret';

type MediaScope = 'playback' | 'session' | 'source' | 'manifest' | 'segment' | 'thumbnail';

interface MediaTokenPayload {
  videoId: string;
  scope: MediaScope;
  resource?: string;
  userId?: string | null;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac('sha256', mediaSecret).update(payload).digest('base64url');
}

function encodePayload(payload: MediaTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(token: string) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as MediaTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createMediaToken(
  videoId: string,
  scope: MediaScope,
  options?: { resource?: string; userId?: string | null; expiresAt?: number }
) {
  const payload: MediaTokenPayload = {
    videoId,
    scope,
    resource: options?.resource,
    userId: options?.userId ?? null,
    exp: options?.expiresAt ?? Date.now() + SESSION_TOKEN_TTL_MS,
  };

  const encodedPayload = encodePayload(payload);
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyMediaToken(
  token: string | null | undefined,
  videoId: string,
  scope: MediaScope,
  options?: { resource?: string; userId?: string | null }
) {
  if (!token) {
    return null;
  }

  const payload = decodePayload(token);
  if (!payload || payload.videoId !== videoId || payload.scope !== scope) {
    return null;
  }

  if (options?.resource && payload.resource !== options.resource) {
    return null;
  }

  if (payload.userId && options?.userId && payload.userId !== options.userId) {
    return null;
  }

  return payload;
}

export function getPlaybackCookieName(videoId: string) {
  return `wmv_${videoId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function createPlaybackCookieToken(videoId: string, userId?: string | null) {
  return createMediaToken(videoId, 'playback', {
    userId,
    expiresAt: Date.now() + STREAM_TOKEN_TTL_MS,
  });
}

function withToken(pathname: string, token: string) {
  return `${pathname}?token=${encodeURIComponent(token)}`;
}

function buildHeaderAccessKey(token: string) {
  return createHmac('sha256', mediaSecret).update(`header:${token}`).digest('base64url').slice(0, 32);
}

function getStableExpiry(ttlMs: number) {
  return Math.ceil(Date.now() / ttlMs) * ttlMs;
}

export function buildVideoPlaybackSessionUrl(videoId: string, userId?: string | null) {
  return `/api/media/video/${videoId}/session`;
}

export function buildVideoSourceUrl(videoId: string, userId?: string | null) {
  const token = createMediaToken(videoId, 'source', {
    userId,
    expiresAt: getStableExpiry(STREAM_TOKEN_TTL_MS),
  });
  return withToken(`/api/media/video/${videoId}`, token);
}

export function buildVideoManifestUrl(videoId: string, userId?: string | null) {
  return `/api/media/video/${videoId}/master`;
}

export function buildVideoVariantUrl(videoId: string, variantId: string, userId?: string | null) {
  return `/api/media/video/${videoId}/variant/${variantId}`;
}

export function buildVideoSegmentUrl(videoId: string, segmentPath: string, userId?: string | null) {
  return `/api/media/video/${videoId}/segment/${segmentPath}`;
}

export function buildVideoThumbnailUrl(videoId: string, userId?: string | null) {
  const token = createMediaToken(videoId, 'thumbnail', {
    userId,
    expiresAt: getStableExpiry(STREAM_TOKEN_TTL_MS),
  });
  const accessKey = buildHeaderAccessKey(token);
  return `${withToken(`/api/media/video/${videoId}/thumbnail`, token)}&k=${encodeURIComponent(accessKey)}`;
}

export function verifyVideoThumbnailAccessKey(token: string | null | undefined, accessKey: string | null | undefined) {
  if (!token || !accessKey) {
    return false;
  }

  return accessKey === buildHeaderAccessKey(token);
}
