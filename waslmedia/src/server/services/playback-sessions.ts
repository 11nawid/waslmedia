import { createHash, randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getObjectFromStorage } from '@/lib/storage/server';
import { parseStorageUrl } from '@/lib/storage/shared';
import type { VideoAssetRow } from '@/server/repositories/video-assets';
import { findVideoAssetByVideoId } from '@/server/repositories/video-assets';
import {
  createPlaybackSessionRow,
  deleteExpiredPlaybackSessions,
  findPlaybackSessionRowById,
  touchPlaybackSessionRow,
  type PlaybackMode,
  type PlaybackSessionMode,
} from '@/server/repositories/playback-sessions';
import { findVideoRowById } from '@/server/repositories/videos';
import { getCurrentAuthUser } from '@/server/services/auth';
import { parseVideoRenditions, type VideoRendition } from '@/server/services/video-media';

const PLAYBACK_SESSION_TTL_MS = 30 * 60 * 1000;

interface SessionSourceLocation {
  bucket: string;
  objectKey: string;
}

interface SessionChunkDescriptor {
  objectKey: string;
  contentType: string;
}

interface SessionVariantDescriptor {
  width: number;
  height: number;
  bandwidth: number;
  lines: string[];
  chunks: Record<string, SessionChunkDescriptor>;
}

interface PlaybackSessionPayload {
  source: SessionSourceLocation | null;
  thumbnail: SessionSourceLocation | null;
  manifestBucket: string | null;
  accessKey: string;
  variants: Record<string, SessionVariantDescriptor>;
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
}

function getRequestFingerprint(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  return {
    ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
    userAgentHash: userAgent ? createHash('sha256').update(userAgent).digest('hex') : null,
  };
}

function buildChunkContentType(segmentName: string) {
  const normalized = segmentName.toLowerCase();
  if (normalized.endsWith('.m4s')) {
    return 'video/iso.segment';
  }
  if (normalized.endsWith('.mp4')) {
    return 'video/mp4';
  }
  return 'video/mp2t';
}

async function loadPlaylistLines(bucket: string, objectKey: string) {
  const response = await getObjectFromStorage({ bucket, objectKey });
  if (!response.Body) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  const contents = Buffer.from(await response.Body.transformToByteArray()).toString('utf8');
  return contents.split('\n');
}

function resolveThumbnailLocation(rowThumbnailUrl: string | null | undefined, asset?: VideoAssetRow | null) {
  const parsedThumbnail = parseStorageUrl(rowThumbnailUrl || '');
  if (parsedThumbnail) {
    return parsedThumbnail;
  }

  if (asset?.thumbnail_bucket && asset.thumbnail_object_key) {
    return {
      bucket: asset.thumbnail_bucket,
      objectKey: asset.thumbnail_object_key,
    };
  }

  return null;
}

function resolveSourceLocation(rowVideoUrl: string | null | undefined, asset?: VideoAssetRow | null) {
  if (asset?.source_bucket && asset.source_object_key) {
    return {
      bucket: asset.source_bucket,
      objectKey: asset.source_object_key,
    };
  }

  return parseStorageUrl(rowVideoUrl || '');
}

async function buildVariantPayload(asset: VideoAssetRow) {
  if (!asset.manifest_bucket) {
    return {} as Record<string, SessionVariantDescriptor>;
  }

  const renditions = parseVideoRenditions(asset.renditions_json);
  const variants: Record<string, SessionVariantDescriptor> = {};

  for (const rendition of renditions) {
    const variantId = randomUUID().replace(/-/g, '');
    const playlistLines = await loadPlaylistLines(asset.manifest_bucket, rendition.playlistKey);
    const chunks: Record<string, SessionChunkDescriptor> = {};

    const rewrittenLines = playlistLines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      const chunkId = randomUUID().replace(/-/g, '');
      const objectKey = `${rendition.playlistKey.replace(/index\.m3u8$/, '')}${trimmed}`;
      chunks[chunkId] = {
        objectKey,
        contentType: buildChunkContentType(trimmed),
      };
      return chunkId;
    });

    variants[variantId] = {
      width: rendition.width,
      height: rendition.height,
      bandwidth: rendition.bandwidth,
      lines: rewrittenLines,
      chunks,
    };
  }

  return variants;
}

function getPlaybackMode(asset: VideoAssetRow | null) {
  return asset?.transcode_status === 'ready' && parseVideoRenditions(asset.renditions_json).length > 0
    ? ('mse' satisfies PlaybackMode)
    : ('compat-source' satisfies PlaybackMode);
}

function toExpiresAt() {
  return new Date(Date.now() + PLAYBACK_SESSION_TTL_MS);
}

function buildPlaybackUrlWithAccessKey(path: string, accessKey: string) {
  return `${path}?k=${encodeURIComponent(accessKey)}`;
}

