'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { beginGlobalNavigation, beginGlobalRefresh } from '@/hooks/use-global-load-progress';

type RouterLikeHref = string | URL;

export function useProgressRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (href: RouterLikeHref, options?: { scroll?: boolean }) => {
        beginGlobalNavigation(href);
        router.push(typeof href === 'string' ? href : href.toString(), options);
      },
      replace: (href: RouterLikeHref, options?: { scroll?: boolean }) => {
        beginGlobalNavigation(href);
        router.replace(typeof href === 'string' ? href : href.toString(), options);
      },
      back: () => {
        beginGlobalNavigation();
        router.back();
      },
      forward: () => {
        beginGlobalNavigation();
        router.forward();
      },
      refresh: () => {
        beginGlobalRefresh();
        router.refresh();
      },
    }),
    [router]
  );
}
