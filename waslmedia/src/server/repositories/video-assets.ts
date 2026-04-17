import { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { dbPool } from '@/db/pool';

type QueryExecutor = Pick<PoolConnection, 'query'>;

function getExecutor(executor?: QueryExecutor) {
  return executor ?? dbPool;
}

export interface VideoAssetRow extends RowDataPacket {
  video_id: string;
  source_bucket: string;
  source_object_key: string;
  manifest_bucket: string | null;
  manifest_object_key: string | null;
  thumbnail_bucket: string | null;
  thumbnail_object_key: string | null;
  transcode_status: 'pending' | 'processing' | 'ready' | 'failed';
  renditions_json: string | null;
  duration_seconds: number;
  processed_at: Date | string | null;
  last_error: string | null;
}

export async function createVideoAssetRow(input: {
  videoId: string;
  sourceBucket: string;
  sourceObjectKey: string;
  durationSeconds?: number;
}, executor?: QueryExecutor) {
  const db = getExecutor(executor);

  await db.query(
    `INSERT INTO video_assets (
      video_id,
      source_bucket,
      source_object_key,
      duration_seconds
    ) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      source_bucket = VALUES(source_bucket),
      source_object_key = VALUES(source_object_key),
      duration_seconds = VALUES(duration_seconds),
      updated_at = CURRENT_TIMESTAMP`,
    [input.videoId, input.sourceBucket, input.sourceObjectKey, input.durationSeconds || 0]
  );
}

export async function findVideoAssetByVideoId(videoId: string) {
  const [rows] = await dbPool.query<VideoAssetRow[]>(
    `SELECT
      video_id,
      source_bucket,
      source_object_key,
      manifest_bucket,
      manifest_object_key,
      thumbnail_bucket,
      thumbnail_object_key,
      transcode_status,
      renditions_json,
      duration_seconds,
      processed_at,
      last_error
     FROM video_assets
     WHERE video_id = ?
     LIMIT 1`,
    [videoId]
  );

  return rows[0] || null;
}

export async function listVideoAssetsByVideoIds(videoIds: string[]) {
  if (videoIds.length === 0) {
    return [];
  }

  const placeholders = videoIds.map(() => '?').join(', ');
  const [rows] = await dbPool.query<VideoAssetRow[]>(
    `SELECT
      video_id,
      source_bucket,
      source_object_key,
      manifest_bucket,
      manifest_object_key,
      thumbnail_bucket,
      thumbnail_object_key,
      transcode_status,
      renditions_json,
      duration_seconds,
      processed_at,
      last_error
     FROM video_assets
     WHERE video_id IN (${placeholders})`,
    videoIds
  );

  return rows;
}

export async function updateVideoAssetRow(
  videoId: string,
  updates: Partial<{
    source_bucket: string;
    source_object_key: string;
    manifest_bucket: string | null;
    manifest_object_key: string | null;
    thumbnail_bucket: string | null;
    thumbnail_object_key: string | null;
    transcode_status: 'pending' | 'processing' | 'ready' | 'failed';
    renditions_json: string | null;
    duration_seconds: number;
    processed_at: Date | null;
    last_error: string | null;
  }>
) {
  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (fields.length === 0) {
    return findVideoAssetByVideoId(videoId);
  }

  const columns = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);

  await dbPool.query(`UPDATE video_assets SET ${columns} WHERE video_id = ?`, [...values, videoId]);
  return findVideoAssetByVideoId(videoId);
}
