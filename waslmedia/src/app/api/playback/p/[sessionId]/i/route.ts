import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildMasterPlaylist, loadPlaybackSession } from '@/server/services/playback-sessions';
import { createPlaybackDeniedResponse } from '@/server/utils/playback-response';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { sessionId } = await context.params;
  const loaded = await loadPlaybackSession(request, sessionId);

  if ('error' in loaded) {
    return createPlaybackDeniedResponse(loaded.status);
  }

  const playlist = buildMasterPlaylist(sessionId, loaded.payload.variants);
  return new Response(playlist, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'private, no-store',
    },
  });
}
