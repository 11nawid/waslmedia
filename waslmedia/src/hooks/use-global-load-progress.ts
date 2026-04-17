'use client';

import { create } from 'zustand';

export type GlobalLoadMode = 'idle' | 'navigating' | 'refreshing' | 'reloading';
export type ApiProgressMode = 'foreground' | 'silent';

type GlobalLoadProgressState = {
  mode: GlobalLoadMode;
  progress: number;
  isVisible: boolean;
  activeForegroundRequests: number;
  activeLoadingBoundaries: number;
  lastTargetUrl: string | null;
  awaitingRouteCommit: boolean;
  startedAt: number;
  startTransition: (mode: Exclude<GlobalLoadMode, 'idle'>, options?: { targetUrl?: string | null; awaitRouteCommit?: boolean }) => void;
  markRouteCommitted: (routeKey: string) => void;
  incrementForegroundRequests: () => void;
  decrementForegroundRequests: () => void;
  incrementLoadingBoundaries: () => void;
  decrementLoadingBoundaries: () => void;
  completeIfReady: () => boolean;
  reset: () => void;
};

const STARTING_PROGRESS = 10;
const MAX_TRICKLE_PROGRESS = 94;
const FINISHING_DELAY_MS = 220;
const MIN_REFRESH_VISIBLE_MS = 180;
const ROUTE_COMMIT_GRACE_MS = 1800;
const FORCE_COMPLETE_AFTER_MS = 8000;
const PRELOAD_PROGRESS_STORAGE_KEY = 'waslmedia:reload-progress';
const PRELOAD_PROGRESS_ATTRIBUTE = 'data-global-reload-progress';

let trickleTimer: number | null = null;
let finishTimer: number | null = null;
let completionProbeTimer: number | null = null;

function stopTrickle() {
  if (trickleTimer !== null) {
    window.clearInterval(trickleTimer);
    trickleTimer = null;
  }
}

function stopFinishTimer() {
  if (finishTimer !== null) {
    window.clearTimeout(finishTimer);
    finishTimer = null;
  }
}

function stopCompletionProbe() {
  if (completionProbeTimer !== null) {
    window.clearTimeout(completionProbeTimer);
    completionProbeTimer = null;
  }
}

function startTrickle() {
  if (typeof window === 'undefined' || trickleTimer !== null) {
    return;
  }

  trickleTimer = window.setInterval(() => {
    const state = useGlobalLoadProgressStore.getState();
    if (!state.isVisible || state.mode === 'idle') {
      stopTrickle();
      return;
    }

    if (state.progress >= MAX_TRICKLE_PROGRESS) {
      return;
    }

    const remaining = MAX_TRICKLE_PROGRESS - state.progress;
    const increment =
      remaining > 36
        ? 8
        : remaining > 20
          ? 5
          : remaining > 10
            ? 3
            : 1.2;

    useGlobalLoadProgressStore.setState({
      progress: Math.min(MAX_TRICKLE_PROGRESS, Number((state.progress + increment).toFixed(2))),
    });
  }, 170);
}

function finalizeProgress() {
  stopTrickle();
  stopCompletionProbe();
  stopFinishTimer();
  useGlobalLoadProgressStore.setState({ progress: 100 });
  finishTimer = window.setTimeout(() => {
    useGlobalLoadProgressStore.setState({
      mode: 'idle',
      progress: 0,
      isVisible: false,
      activeForegroundRequests: 0,
      activeLoadingBoundaries: 0,
      lastTargetUrl: null,
      awaitingRouteCommit: false,
      startedAt: 0,
    });
    stopFinishTimer();
  }, FINISHING_DELAY_MS);
}

function canComplete(state: GlobalLoadProgressState) {
  if (!state.isVisible || state.mode === 'idle') {
    return false;
  }

  if (state.awaitingRouteCommit) {
    const isPastCommitGrace =
      state.mode === 'navigating' &&
      state.activeForegroundRequests === 0 &&
      state.activeLoadingBoundaries === 0 &&
      Date.now() - state.startedAt >= ROUTE_COMMIT_GRACE_MS;

    if (!isPastCommitGrace) {
      return false;
    }
  }

  if (state.activeForegroundRequests > 0 || state.activeLoadingBoundaries > 0) {
    return false;
  }

  if (
    (state.mode === 'refreshing' || state.mode === 'reloading') &&
    Date.now() - state.startedAt < MIN_REFRESH_VISIBLE_MS
  ) {
    return false;
  }

  return true;
}

function canForceComplete(state: GlobalLoadProgressState) {
  if (!state.isVisible || state.mode === 'idle') {
    return false;
  }

  if (typeof document !== 'undefined' && document.readyState !== 'complete') {
    return false;
  }

  return Date.now() - state.startedAt >= FORCE_COMPLETE_AFTER_MS;
}

function requestCompletionProbe(attempts = 18, delayMs = 90) {
  if (typeof window === 'undefined') {
    return;
  }

  stopCompletionProbe();

  const tick = (remaining: number) => {
    completionProbeTimer = window.setTimeout(() => {
      completionProbeTimer = null;
      const completed = useGlobalLoadProgressStore.getState().completeIfReady();
      if (!completed && remaining > 1 && useGlobalLoadProgressStore.getState().isVisible) {
        tick(remaining - 1);
      }
    }, delayMs);
  };

  tick(attempts);
}

