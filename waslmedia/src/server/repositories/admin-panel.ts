import type { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export type AdminDashboardCountsRow = RowDataPacket & {
  users_count: number;
  channels_count: number;
  videos_count: number;
  comments_count: number;
  posts_count: number;
  ads_pending_count: number;
  ads_active_count: number;
  staff_count: number;
};

export type AdminSimpleMetricRow = RowDataPacket & {
  label: string;
  value: number;
};

export async function getAdminDashboardCounts() {
  const [rows] = await dbPool.query<AdminDashboardCountsRow[]>(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_count,
      (SELECT COUNT(*) FROM channels) AS channels_count,
      (SELECT COUNT(*) FROM videos) AS videos_count,
      (SELECT COUNT(*) FROM comments) AS comments_count,
      (SELECT COUNT(*) FROM posts) AS posts_count,
      (SELECT COUNT(*) FROM ad_campaigns WHERE review_status = 'pending') AS ads_pending_count,
      (SELECT COUNT(*) FROM ad_campaigns WHERE status = 'active') AS ads_active_count,
      (SELECT COUNT(*) FROM admin_staff_accounts) AS staff_count
  `);

  return rows[0] || null;
}

export async function listAdminUsers(query = '', limit = 25) {
  const normalizedQuery = query.trim();
  const like = `%${normalizedQuery}%`;
  const params: unknown[] = [];
  const where = normalizedQuery
    ? `WHERE u.email LIKE ? OR u.display_name LIKE ? OR u.handle LIKE ?`
    : '';

  if (normalizedQuery) {
    params.push(like, like, like);
  }
  params.push(limit);

  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       u.id,
       u.email,
       u.display_name,
       u.handle,
       u.created_at,
       c.name AS channel_name,
       c.subscriber_count,
       (SELECT COUNT(*) FROM watch_later wl WHERE wl.user_id = u.id) AS watch_later_count,
       (SELECT COUNT(*) FROM history h WHERE h.user_id = u.id) AS history_count,
       (SELECT COUNT(*) FROM subscriptions s WHERE s.subscriber_id = u.id) AS subscriptions_count
     FROM users u
     LEFT JOIN channels c ON c.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listAdminChannels(query = '', limit = 25) {
  const normalizedQuery = query.trim();
  const like = `%${normalizedQuery}%`;
  const params: unknown[] = [];
  const where = normalizedQuery
    ? `WHERE c.name LIKE ? OR c.handle LIKE ? OR u.email LIKE ?`
    : '';

  if (normalizedQuery) {
    params.push(like, like, like);
  }
  params.push(limit);

  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       c.user_id,
       c.name,
       c.handle,
       c.contact_email,
       c.country,
       c.show_country,
       c.subscriber_count,
       c.updated_at,
       u.email AS owner_email,
       (SELECT COUNT(*) FROM videos v WHERE v.author_id = c.user_id) AS videos_count,
       (SELECT COUNT(*) FROM posts p WHERE p.author_id = c.user_id) AS posts_count
     FROM channels c
     INNER JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY c.updated_at DESC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listAdminVideos(query = '', limit = 30) {
  const normalizedQuery = query.trim();
  const like = `%${normalizedQuery}%`;
  const params: unknown[] = [];
  const where = normalizedQuery
    ? `WHERE v.title LIKE ? OR v.description LIKE ? OR u.handle LIKE ?`
    : '';

  if (normalizedQuery) {
    params.push(like, like, like);
  }
  params.push(limit);

  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       v.id,
       v.title,
       v.visibility,
       v.duration,
       v.thumbnail_url,
       v.view_count,
       v.likes,
       v.dislikes,
       v.comment_count,
       v.share_count,
       v.created_at,
       u.id AS author_id,
       u.display_name AS author_name,
       u.handle AS author_handle
     FROM videos v
     INNER JOIN users u ON u.id = v.author_id
     ${where}
     ORDER BY v.created_at DESC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listAdminComments(query = '', limit = 30) {
  const normalizedQuery = query.trim();
  const like = `%${normalizedQuery}%`;
  const params: unknown[] = [];
  const where = normalizedQuery
    ? `WHERE cm.text LIKE ? OR u.handle LIKE ?`
    : '';

  if (normalizedQuery) {
    params.push(like, like);
  }
  params.push(limit);

  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       cm.id,
       cm.video_id,
       cm.post_id,
       cm.parent_id,
       cm.text,
       cm.likes,
       cm.created_at,
       u.id AS author_id,
       u.display_name AS author_name,
       u.handle AS author_handle
     FROM comments cm
     INNER JOIN users u ON u.id = cm.author_id
     ${where}
     ORDER BY cm.created_at DESC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listAdminPosts(query = '', limit = 30) {
  const normalizedQuery = query.trim();
  const like = `%${normalizedQuery}%`;
  const params: unknown[] = [];
  const where = normalizedQuery
    ? `WHERE p.text LIKE ? OR u.handle LIKE ? OR u.display_name LIKE ?`
    : '';

  if (normalizedQuery) {
    params.push(like, like, like);
  }
  params.push(limit);

  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       p.id,
       p.text,
       p.image_url,
       p.likes,
       p.dislikes,
       p.comment_count,
       p.created_at,
       u.id AS author_id,
       u.display_name AS author_name,
       u.handle AS author_handle
     FROM posts p
     INNER JOIN users u ON u.id = p.author_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listAdminAnalyticsPoints(days = 7) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       DATE(created_at) AS activity_date,
       SUM(CASE WHEN event_type = 'view' THEN event_value ELSE 0 END) AS views_delta,
       SUM(CASE WHEN event_type = 'like' THEN event_value ELSE 0 END) AS likes_delta,
       SUM(CASE WHEN event_type = 'comment' THEN event_value ELSE 0 END) AS comments_delta,
       SUM(CASE WHEN event_type = 'share' THEN event_value ELSE 0 END) AS shares_delta
     FROM video_analytics_events
     WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY activity_date ASC`,
    [Math.max(days - 1, 0)]
  );

  return rows;
}

export async function listAdminFinanceRows(limit = 30) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       o.id,
       o.razorpay_order_id,
       o.status AS order_status,
       o.amount_paise,
       o.tax_paise,
       o.total_paise,
       o.currency,
       o.created_at,
       c.id AS campaign_id,
       c.status AS campaign_status,
       c.review_status,
       c.payment_status,
       c.destination_url,
       p.razorpay_payment_id,
       p.status AS payment_record_status,
       p.captured_at
     FROM ad_orders o
     INNER JOIN ad_campaigns c ON c.id = o.campaign_id
     LEFT JOIN ad_payments p ON p.order_id = o.id
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows;
}
