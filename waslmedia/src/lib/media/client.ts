'use client';

import { apiSend } from '@/lib/api/client';

export interface PlaybackSessionResponse {
  sessionId: string;
  accessKey: string;
  playbackMode: 'mse' | 'compat-hls' | 'compat-source';
  bootstrapUrl: string;
  fallbackUrl: string;
  directSourceUrl: string;
  thumbnailUrl: string | null;
  expiresAt: string;
}

type PlaybackSessionMode = 'watch' | 'preview' | 'shorts' | 'owner-download';
const PLAYBACK_CACHE_SAFETY_WINDOW_MS = 60_000;

type PlaybackSessionCacheEntry = {
  promise: Promise<PlaybackSessionResponse>;
  expiresAt: number | null;
};

const playbackSessionCache = new Map<string, PlaybackSessionCacheEntry>();
const playbackBlobCache = new Map<string, Promise<string>>();

function getPlaybackCacheKey(videoId: string, mode: PlaybackSessionMode) {
  return `${mode}:${videoId}`;
}

function getSessionExpiryTimestamp(expiresAt: string) {
  const nextExpiry = new Date(expiresAt).getTime() - PLAYBACK_CACHE_SAFETY_WINDOW_MS;
  return Number.isFinite(nextExpiry) ? nextExpiry : Date.now();
}

export function invalidatePlaybackSession(videoId?: string | null, mode: PlaybackSessionMode = 'watch') {
  if (!videoId) {
    return;
  }

  const cacheKey = getPlaybackCacheKey(videoId, mode);
  playbackSessionCache.delete(cacheKey);
  playbackBlobCache.delete(cacheKey);
}

export function createPlaybackSession(
  videoId?: string | null,
  mode: PlaybackSessionMode = 'watch',
  options?: { forceRefresh?: boolean }
) {
  if (!videoId) {
    return Promise.reject(new Error('VIDEO_ID_REQUIRED'));
  }

  const cacheKey = getPlaybackCacheKey(videoId, mode);
  if (options?.forceRefresh) {
    invalidatePlaybackSession(videoId, mode);
  }

  const cached = playbackSessionCache.get(cacheKey);
  if (cached) {
    if (cached.expiresAt === null || Date.now() < cached.expiresAt) {
      return cached.promise;
    }
    invalidatePlaybackSession(videoId, mode);
  }

  const request = apiSend<PlaybackSessionResponse>('/api/playback/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoId, mode }),
  })
    .then((response) => {
      const entry = playbackSessionCache.get(cacheKey);
      if (entry) {
        entry.expiresAt = getSessionExpiryTimestamp(response.expiresAt);
      }
      return response;
    })
    .catch((error) => {
      playbackSessionCache.delete(cacheKey);
      throw error;
    });

  playbackSessionCache.set(cacheKey, {
    promise: request,
    expiresAt: null,
  });
  return request;
}

export function getPlaybackBlobUrl(
  videoId?: string | null,
  mode: PlaybackSessionMode = 'watch',
  options?: { forceRefresh?: boolean }
) {
  if (!videoId) {
    return Promise.reject(new Error('VIDEO_ID_REQUIRED'));
  }

  const cacheKey = getPlaybackCacheKey(videoId, mode);
  if (options?.forceRefresh) {
    invalidatePlaybackSession(videoId, mode);
  }

  const cached = playbackBlobCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = createPlaybackSession(videoId, mode, options)
    .then(async (session) => {
      const response = await fetch(session.fallbackUrl, {
        credentials: 'include',
        headers: {
          'X-Wasl-Playback-Key': session.accessKey,
        },
      });
      if (!response.ok) {
        throw new Error('PLAYBACK_BLOB_REQUEST_FAILED');
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    })
    .catch((error) => {
      playbackBlobCache.delete(cacheKey);
      throw error;
    });

  playbackBlobCache.set(cacheKey, request);
  return request;
}
