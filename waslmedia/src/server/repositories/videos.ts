import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { dbPool } from '@/db/pool';
import type { SearchFilters } from '@/components/search-filter-dialog';
import type { UploadMediaKind } from '@/lib/video-upload/rules';

export interface VideoRow extends RowDataPacket {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: string;
  visibility: 'public' | 'private' | 'unlisted';
  audience: 'madeForKids' | 'notMadeForKids';
  tags: string | null;
  language: string | null;
  category: string | null;
  comments_enabled: number;
  show_likes: number;
  summary: string | null;
  timestamps: string | null;
  credits: string | null;
  view_count: number;
  likes: number;
  dislikes: number;
  comment_count: number;
  share_count: number;
  created_at: Date | string;
  channel_name: string;
  channel_handle: string;
  channel_image_url: string | null;
  channel_subscriber_count: number;
  location: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface LegacyVideoSourceRow extends RowDataPacket {
  id: string;
  video_url: string | null;
  duration: string;
}

interface AuthorVideoQueryOptions {
  publicOnly?: boolean;
  search?: string;
  contentType?: 'videos' | 'shorts';
  visibility?: 'public' | 'private' | 'unlisted';
  audience?: 'madeForKids' | 'notMadeForKids';
  sortBy?: 'newest' | 'oldest' | 'most-viewed';
  limit?: number;
  offset?: number;
}

interface PublicVideoQueryOptions {
  query?: string;
  filters?: SearchFilters;
  contentType?: 'videos' | 'shorts';
  limit?: number;
  offset?: number;
}

interface RecentUploadUsageRow extends RowDataPacket {
  used: number;
  oldest_created_at: Date | string | null;
}

type QueryExecutor = Pick<PoolConnection, 'query'>;

const BASE_VIDEO_SELECT = `
  SELECT
    v.id,
    v.author_id,
    v.title,
    v.description,
    v.thumbnail_url,
    v.video_url,
    v.duration,
    v.visibility,
    v.audience,
    v.tags,
    v.language,
    v.category,
    v.comments_enabled,
    v.show_likes,
    v.summary,
    v.timestamps,
    v.credits,
    v.view_count,
    v.likes,
    v.dislikes,
    v.comment_count,
    v.share_count,
    v.created_at,
    c.name AS channel_name,
    c.handle AS channel_handle,
    c.profile_picture_url AS channel_image_url,
    c.subscriber_count AS channel_subscriber_count,
    c.country AS location
  FROM videos v
  INNER JOIN channels c ON c.user_id = v.author_id
`;

function getExecutor(executor?: QueryExecutor) {
  return executor ?? dbPool;
}

function buildAuthorVideoWhereClause(authorId: string, options: AuthorVideoQueryOptions = {}) {
  const conditions = ['v.author_id = ?'];
  const values: unknown[] = [authorId];

  if (options.publicOnly) {
    conditions.push(`v.visibility = 'public'`);
  }

  if (options.contentType === 'shorts') {
    conditions.push(`v.category = 'Shorts'`);
  }

  if (options.contentType === 'videos') {
    conditions.push(`(v.category IS NULL OR v.category <> 'Shorts')`);
  }

  if (options.visibility) {
    conditions.push(`v.visibility = ?`);
    values.push(options.visibility);
  }

  if (options.audience) {
    conditions.push(`v.audience = ?`);
    values.push(options.audience);
  }

  const normalizedSearch = options.search?.trim().toLowerCase();
  if (normalizedSearch) {
    conditions.push(`(LOWER(v.title) LIKE ? OR LOWER(COALESCE(v.description, '')) LIKE ?)`);
    values.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

function getUploadDateThreshold(uploadDate: SearchFilters['uploadDate']) {
  const now = Date.now();
  switch (uploadDate) {
    case 'lasthour':
      return new Date(now - 60 * 60 * 1000);
    case 'today':
      return new Date(now - 24 * 60 * 60 * 1000);
    case 'thisweek':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'thismonth':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case 'thisyear':
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

function buildPublicVideoWhereClause(options: PublicVideoQueryOptions = {}) {
  const conditions = [`v.visibility = 'public'`];
  const values: unknown[] = [];
  const normalizedQuery = options.query?.trim().toLowerCase();

  if (normalizedQuery) {
    conditions.push(
      `(LOWER(v.title) LIKE ? OR LOWER(COALESCE(v.description, '')) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.handle) LIKE ?)`
    );
    values.push(
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`
    );
  }

  if (options.filters?.type === 'video') {
    conditions.push(`(v.category IS NULL OR v.category <> 'Shorts')`);
  }

  if (options.contentType === 'videos') {
    conditions.push(`(v.category IS NULL OR v.category <> 'Shorts')`);
  }

  if (options.contentType === 'shorts') {
    conditions.push(`v.category = 'Shorts'`);
  }

  if (options.filters?.type === 'film') {
    conditions.push(`(v.category = 'Film & Animation' OR v.category = 'Movies')`);
  }

  if (options.filters?.uploadDate && options.filters.uploadDate !== 'anytime') {
    const threshold = getUploadDateThreshold(options.filters.uploadDate);
    if (threshold) {
      conditions.push(`v.created_at >= ?`);
      values.push(threshold);
    }
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

function buildPublicVideoOrderBy(filters?: SearchFilters) {
  switch (filters?.sortBy) {
    case 'uploaddate':
      return 'v.created_at DESC';
    case 'viewcount':
      return 'v.view_count DESC, v.created_at DESC';
    case 'rating':
      return 'v.likes DESC, v.created_at DESC';
    default:
      return 'v.created_at DESC';
  }
}

export async function listPublicVideoRows() {
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     WHERE v.visibility = 'public'
     ORDER BY v.created_at DESC`
  );

  return rows;
}

export async function listPublicVideoRowsPage(options: PublicVideoQueryOptions = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const { whereClause, values } = buildPublicVideoWhereClause(options);
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     ${whereClause}
     ORDER BY ${buildPublicVideoOrderBy(options.filters)}
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return rows;
}

export async function countPublicVideoRows(options: PublicVideoQueryOptions = {}) {
  const { whereClause, values } = buildPublicVideoWhereClause(options);
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM videos v
     INNER JOIN channels c ON c.user_id = v.author_id
     ${whereClause}`,
    values
  );

  return rows[0]?.total || 0;
}

export async function listVideoRowsByAuthor(authorId: string) {
  return listVideoRowsByAuthorPage(authorId);
}

export async function listVideoRowsByAuthorPage(authorId: string, options: AuthorVideoQueryOptions = {}) {
  const { whereClause, values } = buildAuthorVideoWhereClause(authorId, options);
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(Number(options.limit), 100)) : null;
  const offset = Number.isFinite(options.offset) ? Math.max(0, Number(options.offset)) : 0;
  const orderByClause =
    options.sortBy === 'oldest'
      ? 'v.created_at ASC'
      : options.sortBy === 'most-viewed'
        ? 'v.view_count DESC, v.created_at DESC'
        : 'v.created_at DESC';

  const paginationClause = limit === null ? '' : ' LIMIT ? OFFSET ?';
  const queryValues = limit === null ? values : [...values, limit, offset];

  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     ${whereClause}
     ORDER BY ${orderByClause}${paginationClause}`,
    queryValues
  );

  return rows;
}

export async function countVideoRowsByAuthor(authorId: string, options: Omit<AuthorVideoQueryOptions, 'limit' | 'offset'> = {}) {
  const { whereClause, values } = buildAuthorVideoWhereClause(authorId, options);
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM videos v
     ${whereClause}`,
    values
  );

  return rows[0]?.total || 0;
}

export async function listPublicVideoRowsByAuthors(authorIds: string[]) {
  if (authorIds.length === 0) {
    return [];
  }

  const placeholders = authorIds.map(() => '?').join(', ');
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     WHERE v.author_id IN (${placeholders}) AND v.visibility = 'public'
     ORDER BY v.created_at DESC`,
    authorIds
  );

  return rows;
}

export async function listVideoRowsByIds(videoIds: string[]) {
  if (videoIds.length === 0) {
    return [];
  }

  const placeholders = videoIds.map(() => '?').join(', ');
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     WHERE v.id IN (${placeholders})`,
    videoIds
  );

  return rows;
}

export async function listRecommendedVideoRows(input: {
  videoId: string;
  authorId?: string | null;
  category?: string | null;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 16, 50));
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     WHERE v.visibility = 'public'
       AND v.id <> ?
     ORDER BY
       CASE WHEN v.author_id = ? THEN 0 ELSE 1 END,
       CASE WHEN COALESCE(v.category, '') = ? THEN 0 ELSE 1 END,
       v.view_count DESC,
       v.created_at DESC
     LIMIT ?`,
    [input.videoId, input.authorId || '', input.category || '', limit]
  );

  return rows;
}

export async function listLikedVideoRowsPage(userId: string, options: { limit?: number; offset?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     INNER JOIN video_reactions vr ON vr.video_id = v.id
     WHERE vr.user_id = ?
       AND vr.reaction = 'like'
       AND v.visibility = 'public'
     ORDER BY vr.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows;
}

export async function countLikedVideoRows(userId: string) {
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM video_reactions vr
     INNER JOIN videos v ON v.id = vr.video_id
     WHERE vr.user_id = ?
       AND vr.reaction = 'like'
       AND v.visibility = 'public'`,
    [userId]
  );

  return rows[0]?.total || 0;
}

export async function listWatchLaterVideoRowsPage(userId: string, options: { limit?: number; offset?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     INNER JOIN watch_later wl ON wl.video_id = v.id
     WHERE wl.user_id = ?
       AND v.visibility = 'public'
     ORDER BY wl.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows;
}

export async function countWatchLaterVideoRows(userId: string) {
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM watch_later wl
     INNER JOIN videos v ON v.id = wl.video_id
     WHERE wl.user_id = ?
       AND v.visibility = 'public'`,
    [userId]
  );

  return rows[0]?.total || 0;
}

export async function listHistoryVideoRowsPage(userId: string, options: { limit?: number; offset?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     INNER JOIN history h ON h.video_id = v.id
     WHERE h.user_id = ?
       AND v.visibility = 'public'
     ORDER BY h.watched_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows;
}

export async function countHistoryVideoRows(userId: string) {
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM history h
     INNER JOIN videos v ON v.id = h.video_id
     WHERE h.user_id = ?
       AND v.visibility = 'public'`,
    [userId]
  );

  return rows[0]?.total || 0;
}

export async function listSubscribedVideoRowsPage(userId: string, options: { limit?: number; offset?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));
  const offset = Math.max(0, options.offset ?? 0);
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     INNER JOIN subscriptions s ON s.channel_user_id = v.author_id
     WHERE s.subscriber_id = ?
       AND v.visibility = 'public'
     ORDER BY v.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows;
}

export async function countSubscribedVideoRows(userId: string) {
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM subscriptions s
     INNER JOIN videos v ON v.author_id = s.channel_user_id
     WHERE s.subscriber_id = ?
       AND v.visibility = 'public'`,
    [userId]
  );

  return rows[0]?.total || 0;
}

export async function findVideoRowById(videoId: string) {
  const [rows] = await dbPool.query<VideoRow[]>(
    `${BASE_VIDEO_SELECT}
     WHERE v.id = ?
     LIMIT 1`,
    [videoId]
  );

  return rows[0] || null;
}

export async function createVideoRow(input: {
  authorId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
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
}, executor?: QueryExecutor) {
  const id = randomUUID();
  const db = getExecutor(executor);

  await db.query(
    `INSERT INTO videos (
      id, author_id, title, description, thumbnail_url, video_url, duration, visibility,
      audience, tags, language, category, comments_enabled, show_likes, summary, timestamps, credits
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.authorId,
      input.title,
      input.description || '',
      input.thumbnailUrl || '',
      input.videoUrl || '',
      input.duration || '0:00',
      input.visibility || 'private',
      input.audience || 'notMadeForKids',
      JSON.stringify(input.tags || []),
      input.language || 'None',
      input.category || 'People & Blogs',
      input.commentsEnabled === false ? 0 : 1,
      input.showLikes === false ? 0 : 1,
      input.summary || '',
      input.timestamps || '',
      input.credits || '',
    ]
  );

  return id;
}

export async function getRecentUploadUsageByAuthor(
  authorId: string,
  mediaKind: UploadMediaKind,
  executor?: QueryExecutor
) {
  const db = getExecutor(executor);
  const categoryClause = mediaKind === 'short' ? `v.category = 'Shorts'` : `(v.category IS NULL OR v.category <> 'Shorts')`;
  const [rows] = await db.query<RecentUploadUsageRow[]>(
    `SELECT
      COUNT(*) AS used,
      MIN(v.created_at) AS oldest_created_at
     FROM videos v
     WHERE v.author_id = ?
       AND ${categoryClause}
       AND v.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)`,
    [authorId]
  );

  return {
    used: Number(rows[0]?.used || 0),
    oldestCreatedAt: rows[0]?.oldest_created_at ? new Date(rows[0].oldest_created_at).toISOString() : null,
  };
}

export async function updateVideoRow(videoId: string, updates: Record<string, unknown>) {
  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (fields.length === 0) {
    return findVideoRowById(videoId);
  }

  const columns = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);
  await dbPool.query(`UPDATE videos SET ${columns} WHERE id = ?`, [...values, videoId]);
  return findVideoRowById(videoId);
}

export async function deleteVideoRow(videoId: string, authorId: string) {
  const [result] = await dbPool.query(
    `DELETE FROM videos WHERE id = ? AND author_id = ?`,
    [videoId, authorId]
  );

  return result;
}

export async function bulkDeleteVideoRows(videoIds: string[], authorId: string) {
  if (videoIds.length === 0) {
    return;
  }

  const placeholders = videoIds.map(() => '?').join(', ');
  await dbPool.query(
    `DELETE FROM videos WHERE author_id = ? AND id IN (${placeholders})`,
    [authorId, ...videoIds]
  );
}

export async function bulkUpdateVideoRows(videoIds: string[], authorId: string, updates: Record<string, unknown>) {
  if (videoIds.length === 0) {
    return;
  }

  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (fields.length === 0) {
    return;
  }

  const placeholders = videoIds.map(() => '?').join(', ');
  const columns = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);

  await dbPool.query(
    `UPDATE videos SET ${columns} WHERE author_id = ? AND id IN (${placeholders})`,
    [...values, authorId, ...videoIds]
  );
}

export async function incrementVideoCounters(videoId: string, updates: { viewCount?: number; shareCount?: number; commentCount?: number }) {
  const parts: string[] = [];
  const values: number[] = [];

  if (updates.viewCount) {
    parts.push('view_count = view_count + ?');
    values.push(updates.viewCount);
  }
  if (updates.shareCount) {
    parts.push('share_count = share_count + ?');
    values.push(updates.shareCount);
  }
  if (updates.commentCount) {
    parts.push('comment_count = comment_count + ?');
    values.push(updates.commentCount);
  }

  if (parts.length === 0) {
    return;
  }

  await dbPool.query(`UPDATE videos SET ${parts.join(', ')} WHERE id = ?`, [...values, videoId]);
}

export async function listLegacyVideoSourceRows(limit = 100) {
  const [rows] = await dbPool.query<LegacyVideoSourceRow[]>(
    `SELECT v.id, v.video_url, v.duration
     FROM videos v
     LEFT JOIN video_assets va ON va.video_id = v.id
     WHERE va.video_id IS NULL
       AND v.video_url IS NOT NULL
       AND v.video_url <> ''
     ORDER BY v.created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows;
}

export async function scrubVideoUrlsWithAssets() {
  const [result] = await dbPool.query(
    `UPDATE videos v
     INNER JOIN video_assets va ON va.video_id = v.id
     SET v.video_url = ''
     WHERE v.video_url IS NOT NULL
       AND v.video_url <> ''`
  );

  return result;
}
