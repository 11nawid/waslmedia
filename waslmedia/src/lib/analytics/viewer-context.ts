'use client';

const VIEWER_KEY_STORAGE = 'waslmedia-viewer-key';

export type AnalyticsTrafficSource =
  | 'home'
  | 'search'
  | 'channel'
  | 'watch'
  | 'watch-recommendation'
  | 'subscriptions'
  | 'history'
  | 'liked'
  | 'watch-later'
  | 'playlist'
  | 'shorts'
  | 'share'
  | 'external'
  | 'direct_or_unknown';

export type AnalyticsDeviceType = 'mobile_phone' | 'tablet' | 'computer';

function createViewerKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function getViewerKey() {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE);
  if (existing) {
    return existing;
  }

  const nextKey = createViewerKey();
  window.localStorage.setItem(VIEWER_KEY_STORAGE, nextKey);
  return nextKey;
}

export function getViewerCountry() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem('location-storage');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { state?: { location?: string; isLocationDefault?: boolean } };
    const location = parsed.state?.location?.trim();
    if (!location || parsed.state?.isLocationDefault || location === 'Worldwide') {
      return null;
    }

    return location;
  } catch {
    return null;
  }
}

export function getDeviceType() {
  if (typeof window === 'undefined') {
    return 'computer' satisfies AnalyticsDeviceType;
  }

  const smallestSide = Math.min(window.innerWidth, window.innerHeight);
  if (smallestSide <= 768) {
    return 'mobile_phone' satisfies AnalyticsDeviceType;
  }

  if (smallestSide <= 1120) {
    return 'tablet' satisfies AnalyticsDeviceType;
  }

  return 'computer' satisfies AnalyticsDeviceType;
}

export function resolveTrafficSource(explicitSource?: string | null) {
  if (explicitSource) {
    return explicitSource as AnalyticsTrafficSource;
  }

  if (typeof window === 'undefined') {
    return 'direct_or_unknown' satisfies AnalyticsTrafficSource;
  }

  const params = new URLSearchParams(window.location.search);
  const source = params.get('src');
  if (source) {
    return source as AnalyticsTrafficSource;
  }

  const ref = params.get('ref');
  if (ref === 'share') {
    return 'share' satisfies AnalyticsTrafficSource;
  }

  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      if (referrerUrl.origin !== window.location.origin) {
        return 'external' satisfies AnalyticsTrafficSource;
      }
    } catch {
      return 'external' satisfies AnalyticsTrafficSource;
    }
  }

  return 'direct_or_unknown' satisfies AnalyticsTrafficSource;
}

export function getViewerAnalyticsContext(explicitSource?: string | null) {
  return {
    source: resolveTrafficSource(explicitSource),
    viewerKey: getViewerKey(),
    viewerCountry: getViewerCountry(),
    deviceType: getDeviceType(),
  };
}
