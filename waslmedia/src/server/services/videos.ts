import { findChannelSettingsByUserId } from '@/server/repositories/channel-settings';
import { dbPool } from '@/db/pool';
import {
  addToHistory,
  bulkSetWatchLater,
  clearHistory,
  findVideoReaction,
  listHistoryVideoIds,
  listLikedVideoIds,
  listSubscriptionChannelIds,
  listUserVideoStatus,
  listWatchLaterVideoIds,
  removeFromHistory,
  setVideoReaction,
  upsertWatchLater,
} from '@/server/repositories/engagement';
import { findUserHistoryPreference, upsertUserHistoryPreference } from '@/server/repositories/history-preferences';
import { mapVideo } from '@/server/mappers/content';
import { parseJsonArray } from '@/server/utils/json';
import type { Video } from '@/lib/types';
import type { SearchFilters } from '@/components/search-filter-dialog';
import {
  bulkDeleteVideoRows,
  bulkUpdateVideoRows,
  countHistoryVideoRows,
  countLikedVideoRows,
  countPublicVideoRows,
  countSubscribedVideoRows,
  countVideoRowsByAuthor,
  countWatchLaterVideoRows,
  createVideoRow,
  deleteVideoRow,
  findVideoRowById,
  incrementVideoCounters,
  listHistoryVideoRowsPage,
  listLikedVideoRowsPage,
  listPublicVideoRows,
  listPublicVideoRowsPage,
  listRecommendedVideoRows,
  listSubscribedVideoRowsPage,
  listVideoRowsByAuthor,
  listVideoRowsByAuthorPage,
  listVideoRowsByIds,
  listWatchLaterVideoRowsPage,
  updateVideoRow,
} from '@/server/repositories/videos';
import { findUploadMediaMetadata } from '@/server/repositories/upload-media-metadata';
import { createVideoAssetRow, findVideoAssetByVideoId, listVideoAssetsByVideoIds } from '@/server/repositories/video-assets';
import { recordAnalyticsActivity } from '@/server/services/video-analytics';
import { ensureVideoAssetForExistingVideo, queueVideoAssetProcessing } from '@/server/services/video-processing';
import { parseStorageUrl } from '@/lib/storage/shared';
import {
  formatDurationLabelFromSeconds,
  getMediaKindFromCategory,
  getDurationLimitErrorCode,
  isDurationAllowed,
} from '@/lib/video-upload/rules';
import { assertVideoUploadQuotaAvailable } from '@/server/services/video-upload-constraints';

async function mapVideoRows(
  rows: Awaited<ReturnType<typeof listVideoRowsByIds>>,
  options?: { includeDirectSource?: boolean; viewerId?: string | null }
) {
  const assets = await listVideoAssetsByVideoIds(rows.map((row) => row.id));
  const assetsByVideoId = new Map(assets.map((asset) => [asset.video_id, asset]));
  return rows.map((row) => mapVideo(row, assetsByVideoId.get(row.id), options));
}

