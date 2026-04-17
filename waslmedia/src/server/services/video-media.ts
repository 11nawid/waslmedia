import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { findVideoAssetByVideoId } from '@/server/repositories/video-assets';
import { findVideoRowById } from '@/server/repositories/videos';
import { getCurrentAuthUser } from '@/server/services/auth';
import { verifyMediaToken } from '@/server/utils/media';
import { parseStorageUrl } from '@/lib/storage/shared';

type MediaScope = 'playback' | 'session' | 'source' | 'manifest' | 'segment' | 'thumbnail';

export async function authorizeVideoMediaRequest(
  videoId: string,
  scope: MediaScope,
  token?: string | null,
  options?: { resource?: string; allowPublicWithoutToken?: boolean }
) {
  const [user, row, asset] = await Promise.all([
    getCurrentAuthUser(),
    findVideoRowById(videoId),
    findVideoAssetByVideoId(videoId),
  ]);

  if (!row) {
    return { error: NextResponse.json({ error: 'VIDEO_NOT_FOUND' }, { status: 404 }) };
  }

  const playbackPayload = verifyMediaToken(token, videoId, 'playback', {
    userId: user?.id,
  });
  const scopedPayload =
    scope === 'playback'
      ? playbackPayload
      : verifyMediaToken(token, videoId, scope, {
          resource: options?.resource,
          userId: user?.id,
        });
  const isOwner = row.author_id === user?.id;
  const hasPublicAccessToken = Boolean(playbackPayload || scopedPayload);
  const canView =
    isOwner ||
    (row.visibility !== 'private' && (options?.allowPublicWithoutToken || hasPublicAccessToken));

  if (!canView) {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }

  return {
    row,
    asset,
    userId: user?.id || null,
    isOwner,
    isPrivate: row.visibility === 'private',
  };
}

export function resolveSourceLocation(videoUrl: string | null | undefined, asset?: { source_bucket: string; source_object_key: string } | null) {
  if (asset?.source_bucket && asset.source_object_key) {
    return {
      bucket: asset.source_bucket,
      objectKey: asset.source_object_key,
    };
  }

  return parseStorageUrl(videoUrl || '');
}

export function toWebStream(body: unknown) {
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream;
  }

  const streamable = body as { transformToWebStream?: () => ReadableStream } | null;
  if (streamable?.transformToWebStream) {
    return streamable.transformToWebStream();
  }

  return body as BodyInit;
}

export interface VideoRendition {
  id: string;
  width: number;
  height: number;
  bandwidth: number;
  playlistKey: string;
}

export function parseVideoRenditions(renditionsJson: string | VideoRendition[] | null | undefined) {
  if (!renditionsJson) {
    return [] as VideoRendition[];
  }

  if (Array.isArray(renditionsJson)) {
    return renditionsJson;
  }

  try {
    const parsed = JSON.parse(renditionsJson) as VideoRendition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
