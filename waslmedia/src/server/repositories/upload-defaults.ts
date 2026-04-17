import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface UploadDefaultsRow extends RowDataPacket {
  user_id: string;
  title: string | null;
  description: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  category: string | null;
  tags: string | null;
}

export interface UploadDefaultsInput {
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  category: string;
  tags: string;
}

export async function findUploadDefaultsByUserId(userId: string) {
  const [rows] = await dbPool.query<UploadDefaultsRow[]>(
    `SELECT user_id, title, description, visibility, category, tags
      FROM upload_defaults
      WHERE user_id = ?
      LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function upsertUploadDefaults(userId: string, input: UploadDefaultsInput) {
  await dbPool.query(
    `INSERT INTO upload_defaults (user_id, title, description, visibility, category, tags)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        visibility = VALUES(visibility),
        category = VALUES(category),
        tags = VALUES(tags)`,
    [userId, input.title, input.description, input.visibility, input.category, input.tags]
  );

  return findUploadDefaultsByUserId(userId);
}
