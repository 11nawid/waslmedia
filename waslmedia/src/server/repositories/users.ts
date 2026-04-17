import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { DEFAULT_BANNER, DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';

export interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  photo_url: string | null;
  handle: string;
  profile_picture_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  description: string | null;
  country: string | null;
  show_country: number;
}

export async function findUserByEmail(email: string) {
  const [rows] = await dbPool.query<UserRow[]>(
    `SELECT u.id, u.email, u.password_hash, u.display_name, u.photo_url, u.handle,
            c.profile_picture_url, c.banner_url, c.subscriber_count, c.description, c.country, c.show_country
     FROM users u
     LEFT JOIN channels c ON c.user_id = u.id
     WHERE u.email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

export async function findUserByHandle(handle: string) {
  const [rows] = await dbPool.query<UserRow[]>(
    `SELECT u.id, u.email, u.password_hash, u.display_name, u.photo_url, u.handle,
            c.profile_picture_url, c.banner_url, c.subscriber_count, c.description, c.country, c.show_country
     FROM users u
     LEFT JOIN channels c ON c.user_id = u.id
     WHERE u.handle = ?
     LIMIT 1`,
    [handle]
  );

  return rows[0] || null;
}

export async function findUserById(userId: string) {
  const [rows] = await dbPool.query<UserRow[]>(
    `SELECT u.id, u.email, u.password_hash, u.display_name, u.photo_url, u.handle,
            c.profile_picture_url, c.banner_url, c.subscriber_count, c.description, c.country, c.show_country
     FROM users u
     LEFT JOIN channels c ON c.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function createUserWithChannel(input: {
  email: string;
  passwordHash: string;
  displayName: string;
  handle: string;
  photoUrl?: string | null;
}) {
  const userId = randomUUID();
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (id, email, password_hash, display_name, photo_url, handle)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, input.email, input.passwordHash, input.displayName, input.photoUrl || DEFAULT_PROFILE_PICTURE, input.handle]
    );

    await connection.query(
      `INSERT INTO channels (
        user_id, name, handle, profile_picture_url, banner_url, subscriber_count, description, contact_email, country, show_country
      ) VALUES (?, ?, ?, ?, ?, 0, '', '', '', 0)`,
      [userId, input.displayName, `@${input.handle}`, input.photoUrl || DEFAULT_PROFILE_PICTURE, DEFAULT_BANNER]
    );

    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSubscriptionsForUser(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    'SELECT channel_user_id FROM subscriptions WHERE subscriber_id = ?',
    [userId]
  );

  return rows.map((row) => String(row.channel_user_id));
}

export async function getWatchLaterForUser(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    'SELECT video_id FROM watch_later WHERE user_id = ?',
    [userId]
  );

  return rows.map((row) => String(row.video_id));
}
