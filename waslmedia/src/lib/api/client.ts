import type { ApiProgressMode } from '@/hooks/use-global-load-progress';
import { beginForegroundRequest, endForegroundRequest } from '@/hooks/use-global-load-progress';

export const AUTH_SYNC_EVENT = 'waslmedia:auth-sync';
export const AUTH_SYNC_STORAGE_KEY = 'waslmedia:auth-sync:stamp';

const inflightGetRequests = new Map<string, Promise<unknown>>();

type ApiRequestInit = RequestInit & {
  progressMode?: ApiProgressMode;
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'REQUEST_FAILED');
  }

  return payload;
}

function buildGetCacheKey(path: string, init?: RequestInit) {
  const headers =
    init?.headers instanceof Headers
      ? Array.from(init.headers.entries())
      : Array.isArray(init?.headers)
        ? init.headers
        : Object.entries(init?.headers || {});

  return JSON.stringify({
    path,
    credentials: init?.credentials || 'include',
    cache: init?.cache || 'default',
    headers: headers.sort(([left], [right]) => left.localeCompare(right)),
  });
}

export function invalidateApiGet(match?: string | RegExp | ((key: string) => boolean)) {
  for (const key of inflightGetRequests.keys()) {
    const shouldDelete =
      match === undefined
        ? true
        : typeof match === 'string'
          ? key.includes(match)
          : match instanceof RegExp
            ? match.test(key)
            : match(key);

    if (shouldDelete) {
      inflightGetRequests.delete(key);
    }
  }
}

export async function apiGet<T>(path: string, init: ApiRequestInit = {}) {
  const cacheKey = buildGetCacheKey(path, init);
  const cachedRequest = inflightGetRequests.get(cacheKey);
  if (cachedRequest) {
    return cachedRequest as Promise<T>;
  }

  const progressMode = (init as ApiRequestInit).progressMode || 'foreground';
  const { progressMode: _progressMode, ...requestInit } = init;
  beginForegroundRequest(progressMode);
  const request = fetch(path, {
    credentials: 'include',
    cache: init.cache || 'default',
    ...requestInit,
  })
    .then((response) => parseResponse(response) as Promise<T>)
    .catch((error) => {
      inflightGetRequests.delete(cacheKey);
      throw error;
    })
    .finally(() => {
      endForegroundRequest(progressMode);
    });

  inflightGetRequests.set(cacheKey, request as Promise<unknown>);
  return request.finally(() => {
    inflightGetRequests.delete(cacheKey);
  });
}

export async function apiSend<T>(path: string, init: ApiRequestInit = {}) {
  invalidateApiGet();
  const progressMode = init.progressMode || 'foreground';
  const { progressMode: _progressMode, ...requestInit } = init;
  beginForegroundRequest(progressMode);
  try {
    const response = await fetch(path, {
      credentials: 'include',
      ...requestInit,
    });
    return (await parseResponse(response)) as T;
  } finally {
    endForegroundRequest(progressMode);
  }
}

export function syncAuthState() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
    try {
      window.localStorage.setItem(AUTH_SYNC_STORAGE_KEY, String(Date.now()));
    } catch (error) {
      console.warn('Failed to persist auth sync stamp', error);
    }
  }
}
