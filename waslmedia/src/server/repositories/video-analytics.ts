import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface VideoAnalyticsDailyRow extends RowDataPacket {
  video_id: string;
  activity_date: Date | string;
  views_delta: number;
  likes_delta: number;
  dislikes_delta: number;
  comments_delta: number;
  shares_delta: number;
}

export interface AuthorAnalyticsDailyRow extends RowDataPacket {
  activity_date: Date | string;
  views_delta: number;
  likes_delta: number;
  dislikes_delta: number;
  comments_delta: number;
  shares_delta: number;
}

export interface VideoAnalyticsEventRow extends RowDataPacket {
  id: string;
  video_id: string;
  actor_user_id: string | null;
  event_type: 'view' | 'like' | 'dislike' | 'comment' | 'share';
  event_value: number;
  traffic_source: string | null;
  viewer_country: string | null;
  viewer_key: string | null;
  device_type: string | null;
  created_at: Date | string;
  actor_name: string | null;
  actor_image_url: string | null;
}

export interface AnalyticsBreakdownRow extends RowDataPacket {
  label: string;
  value: number;
}

export interface ViewerCountRow extends RowDataPacket {
  value: number;
}

function buildDaysFilter(days?: number, column = 'created_at') {
  if (typeof days !== 'number' || !Number.isFinite(days)) {
    return {
      clause: '',
      params: [] as number[],
    };
  }

  return {
    clause: `AND ${column} >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)`,
    params: [Math.max(1, Math.ceil(days))],
  };
}

export async function recordVideoAnalyticsDelta(input: {
  videoId: string;
  actorUserId?: string | null;
  type: 'view' | 'like' | 'dislike' | 'comment' | 'share';
  value?: number;
  deltas: {
    views?: number;
    likes?: number;
    dislikes?: number;
    comments?: number;
    shares?: number;
  };
  trafficSource?: string | null;
  viewerCountry?: string | null;
  viewerKey?: string | null;
  deviceType?: string | null;
}) {
  const value = input.value ?? 1;
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO video_analytics_daily (
        video_id,
        activity_date,
        views_delta,
        likes_delta,
        dislikes_delta,
        comments_delta,
        shares_delta
      ) VALUES (?, CURRENT_DATE(), ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        views_delta = views_delta + VALUES(views_delta),
        likes_delta = likes_delta + VALUES(likes_delta),
        dislikes_delta = dislikes_delta + VALUES(dislikes_delta),
        comments_delta = comments_delta + VALUES(comments_delta),
        shares_delta = shares_delta + VALUES(shares_delta),
        updated_at = CURRENT_TIMESTAMP`,
      [
        input.videoId,
        input.deltas.views || 0,
        input.deltas.likes || 0,
        input.deltas.dislikes || 0,
        input.deltas.comments || 0,
        input.deltas.shares || 0,
      ]
    );

    await connection.query(
      `INSERT INTO video_analytics_events (
        id,
        video_id,
        actor_user_id,
        event_type,
        event_value,
        traffic_source,
        viewer_country,
        viewer_key,
        device_type
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.videoId,
        input.actorUserId || null,
        input.type,
        value,
        input.trafficSource || null,
        input.viewerCountry || null,
        input.viewerKey || null,
        input.deviceType || null,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listVideoAnalyticsDaily(videoId: string, days?: number) {
  const params: Array<string | number> = [videoId];
  const whereDays =
    typeof days === 'number'
      ? (() => {
          params.push(days);
          return `AND activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)`;
        })()
      : '';

  const [rows] = await dbPool.query<VideoAnalyticsDailyRow[]>(
    `SELECT video_id, activity_date, views_delta, likes_delta, dislikes_delta, comments_delta, shares_delta
     FROM video_analytics_daily
     WHERE video_id = ?
     ${whereDays}
     ORDER BY activity_date ASC`,
    params
  );

  return rows;
}

export async function listRecentVideoAnalyticsEvents(videoId: string, limit = 20) {
  const [rows] = await dbPool.query<VideoAnalyticsEventRow[]>(
    `SELECT
       e.id,
       e.video_id,
       e.actor_user_id,
       e.event_type,
       e.event_value,
       e.traffic_source,
       e.viewer_country,
       e.viewer_key,
       e.device_type,
       e.created_at,
       ch.name AS actor_name,
       ch.profile_picture_url AS actor_image_url
     FROM video_analytics_events e
     LEFT JOIN channels ch ON ch.user_id = e.actor_user_id
     WHERE e.video_id = ?
     ORDER BY e.created_at DESC
     LIMIT ?`,
    [videoId, limit]
  );

  return rows;
}

export async function listAuthorVideoAnalyticsDaily(authorId: string, days = 28) {
  const normalizedDays = Math.max(1, days);
  const [rows] = await dbPool.query<AuthorAnalyticsDailyRow[]>(
    `SELECT
       d.activity_date,
       SUM(d.views_delta) AS views_delta,
       SUM(d.likes_delta) AS likes_delta,
       SUM(d.dislikes_delta) AS dislikes_delta,
       SUM(d.comments_delta) AS comments_delta,
       SUM(d.shares_delta) AS shares_delta
     FROM video_analytics_daily d
     INNER JOIN videos v ON v.id = d.video_id
     WHERE v.author_id = ?
       AND d.activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
     GROUP BY d.activity_date
     ORDER BY d.activity_date ASC`,
    [authorId, normalizedDays]
  );

  return rows;
}

export async function listVideoTrafficSourceBreakdown(videoId: string, days?: number) {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(traffic_source, ''), 'direct_or_unknown') AS label, COUNT(*) AS value
     FROM video_analytics_events
     WHERE video_id = ?
       AND event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [videoId, ...filter.params]
  );

  return rows;
}

export async function listAuthorTrafficSourceBreakdown(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(e.traffic_source, ''), 'direct_or_unknown') AS label, COUNT(*) AS value
     FROM video_analytics_events e
     INNER JOIN videos v ON v.id = e.video_id
     WHERE v.author_id = ?
       AND e.event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [authorId, ...filter.params]
  );

  return rows;
}

