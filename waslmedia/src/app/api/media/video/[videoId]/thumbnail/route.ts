import { NextRequest, NextResponse } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { authorizeVideoMediaRequest, toWebStream } from '@/server/services/video-media';
import { getPlaybackCookieName, verifyVideoThumbnailAccessKey } from '@/server/utils/media';
import { parseStorageUrl } from '@/lib/storage/shared';
import { createPlaybackDeniedResponse } from '@/server/utils/playback-response';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { videoId } = await context.params;
  const token = request.nextUrl.searchParams.get('token') || request.cookies.get(getPlaybackCookieName(videoId))?.value;
  const accessKey = request.headers.get('x-wasl-asset-key') || request.nextUrl.searchParams.get('k');
  if (!verifyVideoThumbnailAccessKey(token, accessKey)) {
    return createPlaybackDeniedResponse(403);
  }
  const loaded = await authorizeVideoMediaRequest(videoId, 'thumbnail', token, {
    allowPublicWithoutToken: true,
  });

  if ('error' in loaded) {
    return loaded.error;
  }

  const customThumbnail = parseStorageUrl(loaded.row.thumbnail_url || '');
  const thumbnailSource = customThumbnail
    ? {
        bucket: customThumbnail.bucket,
        objectKey: customThumbnail.objectKey,
      }
    : loaded.asset?.thumbnail_bucket && loaded.asset.thumbnail_object_key
      ? {
          bucket: loaded.asset.thumbnail_bucket,
          objectKey: loaded.asset.thumbnail_object_key,
        }
      : null;

  if (!thumbnailSource) {
    return NextResponse.json({ error: 'THUMBNAIL_NOT_FOUND' }, { status: 404 });
  }

  const storageResponse = await getObjectFromStorage({
    bucket: thumbnailSource.bucket,
    objectKey: thumbnailSource.objectKey,
  });

  if (!storageResponse.Body) {
    return NextResponse.json({ error: 'THUMBNAIL_NOT_FOUND' }, { status: 404 });
  }

  return new Response(toWebStream(storageResponse.Body), {
    headers: {
      'Content-Type': storageResponse.ContentType || 'image/jpeg',
      'Cache-Control': loaded.isPrivate ? 'private, max-age=300' : 'public, max-age=7200, immutable',
    },
  });
}
