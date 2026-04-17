import { NextRequest } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { enforceRateLimit } from '@/server/rate-limit';
import { subscribeToRealtimeScope } from '@/server/realtime/events';
import { verifyRealtimeScopeToken } from '@/server/realtime/tokens';

export const runtime = 'nodejs';

function createEventStream(scope: string) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    start(controller) {
      const write = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      write('ready', { scope });

      unsubscribe = subscribeToRealtimeScope(scope, (event) => {
        write(event.type, event.payload || {});
      });

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);
    },
    cancel() {
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
      unsubscribe?.();
      unsubscribe = null;
    },
  });
}

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const authUser = await getCurrentAuthUser();
  const rateLimit = await enforceRateLimit(request, {
    key: 'realtime',
    limit: 60,
    windowSeconds: 60,
    discriminator: authUser?.id || undefined,
  });
  if (!rateLimit.allowed) {
    return new Response('Too many realtime requests', { status: 429 });
  }

  const token = request.nextUrl.searchParams.get('token');
  const tokenPayload = verifyRealtimeScopeToken(token, authUser?.id);
  const scope = tokenPayload?.scope || request.nextUrl.searchParams.get('scope');
  if (!scope) {
    return new Response('Missing realtime scope', { status: 400 });
  }

  const isRawScopeRequest = !tokenPayload;
  const ownerScope = scope.match(/^(analytics|studio):(.+)$/);
  if (ownerScope && authUser?.id !== ownerScope[2]) {
    return new Response('Forbidden realtime scope', { status: 403 });
  }
  if (isRawScopeRequest && !ownerScope) {
    return new Response('Realtime token required', { status: 403 });
  }

  return new Response(createEventStream(scope), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