export async function listVideoViewerCountryBreakdown(videoId: string, days?: number) {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(viewer_country, ''), 'Unknown') AS label, COUNT(*) AS value
     FROM video_analytics_events
     WHERE video_id = ?
       AND event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC
     LIMIT 10`,
    [videoId, ...filter.params]
  );

  return rows;
}

export async function listAuthorViewerCountryBreakdown(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(e.viewer_country, ''), 'Unknown') AS label, COUNT(*) AS value
     FROM video_analytics_events e
     INNER JOIN videos v ON v.id = e.video_id
     WHERE v.author_id = ?
       AND e.event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC
     LIMIT 10`,
    [authorId, ...filter.params]
  );

  return rows;
}

export async function listAuthorDeviceTypeBreakdown(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(e.device_type, ''), 'computer') AS label, COUNT(*) AS value
     FROM video_analytics_events e
     INNER JOIN videos v ON v.id = e.video_id
     WHERE v.author_id = ?
       AND e.event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [authorId, ...filter.params]
  );

  return rows;
}

export async function listVideoDeviceTypeBreakdown(videoId: string, days?: number) {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT COALESCE(NULLIF(device_type, ''), 'computer') AS label, COUNT(*) AS value
     FROM video_analytics_events
     WHERE video_id = ?
       AND event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [videoId, ...filter.params]
  );

  return rows;
}

export async function listAuthorFormatViewBreakdown(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<AnalyticsBreakdownRow[]>(
    `SELECT
       CASE WHEN v.category = 'Shorts' THEN 'Shorts' ELSE 'Videos' END AS label,
       COUNT(*) AS value
     FROM video_analytics_events e
     INNER JOIN videos v ON v.id = e.video_id
     WHERE v.author_id = ?
       AND e.event_type = 'view'
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [authorId, ...filter.params]
  );

  return rows;
}

export async function countVideoUniqueViewers(videoId: string, days?: number) {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<ViewerCountRow[]>(
    `SELECT COUNT(DISTINCT COALESCE(actor_user_id, viewer_key, id)) AS value
     FROM video_analytics_events
     WHERE video_id = ?
       AND event_type = 'view'
       ${filter.clause}`,
    [videoId, ...filter.params]
  );

  return Number(rows[0]?.value || 0);
}

export async function countVideoReturningViewers(videoId: string, days?: number) {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<ViewerCountRow[]>(
    `SELECT COUNT(*) AS value
     FROM (
       SELECT COALESCE(actor_user_id, viewer_key, id) AS viewer_identity
       FROM video_analytics_events
       WHERE video_id = ?
         AND event_type = 'view'
         ${filter.clause}
       GROUP BY viewer_identity
       HAVING COUNT(*) > 1
     ) repeated_viewers`,
    [videoId, ...filter.params]
  );

  return Number(rows[0]?.value || 0);
}

export async function countAuthorUniqueViewers(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<ViewerCountRow[]>(
    `SELECT COUNT(DISTINCT COALESCE(e.actor_user_id, e.viewer_key, e.id)) AS value
     FROM video_analytics_events e
     INNER JOIN videos v ON v.id = e.video_id
     WHERE v.author_id = ?
       AND e.event_type = 'view'
       ${filter.clause}`,
    [authorId, ...filter.params]
  );

  return Number(rows[0]?.value || 0);
}

export async function countAuthorReturningViewers(authorId: string, days?: number) {
  const filter = buildDaysFilter(days, 'e.created_at');
  const [rows] = await dbPool.query<ViewerCountRow[]>(
    `SELECT COUNT(*) AS value
     FROM (
       SELECT COALESCE(e.actor_user_id, e.viewer_key, e.id) AS viewer_identity
       FROM video_analytics_events e
       INNER JOIN videos v ON v.id = e.video_id
       WHERE v.author_id = ?
         AND e.event_type = 'view'
         ${filter.clause}
       GROUP BY viewer_identity
       HAVING COUNT(*) > 1
     ) repeated_viewers`,
    [authorId, ...filter.params]
  );

  return Number(rows[0]?.value || 0);
}
