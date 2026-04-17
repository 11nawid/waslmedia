'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useStudioStore } from '@/hooks/use-studio-store';
import { fetchChannelAnalytics, subscribeToAnalyticsScope } from '@/lib/analytics/client';
import type { ChannelAnalytics } from '@/lib/analytics/types';

export function useChannelAnalyticsData(days = 28) {
  const { user } = useAuth();
  const cachedAnalytics = useStudioStore((state) => state.channelAnalytics);
  const setChannelAnalyticsCache = useStudioStore((state) => state.setChannelAnalyticsCache);
  const canUseCache = days === 28;
  const [data, setData] = useState<ChannelAnalytics | null>(canUseCache ? cachedAnalytics.data : null);
  const [loading, setLoading] = useState(canUseCache ? !cachedAnalytics.loaded : true);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      const analytics = await fetchChannelAnalytics(user.uid, days);
      if (!active) {
        return;
      }

      setData(analytics);
      if (canUseCache) {
        setChannelAnalyticsCache(analytics);
      }
      setLoading(false);
    };

    if (!canUseCache || !cachedAnalytics.loaded) {
      setLoading(true);
    }

    load().catch((error) => {
      console.error('Failed to load channel analytics:', error);
      if (active) {
        setLoading(false);
      }
    });

    const unsubscribe = subscribeToAnalyticsScope(`analytics:${user.uid}`, () => {
      load().catch(console.error);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [cachedAnalytics.loaded, canUseCache, days, setChannelAnalyticsCache, user]);

  return { data, loading, user };
}
