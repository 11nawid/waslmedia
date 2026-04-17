import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { sendStudioAiChat, streamStudioAiChat } from '@/server/services/studio-ai';
import { enforceRateLimit } from '@/server/utils/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimit = enforceRateLimit(request, 'studio-ai:chat', 40, 1000 * 60 * 10);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const wantsStream = Boolean(body.stream);

  try {
    if (wantsStream) {
      const stream = await streamStudioAiChat({
        userId: auth.user.id,
        messages: body.messages,
        pagePath: typeof body.pagePath === 'string' ? body.pagePath : null,
        pageOrigin: typeof body.pageOrigin === 'string' ? body.pageOrigin : null,
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const reply = await sendStudioAiChat({
      userId: auth.user.id,
      messages: body.messages,
      pagePath: typeof body.pagePath === 'string' ? body.pagePath : null,
      pageOrigin: typeof body.pageOrigin === 'string' ? body.pageOrigin : null,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'AI_CHAT_FAILED';
    if (code === 'AI_SETTINGS_REQUIRED' || code.startsWith('INVALID_') || code === 'AI_EMPTY_RESPONSE') {
      return NextResponse.json({ error: code }, { status: 400 });
    }

    return NextResponse.json({ error: 'AI_CHAT_FAILED' }, { status: 500 });
  }
}
