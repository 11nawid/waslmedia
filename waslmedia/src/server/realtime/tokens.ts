import { createHmac, timingSafeEqual } from 'node:crypto';
import { getMediaTokenSecret } from '@/server/utils/runtime-config';

const REALTIME_TOKEN_TTL_MS = 1000 * 60 * 30;

interface RealtimeScopeTokenPayload {
  scope: string;
  userId?: string | null;
  exp: number;
}

function signValue(value: string) {
  return createHmac('sha256', getMediaTokenSecret()).update(value).digest('base64url');
}

function encodePayload(payload: RealtimeScopeTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

export function createRealtimeScopeToken(scope: string, options?: { userId?: string | null; expiresAt?: number }) {
  return encodePayload({
    scope,
    userId: options?.userId ?? null,
    exp: options?.expiresAt ?? Date.now() + REALTIME_TOKEN_TTL_MS,
  });
}

export function verifyRealtimeScopeToken(token: string | null | undefined, userId?: string | null) {
  if (!token) {
    return null;
  }

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
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as RealtimeScopeTokenPayload;
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    if (payload.userId && payload.userId !== userId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
