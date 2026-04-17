import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { authorizeVideoMediaRequest, resolveSourceLocation, toWebStream } from '@/server/services/video-media';
import { getPlaybackCookieName } from '@/server/utils/media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

function buildStreamHeaders(response: Awaited<ReturnType<typeof getObjectFromStorage>>, isPrivate: boolean) {
  const headers = new Headers();
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', response.ContentType || 'video/mp4');
  headers.set('Content-Disposition', 'inline');
  headers.set('Cache-Control', isPrivate ? 'private, no-store' : 'private, max-age=300');

  if (typeof response.ContentLength === 'number') {
    headers.set('Content-Length', String(response.ContentLength));
  }

  if (response.ContentRange) {
    headers.set('Content-Range', response.ContentRange);
  }

  if (response.ETag) {
    headers.set('ETag', response.ETag);
  }

  if (response.LastModified) {
    headers.set('Last-Modified', response.LastModified.toUTCString());
  }

  return headers;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { videoId } = await context.params;
  const token = request.nextUrl.searchParams.get('token') || request.cookies.get(getPlaybackCookieName(videoId))?.value;
  const loaded = await authorizeVideoMediaRequest(videoId, 'source', token);

  if ('error' in loaded) {
    return loaded.error;
  }

  const source = resolveSourceLocation(loaded.row.video_url, loaded.asset);
  if (!source) {
    return NextResponse.json({ error: 'VIDEO_SOURCE_NOT_FOUND' }, { status: 404 });
  }

  const range = request.headers.get('range') || undefined;
  const storageResponse = await getObjectFromStorage({
    bucket: source.bucket,
    objectKey: source.objectKey,
    range,
  });

  if (!storageResponse.Body) {
    return NextResponse.json({ error: 'VIDEO_STREAM_UNAVAILABLE' }, { status: 404 });
  }

  return new Response(toWebStream(storageResponse.Body), {
    status: storageResponse.ContentRange ? 206 : 200,
    headers: buildStreamHeaders(storageResponse, loaded.row.visibility === 'private'),
  });
}