export async function createPlaybackSession(request: NextRequest, videoId: string, mode: PlaybackSessionMode) {
  await deleteExpiredPlaybackSessions();
  const [user, row, asset] = await Promise.all([
    getCurrentAuthUser(),
    findVideoRowById(videoId),
    findVideoAssetByVideoId(videoId),
  ]);

  if (!row) {
    return { error: 'VIDEO_NOT_FOUND' as const, status: 404 };
  }

  const isOwner = row.author_id === user?.id;
  const canView =
    mode === 'owner-download'
      ? isOwner
      : isOwner || row.visibility === 'public' || row.visibility === 'unlisted';

  if (!canView) {
    return { error: 'FORBIDDEN' as const, status: 403 };
  }

  const source = resolveSourceLocation(row.video_url, asset);
  if (!source) {
    return { error: 'VIDEO_SOURCE_NOT_FOUND' as const, status: 404 };
  }

  const thumbnail = resolveThumbnailLocation(row.thumbnail_url, asset);
  const shouldUseMsePlayback = mode === 'watch' && asset && getPlaybackMode(asset) === 'mse';
  const variants = shouldUseMsePlayback ? await buildVariantPayload(asset) : {};
  const accessKey = randomUUID().replace(/-/g, '');
  const playbackMode = Object.keys(variants).length > 0 ? ('mse' satisfies PlaybackMode) : ('compat-source' satisfies PlaybackMode);

  const payload: PlaybackSessionPayload = {
    source,
    thumbnail,
    manifestBucket: asset?.manifest_bucket || null,
    accessKey,
    variants,
  };

  const fingerprint = getRequestFingerprint(request);
  const expiresAt = toExpiresAt();
  const sessionId = await createPlaybackSessionRow({
    videoId,
    viewerUserId: user?.id || null,
    mode,
    playbackMode,
    payloadJson: JSON.stringify(payload),
    ipHash: fingerprint.ipHash,
    userAgentHash: fingerprint.userAgentHash,
    expiresAt,
  });

  return {
    sessionId,
    accessKey,
    playbackMode,
    thumbnailUrl: `/api/playback/p/${sessionId}/t`,
    fallbackUrl: `/api/playback/p/${sessionId}/b`,
    directSourceUrl: buildPlaybackUrlWithAccessKey(`/api/playback/p/${sessionId}/b`, accessKey),
    bootstrapUrl: playbackMode === 'compat-source' ? `/api/playback/p/${sessionId}/b` : `/api/playback/p/${sessionId}/i`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function loadPlaybackSession(
  request: NextRequest,
  sessionId: string,
  options?: { skipAccessKey?: boolean }
) {
  const [row, user] = await Promise.all([findPlaybackSessionRowById(sessionId), getCurrentAuthUser()]);
  if (!row) {
    return { error: 'PLAYBACK_SESSION_NOT_FOUND' as const, status: 404 };
  }

  const expiresAt = row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { error: 'PLAYBACK_SESSION_EXPIRED' as const, status: 410 };
  }

  if (row.viewer_user_id && row.viewer_user_id !== user?.id) {
    return { error: 'PLAYBACK_SESSION_FORBIDDEN' as const, status: 403 };
  }

  const fingerprint = getRequestFingerprint(request);
  if (row.ip_hash && fingerprint.ipHash && row.ip_hash !== fingerprint.ipHash) {
    return { error: 'PLAYBACK_SESSION_FORBIDDEN' as const, status: 403 };
  }
  if (row.user_agent_hash && fingerprint.userAgentHash && row.user_agent_hash !== fingerprint.userAgentHash) {
    return { error: 'PLAYBACK_SESSION_FORBIDDEN' as const, status: 403 };
  }

  const payload = JSON.parse(row.payload_json) as PlaybackSessionPayload;
  if (!options?.skipAccessKey) {
    const requestAccessKey = request.headers.get('x-wasl-playback-key') || request.nextUrl.searchParams.get('k');
    if (!requestAccessKey || requestAccessKey !== payload.accessKey) {
      return { error: 'PLAYBACK_SESSION_FORBIDDEN' as const, status: 403 };
    }
  }
  await touchPlaybackSessionRow(sessionId, toExpiresAt());

  return {
    session: row,
    payload,
  };
}

export function buildMasterPlaylist(sessionId: string, variants: Record<string, SessionVariantDescriptor>) {
  return [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...Object.entries(variants).flatMap(([variantId, variant]) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}`,
      `/api/playback/p/${sessionId}/v/${variantId}`,
    ]),
    '',
  ].join('\n');
}

export function buildVariantPlaylist(sessionId: string, variant: SessionVariantDescriptor) {
  return variant.lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      return `/api/playback/p/${sessionId}/c/${trimmed}`;
    })
    .join('\n');
}
