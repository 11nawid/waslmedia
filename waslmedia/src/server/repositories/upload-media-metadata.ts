import { createHash, randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { dbPool } from '@/db/pool';
import type { UploadMediaKind } from '@/lib/video-upload/rules';

type QueryExecutor = Pick<PoolConnection, 'query'>;

interface UploadMediaMetadataRow extends RowDataPacket {
  id: string;
  user_id: string;
  bucket: string;
  object_key: string;
  object_key_hash: string;
  media_kind: UploadMediaKind;
  duration_seconds: number;
  width: number;
  height: number;
  created_at: Date | string;
  updated_at: Date | string;
}

function getExecutor(executor?: QueryExecutor) {
  return executor ?? dbPool;
}

function hashObjectKey(objectKey: string) {
  return createHash('sha256').update(objectKey).digest('hex');
}

export async function upsertUploadMediaMetadata(
  input: {
    userId: string;
    bucket: string;
    objectKey: string;
    mediaKind: UploadMediaKind;
    durationSeconds: number;
    width: number;
    height: number;
  },
  executor?: QueryExecutor
) {
  const db = getExecutor(executor);

  await db.query(
    `INSERT INTO upload_media_metadata (
      id,
      user_id,
      bucket,
      object_key,
      object_key_hash,
      media_kind,
      duration_seconds,
      width,
      height
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      media_kind = VALUES(media_kind),
      duration_seconds = VALUES(duration_seconds),
      width = VALUES(width),
      height = VALUES(height),
      updated_at = CURRENT_TIMESTAMP`,
    [
      randomUUID(),
      input.userId,
      input.bucket,
      input.objectKey,
      hashObjectKey(input.objectKey),
      input.mediaKind,
      input.durationSeconds,
      input.width,
      input.height,
    ]
  );
}

export async function findUploadMediaMetadata(input: {
  userId: string;
  bucket: string;
  objectKey: string;
}) {
  const [rows] = await dbPool.query<UploadMediaMetadataRow[]>(
    `SELECT
      id,
      user_id,
      bucket,
      object_key,
      object_key_hash,
      media_kind,
      duration_seconds,
      width,
      height,
      created_at,
      updated_at
     FROM upload_media_metadata
     WHERE user_id = ?
       AND bucket = ?
       AND object_key_hash = ?
       AND object_key = ?
     LIMIT 1`,
    [input.userId, input.bucket, hashObjectKey(input.objectKey), input.objectKey]
  );

  return rows[0] || null;
}
