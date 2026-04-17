'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

const DISMISSED_VIDEO_IDS_KEY = 'waslmedia.dismissedVideoIds';
const DISMISSED_AD_IDS_KEY = 'waslmedia.dismissedAdIds';

const dismissedAdIdsCache = new Map<string, string[]>();
const dismissedAdIdsRequestCache = new Map<string, Promise<string[]>>();

function loadStoredIds(key: string) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function getScopedStorageKey(baseKey: string, userId?: string | null) {
  return `${baseKey}:${userId || 'guest'}`;
}

function mergeIds(current: string[], incoming: string[]) {
  return Array.from(new Set([...current, ...incoming]));
}

async function fetchDismissedAdIdsForUser(userId: string) {
  const cachedIds = dismissedAdIdsCache.get(userId);
  if (cachedIds) {
    return cachedIds;
  }

  const inFlightRequest = dismissedAdIdsRequestCache.get(userId);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    const response = await fetch('/api/ads/dismissed', {
      credentials: 'include',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(payload.adIds)) {
      throw new Error('DISMISSED_ADS_FETCH_FAILED');
    }

    const adIds = payload.adIds.filter((value: unknown): value is string => typeof value === 'string');
    dismissedAdIdsCache.set(userId, adIds);
    return adIds;
  })();

  dismissedAdIdsRequestCache.set(userId, request);

  try {
    return await request;
  } finally {
    dismissedAdIdsRequestCache.delete(userId);
  }
}

export function useDismissedFeedItems() {
  const { user } = useAuth();
  const [dismissedVideoIds, setDismissedVideoIds] = useState<string[]>([]);
  const [dismissedAdIds, setDismissedAdIds] = useState<string[]>([]);
  const dismissedVideoStorageKey = getScopedStorageKey(DISMISSED_VIDEO_IDS_KEY, user?.id);
  const dismissedAdStorageKey = getScopedStorageKey(DISMISSED_AD_IDS_KEY, user?.id);

  useEffect(() => {
    setDismissedVideoIds(loadStoredIds(dismissedVideoStorageKey));
    setDismissedAdIds(loadStoredIds(dismissedAdStorageKey));
  }, [dismissedAdStorageKey, dismissedVideoStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(dismissedVideoStorageKey, JSON.stringify(dismissedVideoIds));
  }, [dismissedVideoIds, dismissedVideoStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(dismissedAdStorageKey, JSON.stringify(dismissedAdIds));
  }, [dismissedAdIds, dismissedAdStorageKey]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const loadDismissedAds = async () => {
      try {
        const adIds = await fetchDismissedAdIdsForUser(user.id);

        if (active) {
          setDismissedAdIds((current) => mergeIds(current, adIds));
        }
      } catch {
        // Keep browsing resilient if sync fails.
      }
    };

    void loadDismissedAds();

    return () => {
      active = false;
    };
  }, [user]);

  const dismissVideo = useCallback((videoId: string) => {
    setDismissedVideoIds((current) => (current.includes(videoId) ? current : [...current, videoId]));
  }, []);

  const dismissAd = useCallback((adId: string) => {
    setDismissedAdIds((current) => {
      const next = current.includes(adId) ? current : [...current, adId];
      if (user?.id) {
        dismissedAdIdsCache.set(user.id, next);
      }
      return next;
    });
  }, [user?.id]);

  return {
    dismissedVideoIds,
    dismissedAdIds,
    dismissVideo,
    dismissAd,
  };
}