async function loadVideosInOrder(videoIds: string[], options?: { includeDirectSource?: boolean; viewerId?: string | null }) {
  const rows = await listVideoRowsByIds(videoIds);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const assets = await listVideoAssetsByVideoIds(videoIds);
  const assetsByVideoId = new Map(assets.map((asset) => [asset.video_id, asset]));
  return videoIds
    .map((videoId) => byId.get(videoId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => mapVideo(row, assetsByVideoId.get(row.id), options));
}

function filterBySearchInput(videos: Video[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return videos;
  }

  return videos.filter((video) => {
    const haystack = [
      video.title,
      video.description,
      video.channelName,
      video.channelHandle,
      video.category,
      ...(video.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function filterVideos(videos: Video[], filters?: SearchFilters) {
  if (!filters) {
    return videos;
  }

  let filtered = [...videos];

  if (filters.type === 'video') {
    filtered = filtered.filter((video) => video.category !== 'Shorts');
  }

  if (filters.type === 'film') {
    filtered = filtered.filter((video) => video.category === 'Film & Animation' || video.category === 'Movies');
  }

  if (filters.duration === 'short') {
    filtered = filtered.filter((video) => parseDurationSeconds(video.duration) < 4 * 60);
  }

  if (filters.duration === 'medium') {
    filtered = filtered.filter((video) => {
      const seconds = parseDurationSeconds(video.duration);
      return seconds >= 4 * 60 && seconds <= 20 * 60;
    });
  }

  if (filters.duration === 'long') {
    filtered = filtered.filter((video) => parseDurationSeconds(video.duration) > 20 * 60);
  }

  if (filters.uploadDate !== 'anytime') {
    const now = Date.now();
    const threshold = getUploadDateThreshold(filters.uploadDate);
    if (threshold) {
      filtered = filtered.filter((video) => {
        const createdAt = video.rawCreatedAt ? new Date(video.rawCreatedAt).getTime() : now;
        return createdAt >= threshold;
      });
    }
  }

  if (filters.sortBy === 'uploaddate') {
    filtered.sort((left, right) => {
      const leftTime = left.rawCreatedAt ? new Date(left.rawCreatedAt).getTime() : 0;
      const rightTime = right.rawCreatedAt ? new Date(right.rawCreatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }

  if (filters.sortBy === 'viewcount' || filters.sortBy === 'rating') {
    filtered.sort((left, right) => {
      if (filters.sortBy === 'rating') {
        return right.likes - left.likes;
      }

      return right.viewCount - left.viewCount;
    });
  }

  return filtered;
}

function getUploadDateThreshold(uploadDate: SearchFilters['uploadDate']) {
  const now = Date.now();
  switch (uploadDate) {
    case 'lasthour':
      return now - 60 * 60 * 1000;
    case 'today':
      return now - 24 * 60 * 60 * 1000;
    case 'thisweek':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'thismonth':
      return now - 30 * 24 * 60 * 60 * 1000;
    case 'thisyear':
      return now - 365 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function parseDurationSeconds(duration: string) {
  const parts = duration.split(':').map((part) => Number(part) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] || 0;
}

function mapVideoUpdates(updates: Partial<Video>) {
  const nextUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) nextUpdates.title = updates.title;
  if (updates.description !== undefined) nextUpdates.description = updates.description;
  if (updates.thumbnailUrl !== undefined) nextUpdates.thumbnail_url = updates.thumbnailUrl;
  if (updates.videoUrl !== undefined) nextUpdates.video_url = updates.videoUrl;
  if (updates.duration !== undefined) nextUpdates.duration = updates.duration;
  if (updates.visibility !== undefined) nextUpdates.visibility = updates.visibility;
  if (updates.audience !== undefined) nextUpdates.audience = updates.audience;
  if (updates.tags !== undefined) nextUpdates.tags = JSON.stringify(updates.tags);
  if (updates.language !== undefined) nextUpdates.language = updates.language;
  if (updates.category !== undefined) nextUpdates.category = updates.category;
  if (updates.commentsEnabled !== undefined) nextUpdates.comments_enabled = updates.commentsEnabled ? 1 : 0;
  if (updates.showLikes !== undefined) nextUpdates.show_likes = updates.showLikes ? 1 : 0;
  if (updates.summary !== undefined) nextUpdates.summary = updates.summary;
  if (updates.timestamps !== undefined) nextUpdates.timestamps = updates.timestamps;
  if (updates.credits !== undefined) nextUpdates.credits = updates.credits;

  return nextUpdates;
}

export async function getPublicVideos() {
  const rows = await listPublicVideoRows();
  return mapVideoRows(rows);
}

export async function getPaginatedPublicVideos(options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listPublicVideoRowsPage({
      limit,
      offset,
      query: undefined,
      filters: undefined,
      contentType: undefined,
    }),
    countPublicVideoRows(),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getPaginatedFeedVideos(options?: {
  limit?: number;
  offset?: number;
  query?: string;
  filters?: SearchFilters;
  contentType?: 'videos' | 'shorts';
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listPublicVideoRowsPage({
      limit,
      offset,
      query: options?.query,
      filters: options?.filters,
      contentType: options?.contentType,
    }),
    countPublicVideoRows({
      query: options?.query,
      filters: options?.filters,
      contentType: options?.contentType,
    }),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getVideosByAuthorId(authorId: string, options?: { publicOnly?: boolean }) {
  const rows = await listVideoRowsByAuthor(authorId);
  return mapVideoRows(rows.filter((row) => !options?.publicOnly || row.visibility === 'public'), {
    includeDirectSource: !options?.publicOnly,
    viewerId: authorId,
  });
}

export async function getPaginatedVideosByAuthorId(
  authorId: string,
  options?: {
    publicOnly?: boolean;
    search?: string;
    contentType?: 'videos' | 'shorts';
    visibility?: 'public' | 'private' | 'unlisted';
    audience?: 'madeForKids' | 'notMadeForKids';
    sortBy?: 'newest' | 'oldest' | 'most-viewed';
    limit?: number;
    offset?: number;
  }
) {
  const limit = Math.max(1, Math.min(options?.limit ?? 30, 100));
  const offset = Math.max(0, options?.offset ?? 0);

  const [rows, total] = await Promise.all([
    listVideoRowsByAuthorPage(authorId, {
      publicOnly: options?.publicOnly,
      search: options?.search,
      contentType: options?.contentType,
      visibility: options?.visibility,
      audience: options?.audience,
      sortBy: options?.sortBy,
      limit,
      offset,
    }),
    countVideoRowsByAuthor(authorId, {
      publicOnly: options?.publicOnly,
      search: options?.search,
      contentType: options?.contentType,
      visibility: options?.visibility,
      audience: options?.audience,
    }),
  ]);

  return {
    videos: await mapVideoRows(rows, { includeDirectSource: !options?.publicOnly, viewerId: authorId }),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getVideoById(
  videoId: string,
  options?: { viewerId?: string | null; isShare?: boolean; incrementView?: boolean }
) {
  const row = await findVideoRowById(videoId);
  if (!row) {
    return null;
  }

  const canView =
    row.visibility === 'public' || (options?.viewerId && row.author_id === options.viewerId) || options?.isShare;

  if (!canView) {
    return null;
  }

  if (options?.incrementView) {
    await incrementVideoCounters(videoId, { viewCount: 1 });
    await recordAnalyticsActivity({
      videoId,
      actorUserId: options.viewerId || null,
      type: 'view',
      deltas: { views: 1 },
    });
    row.view_count += 1;
  }

  const asset = (await findVideoAssetByVideoId(videoId)) || (await ensureVideoAssetForExistingVideo(videoId));
  return mapVideo(row, asset, {
    includeDirectSource: Boolean(options?.viewerId && row.author_id === options.viewerId),
    viewerId: options?.viewerId || null,
  });
}

export async function createVideo(input: {
  authorId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  sourceBucket?: string;
  sourceObjectKey?: string;
  duration?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  audience?: 'madeForKids' | 'notMadeForKids';
  tags?: string[];
  language?: string;
  category?: string;
  commentsEnabled?: boolean;
  showLikes?: boolean;
  summary?: string;
  timestamps?: string;
  credits?: string;
}) {
  if (!input.sourceBucket || !input.sourceObjectKey) {
    throw new Error('UPLOAD_MEDIA_METADATA_MISSING');
  }

  const uploadMediaMetadata = await findUploadMediaMetadata({
    userId: input.authorId,
    bucket: input.sourceBucket,
    objectKey: input.sourceObjectKey,
  });

  if (!uploadMediaMetadata) {
    throw new Error('UPLOAD_MEDIA_METADATA_MISSING');
  }

  const mediaKind = getMediaKindFromCategory(input.category);
  if (uploadMediaMetadata.media_kind !== mediaKind) {
    throw new Error('UPLOAD_MEDIA_METADATA_MISSING');
  }

  if (!isDurationAllowed(mediaKind, uploadMediaMetadata.duration_seconds)) {
    throw new Error(getDurationLimitErrorCode(mediaKind));
  }

  const source =
    input.sourceBucket && input.sourceObjectKey
      ? { bucket: input.sourceBucket, objectKey: input.sourceObjectKey }
      : input.videoUrl
        ? parseStorageUrl(input.videoUrl)
        : null;

  const connection = await dbPool.getConnection();

  let id = '';
  try {
    await connection.beginTransaction();
    await connection.query(`SELECT id FROM users WHERE id = ? FOR UPDATE`, [input.authorId]);
    await assertVideoUploadQuotaAvailable(input.authorId, mediaKind, connection);

    id = await createVideoRow(
      {
        ...input,
        duration: formatDurationLabelFromSeconds(uploadMediaMetadata.duration_seconds),
        videoUrl: source ? '' : input.videoUrl || '',
      },
      connection
    );

    if (source) {
      await createVideoAssetRow(
        {
          videoId: id,
          sourceBucket: source.bucket,
          sourceObjectKey: source.objectKey,
          durationSeconds: uploadMediaMetadata.duration_seconds,
        },
        connection
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (source) {
    await queueVideoAssetProcessing(id);
  }

  const created = await findVideoRowById(id);
  const asset = await findVideoAssetByVideoId(id);
  return created ? mapVideo(created, asset, { includeDirectSource: true, viewerId: input.authorId }) : null;
}

export async function updateVideo(videoId: string, authorId: string, updates: Partial<Video>) {
  const existing = await findVideoRowById(videoId);
  if (!existing || existing.author_id !== authorId) {
    throw new Error('VIDEO_NOT_FOUND');
  }

  const row = await updateVideoRow(videoId, mapVideoUpdates(updates));
  const asset = await findVideoAssetByVideoId(videoId);
  return row ? mapVideo(row, asset, { includeDirectSource: true, viewerId: authorId }) : null;
}

export async function deleteVideo(videoId: string, authorId: string) {
  await deleteVideoRow(videoId, authorId);
}

export async function bulkDeleteVideos(videoIds: string[], authorId: string) {
  await bulkDeleteVideoRows(videoIds, authorId);
}

export async function bulkUpdateVideos(videoIds: string[], authorId: string, updates: Partial<Video>) {
  await bulkUpdateVideoRows(videoIds, authorId, mapVideoUpdates(updates));
}

export async function reactToVideo(videoId: string, userId: string, reaction: 'like' | 'dislike') {
  const current = await findVideoReaction(userId, videoId);
  const nextReaction = current?.reaction === reaction ? null : reaction;
  await setVideoReaction(userId, videoId, nextReaction);

  if (current?.reaction === 'like' && nextReaction !== 'like') {
    await recordAnalyticsActivity({
      videoId,
      actorUserId: userId,
      type: 'like',
      value: -1,
      deltas: { likes: -1 },
    });
  }

  if (current?.reaction === 'dislike' && nextReaction !== 'dislike') {
    await recordAnalyticsActivity({
      videoId,
      actorUserId: userId,
      type: 'dislike',
      value: -1,
      deltas: { dislikes: -1 },
    });
  }

  if (nextReaction === 'like' && current?.reaction !== 'like') {
    await recordAnalyticsActivity({
      videoId,
      actorUserId: userId,
      type: 'like',
      deltas: { likes: 1 },
    });
  }

  if (nextReaction === 'dislike' && current?.reaction !== 'dislike') {
    await recordAnalyticsActivity({
      videoId,
      actorUserId: userId,
      type: 'dislike',
      deltas: { dislikes: 1 },
    });
  }

  return listUserVideoStatus(userId, videoId);
}

export async function getUserInteractionStatus(videoId: string, userId: string) {
  return listUserVideoStatus(userId, videoId);
}

export async function getLikedVideos(userId: string, explicitVideoIds?: string[]) {
  const likedVideoIds = explicitVideoIds && explicitVideoIds.length > 0 ? explicitVideoIds : await listLikedVideoIds(userId);
  return loadVideosInOrder(likedVideoIds);
}

export async function getPaginatedLikedVideos(userId: string, options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listLikedVideoRowsPage(userId, { limit, offset }),
    countLikedVideoRows(userId),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function toggleWatchLater(videoId: string, userId: string) {
  return upsertWatchLater(userId, videoId);
}

export async function bulkToggleWatchLater(videoIds: string[], userId: string, shouldExist: boolean) {
  await bulkSetWatchLater(userId, videoIds, shouldExist);
}

export async function getWatchLaterVideos(userId: string) {
  return loadVideosInOrder(await listWatchLaterVideoIds(userId));
}

export async function getPaginatedWatchLaterVideos(userId: string, options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listWatchLaterVideoRowsPage(userId, { limit, offset }),
    countWatchLaterVideoRows(userId),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function isWatchHistoryEnabled(userId: string) {
  const row = await findUserHistoryPreference(userId);
  return row ? Boolean(row.save_history) : true;
}

export async function setWatchHistoryEnabled(userId: string, enabled: boolean) {
  const row = await upsertUserHistoryPreference(userId, enabled);
  return row ? Boolean(row.save_history) : enabled;
}

export async function addVideoToHistory(userId: string, videoId: string) {
  if (!(await isWatchHistoryEnabled(userId))) {
    return false;
  }

  await addToHistory(userId, videoId);
  return true;
}

export async function removeVideoFromHistory(userId: string, videoId: string) {
  await removeFromHistory(userId, videoId);
}

export async function clearUserWatchHistory(userId: string) {
  await clearHistory(userId);
}

export async function registerQualifiedVideoView(
  videoId: string,
  viewerId?: string | null,
  metadata?: {
    trafficSource?: string | null;
    viewerCountry?: string | null;
    viewerKey?: string | null;
    deviceType?: string | null;
  }
) {
  const row = await findVideoRowById(videoId);
  if (!row) {
    return null;
  }

  await incrementVideoCounters(videoId, { viewCount: 1 });
  await recordAnalyticsActivity({
    videoId,
    actorUserId: viewerId || null,
    type: 'view',
    deltas: { views: 1 },
    trafficSource: metadata?.trafficSource || null,
    viewerCountry: metadata?.viewerCountry || null,
    viewerKey: metadata?.viewerKey || null,
    deviceType: metadata?.deviceType || null,
  });

  if (viewerId) {
    await addVideoToHistory(viewerId, videoId);
  }

  const updated = await findVideoRowById(videoId);
  const asset = await findVideoAssetByVideoId(videoId);
  return updated ? mapVideo(updated, asset) : null;
}

export async function shareVideo(videoId: string, actorUserId?: string | null) {
  const row = await findVideoRowById(videoId);
  if (!row) {
    return null;
  }

  await incrementVideoCounters(videoId, { shareCount: 1 });
  await recordAnalyticsActivity({
    videoId,
    actorUserId: actorUserId || null,
    type: 'share',
    deltas: { shares: 1 },
  });

  const updated = await findVideoRowById(videoId);
  const asset = await findVideoAssetByVideoId(videoId);
  return updated ? mapVideo(updated, asset) : null;
}

export async function getHistoryVideos(userId: string) {
  return loadVideosInOrder(await listHistoryVideoIds(userId));
}

export async function getPaginatedHistoryVideos(userId: string, options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listHistoryVideoRowsPage(userId, { limit, offset }),
    countHistoryVideoRows(userId),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getSubscribedVideos(userId: string) {
  const rows = await listSubscribedVideoRowsPage(userId, { limit: 100 });
  return mapVideoRows(rows);
}

export async function getPaginatedSubscribedVideos(userId: string, options?: { limit?: number; offset?: number }) {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listSubscribedVideoRowsPage(userId, { limit, offset }),
    countSubscribedVideoRows(userId),
  ]);

  return {
    videos: await mapVideoRows(rows),
    pagination: {
      total,
      limit,
      offset,
      count: rows.length,
      hasNextPage: offset + rows.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getSearchVideos(query: string, filters?: SearchFilters) {
  const rows = await listPublicVideoRowsPage({
    query,
    filters,
    limit: 50,
    offset: 0,
  });
  const videos = await mapVideoRows(rows);
  return filterVideos(filterBySearchInput(videos, query), filters);
}

export async function getPaginatedSearchVideos(
  query: string,
  filters?: SearchFilters,
  options?: { limit?: number; offset?: number }
) {
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const [rows, total] = await Promise.all([
    listPublicVideoRowsPage({ query, filters, limit, offset }),
    countPublicVideoRows({ query, filters }),
  ]);

  const videos = filterVideos(filterBySearchInput(await mapVideoRows(rows), query), filters);
  return {
    videos,
    pagination: {
      total,
      limit,
      offset,
      count: videos.length,
      hasNextPage: offset + videos.length < total,
      hasPreviousPage: offset > 0,
    },
  };
}

export async function getPlaylistEligibleVideo(videoId: string, userId?: string) {
  const row = await findVideoRowById(videoId);
  if (!row) {
    return null;
  }

  if (row.visibility !== 'public' && row.author_id !== userId) {
    return null;
  }

  const asset = await findVideoAssetByVideoId(videoId);
  return mapVideo(row, asset, {
    includeDirectSource: Boolean(userId && row.author_id === userId),
    viewerId: userId || null,
  });
}

export async function hydrateVideoIds(videoIds: string[]) {
  return loadVideosInOrder(videoIds);
}

export async function getRecommendedVideos(input: {
  videoId: string;
  authorId?: string | null;
  category?: string | null;
  limit?: number;
}) {
  const rows = await listRecommendedVideoRows(input);
  return mapVideoRows(rows);
}

export async function getChannelContextForUpload(authorId: string) {
  return findChannelSettingsByUserId(authorId);
}

export function extractVideoTags(tags: unknown) {
  return parseJsonArray(JSON.stringify(tags));
}
