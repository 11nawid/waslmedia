import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { authorizeVideoMediaRequest, parseVideoRenditions, toWebStream } from '@/server/services/video-media';
import { getPlaybackCookieName } from '@/server/utils/media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ videoId: string; segmentPath: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { videoId, segmentPath } = await context.params;
  const resourcePath = segmentPath.join('/');
  const [variantId, ...rest] = segmentPath;
  const segmentFile = rest.join('/');
  const token = request.nextUrl.searchParams.get('token') || request.cookies.get(getPlaybackCookieName(videoId))?.value;

  const loaded = await authorizeVideoMediaRequest(videoId, 'segment', token, {
    resource: resourcePath,
  });

  if ('error' in loaded) {
    return loaded.error;
  }

  const rendition = parseVideoRenditions(loaded.asset?.renditions_json).find((item) => item.id === variantId);
  if (!rendition || !loaded.asset?.manifest_bucket || !segmentFile) {
    return NextResponse.json({ error: 'SEGMENT_NOT_FOUND' }, { status: 404 });
  }

  const segmentObjectKey = `${rendition.playlistKey.replace(/index\.m3u8$/, '')}${segmentFile}`;
  const storageResponse = await getObjectFromStorage({
    bucket: loaded.asset.manifest_bucket,
    objectKey: segmentObjectKey,
  });

  if (!storageResponse.Body) {
    return NextResponse.json({ error: 'SEGMENT_STREAM_UNAVAILABLE' }, { status: 404 });
  }

  return new Response(toWebStream(storageResponse.Body), {
    headers: {
      'Content-Type': storageResponse.ContentType || 'video/mp2t',
      'Cache-Control': loaded.isPrivate ? 'private, no-store' : 'private, max-age=300',
    },
  });
}