export const useGlobalLoadProgressStore = create<GlobalLoadProgressState>((set, get) => ({
  mode: 'idle',
  progress: 0,
  isVisible: false,
  activeForegroundRequests: 0,
  activeLoadingBoundaries: 0,
  lastTargetUrl: null,
  awaitingRouteCommit: false,
  startedAt: 0,
  startTransition: (mode, options) => {
    stopFinishTimer();

    set((state) => ({
      mode,
      isVisible: true,
      progress: state.isVisible ? Math.max(state.progress, STARTING_PROGRESS) : STARTING_PROGRESS,
      lastTargetUrl: options?.targetUrl || null,
      awaitingRouteCommit: options?.awaitRouteCommit ?? mode === 'navigating',
      startedAt: Date.now(),
    }));

    startTrickle();
    requestCompletionProbe();
  },
  markRouteCommitted: () => {
    if (get().mode === 'idle') {
      return;
    }

    set({ awaitingRouteCommit: false });
    requestCompletionProbe(12, 60);
  },
  incrementForegroundRequests: () => {
    set((state) => ({
      activeForegroundRequests: state.activeForegroundRequests + 1,
      isVisible: state.isVisible || state.mode !== 'idle',
      progress:
        state.isVisible || state.mode !== 'idle'
          ? Math.max(state.progress, STARTING_PROGRESS)
          : STARTING_PROGRESS,
    }));
    startTrickle();
  },
  decrementForegroundRequests: () => {
    set((state) => ({
      activeForegroundRequests: Math.max(0, state.activeForegroundRequests - 1),
    }));
    requestCompletionProbe();
  },
  incrementLoadingBoundaries: () => {
    set((state) => ({
      activeLoadingBoundaries: state.activeLoadingBoundaries + 1,
      isVisible: true,
      progress: Math.max(state.progress, STARTING_PROGRESS),
    }));
    startTrickle();
  },
  decrementLoadingBoundaries: () => {
    set((state) => ({
      activeLoadingBoundaries: Math.max(0, state.activeLoadingBoundaries - 1),
    }));
    requestCompletionProbe();
  },
  completeIfReady: () => {
    const state = get();
    if (!canComplete(state)) {
      if (!canForceComplete(state)) {
        return false;
      }
    }

    finalizeProgress();
    return true;
  },
  reset: () => {
    stopTrickle();
    stopFinishTimer();
    stopCompletionProbe();
    set({
      mode: 'idle',
      progress: 0,
      isVisible: false,
      activeForegroundRequests: 0,
      activeLoadingBoundaries: 0,
      lastTargetUrl: null,
      awaitingRouteCommit: false,
      startedAt: 0,
    });
  },
}));

function normalizeUrl(input: string | URL) {
  if (typeof window === 'undefined') {
    return typeof input === 'string' ? input : input.toString();
  }

  const resolved = new URL(typeof input === 'string' ? input : input.toString(), window.location.href);
  resolved.hash = '';
  return resolved.toString();
}

export function beginGlobalNavigation(targetUrl?: string | URL | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = targetUrl ? normalizeUrl(targetUrl) : null;
  const currentUrl = normalizeUrl(window.location.href);
  if (nextUrl && nextUrl === currentUrl) {
    return;
  }

  useGlobalLoadProgressStore
    .getState()
    .startTransition('navigating', { targetUrl: nextUrl, awaitRouteCommit: true });
}

export function beginGlobalRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  useGlobalLoadProgressStore
    .getState()
    .startTransition('refreshing', { targetUrl: normalizeUrl(window.location.href), awaitRouteCommit: false });
  requestCompletionProbe(24, 100);
}

export function noteGlobalRouteCommit(routeKey: string) {
  useGlobalLoadProgressStore.getState().markRouteCommitted(routeKey);
}

export function beginForegroundRequest(mode: ApiProgressMode = 'foreground') {
  if (mode !== 'foreground') {
    return;
  }

  useGlobalLoadProgressStore.getState().incrementForegroundRequests();
}

export function endForegroundRequest(mode: ApiProgressMode = 'foreground') {
  if (mode !== 'foreground') {
    return;
  }

  useGlobalLoadProgressStore.getState().decrementForegroundRequests();
}

export async function trackGlobalForegroundTask<T>(
  task: Promise<T> | (() => Promise<T>),
  mode: ApiProgressMode = 'foreground'
) {
  if (mode !== 'foreground') {
    return typeof task === 'function' ? task() : task;
  }

  beginForegroundRequest(mode);

  try {
    return await (typeof task === 'function' ? task() : task);
  } finally {
    endForegroundRequest(mode);
  }
}

export function beginLoadingBoundarySignal() {
  useGlobalLoadProgressStore.getState().incrementLoadingBoundaries();
}

export function endLoadingBoundarySignal() {
  useGlobalLoadProgressStore.getState().decrementLoadingBoundaries();
}

export function clearReloadBootstrapProgress() {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.removeAttribute(PRELOAD_PROGRESS_ATTRIBUTE);
  try {
    window.sessionStorage.removeItem(PRELOAD_PROGRESS_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function getReloadBootstrapScript() {
  return `
    (() => {
      try {
        const key = '${PRELOAD_PROGRESS_STORAGE_KEY}';
        const attr = '${PRELOAD_PROGRESS_ATTRIBUTE}';
        if (window.sessionStorage.getItem(key) === '1') {
          document.documentElement.setAttribute(attr, '1');
        }
        window.addEventListener('beforeunload', () => {
          window.sessionStorage.setItem(key, '1');
          document.documentElement.setAttribute(attr, '1');
        });
      } catch (error) {
        // Ignore storage access failures.
      }
    })();
  `;
}
