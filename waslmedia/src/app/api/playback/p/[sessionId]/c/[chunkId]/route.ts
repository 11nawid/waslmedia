import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getObjectFromStorage } from '@/lib/storage/server';
import { loadPlaybackSession } from '@/server/services/playback-sessions';
import { toWebStream } from '@/server/services/video-media';
import { createPlaybackDeniedResponse, createPlaybackNotFoundResponse } from '@/server/utils/playback-response';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string; chunkId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { sessionId, chunkId } = await context.params;
  const loaded = await loadPlaybackSession(request, sessionId);

  if ('error' in loaded) {
    return createPlaybackDeniedResponse(loaded.status);
  }

  const descriptor = Object.values(loaded.payload.variants).find((variant) => variant.chunks[chunkId])?.chunks[chunkId];
  if (!descriptor) {
    return createPlaybackNotFoundResponse();
  }
  if (!loaded.payload.manifestBucket) {
    return createPlaybackNotFoundResponse();
  }

  const storageResponse = await getObjectFromStorage({
    bucket: loaded.payload.manifestBucket,
    objectKey: descriptor.objectKey,
  });

  if (!storageResponse.Body) {
    return createPlaybackNotFoundResponse();
  }

  return new Response(toWebStream(storageResponse.Body), {
    headers: {
      'Content-Type': descriptor.contentType,
      'Cache-Control': 'private, no-store',
    },
  });
}
