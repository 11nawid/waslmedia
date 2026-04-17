import type { UserNotification } from '@/lib/ads/types';
import {
  countUnreadUserNotifications,
  createUserNotificationRow,
  findUserNotificationRowById,
  listUserNotificationRowsByUserId,
  markUserNotificationReadRow,
  type UserNotificationRow,
} from '@/server/repositories/user-notifications';

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapNotification(row: UserNotificationRow): UserNotification {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    severity: row.severity,
    readAt: toIso(row.read_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    relatedCampaignId: row.related_campaign_id,
    ctaLabel: row.cta_label,
    ctaTarget: row.cta_target,
    metadata,
  };
}

export async function createUserNotification(input: {
  userId: string;
  type: UserNotification['type'];
  title: string;
  body: string;
  severity: UserNotification['severity'];
  relatedCampaignId?: string | null;
  ctaLabel?: string | null;
  ctaTarget?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const id = await createUserNotificationRow({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity,
    relatedCampaignId: input.relatedCampaignId || null,
    ctaLabel: input.ctaLabel || null,
    ctaTarget: input.ctaTarget || null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  });

  const row = await findUserNotificationRowById(input.userId, id);
  if (!row) {
    throw new Error('USER_NOTIFICATION_CREATE_FAILED');
  }

  return mapNotification(row);
}

export async function listUserNotifications(userId: string, limit = 20) {
  const [rows, unreadCount] = await Promise.all([
    listUserNotificationRowsByUserId(userId, limit),
    countUnreadUserNotifications(userId),
  ]);

  return {
    items: rows.map(mapNotification),
    unreadCount,
  };
}

export async function getUserNotification(userId: string, notificationId: string) {
  const row = await findUserNotificationRowById(userId, notificationId);
  return row ? mapNotification(row) : null;
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  await markUserNotificationReadRow(userId, notificationId);
  const row = await findUserNotificationRowById(userId, notificationId);
  return row ? mapNotification(row) : null;
}
