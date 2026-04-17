import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface VideoReactionRow extends RowDataPacket {
  user_id: string;
  video_id: string;
  reaction: 'like' | 'dislike';
}

export async function findVideoReaction(userId: string, videoId: string) {
  const [rows] = await dbPool.query<VideoReactionRow[]>(
    `SELECT user_id, video_id, reaction
     FROM video_reactions
     WHERE user_id = ? AND video_id = ?
     LIMIT 1`,
    [userId, videoId]
  );

  return rows[0] || null;
}

export async function setVideoReaction(userId: string, videoId: string, reaction: 'like' | 'dislike' | null) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query<VideoReactionRow[]>(
      `SELECT user_id, video_id, reaction
       FROM video_reactions
       WHERE user_id = ? AND video_id = ?
       LIMIT 1`,
      [userId, videoId]
    );

    const existing = existingRows[0] || null;

    if (existing?.reaction === 'like') {
      await connection.query(`UPDATE videos SET likes = GREATEST(likes - 1, 0) WHERE id = ?`, [videoId]);
    }
    if (existing?.reaction === 'dislike') {
      await connection.query(`UPDATE videos SET dislikes = GREATEST(dislikes - 1, 0) WHERE id = ?`, [videoId]);
    }

    if (!reaction) {
      await connection.query(`DELETE FROM video_reactions WHERE user_id = ? AND video_id = ?`, [userId, videoId]);
    } else {
      await connection.query(
        `INSERT INTO video_reactions (user_id, video_id, reaction)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reaction = VALUES(reaction), created_at = CURRENT_TIMESTAMP`,
        [userId, videoId, reaction]
      );
      await connection.query(
        `UPDATE videos SET ${reaction === 'like' ? 'likes' : 'dislikes'} = ${reaction === 'like' ? 'likes' : 'dislikes'} + 1 WHERE id = ?`,
        [videoId]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listLikedVideoIds(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT video_id
     FROM video_reactions
     WHERE user_id = ? AND reaction = 'like'
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => String(row.video_id));
}

export async function upsertWatchLater(userId: string, videoId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT video_id FROM watch_later WHERE user_id = ? AND video_id = ? LIMIT 1`,
    [userId, videoId]
  );

  if (rows[0]) {
    await dbPool.query(`DELETE FROM watch_later WHERE user_id = ? AND video_id = ?`, [userId, videoId]);
    return false;
  }

  await dbPool.query(
    `INSERT INTO watch_later (user_id, video_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
    [userId, videoId]
  );

  return true;
}

export async function bulkSetWatchLater(userId: string, videoIds: string[], shouldExist: boolean) {
  if (videoIds.length === 0) {
    return;
  }

  const placeholders = videoIds.map(() => '(?, ?)').join(', ');
  if (shouldExist) {
    const values = videoIds.flatMap((videoId) => [userId, videoId]);
    await dbPool.query(
      `INSERT IGNORE INTO watch_later (user_id, video_id) VALUES ${placeholders}`,
      values
    );
    return;
  }

  const inPlaceholders = videoIds.map(() => '?').join(', ');
  await dbPool.query(
    `DELETE FROM watch_later WHERE user_id = ? AND video_id IN (${inPlaceholders})`,
    [userId, ...videoIds]
  );
}

export async function listWatchLaterVideoIds(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT video_id
     FROM watch_later
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => String(row.video_id));
}

export async function addToHistory(userId: string, videoId: string) {
  await dbPool.query(
    `INSERT INTO history (user_id, video_id, watched_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE watched_at = CURRENT_TIMESTAMP`,
    [userId, videoId]
  );
}

export async function removeFromHistory(userId: string, videoId: string) {
  await dbPool.query(
    `DELETE FROM history
     WHERE user_id = ? AND video_id = ?`,
    [userId, videoId]
  );
}

export async function clearHistory(userId: string) {
  await dbPool.query(
    `DELETE FROM history
     WHERE user_id = ?`,
    [userId]
  );
}

export async function listHistoryVideoIds(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT video_id
     FROM history
     WHERE user_id = ?
     ORDER BY watched_at DESC`,
    [userId]
  );

  return rows.map((row) => String(row.video_id));
}

export async function listUserVideoStatus(userId: string, videoId: string) {
  const [reactionRows] = await dbPool.query<VideoReactionRow[]>(
    `SELECT reaction FROM video_reactions WHERE user_id = ? AND video_id = ? LIMIT 1`,
    [userId, videoId]
  );
  const [watchLaterRows] = await dbPool.query<RowDataPacket[]>(
    `SELECT 1 FROM watch_later WHERE user_id = ? AND video_id = ? LIMIT 1`,
    [userId, videoId]
  );

  return {
    liked: reactionRows[0]?.reaction === 'like',
    disliked: reactionRows[0]?.reaction === 'dislike',
    watchLater: Boolean(watchLaterRows[0]),
  };
}

export async function toggleSubscription(
  userId: string,
  channelUserId: string,
  options?: { sourceContext?: string | null; subscriberCountry?: string | null }
) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_user_id = ? LIMIT 1`,
      [userId, channelUserId]
    );

    const isSubscribed = Boolean(rows[0]);

    if (isSubscribed) {
      await connection.query(`DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_user_id = ?`, [userId, channelUserId]);
      await connection.query(`UPDATE channels SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE user_id = ?`, [channelUserId]);
      await connection.query(
        `INSERT INTO subscription_events (id, subscriber_id, channel_user_id, change_value, source_context, subscriber_country)
         VALUES (?, ?, ?, -1, ?, ?)`,
        [randomUUID(), userId, channelUserId, options?.sourceContext || null, options?.subscriberCountry || null]
      );
      await connection.commit();
      return false;
    }

    await connection.query(
      `INSERT INTO subscriptions (subscriber_id, channel_user_id) VALUES (?, ?)`,
      [userId, channelUserId]
    );
    await connection.query(`UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE user_id = ?`, [channelUserId]);
    await connection.query(
      `INSERT INTO subscription_events (id, subscriber_id, channel_user_id, change_value, source_context, subscriber_country)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [randomUUID(), userId, channelUserId, options?.sourceContext || null, options?.subscriberCountry || null]
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listSubscriptionChannelIds(userId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT channel_user_id
     FROM subscriptions
     WHERE subscriber_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => String(row.channel_user_id));
}
