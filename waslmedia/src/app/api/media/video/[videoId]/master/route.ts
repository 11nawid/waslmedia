import { NextRequest, NextResponse } from 'next/server';
import { authorizeVideoMediaRequest, parseVideoRenditions } from '@/server/services/video-media';
import { buildVideoVariantUrl, getPlaybackCookieName } from '@/server/utils/media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { videoId } = await context.params;
  const token = request.nextUrl.searchParams.get('token') || request.cookies.get(getPlaybackCookieName(videoId))?.value;
  const loaded = await authorizeVideoMediaRequest(videoId, 'manifest', token);

  if ('error' in loaded) {
    return loaded.error;
  }

  const renditions = parseVideoRenditions(loaded.asset?.renditions_json);
  if (renditions.length === 0) {
    return NextResponse.json({ error: 'PLAYBACK_NOT_READY' }, { status: 409 });
  }

  const playlist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...renditions.flatMap((rendition) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`,
      buildVideoVariantUrl(videoId, rendition.id, loaded.userId),
    ]),
    '',
  ].join('\n');

  return new Response(playlist, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': loaded.isPrivate ? 'private, no-store' : 'private, max-age=60',
    },
  });
}
