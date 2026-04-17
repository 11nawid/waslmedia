import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getObjectFromStorage } from '@/lib/storage/server';
import { loadPlaybackSession } from '@/server/services/playback-sessions';
import { toWebStream } from '@/server/services/video-media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { sessionId } = await context.params;
  const loaded = await loadPlaybackSession(request, sessionId, { skipAccessKey: true });

  if ('error' in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  if (!loaded.payload.thumbnail) {
    return NextResponse.json({ error: 'PLAYBACK_THUMBNAIL_NOT_FOUND' }, { status: 404 });
  }

  const storageResponse = await getObjectFromStorage({
    bucket: loaded.payload.thumbnail.bucket,
    objectKey: loaded.payload.thumbnail.objectKey,
  });

  if (!storageResponse.Body) {
    return NextResponse.json({ error: 'PLAYBACK_THUMBNAIL_NOT_FOUND' }, { status: 404 });
  }

  return new Response(toWebStream(storageResponse.Body), {
    headers: {
      'Content-Type': storageResponse.ContentType || 'image/jpeg',
      'Cache-Control': 'private, no-store',
    },
  });
}
