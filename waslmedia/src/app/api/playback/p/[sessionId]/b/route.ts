import { NextRequest } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getObjectFromStorage } from '@/lib/storage/server';
import { loadPlaybackSession } from '@/server/services/playback-sessions';
import { toWebStream } from '@/server/services/video-media';
import { createPlaybackDeniedResponse, createPlaybackNotFoundResponse } from '@/server/utils/playback-response';

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

  if (!loaded.payload.source) {
    return createPlaybackNotFoundResponse();
  }

  const storageResponse = await getObjectFromStorage({
    bucket: loaded.payload.source.bucket,
    objectKey: loaded.payload.source.objectKey,
    range: request.headers.get('range') || undefined,
  });

  if (!storageResponse.Body) {
    return createPlaybackNotFoundResponse();
  }

  const headers = new Headers({
    'Content-Type': storageResponse.ContentType || 'video/mp4',
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': storageResponse.AcceptRanges || 'bytes',
  });

  if (typeof storageResponse.ContentLength === 'number') {
    headers.set('Content-Length', String(storageResponse.ContentLength));
  }

  if (storageResponse.ContentRange) {
    headers.set('Content-Range', storageResponse.ContentRange);
  }

  return new Response(toWebStream(storageResponse.Body), {
    status: storageResponse.ContentRange ? 206 : 200,
    headers: {
      ...Object.fromEntries(headers.entries()),
    },
  });
}
