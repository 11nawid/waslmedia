'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  clearReloadBootstrapProgress,
  noteGlobalRouteCommit,
  useGlobalLoadProgressStore,
  beginGlobalNavigation,
} from '@/hooks/use-global-load-progress';

function shouldTrackAnchorClick(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (anchor.target && anchor.target !== '_self') {
    return false;
  }

  if (anchor.hasAttribute('download') || anchor.getAttribute('rel')?.includes('external')) {
    return false;
  }

  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  const resolved = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);
  resolved.hash = '';
  current.hash = '';

  return resolved.origin === current.origin && resolved.toString() !== current.toString();
}

export function GlobalLoadProgress() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const progress = useGlobalLoadProgressStore((state) => state.progress);
  const isVisible = useGlobalLoadProgressStore((state) => state.isVisible);
  const routeKey = useMemo(() => {
    const query = searchParams?.toString() || '';
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);
  const previousRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    clearReloadBootstrapProgress();
  }, []);

  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) {
      return;
    }

    previousRouteKeyRef.current = routeKey;
    noteGlobalRouteCommit(routeKey);
  }, [routeKey]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const anchor = target instanceof Element ? target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!shouldTrackAnchorClick(anchor, event)) {
        return;
      }

      beginGlobalNavigation(anchor.href);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[4px] overflow-hidden"
      aria-hidden="true"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 160ms ease-out',
      }}
    >
      <div className="absolute inset-0 bg-white/12 dark:bg-white/10" />
      <div
        className="relative h-full origin-left rounded-r-full bg-[linear-gradient(90deg,rgba(255,70,70,0.98)_0%,rgba(76,166,255,0.98)_100%)] shadow-[0_0_20px_rgba(76,166,255,0.45)] transition-[transform,opacity] duration-200 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: `scaleX(${Math.max(0, Math.min(1, progress / 100))})`,
        }}
      >
        <div className="absolute inset-y-0 right-0 w-12 bg-white/45 blur-[6px]" />
      </div>
    </div>
  );
}
