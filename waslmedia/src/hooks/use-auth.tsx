'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SplashScreen } from '@/components/splash-screen';
import { AUTH_SYNC_EVENT, AUTH_SYNC_STORAGE_KEY } from '@/lib/api/client';
import { AuthUser } from '@/lib/auth/types';
import { buildChannelHref } from '@/lib/channel-links';

const AUTH_CACHE_TTL_MS = 5000;

type AuthSnapshot = {
  user: AuthUser | null;
};

let authSnapshotCache: { snapshot: AuthSnapshot; fetchedAt: number } | null = null;
let authSnapshotPromise: Promise<AuthSnapshot> | null = null;

interface AuthContextType {
  user: AuthUser | null;
  userProfile: AuthUser | null;
  loading: boolean;
  authRefreshError: string | null;
  userChannelLink: string;
  isSubscribedTo: (channelId: string) => boolean;
  isInWatchLater: (videoId: string) => boolean;
  refreshAuth: (options?: { silent?: boolean; force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authRefreshError: null,
  userChannelLink: '/login',
  isSubscribedTo: () => false,
  isInWatchLater: () => false,
  refreshAuth: async () => {},
});

const AUTH_GATED_PATHS = [
  '/history',
  '/liked',
  '/playlists',
  '/subscriptions',
  '/watch-later',
  '/your-data',
  '/your-videos',
];

function shouldGateInitialRender(pathname: string) {
  if (!pathname) {
    return false;
  }

  if (pathname.startsWith('/studio')) {
    return true;
  }

  return AUTH_GATED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function primeAuthSnapshotCache(user: AuthUser | null) {
  authSnapshotCache = {
    snapshot: { user },
    fetchedAt: Date.now(),
  };
}

async function fetchAuthSnapshot(force = false): Promise<AuthSnapshot> {
  const now = Date.now();
  if (!force && authSnapshotCache && now - authSnapshotCache.fetchedAt < AUTH_CACHE_TTL_MS) {
    return authSnapshotCache.snapshot;
  }

  if (!force && authSnapshotPromise) {
    return authSnapshotPromise;
  }

  authSnapshotPromise = (async () => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'AUTH_REFRESH_FAILED');
    }

    const snapshot = { user: payload.user || null };
    authSnapshotCache = {
      snapshot,
      fetchedAt: Date.now(),
    };
    return snapshot;
  })();

  try {
    return await authSnapshotPromise;
  } finally {
    authSnapshotPromise = null;
  }
}

export function AuthProvider({ children, initialUser = null }: { children: ReactNode; initialUser?: AuthUser | null }) {
  const pathname = usePathname() || '';
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(initialUser ? false : true);
  const [hasBootstrapped, setHasBootstrapped] = useState(Boolean(initialUser));
  const [authRefreshError, setAuthRefreshError] = useState<string | null>(null);

  const refreshAuth = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;
    if (!silent) {
      setLoading(true);
    }

    try {
      const payload = await fetchAuthSnapshot(force);
      setAuthRefreshError(null);
      setUser(payload.user || null);
    } catch (error) {
      console.error('Failed to refresh auth state', error);
      setAuthRefreshError(error instanceof Error ? error.message : 'AUTH_REFRESH_FAILED');
      setUser((current) => current);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (initialUser) {
      primeAuthSnapshotCache(initialUser);
      return;
    }

    authSnapshotCache = null;
    void refreshAuth();
  }, [initialUser, refreshAuth]);

  useEffect(() => {
    if (!loading) {
      setHasBootstrapped(true);
    }
  }, [loading]);

  useEffect(() => {
    const handleAuthSync = () => {
      void refreshAuth({ silent: true, force: true });
    };

    window.addEventListener(AUTH_SYNC_EVENT, handleAuthSync);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, handleAuthSync);
  }, [refreshAuth]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SYNC_STORAGE_KEY) {
        void refreshAuth({ silent: true, force: true });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshAuth]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const refreshSilently = () => {
      void refreshAuth({ silent: true });
    };

    const intervalId = window.setInterval(refreshSilently, 1000 * 60 * 10);
    const handleFocus = () => refreshSilently();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAuth, user]);

  const userChannelLink = user ? buildChannelHref(user.handle) : '/login';

  const isSubscribedTo = useCallback(
    (channelId: string) => user?.subscriptions.includes(channelId) || false,
    [user]
  );

  const isInWatchLater = useCallback(
    (videoId: string) => user?.watchLater.includes(videoId) || false,
    [user]
  );

  if (loading && !hasBootstrapped && shouldGateInitialRender(pathname)) {
    return <SplashScreen />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile: user,
        loading,
        authRefreshError,
        userChannelLink,
        isSubscribedTo,
        isInWatchLater,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
