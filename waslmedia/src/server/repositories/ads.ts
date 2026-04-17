import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import type {
  AdNotifyMode,
  AdCampaignStatus,
  AdDeliveryEventType,
  AdOrderStatus,
  AdPaymentRecordStatus,
  AdPaymentStatus,
  AdPlacement,
  AdRejectionReasonCode,
  AdReviewAction,
  AdReviewStatus,
  AdSurface,
} from '@/lib/ads/types';

export interface AdPackageRow extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  placement_scope: AdPlacement;
  duration_days: number;
  impression_cap: number;
  price_paise: number;
  gst_percent: string;
  currency: string;
  active: number;
  display_order: number;
}

export interface AdCampaignRow extends RowDataPacket {
  id: string;
  owner_user_id: string;
  channel_user_id: string;
  package_id: string | null;
  status: AdCampaignStatus;
  review_status: AdReviewStatus;
  payment_status: AdPaymentStatus;
  placement_scope: AdPlacement;
  currency: string;
  destination_url: string;
  cta_label: string;
  budget_paise: number;
  tax_paise: number;
  total_paise: number;
  spend_paise: number;
  duration_days: number;
  impression_cap: number;
  total_impressions: number;
  total_clicks: number;
  total_dismissals: number;
  total_watch_previews: number;
  package_snapshot_json: string | null;
  review_notes: string | null;
  rejection_reason_code: AdRejectionReasonCode | null;
  rejection_reason_label: string | null;
  rejection_custom_reason: string | null;
  rejection_notify_mode: AdNotifyMode | null;
  last_reviewed_at: Date | string | null;
  start_at: Date | string | null;
  end_at: Date | string | null;
  paid_at: Date | string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdCreativeRow extends RowDataPacket {
  campaign_id: string;
  title: string;
  description: string;
  sponsor_name: string;
  sponsor_domain: string;
  video_storage_ref: string;
  thumbnail_storage_ref: string;
  extracted_thumbnail_storage_ref: string | null;
  selected_thumbnail_source: 'extracted' | 'custom';
  video_duration_seconds: number;
  video_width: number;
  video_height: number;
  video_mime_type: string;
  thumbnail_mime_type: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdCampaignWithCreativeRow extends AdCampaignRow {
  title: string;
  description: string;
  sponsor_name: string;
  sponsor_domain: string;
  video_storage_ref: string;
  thumbnail_storage_ref: string;
  extracted_thumbnail_storage_ref: string | null;
  selected_thumbnail_source: 'extracted' | 'custom';
  video_duration_seconds: number;
  video_width: number;
  video_height: number;
  video_mime_type: string;
  thumbnail_mime_type: string | null;
  package_name: string | null;
}

export interface AdOrderRow extends RowDataPacket {
  id: string;
  campaign_id: string;
  package_id: string;
  razorpay_order_id: string;
  status: AdOrderStatus;
  wallet_credit_paise: number;
  external_payable_paise: number;
  amount_paise: number;
  tax_paise: number;
  total_paise: number;
  currency: string;
  package_snapshot_json: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdPaymentRow extends RowDataPacket {
  id: string;
  campaign_id: string;
  order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string | null;
  status: AdPaymentRecordStatus;
  amount_paise: number;
  raw_payload_json: string | null;
  captured_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdReviewRow extends RowDataPacket {
  id: string;
  campaign_id: string;
  reviewer_staff_id: string | null;
  reviewer_user_id: string | null;
  action: AdReviewAction;
  notes: string | null;
  reason_code: AdRejectionReasonCode | null;
  reason_label_snapshot: string | null;
  custom_reason: string | null;
  notify_mode: AdNotifyMode | null;
  email_delivery_status: string | null;
  email_delivery_error: string | null;
  created_at: Date | string;
}

export interface AdAnalyticsDailyRow extends RowDataPacket {
  campaign_id: string;
  activity_date: Date | string;
  impressions: number;
  clicks: number;
  dismissals: number;
  watch_previews: number;
  spend_paise: number;
  updated_at: Date | string;
}

export interface SeedAdPackageInput {
  code: string;
  name: string;
  placementScope: AdPlacement;
  durationDays: number;
  impressionCap: number;
  pricePaise: number;
  gstPercent: number;
  currency: string;
  displayOrder: number;
}

const CAMPAIGN_SELECT = `
  SELECT
    c.*,
    cr.title,
    cr.description,
    cr.sponsor_name,
    cr.sponsor_domain,
    cr.video_storage_ref,
    cr.thumbnail_storage_ref,
    cr.extracted_thumbnail_storage_ref,
    cr.selected_thumbnail_source,
    cr.video_duration_seconds,
    cr.video_width,
    cr.video_height,
    cr.video_mime_type,
    cr.thumbnail_mime_type,
    p.name AS package_name
  FROM ad_campaigns c
  LEFT JOIN ad_creatives cr ON cr.campaign_id = c.id
  LEFT JOIN ad_packages p ON p.id = c.package_id
`;

export async function seedAdPackagesRows(packages: SeedAdPackageInput[]) {
  for (const item of packages) {
    await dbPool.query(
      `INSERT INTO ad_packages (
        id, code, name, placement_scope, duration_days, impression_cap, price_paise, gst_percent, currency, active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        placement_scope = VALUES(placement_scope),
        duration_days = VALUES(duration_days),
        impression_cap = VALUES(impression_cap),
        price_paise = VALUES(price_paise),
        gst_percent = VALUES(gst_percent),
        currency = VALUES(currency),
        active = VALUES(active),
        display_order = VALUES(display_order)`,
      [
        randomUUID(),
        item.code,
        item.name,
        item.placementScope,
        item.durationDays,
        item.impressionCap,
        item.pricePaise,
        item.gstPercent,
        item.currency,
        item.displayOrder,
      ]
    );
  }
}

export async function listActiveAdPackageRows(placement?: AdPlacement) {
  const params: unknown[] = [];
  const placementClause =
    placement && placement !== 'both'
      ? ` AND (placement_scope = ? OR placement_scope = 'both')`
      : placement === 'both'
        ? ` AND placement_scope = 'both'`
        : '';
  if (placement && placement !== 'both') {
    params.push(placement);
  }

  const [rows] = await dbPool.query<AdPackageRow[]>(
    `SELECT *
     FROM ad_packages
     WHERE active = 1${placementClause}
     ORDER BY display_order ASC, duration_days ASC, price_paise ASC`,
    params
  );

  return rows;
}

export async function findAdPackageRowById(packageId: string) {
  const [rows] = await dbPool.query<AdPackageRow[]>(
    `SELECT *
     FROM ad_packages
     WHERE id = ?
     LIMIT 1`,
    [packageId]
  );

  return rows[0] || null;
}

export async function findAdPackageRowByCode(code: string) {
  const [rows] = await dbPool.query<AdPackageRow[]>(
    `SELECT *
     FROM ad_packages
     WHERE code = ?
     LIMIT 1`,
    [code]
  );

  return rows[0] || null;
}

export async function findCampaignRowByOwnerUserId(ownerUserId: string) {
  const [rows] = await dbPool.query<AdCampaignWithCreativeRow[]>(
    `${CAMPAIGN_SELECT}
     WHERE c.owner_user_id = ?
     LIMIT 1`,
    [ownerUserId]
  );

  return rows[0] || null;
}

export async function listCampaignRowsByOwnerUserId(ownerUserId: string) {
  const [rows] = await dbPool.query<AdCampaignWithCreativeRow[]>(
    `${CAMPAIGN_SELECT}
     WHERE c.owner_user_id = ?
     ORDER BY c.updated_at DESC`,
    [ownerUserId]
  );

  return rows;
}

export async function findCampaignRowById(campaignId: string) {
  const [rows] = await dbPool.query<AdCampaignWithCreativeRow[]>(
    `${CAMPAIGN_SELECT}
     WHERE c.id = ?
     LIMIT 1`,
    [campaignId]
  );

  return rows[0] || null;
}

export async function createDraftCampaignRow(input: {
  ownerUserId: string;
  channelUserId: string;
  destinationUrl: string;
  ctaLabel: string;
  placementScope: AdPlacement;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO ad_campaigns (
      id, owner_user_id, channel_user_id, destination_url, cta_label, placement_scope
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.ownerUserId, input.channelUserId, input.destinationUrl, input.ctaLabel, input.placementScope]
  );
  return id;
}

export async function updateCampaignRow(campaignId: string, updates: Record<string, unknown>) {
  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (fields.length === 0) {
    return;
  }

  const columns = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);
  await dbPool.query(`UPDATE ad_campaigns SET ${columns} WHERE id = ?`, [...values, campaignId]);
}

export async function deleteCampaignRow(campaignId: string) {
  await dbPool.query(`DELETE FROM ad_campaigns WHERE id = ?`, [campaignId]);
}

export async function upsertCreativeRow(input: {
  campaignId: string;
  title: string;
  description: string;
  sponsorName: string;
  sponsorDomain: string;
  videoStorageRef: string;
  thumbnailStorageRef: string;
  extractedThumbnailStorageRef?: string | null;
  selectedThumbnailSource: 'extracted' | 'custom';
  videoDurationSeconds: number;
  videoWidth: number;
  videoHeight: number;
  videoMimeType: string;
  thumbnailMimeType?: string | null;
}) {
  await dbPool.query(
    `INSERT INTO ad_creatives (
      campaign_id, title, description, sponsor_name, sponsor_domain, video_storage_ref,
      thumbnail_storage_ref, extracted_thumbnail_storage_ref, selected_thumbnail_source,
      video_duration_seconds, video_width, video_height, video_mime_type, thumbnail_mime_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      description = VALUES(description),
      sponsor_name = VALUES(sponsor_name),
      sponsor_domain = VALUES(sponsor_domain),
      video_storage_ref = VALUES(video_storage_ref),
      thumbnail_storage_ref = VALUES(thumbnail_storage_ref),
      extracted_thumbnail_storage_ref = VALUES(extracted_thumbnail_storage_ref),
      selected_thumbnail_source = VALUES(selected_thumbnail_source),
      video_duration_seconds = VALUES(video_duration_seconds),
      video_width = VALUES(video_width),
      video_height = VALUES(video_height),
      video_mime_type = VALUES(video_mime_type),
      thumbnail_mime_type = VALUES(thumbnail_mime_type)`,
    [
      input.campaignId,
      input.title,
      input.description,
      input.sponsorName,
      input.sponsorDomain,
      input.videoStorageRef,
      input.thumbnailStorageRef,
      input.extractedThumbnailStorageRef || null,
      input.selectedThumbnailSource,
      input.videoDurationSeconds,
      input.videoWidth,
      input.videoHeight,
      input.videoMimeType,
      input.thumbnailMimeType || null,
    ]
  );
}

export async function createAdOrderRow(input: {
  campaignId: string;
  packageId: string;
  razorpayOrderId: string;
  walletCreditPaise?: number;
  externalPayablePaise?: number;
  amountPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: string;
  packageSnapshotJson: string;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO ad_orders (
      id, campaign_id, package_id, razorpay_order_id, status, wallet_credit_paise, external_payable_paise, amount_paise, tax_paise, total_paise, currency, package_snapshot_json
    ) VALUES (?, ?, ?, ?, 'created', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.campaignId,
      input.packageId,
      input.razorpayOrderId,
      input.walletCreditPaise || 0,
      input.externalPayablePaise || 0,
      input.amountPaise,
      input.taxPaise,
      input.totalPaise,
      input.currency,
      input.packageSnapshotJson,
    ]
  );
  return id;
}

export async function findAdOrderRowByCampaignId(campaignId: string) {
  const [rows] = await dbPool.query<AdOrderRow[]>(
    `SELECT *
     FROM ad_orders
     WHERE campaign_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [campaignId]
  );
  return rows[0] || null;
}

export async function findAdOrderRowByRazorpayOrderId(razorpayOrderId: string) {
  const [rows] = await dbPool.query<AdOrderRow[]>(
    `SELECT *
     FROM ad_orders
     WHERE razorpay_order_id = ?
     LIMIT 1`,
    [razorpayOrderId]
  );
  return rows[0] || null;
}

export async function updateAdOrderRow(orderId: string, updates: Record<string, unknown>) {
  const fields = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (fields.length === 0) {
    return;
  }

  const columns = fields.map(([key]) => `${key} = ?`).join(', ');
  const values = fields.map(([, value]) => value);
  await dbPool.query(`UPDATE ad_orders SET ${columns} WHERE id = ?`, [...values, orderId]);
}

export async function createAdPaymentRow(input: {
  campaignId: string;
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  status: AdPaymentRecordStatus;
  amountPaise: number;
  rawPayloadJson?: string | null;
  capturedAt?: Date | null;
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO ad_payments (
      id, campaign_id, order_id, razorpay_payment_id, razorpay_signature, status, amount_paise, raw_payload_json, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.campaignId,
      input.orderId,
      input.razorpayPaymentId,
      input.razorpaySignature || null,
      input.status,
      input.amountPaise,
      input.rawPayloadJson || null,
      input.capturedAt || null,
    ]
  );
  return id;
}

export async function findAdPaymentRowByRazorpayPaymentId(razorpayPaymentId: string) {
  const [rows] = await dbPool.query<AdPaymentRow[]>(
    `SELECT *
     FROM ad_payments
     WHERE razorpay_payment_id = ?
     LIMIT 1`,
    [razorpayPaymentId]
  );
  return rows[0] || null;
}

export async function createAdReviewRow(input: {
  campaignId: string;
  reviewerStaffId?: string | null;
  reviewerUserId?: string | null;
  action: AdReviewAction;
  notes?: string | null;
  reasonCode?: AdRejectionReasonCode | null;
  reasonLabelSnapshot?: string | null;
  customReason?: string | null;
  notifyMode?: AdNotifyMode | null;
  emailDeliveryStatus?: string | null;
  emailDeliveryError?: string | null;
}) {
  await dbPool.query(
    `INSERT INTO ad_reviews (
      id, campaign_id, reviewer_staff_id, reviewer_user_id, action, notes, reason_code, reason_label_snapshot, custom_reason, notify_mode, email_delivery_status, email_delivery_error
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.campaignId,
      input.reviewerStaffId || null,
      input.reviewerUserId || null,
      input.action,
      input.notes || null,
      input.reasonCode || null,
      input.reasonLabelSnapshot || null,
      input.customReason || null,
      input.notifyMode || null,
      input.emailDeliveryStatus || null,
      input.emailDeliveryError || null,
    ]
  );
}

export async function listAdReviewRowsByCampaignId(campaignId: string) {
  const [rows] = await dbPool.query<AdReviewRow[]>(
    `SELECT *
     FROM ad_reviews
     WHERE campaign_id = ?
     ORDER BY created_at DESC`,
    [campaignId]
  );

  return rows;
}

export async function listPendingReviewCampaignRows() {
  const [rows] = await dbPool.query<AdCampaignWithCreativeRow[]>(
    `${CAMPAIGN_SELECT}
     WHERE c.review_status = 'pending'
       AND c.payment_status = 'paid'
       AND c.status = 'paid_pending_review'
     ORDER BY c.updated_at ASC`
  );
  return rows;
}

export async function listEligibleCampaignRows(input: {
  surface: AdSurface;
  limit: number;
  viewerUserId?: string | null;
}) {
  const params: unknown[] = [input.surface];
  const dismissClause = input.viewerUserId
    ? ` AND c.id NOT IN (
        SELECT campaign_id
        FROM ad_delivery_events
        WHERE viewer_user_id = ?
          AND event_type = 'dismiss'
      )`
    : '';

  if (input.viewerUserId) {
    params.push(input.viewerUserId);
  }
  params.push(input.limit);

  const [rows] = await dbPool.query<AdCampaignWithCreativeRow[]>(
    `${CAMPAIGN_SELECT}
     WHERE c.status = 'active'
       AND c.review_status = 'approved'
       AND c.payment_status = 'paid'
       AND (c.placement_scope = ? OR c.placement_scope = 'both')
       AND c.start_at IS NOT NULL
       AND c.end_at IS NOT NULL
       AND c.start_at <= NOW()
       AND c.end_at >= NOW()
       AND c.total_impressions < c.impression_cap
       ${dismissClause}
     ORDER BY
       CASE
         WHEN c.impression_cap <= 0 THEN 1
         ELSE (c.total_impressions / c.impression_cap)
       END ASC,
       c.updated_at ASC
     LIMIT ?`,
    params
  );

  return rows;
}

export async function listDismissedCampaignIdsByViewerUserId(viewerUserId: string) {
  const [rows] = await dbPool.query<Array<RowDataPacket & { campaign_id: string }>>(
    `SELECT DISTINCT campaign_id
     FROM ad_delivery_events
     WHERE viewer_user_id = ?
       AND event_type = 'dismiss'
     ORDER BY campaign_id ASC`,
    [viewerUserId]
  );

  return rows.map((row) => row.campaign_id);
}

export async function recordAdDeliveryEventRow(input: {
  campaignId: string;
  eventType: AdDeliveryEventType;
  surface: AdSurface;
  viewerUserId?: string | null;
  viewerKey?: string | null;
  searchQuery?: string | null;
  eventCostPaise?: number;
  metadataJson?: string | null;
}) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO ad_delivery_events (
        id, campaign_id, event_type, surface, viewer_user_id, viewer_key, search_query, event_cost_paise, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.campaignId,
        input.eventType,
        input.surface,
        input.viewerUserId || null,
        input.viewerKey || null,
        input.searchQuery || null,
        input.eventCostPaise || 0,
        input.metadataJson || null,
      ]
    );

    const counterColumn =
      input.eventType === 'impression'
        ? 'total_impressions'
        : input.eventType === 'click'
          ? 'total_clicks'
          : input.eventType === 'dismiss'
            ? 'total_dismissals'
            : 'total_watch_previews';

    await connection.query(
      `UPDATE ad_campaigns
       SET ${counterColumn} = ${counterColumn} + 1,
           spend_paise = spend_paise + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.eventCostPaise || 0, input.campaignId]
    );

    await connection.query(
      `INSERT INTO ad_analytics_daily (
        campaign_id, activity_date, impressions, clicks, dismissals, watch_previews, spend_paise
      ) VALUES (?, CURRENT_DATE(), ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        impressions = impressions + VALUES(impressions),
        clicks = clicks + VALUES(clicks),
        dismissals = dismissals + VALUES(dismissals),
        watch_previews = watch_previews + VALUES(watch_previews),
        spend_paise = spend_paise + VALUES(spend_paise)`,
      [
        input.campaignId,
        input.eventType === 'impression' ? 1 : 0,
        input.eventType === 'click' ? 1 : 0,
        input.eventType === 'dismiss' ? 1 : 0,
        input.eventType === 'watch' ? 1 : 0,
        input.eventCostPaise || 0,
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdAnalyticsDailyRows(campaignId: string, days = 7) {
  const [rows] = await dbPool.query<AdAnalyticsDailyRow[]>(
    `SELECT *
     FROM ad_analytics_daily
     WHERE campaign_id = ?
       AND activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
     ORDER BY activity_date ASC`,
    [campaignId, Math.max(days - 1, 0)]
  );

  return rows;
}
