'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { AuthUser } from '@/lib/auth/types';

type StudioRealtimeEventName =
  | 'analytics.updated'
  | 'videos.updated'
  | 'posts.updated'
  | 'playlists.updated'
  | 'channel.updated'
  | 'comments.updated';

interface StudioSessionContextValue {
  viewer: AuthUser | null;
  subscribe: (eventName: StudioRealtimeEventName, callback: () => void) => () => void;
}

const STUDIO_EVENT_NAMES: StudioRealtimeEventName[] = [
  'analytics.updated',
  'videos.updated',
  'posts.updated',
  'playlists.updated',
  'channel.updated',
  'comments.updated',
];

const StudioSessionContext = createContext<StudioSessionContextValue>({
  viewer: null,
  subscribe: () => () => {},
});

export function StudioSessionProvider({
  children,
  viewer,
  studioToken,
}: {
  children: React.ReactNode;
  viewer: AuthUser | null;
  studioToken: string | null;
}) {
  const listenersRef = useRef(new Map<StudioRealtimeEventName, Set<() => void>>());

  useEffect(() => {
    if (!studioToken || typeof window === 'undefined') {
      return;
    }

    const eventSource = new EventSource(`/api/realtime?token=${encodeURIComponent(studioToken)}`);
    const cleanups = STUDIO_EVENT_NAMES.map((eventName) => {
      const handler = () => {
        const callbacks = listenersRef.current.get(eventName);
        callbacks?.forEach((callback) => callback());
      };

      eventSource.addEventListener(eventName, handler);
      return () => eventSource.removeEventListener(eventName, handler);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      eventSource.close();
    };
  }, [studioToken]);

  const subscribe = useCallback((eventName: StudioRealtimeEventName, callback: () => void) => {
    const scopedListeners = listenersRef.current.get(eventName) || new Set<() => void>();
    scopedListeners.add(callback);
    listenersRef.current.set(eventName, scopedListeners);

    return () => {
      const current = listenersRef.current.get(eventName);
      if (!current) {
        return;
      }

      current.delete(callback);
      if (current.size === 0) {
        listenersRef.current.delete(eventName);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      viewer,
      subscribe,
    }),
    [subscribe, viewer]
  );

  return <StudioSessionContext.Provider value={value}>{children}</StudioSessionContext.Provider>;
}

export function useStudioSession() {
  return useContext(StudioSessionContext);
}

export function useStudioRealtimeEvent(eventName: StudioRealtimeEventName, callback: () => void) {
  const { subscribe } = useStudioSession();

  useEffect(() => subscribe(eventName, callback), [callback, eventName, subscribe]);
}
