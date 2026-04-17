import { format } from 'date-fns';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export async function listSubscriptionHistory(channelUserId: string, days = 28, currentTotal = 0) {
  const normalizedDays = Math.max(1, days);
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS date_value, SUM(change_value) AS delta
     FROM subscription_events
     WHERE channel_user_id = ?
       AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) ASC`,
    [channelUserId, normalizedDays]
  );

  const deltasByDate = new Map(
    rows.map((row) => [format(new Date(row.date_value), 'yyyy-MM-dd'), Number(row.delta || 0)])
  );

  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (normalizedDays - 1));

  for (let index = 0; index < normalizedDays; index += 1) {
    dates.push(format(cursor, 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalDeltaInRange = [...deltasByDate.values()].reduce((sum, delta) => sum + delta, 0);
  let running = Math.max(currentTotal - totalDeltaInRange, 0);

  return dates.map((dateKey) => {
    const delta = deltasByDate.get(dateKey) || 0;
    running += delta;
    return {
      date: format(new Date(dateKey), 'MMM d'),
      count: running,
      change: delta,
    };
  });
}
