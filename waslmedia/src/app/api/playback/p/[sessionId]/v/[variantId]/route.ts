import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildVariantPlaylist, loadPlaybackSession } from '@/server/services/playback-sessions';
import { createPlaybackDeniedResponse, createPlaybackNotFoundResponse } from '@/server/utils/playback-response';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string; variantId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { sessionId, variantId } = await context.params;
  const loaded = await loadPlaybackSession(request, sessionId);

  if ('error' in loaded) {
    return createPlaybackDeniedResponse(loaded.status);
  }

  const variant = loaded.payload.variants[variantId];
  if (!variant) {
    return createPlaybackNotFoundResponse();
  }

  return new Response(buildVariantPlaylist(sessionId, variant), {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'private, no-store',
    },
  });
}
