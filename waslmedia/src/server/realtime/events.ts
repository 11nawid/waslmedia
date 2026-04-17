import { getRedisClient, getRedisSubscriber } from '@/server/redis';

type RealtimeEvent = {
  type: string;
  scope: string;
  payload?: Record<string, unknown>;
};

type Listener = (event: RealtimeEvent) => void;

const listeners = new Map<string, Set<Listener>>();
let subscriberInitialized = false;

function getRedisScope(scope: string) {
  return `realtime:${scope}`;
}

async function ensureRealtimeSubscriber() {
  if (subscriberInitialized) {
    return;
  }

  const subscriber = getRedisSubscriber();
  subscriber.on('message', (channel, message) => {
    if (!channel.startsWith('realtime:')) {
      return;
    }

    const scope = channel.slice('realtime:'.length);
    const scopedListeners = listeners.get(scope);
    if (!scopedListeners?.size) {
      return;
    }

    try {
      const event = JSON.parse(message) as RealtimeEvent;
      for (const listener of scopedListeners) {
        listener(event);
      }
    } catch (error) {
      console.error('Failed to parse realtime event payload', error);
    }
  });
  subscriberInitialized = true;
}

export async function publishRealtimeEvent(scope: string, type: string, payload?: Record<string, unknown>) {
  const event = { type, scope, payload };
  await getRedisClient().publish(getRedisScope(scope), JSON.stringify(event));
}

export function subscribeToRealtimeScope(scope: string, listener: Listener) {
  void ensureRealtimeSubscriber();
  const scopedListeners = listeners.get(scope) || new Set<Listener>();
  const shouldSubscribe = scopedListeners.size === 0;
  scopedListeners.add(listener);
  listeners.set(scope, scopedListeners);
  if (shouldSubscribe) {
    void getRedisSubscriber().subscribe(getRedisScope(scope));
  }

  return () => {
    const current = listeners.get(scope);
    if (!current) {
      return;
    }

    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(scope);
      void getRedisSubscriber().unsubscribe(getRedisScope(scope));
    }
  };
}
