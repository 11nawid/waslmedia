import { NextRequest } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { createPlaybackDeniedResponse, createPlaybackNotFoundResponse } from '@/server/utils/playback-response';
import { verifyProtectedAssetRequest } from '@/server/utils/protected-asset';
import { toWebStream } from '@/server/services/video-media';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const accessKey = request.headers.get('x-wasl-asset-key') || request.nextUrl.searchParams.get('k');
  const payload = verifyProtectedAssetRequest(token, accessKey);

  if (!payload) {
    return createPlaybackDeniedResponse(403);
  }

  const storageResponse = await getObjectFromStorage({
    bucket: payload.bucket,
    objectKey: payload.objectKey,
  });

  if (!storageResponse.Body) {
    return createPlaybackNotFoundResponse();
  }

  return new Response(toWebStream(storageResponse.Body), {
    headers: {
      'Content-Type': storageResponse.ContentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=21600, immutable',
    },
  });
}
