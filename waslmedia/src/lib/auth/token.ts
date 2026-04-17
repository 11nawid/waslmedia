import { createHash, randomBytes } from 'crypto';

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashFingerprintValue(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return createHash('sha256').update(normalized).digest('hex');
}
