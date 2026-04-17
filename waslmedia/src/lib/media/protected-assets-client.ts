'use client';

export function resolveProtectedAssetUrl(src?: string | null) {
  const normalizedSrc = src?.trim() || '';
  return Promise.resolve(normalizedSrc);
}
