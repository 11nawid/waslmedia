
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchChannelAnalytics } from '@/lib/analytics/client';
import { useStudioSession, useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';

export function LiveSubscriberCounter() {
  const { viewer } = useStudioSession();
  const [count, setCount] = useState<number | null>(null);

  const loadCount = useCallback(async () => {
    if (!viewer) {
      return;
    }

    const analytics = await fetchChannelAnalytics(viewer.id);
    setCount(analytics.totalSubscribers ?? 0);
  }, [viewer]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    return () => {
      setCount(null);
    };
  }, [viewer]);

  useEffect(() => {
    loadCount().catch(console.error);
  }, [loadCount]);

  useStudioRealtimeEvent('analytics.updated', () => {
    loadCount().catch(console.error);
  });

  if (count === null) {
    return <Skeleton className="h-24 w-full" />;
  }

  const countString = count.toLocaleString();

  return (
    <div className="flex items-center justify-center p-8 bg-secondary/50 rounded-lg overflow-hidden">
        <AnimatePresence mode="popLayout">
             <motion.div
                key={countString}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="text-7xl font-bold tracking-tighter"
             >
                {countString}
             </motion.div>
        </AnimatePresence>
    </div>
  );
}
