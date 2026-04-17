import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { authorizeVideoMediaRequest, parseVideoRenditions } from '@/server/services/video-media';
import { buildVideoSegmentUrl, getPlaybackCookieName } from '@/server/utils/media';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ videoId: string; variantId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { videoId, variantId } = await context.params;
  const token = request.nextUrl.searchParams.get('token') || request.cookies.get(getPlaybackCookieName(videoId))?.value;
  const loaded = await authorizeVideoMediaRequest(videoId, 'manifest', token, {
    resource: variantId,
  });

  if ('error' in loaded) {
    return loaded.error;
  }

  const rendition = parseVideoRenditions(loaded.asset?.renditions_json).find((item) => item.id === variantId);
  if (!rendition || !loaded.asset?.manifest_bucket) {
    return NextResponse.json({ error: 'VARIANT_NOT_FOUND' }, { status: 404 });
  }

  const playlistResponse = await getObjectFromStorage({
    bucket: loaded.asset.manifest_bucket,
    objectKey: rendition.playlistKey,
  });

  if (!playlistResponse.Body) {
    return NextResponse.json({ error: 'VARIANT_PLAYLIST_NOT_FOUND' }, { status: 404 });
  }

  const playlistContent = Buffer.from(await playlistResponse.Body.transformToByteArray()).toString('utf8');
  const rewrittenPlaylist = playlistContent
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      return buildVideoSegmentUrl(videoId, `${variantId}/${trimmed}`, loaded.userId);
    })
    .join('\n');

  return new Response(rewrittenPlaylist, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': loaded.isPrivate ? 'private, no-store' : 'private, max-age=60',
    },
  });
}
