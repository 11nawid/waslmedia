import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { findChannelSettingsByUserId } from '@/server/repositories/channel-settings';
import type { Channel } from '@/lib/types';
import { mapChannel } from '@/server/mappers/content';
import type { AnalyticsBreakdownItem } from '@/lib/analytics/types';

interface BreakdownRow extends RowDataPacket {
  label: string;
  value: number;
}

interface RecentSubscriberRow extends RowDataPacket {
  subscriber_id: string;
  created_at: Date | string;
}

function buildDaysFilter(days?: number) {
  if (typeof days !== 'number' || !Number.isFinite(days)) {
    return {
      clause: '',
      params: [] as number[],
    };
  }

  return {
    clause: 'AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)',
    params: [Math.max(1, Math.ceil(days))],
  };
}

export async function countRecentSubscribers(channelUserId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM subscriptions
     WHERE channel_user_id = ?`,
    [channelUserId],
  );

  return Number(rows[0]?.total || 0);
}

export async function listRecentSubscribers(
  channelUserId: string,
  count = 5,
  offset = 0,
  sortBy: 'recent' | 'oldest' | 'largest' = 'recent',
) {
  const orderClause =
    sortBy === 'oldest'
      ? 's.created_at ASC'
      : sortBy === 'largest'
        ? 'c.subscriber_count DESC, s.created_at DESC'
        : 's.created_at DESC';

  const [rows] = await dbPool.query<RecentSubscriberRow[]>(
    `SELECT s.subscriber_id, s.created_at
     FROM subscriptions s
     INNER JOIN channels c ON c.user_id = s.subscriber_id
     WHERE s.channel_user_id = ?
     ORDER BY ${orderClause}
     LIMIT ? OFFSET ?`,
    [channelUserId, count, offset]
  );

  const channels: Array<Channel | null> = await Promise.all(
    rows.map(async (row): Promise<Channel | null> => {
      const channel = await findChannelSettingsByUserId(String(row.subscriber_id));
      if (!channel) {
        return null;
      }

      return {
        ...mapChannel(channel),
        recentSubscriptionAt: new Date(row.created_at).toISOString(),
      };
    })
  );

  return channels.filter((channel): channel is Channel => channel !== null);
}

export async function listSubscriberCountryBreakdown(channelUserId: string, days?: number): Promise<AnalyticsBreakdownItem[]> {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<BreakdownRow[]>(
    `SELECT COALESCE(NULLIF(subscriber_country, ''), 'Unknown') AS label, COUNT(*) AS value
     FROM subscription_events
     WHERE channel_user_id = ?
       AND change_value = 1
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC
     LIMIT 10`,
    [channelUserId, ...filter.params]
  );

  return rows.map((row) => ({ label: row.label, value: Number(row.value || 0) }));
}

export async function listSubscriberSourceBreakdown(channelUserId: string, days?: number): Promise<AnalyticsBreakdownItem[]> {
  const filter = buildDaysFilter(days);
  const [rows] = await dbPool.query<BreakdownRow[]>(
    `SELECT COALESCE(NULLIF(source_context, ''), 'channel') AS label, COUNT(*) AS value
     FROM subscription_events
     WHERE channel_user_id = ?
       AND change_value = 1
       ${filter.clause}
     GROUP BY label
     ORDER BY value DESC`,
    [channelUserId, ...filter.params]
  );

  return rows.map((row) => ({ label: row.label, value: Number(row.value || 0) }));
}
