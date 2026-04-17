import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface ChannelSettingsRow extends RowDataPacket {
  user_id: string;
  name: string;
  handle: string;
  profile_picture_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  description: string | null;
  contact_email: string | null;
  country: string | null;
  show_country: number;
  joined_at: Date | string | null;
}

export interface ChannelSettingsInput {
  name: string;
  handle: string;
  profilePictureUrl: string;
  bannerUrl: string;
  description: string;
  contactEmail: string;
  country: string;
  showCountry: boolean;
}

interface CountRow extends RowDataPacket {
  total: number;
}

function getBaseChannelSettingsSelect() {
  return `SELECT
      c.user_id,
      c.name,
      c.handle,
      c.profile_picture_url,
      c.banner_url,
      c.subscriber_count,
      c.description,
      c.contact_email,
      c.country,
      c.show_country,
      u.created_at AS joined_at
    FROM channels c
    INNER JOIN users u ON u.id = c.user_id`;
}

export async function findChannelSettingsByUserId(userId: string) {
  const [rows] = await dbPool.query<ChannelSettingsRow[]>(
    `${getBaseChannelSettingsSelect()}
      WHERE c.user_id = ?
      LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function findChannelSettingsByHandleOrId(handleOrId: string) {
  const normalizedHandle = handleOrId.replace(/^@/, '');
  const handleWithAt = handleOrId.startsWith('@') ? handleOrId : `@${normalizedHandle}`;

  const [rows] = await dbPool.query<ChannelSettingsRow[]>(
    `${getBaseChannelSettingsSelect()}
      WHERE c.user_id = ? OR c.handle = ?
      LIMIT 1`,
    [handleOrId, handleWithAt]
  );

  return rows[0] || null;
}

export async function listPublicChannelSettingsByQuery(query: string, limit = 20, offset = 0) {
  const normalizedQuery = `%${query.trim().toLowerCase()}%`;
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const safeOffset = Math.max(0, offset);

  const [rows] = await dbPool.query<ChannelSettingsRow[]>(
    `${getBaseChannelSettingsSelect()}
      WHERE LOWER(c.name) LIKE ?
         OR LOWER(c.handle) LIKE ?
         OR LOWER(COALESCE(c.description, '')) LIKE ?
      ORDER BY c.subscriber_count DESC, u.created_at DESC
      LIMIT ? OFFSET ?`,
    [normalizedQuery, normalizedQuery, normalizedQuery, safeLimit, safeOffset]
  );

  return rows;
}

export async function listAllPublicChannelSettings(limit = 5000) {
  const safeLimit = Math.max(1, Math.min(limit, 10000));
  const [rows] = await dbPool.query<ChannelSettingsRow[]>(
    `${getBaseChannelSettingsSelect()}
      ORDER BY c.subscriber_count DESC, u.created_at DESC
      LIMIT ?`,
    [safeLimit]
  );

  return rows.filter((row) => Boolean(row.handle));
}

export async function countPublicChannelSettingsByQuery(query: string) {
  const normalizedQuery = `%${query.trim().toLowerCase()}%`;
  const [rows] = await dbPool.query<CountRow[]>(
    `SELECT COUNT(*) AS total
      FROM channels c
      WHERE LOWER(c.name) LIKE ?
         OR LOWER(c.handle) LIKE ?
         OR LOWER(COALESCE(c.description, '')) LIKE ?`,
    [normalizedQuery, normalizedQuery, normalizedQuery]
  );

  return rows[0]?.total || 0;
}

export async function isHandleTaken(handle: string, excludeUserId?: string) {
  const normalizedHandle = handle.replace(/^@/, '');
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT id
      FROM users
      WHERE handle = ?
      ${excludeUserId ? 'AND id <> ?' : ''}
      LIMIT 1`,
    excludeUserId ? [normalizedHandle, excludeUserId] : [normalizedHandle]
  );

  return rows.length > 0;
}

export async function updateChannelSettings(userId: string, input: ChannelSettingsInput) {
  const normalizedHandle = input.handle.replace(/^@/, '');
  const channelHandle = `@${normalizedHandle}`;
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE users
        SET display_name = ?, photo_url = ?, handle = ?
        WHERE id = ?`,
      [input.name, input.profilePictureUrl, normalizedHandle, userId]
    );

    await connection.query(
      `UPDATE channels
        SET name = ?,
            handle = ?,
            profile_picture_url = ?,
            banner_url = ?,
            description = ?,
            contact_email = ?,
            country = ?,
            show_country = ?
        WHERE user_id = ?`,
      [
        input.name,
        channelHandle,
        input.profilePictureUrl,
        input.bannerUrl,
        input.description,
        input.contactEmail,
        input.country,
        input.showCountry ? 1 : 0,
        userId,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return findChannelSettingsByUserId(userId);
}
