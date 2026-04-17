'use client';

const tokenCache = new Map<string, Promise<string>>();

async function getRealtimeToken(scope: string) {
  const cached = tokenCache.get(scope);
  if (cached) {
    return cached;
  }

  const request = fetch(`/api/realtime/token?scope=${encodeURIComponent(scope)}`, {
    credentials: 'include',
    cache: 'no-store',
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.token !== 'string') {
        throw new Error(payload.error || 'REALTIME_TOKEN_REQUEST_FAILED');
      }
      return payload.token as string;
    })
    .catch((error) => {
      tokenCache.delete(scope);
      throw error;
    });

  tokenCache.set(scope, request);
  return request;
}

export function subscribeToSignedRealtimeScope(
  scope: string,
  eventName: string,
  onEvent: () => void
) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let closed = false;

  getRealtimeToken(scope)
    .then((token) => {
      if (closed) {
        return;
      }

      eventSource = new EventSource(`/api/realtime?token=${encodeURIComponent(token)}`);
      eventSource.addEventListener(eventName, onEvent);
    })
    .catch((error) => {
      console.error(`Failed to subscribe to realtime scope ${scope}`, error);
    });

  return () => {
    closed = true;
    eventSource?.close();
  };
}
