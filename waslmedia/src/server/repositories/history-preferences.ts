import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface UserHistoryPreferenceRow extends RowDataPacket {
  user_id: string;
  save_history: number;
  updated_at: Date | string;
}

export async function findUserHistoryPreference(userId: string) {
  const [rows] = await dbPool.query<UserHistoryPreferenceRow[]>(
    `SELECT user_id, save_history, updated_at
     FROM user_history_preferences
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function upsertUserHistoryPreference(userId: string, saveHistory: boolean) {
  await dbPool.query(
    `INSERT INTO user_history_preferences (user_id, save_history)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE save_history = VALUES(save_history), updated_at = CURRENT_TIMESTAMP`,
    [userId, saveHistory ? 1 : 0]
  );

  return findUserHistoryPreference(userId);
}
