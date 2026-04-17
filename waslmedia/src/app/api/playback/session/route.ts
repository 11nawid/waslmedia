import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { createPlaybackSession } from '@/server/services/playback-sessions';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();

  const body = await request.json().catch(() => null);
  const videoId = typeof body?.videoId === 'string' ? body.videoId : '';
  const mode =
    body?.mode === 'preview' || body?.mode === 'shorts' || body?.mode === 'owner-download' ? body.mode : 'watch';

  if (!videoId) {
    return NextResponse.json({ error: 'VIDEO_ID_REQUIRED' }, { status: 400 });
  }

  const session = await createPlaybackSession(request, videoId, mode);
  if ('error' in session) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  return NextResponse.json(session);
}
