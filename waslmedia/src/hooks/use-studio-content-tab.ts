'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStudioStore } from '@/hooks/use-studio-store';
import { useProgressRouter } from '@/hooks/use-progress-router';

type StudioContentTab = 'videos' | 'shorts' | 'posts' | 'playlists';

function isStudioContentTab(value: string | null): value is StudioContentTab {
  return value === 'videos' || value === 'shorts' || value === 'posts' || value === 'playlists';
}

export function useStudioContentTab() {
  const router = useProgressRouter();
  const searchParams = useSearchParams();
  const storedActiveTab = useStudioStore((state) => state.activeContentTab);
  const setActiveContentTab = useStudioStore((state) => state.setActiveContentTab);
  const queryTab = searchParams?.get('tab') || null;
  const activeTab = isStudioContentTab(queryTab) ? queryTab : storedActiveTab;

  useEffect(() => {
    if (isStudioContentTab(queryTab)) {
      if (queryTab !== storedActiveTab) {
        setActiveContentTab(queryTab);
      }
    }
  }, [queryTab, setActiveContentTab, storedActiveTab]);

  const setTab = (nextTab: string) => {
    if (!isStudioContentTab(nextTab)) {
      return;
    }

    if (nextTab === activeTab) {
      return;
    }

    setActiveContentTab(nextTab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', nextTab);
    router.replace(`/studio/upload?${params.toString()}`, { scroll: false });
  };

  return {
    activeTab,
    setActiveTab: setTab,
  };
}
