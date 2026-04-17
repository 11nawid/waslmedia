'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'waslmedia:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;
const RECOVERY_PARAM = '__chunk_recover';

function collectErrorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name} ${error.message} ${error.stack || ''}`;
  if (typeof error === 'object') {
    const parts = Object.entries(error as Record<string, unknown>)
      .map(([, value]) => collectErrorText(value))
      .filter(Boolean);
    return parts.join(' ');
  }
  return String(error);
}

function isChunkLoadError(error: unknown, target?: EventTarget | null) {
  const message = collectErrorText(error);
  const targetSource =
    target instanceof HTMLScriptElement
      ? target.src
      : target instanceof HTMLLinkElement
        ? target.href
        : '';
  const haystack = `${message} ${targetSource}`;

  return (
    haystack.includes('ChunkLoadError') ||
    haystack.includes('Loading chunk') ||
    haystack.includes('Failed to fetch dynamically imported module') ||
    haystack.includes('/_next/static/chunks/') ||
    haystack.includes('webpack.js') ||
    haystack.includes('hot-update')
  );
}

function reloadOnce() {
  const currentTimestamp = Date.now();
  const lastReloadRaw = sessionStorage.getItem(RELOAD_KEY);
  const lastReloadAt = lastReloadRaw ? Number(lastReloadRaw) : 0;

  if (lastReloadAt && currentTimestamp - lastReloadAt < RELOAD_COOLDOWN_MS) {
    return;
  }

  sessionStorage.setItem(RELOAD_KEY, String(currentTimestamp));
  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_PARAM, String(currentTimestamp));
  window.location.replace(url.toString());
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error || event.message, event.target)) {
        reloadOnce();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnce();
      }
    };

    const handleResourceError = (event: Event) => {
      if (isChunkLoadError(undefined, event.target)) {
        reloadOnce();
      }
    };

    if (window.location.search.includes(`${RECOVERY_PARAM}=`)) {
      const url = new URL(window.location.href);
      url.searchParams.delete(RECOVERY_PARAM);
      window.history.replaceState(null, '', url.toString());
    }

    window.addEventListener('error', handleError);
    window.addEventListener('error', handleResourceError, true);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleResourceError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
