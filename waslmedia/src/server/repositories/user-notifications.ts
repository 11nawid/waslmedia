import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import type { UserNotificationSeverity, UserNotificationType } from '@/lib/ads/types';

export interface UserNotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: UserNotificationType;
  title: string;
  body: string;
  severity: UserNotificationSeverity;
  related_campaign_id: string | null;
  cta_label: string | null;
  cta_target: string | null;
  metadata_json: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

export async function createUserNotificationRow(input: {
  userId: string;
  type: UserNotificationType;
  title: string;
  body: string;
  severity: UserNotificationSeverity;
  relatedCampaignId?: string | null;
  ctaLabel?: string | null;
  ctaTarget?: string | null;
  metadataJson?: string | null;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO user_notifications (
      id, user_id, type, title, body, severity, related_campaign_id, cta_label, cta_target, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.type,
      input.title,
      input.body,
      input.severity,
      input.relatedCampaignId || null,
      input.ctaLabel || null,
      input.ctaTarget || null,
      input.metadataJson || null,
    ]
  );

  return id;
}

export async function listUserNotificationRowsByUserId(userId: string, limit = 20) {
  const [rows] = await dbPool.query<UserNotificationRow[]>(
    `SELECT *
     FROM user_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return rows;
}

export async function findUserNotificationRowById(userId: string, notificationId: string) {
  const [rows] = await dbPool.query<UserNotificationRow[]>(
    `SELECT *
     FROM user_notifications
     WHERE user_id = ?
       AND id = ?
     LIMIT 1`,
    [userId, notificationId]
  );

  return rows[0] || null;
}

export async function markUserNotificationReadRow(userId: string, notificationId: string) {
  await dbPool.query(
    `UPDATE user_notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = ?
       AND id = ?`,
    [userId, notificationId]
  );
}

export async function countUnreadUserNotifications(userId: string) {
  const [rows] = await dbPool.query<Array<{ count: number } & RowDataPacket>>(
    `SELECT COUNT(*) AS count
     FROM user_notifications
     WHERE user_id = ?
       AND read_at IS NULL`,
    [userId]
  );

  return Number(rows[0]?.count || 0);
}
