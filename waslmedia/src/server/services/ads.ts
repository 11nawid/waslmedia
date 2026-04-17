import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  AdAnalyticsPoint,
  AdCreative,
  AdNotifyMode,
  AdPackage,
  AdPlacement,
  AdRejectionReasonCode,
  AdReviewAction,
  AdSurface,
  CreateAdDraftInput,
  SponsoredAd,
  StudioAdCampaign,
  StudioAdsOverview,
} from '@/lib/ads/types';
import { AD_REJECTION_REASON_LABELS } from '@/lib/ads/constants';
import { buildProtectedAssetUrlFromStorageUrl } from '@/server/utils/protected-asset';
import {
  createAdOrderRow,
  createAdPaymentRow,
  createAdReviewRow,
  createDraftCampaignRow,
  deleteCampaignRow,
  findAdOrderRowByCampaignId,
  findAdOrderRowByRazorpayOrderId,
  findAdPackageRowByCode,
  findAdPackageRowById,
  findAdPaymentRowByRazorpayPaymentId,
  findCampaignRowById,
  findCampaignRowByOwnerUserId,
  listCampaignRowsByOwnerUserId,
  listActiveAdPackageRows,
  listAdAnalyticsDailyRows,
  listDismissedCampaignIdsByViewerUserId,
  listEligibleCampaignRows,
  listPendingReviewCampaignRows,
  recordAdDeliveryEventRow,
  seedAdPackagesRows,
  updateAdOrderRow,
  updateCampaignRow,
  upsertCreativeRow,
  type AdCampaignWithCreativeRow,
} from '@/server/repositories/ads';
import { findChannelSettingsByUserId } from '@/server/repositories/channel-settings';
import { getAuthUserById } from '@/server/services/auth';
import { sendAdRejectedEmail } from '@/server/services/mail';
import { applyUserAdWalletTransaction, getUserAdWalletBalance } from '@/server/services/ad-wallet';
import { createUserNotification } from '@/server/services/user-notifications';
import { getAdsRuntimeConfig, getRazorpayRuntimeConfig } from '@/server/utils/runtime-config';

const DEFAULT_AD_PACKAGES = [
  { code: 'home_3d_starter', name: 'Home Starter · 3 days', placementScope: 'home', durationDays: 3, impressionCap: 3500, pricePaise: 9900, displayOrder: 10 },
  { code: 'home_7d_growth', name: 'Home Growth · 7 days', placementScope: 'home', durationDays: 7, impressionCap: 9000, pricePaise: 24900, displayOrder: 20 },
  { code: 'search_7d_focus', name: 'Search Focus · 7 days', placementScope: 'search', durationDays: 7, impressionCap: 7500, pricePaise: 19900, displayOrder: 30 },
  { code: 'both_7d_plus', name: 'Home + Search · 7 days', placementScope: 'both', durationDays: 7, impressionCap: 15000, pricePaise: 39900, displayOrder: 40 },
  { code: 'both_14d_pro', name: 'Home + Search · 14 days', placementScope: 'both', durationDays: 14, impressionCap: 30000, pricePaise: 74900, displayOrder: 50 },
] as const;

const HISTORICAL_CAMPAIGN_STATUSES = new Set(['rejected', 'completed', 'archived']);

function isHistoricalCampaignStatus(value: string | null | undefined) {
  return HISTORICAL_CAMPAIGN_STATUSES.has(String(value || ''));
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | string | null | undefined) {
  return normalizeDate(value)?.toISOString() || null;
}

function normalizeDomain(value: string) {
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || 'website.com';
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('INVALID_AD_WEBSITE_URL');
  }

  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).toString();
  } catch {
    throw new Error('INVALID_AD_WEBSITE_URL');
  }
}

function formatCurrency(valuePaise: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(valuePaise / 100);
}

function parsePackageSnapshot(snapshot: string | null) {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapPackageRow(row: Awaited<ReturnType<typeof findAdPackageRowById>>) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    placement: row.placement_scope,
    durationDays: row.duration_days,
    impressionCap: row.impression_cap,
    pricePaise: row.price_paise,
    gstPercent: Number(row.gst_percent),
    currency: row.currency,
    active: Boolean(row.active),
    displayOrder: row.display_order,
  } satisfies AdPackage;
}

function mapCampaignRow(row: AdCampaignWithCreativeRow | null): StudioAdCampaign | null {
  if (!row) {
    return null;
  }

  const creativeHeadline = row.title || 'Sponsored placement';

  return {
    id: row.id,
    campaignId: row.id,
    headline: creativeHeadline,
    description: row.description || '',
    sponsor: row.sponsor_name || row.sponsor_domain || 'Sponsored',
    domain: row.sponsor_domain || normalizeDomain(row.destination_url || ''),
    thumbnailUrl: buildProtectedAssetUrlFromStorageUrl(row.thumbnail_storage_ref) || '',
    previewVideoUrl: buildProtectedAssetUrlFromStorageUrl(row.video_storage_ref) || '',
    ctaLabel: row.cta_label,
    ctaUrl: row.destination_url,
    placement: row.placement_scope,
    status: row.status,
    reviewStatus: row.review_status,
    paymentStatus: row.payment_status,
    budgetPaise: row.budget_paise,
    spendPaise: row.spend_paise,
    impressionCap: row.impression_cap,
    impressions: row.total_impressions,
    clicks: row.total_clicks,
    dismissals: row.total_dismissals,
    watchPreviews: row.total_watch_previews,
    durationDays: row.duration_days,
    startAt: toIso(row.start_at),
    endAt: toIso(row.end_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
    packageId: row.package_id,
    packageName: row.package_name,
    taxPaise: row.tax_paise,
    totalPaise: row.total_paise,
    reviewNotes: row.review_notes || '',
    rejectionReasonCode: row.rejection_reason_code || null,
    rejectionReasonLabel: row.rejection_reason_label || null,
    rejectionCustomReason: row.rejection_custom_reason || null,
    rejectionNotifyMode: row.rejection_notify_mode || null,
    lastReviewedAt: toIso(row.last_reviewed_at),
  };
}

function mapCreativeRow(row: AdCampaignWithCreativeRow | null): AdCreative | null {
  if (!row || !row.title) {
    return null;
  }

  return {
    campaignId: row.id,
    title: row.title,
    description: row.description,
    sponsorName: row.sponsor_name,
    sponsorDomain: row.sponsor_domain,
    websiteUrl: row.destination_url,
    ctaLabel: row.cta_label,
    videoStorageRef: row.video_storage_ref,
    videoPlaybackUrl: buildProtectedAssetUrlFromStorageUrl(row.video_storage_ref) || '',
    thumbnailStorageRef: row.thumbnail_storage_ref,
    thumbnailUrl: buildProtectedAssetUrlFromStorageUrl(row.thumbnail_storage_ref) || '',
    extractedThumbnailStorageRef: row.extracted_thumbnail_storage_ref,
    selectedThumbnailSource: row.selected_thumbnail_source,
    videoDurationSeconds: row.video_duration_seconds,
    videoWidth: row.video_width,
    videoHeight: row.video_height,
    videoMimeType: row.video_mime_type,
    thumbnailMimeType: row.thumbnail_mime_type,
  };
}

function mapSponsoredAd(row: AdCampaignWithCreativeRow): SponsoredAd {
  const campaign = mapCampaignRow(row);
  if (!campaign) {
    throw new Error('AD_CAMPAIGN_MAP_FAILED');
  }
  return campaign;
}

function buildPlacementBreakdown(campaign: StudioAdCampaign | null) {
  if (!campaign || campaign.impressions <= 0) {
    return [
      { label: 'Home feed', value: campaign?.placement === 'search' ? 0 : campaign?.placement === 'both' ? 50 : 100, note: 'Primary delivery slot' },
      { label: 'Search results', value: campaign?.placement === 'home' ? 0 : campaign?.placement === 'both' ? 50 : 100, note: 'Sponsored search placement' },
    ];
  }

  if (campaign.placement === 'home') {
    return [
      { label: 'Home feed', value: 100, note: 'Primary delivery slot' },
      { label: 'Search results', value: 0, note: 'Not enabled for this campaign' },
    ];
  }

  if (campaign.placement === 'search') {
    return [
      { label: 'Home feed', value: 0, note: 'Not enabled for this campaign' },
      { label: 'Search results', value: 100, note: 'Primary delivery slot' },
    ];
  }

  return [
    { label: 'Home feed', value: 60, note: 'Shared delivery slot' },
    { label: 'Search results', value: 40, note: 'Shared sponsored result slot' },
  ];
}

function buildStudioAdsOverviewFromRows(input: {
  rows: AdCampaignWithCreativeRow[];
  currentRow: AdCampaignWithCreativeRow | null;
  packages: AdPackage[];
  analytics: AdAnalyticsPoint[];
  walletBalancePaise: number;
}) {
  const campaign = mapCampaignRow(input.currentRow);
  const creative = mapCreativeRow(input.currentRow);
  const history = input.rows
    .filter((row) => isHistoricalCampaignStatus(row.status))
    .map((row) => mapCampaignRow(row))
    .filter((item): item is StudioAdCampaign => Boolean(item));

  return {
    campaign,
    creative,
    history,
    packages: input.packages,
    analytics: input.analytics,
    canCreateAd: input.rows.length === 0,
    walletBalancePaise: input.walletBalancePaise,
    placementBreakdown: buildPlacementBreakdown(campaign),
  } satisfies StudioAdsOverview;
}

function campaignNeedsResubmissionState(campaign: AdCampaignWithCreativeRow) {
  return (
    campaign.payment_status === 'paid' &&
    campaign.review_status === 'pending' &&
    campaign.status !== 'paid_pending_review' &&
    campaign.status !== 'active' &&
    campaign.status !== 'paused'
  );
}

function calculateImpressionCostPaise(campaign: StudioAdCampaign) {
  if (campaign.impressionCap <= 0 || campaign.totalPaise <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(campaign.totalPaise / campaign.impressionCap));
}

async function createRazorpayOrder(input: {
  receipt: string;
  amountPaise: number;
  currency: string;
  notes: Record<string, string>;
}) {
  const razorpay = getRazorpayRuntimeConfig();
  if (!razorpay.configured) {
    throw new Error('RAZORPAY_NOT_CONFIGURED');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.description || payload.error?.code || 'RAZORPAY_ORDER_FAILED');
  }

  return payload as { id: string; amount: number; currency: string; receipt: string; status: string };
}

function buildRazorpayReceipt(campaignId: string) {
  const compactCampaignId = campaignId.replace(/-/g, '').slice(0, 16);
  const compactTimestamp = Date.now().toString(36);
  return `ad_${compactCampaignId}_${compactTimestamp}`.slice(0, 40);
}

function verifyCheckoutSignature(input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
  const razorpay = getRazorpayRuntimeConfig();
  if (!razorpay.configured) {
    throw new Error('RAZORPAY_NOT_CONFIGURED');
  }

  const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = createHmac('sha256', razorpay.keySecret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpaySignature));
  } catch {
    return false;
  }
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string | null) {
  const razorpay = getRazorpayRuntimeConfig();
  if (!razorpay.configured || !signature) {
    return false;
  }

  const expected = createHmac('sha256', razorpay.webhookSecret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function seedDefaultAdPackages() {
  const adsConfig = getAdsRuntimeConfig();
  const existing = await findAdPackageRowByCode(DEFAULT_AD_PACKAGES[0].code);
  if (existing) {
    return;
  }

  await seedAdPackagesRows(
    DEFAULT_AD_PACKAGES.map((item) => ({
      ...item,
      currency: adsConfig.currency,
      gstPercent: adsConfig.gstPercent,
    }))
  );
}

export async function getAdPackages(placement?: AdPlacement) {
  await seedDefaultAdPackages();
  const rows = await listActiveAdPackageRows(placement);
  return rows.map((row) => mapPackageRow(row)).filter((row): row is AdPackage => Boolean(row));
}

export async function getStudioAdsOverview(ownerUserId: string): Promise<StudioAdsOverview> {
  await seedDefaultAdPackages();
  const [rows, walletBalancePaise] = await Promise.all([
    listCampaignRowsByOwnerUserId(ownerUserId),
    getUserAdWalletBalance(ownerUserId),
  ]);
  const currentRow = rows.find((item) => !isHistoricalCampaignStatus(item.status)) || null;
  const packages = await getAdPackages();
  const currentCampaign = mapCampaignRow(currentRow);
  const analyticsRows = currentCampaign ? await listAdAnalyticsDailyRows(currentCampaign.id, 7) : [];
  const analyticsMap = new Map(
    analyticsRows.map((item) => [toIso(item.activity_date)?.slice(0, 10) || '', item])
  );
  const analytics: AdAnalyticsPoint[] = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const rowItem = analyticsMap.get(key);
    return {
      date: key,
      impressions: rowItem?.impressions || 0,
      clicks: rowItem?.clicks || 0,
      dismissals: rowItem?.dismissals || 0,
      watchPreviews: rowItem?.watch_previews || 0,
      spendPaise: rowItem?.spend_paise || 0,
    };
  });

  return buildStudioAdsOverviewFromRows({
    rows,
    currentRow,
    packages,
    analytics,
    walletBalancePaise,
  });
}

export async function getStudioAdCampaignForUser(ownerUserId: string, campaignId: string) {
  const row = await findCampaignRowById(campaignId);
  if (!row || row.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  return {
    campaign: mapCampaignRow(row),
    creative: mapCreativeRow(row),
  };
}

async function finalizeCampaignAsPaid(input: {
  campaignId: string;
  durationDays: number;
  paidAt?: Date;
}) {
  const paidAt = input.paidAt || new Date();
  const adsConfig = getAdsRuntimeConfig();

  if (adsConfig.reviewRequired) {
    await updateCampaignRow(input.campaignId, {
      payment_status: 'paid',
      paid_at: paidAt,
      status: 'paid_pending_review',
      review_status: 'pending',
    });
    await createAdReviewRow({
      campaignId: input.campaignId,
      action: 'pending',
      notes: 'Awaiting manual review.',
    });
    return;
  }

  const startAt = paidAt;
  const endAt = new Date(startAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
  await updateCampaignRow(input.campaignId, {
    payment_status: 'paid',
    paid_at: paidAt,
    review_status: 'approved',
    status: 'active',
    start_at: startAt,
    end_at: endAt,
  });
}

export async function createOrUpdateAdDraft(ownerUserId: string, input: CreateAdDraftInput) {
  const adsConfig = getAdsRuntimeConfig();
  if (adsConfig.oneCampaignLimit !== 1) {
    throw new Error('ADS_ONE_CAMPAIGN_LIMIT_UNSUPPORTED');
  }

  if (input.videoDurationSeconds <= 0 || input.videoDurationSeconds > 60) {
    throw new Error('AD_VIDEO_DURATION_INVALID');
  }

  if (input.videoWidth <= input.videoHeight) {
    throw new Error('AD_VIDEO_ORIENTATION_INVALID');
  }

  const channel = await findChannelSettingsByUserId(ownerUserId);
  if (!channel) {
    throw new Error('CHANNEL_NOT_FOUND');
  }

  const websiteUrl = normalizeUrl(input.websiteUrl);
  const sponsorDomain = normalizeDomain(websiteUrl);
  let campaign = await findCampaignRowByOwnerUserId(ownerUserId);
  if (!campaign) {
    const campaignId = await createDraftCampaignRow({
      ownerUserId,
      channelUserId: ownerUserId,
      destinationUrl: websiteUrl,
      ctaLabel: input.ctaLabel.trim() || 'Start now',
      placementScope: input.placement,
    });
    campaign = await findCampaignRowById(campaignId);
  }

  if (!campaign) {
    throw new Error('AD_CAMPAIGN_CREATE_FAILED');
  }

  if (campaign.status === 'active') {
    throw new Error('AD_ACTIVE_CAMPAIGN_MUST_BE_PAUSED');
  }

  if (campaign.status === 'completed' || campaign.status === 'archived') {
    throw new Error('AD_CAMPAIGN_NOT_EDITABLE');
  }

  await updateCampaignRow(campaign.id, {
    destination_url: websiteUrl,
    cta_label: input.ctaLabel.trim() || 'Start now',
    placement_scope: input.placement,
  });

  await upsertCreativeRow({
    campaignId: campaign.id,
    title: input.title.trim(),
    description: input.description.trim(),
    sponsorName: channel.name,
    sponsorDomain,
    videoStorageRef: input.videoStorageRef,
    thumbnailStorageRef: input.thumbnailStorageRef,
    extractedThumbnailStorageRef: input.extractedThumbnailStorageRef || null,
    selectedThumbnailSource: input.selectedThumbnailSource,
    videoDurationSeconds: input.videoDurationSeconds,
    videoWidth: input.videoWidth,
    videoHeight: input.videoHeight,
    videoMimeType: input.videoMimeType,
    thumbnailMimeType: input.thumbnailMimeType || null,
  });

  const updated = await findCampaignRowById(campaign.id);
  return {
    campaign: mapCampaignRow(updated),
    creative: mapCreativeRow(updated),
  };
}

export async function createCampaignOrder(
  ownerUserId: string,
  campaignId: string,
  packageId: string,
  options?: { useWalletBalance?: boolean }
) {
  const [campaign, viewer, walletBalancePaise] = await Promise.all([
    findCampaignRowById(campaignId),
    getAuthUserById(ownerUserId),
    getUserAdWalletBalance(ownerUserId),
  ]);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const adPackageRow = await findAdPackageRowById(packageId);
  const adPackage = mapPackageRow(adPackageRow);
  if (!adPackage || !adPackage.active) {
    throw new Error('AD_PACKAGE_NOT_FOUND');
  }

  const taxPaise = Math.round(adPackage.pricePaise * (adPackage.gstPercent / 100));
  const totalPaise = adPackage.pricePaise + taxPaise;
  const useWalletBalance = options?.useWalletBalance !== false;
  const walletCreditPaise = useWalletBalance ? Math.min(walletBalancePaise, totalPaise) : 0;
  const externalPayablePaise = Math.max(totalPaise - walletCreditPaise, 0);
  const packageSnapshot = JSON.stringify(adPackage);

  await updateCampaignRow(campaignId, {
    package_id: adPackage.id,
    budget_paise: adPackage.pricePaise,
    tax_paise: taxPaise,
    total_paise: totalPaise,
    currency: adPackage.currency,
    duration_days: adPackage.durationDays,
    impression_cap: adPackage.impressionCap,
    placement_scope: adPackage.placement,
    package_snapshot_json: packageSnapshot,
    payment_status: 'pending',
    status: 'payment_pending',
  });

  if (externalPayablePaise <= 0) {
    const walletOrderId = `wallet_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const orderId = await createAdOrderRow({
      campaignId,
      packageId: adPackage.id,
      razorpayOrderId: walletOrderId,
      walletCreditPaise,
      externalPayablePaise: 0,
      amountPaise: adPackage.pricePaise,
      taxPaise,
      totalPaise,
      currency: adPackage.currency,
      packageSnapshotJson: packageSnapshot,
    });

    await applyUserAdWalletTransaction({
      userId: ownerUserId,
      type: 'debit',
      amountPaise: walletCreditPaise,
      referenceType: 'ad_order_wallet_debit',
      referenceId: orderId,
      relatedCampaignId: campaignId,
      notes: 'Applied wallet balance to ad campaign payment.',
    });

    await createAdPaymentRow({
      campaignId,
      orderId,
      razorpayPaymentId: walletOrderId,
      status: 'captured',
      amountPaise: totalPaise,
      rawPayloadJson: JSON.stringify({ provider: 'wallet', amountPaise: totalPaise }),
      capturedAt: new Date(),
    });

    await updateAdOrderRow(orderId, { status: 'paid' });
    await finalizeCampaignAsPaid({
      campaignId,
      durationDays: adPackage.durationDays,
      paidAt: new Date(),
    });

    return {
      orderId,
      package: adPackage,
      payment: {
        kind: 'wallet',
        walletCreditPaise,
        externalPayablePaise: 0,
        totalPaise,
        balanceRemainingPaise: Math.max(walletBalancePaise - walletCreditPaise, 0),
      },
      overview: await getStudioAdsOverview(ownerUserId),
    };
  }

  const razorpayOrder = await createRazorpayOrder({
    receipt: buildRazorpayReceipt(campaignId),
    amountPaise: externalPayablePaise,
    currency: adPackage.currency,
    notes: {
      campaignId,
      packageCode: adPackage.code,
      placement: adPackage.placement,
      ownerUserId,
      ownerEmail: viewer?.email || '',
      walletCreditPaise: String(walletCreditPaise),
    },
  });

  const orderId = await createAdOrderRow({
    campaignId,
    packageId: adPackage.id,
    razorpayOrderId: razorpayOrder.id,
    walletCreditPaise,
    externalPayablePaise,
    amountPaise: adPackage.pricePaise,
    taxPaise,
    totalPaise,
    currency: adPackage.currency,
    packageSnapshotJson: packageSnapshot,
  });

  return {
    orderId,
    payment: {
      kind: 'razorpay',
      walletCreditPaise,
      externalPayablePaise,
      totalPaise,
      balanceRemainingPaise: Math.max(walletBalancePaise - walletCreditPaise, 0),
    },
    razorpay: {
      orderId: razorpayOrder.id,
      amountPaise: externalPayablePaise,
      currency: adPackage.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '',
      campaignId,
      packageId: adPackage.id,
      totalPaise,
      customer: {
        name: viewer?.displayName || '',
        email: viewer?.email || '',
      },
    },
    package: adPackage,
  };
}

export async function verifyCampaignPayment(input: {
  campaignId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  rawPayload?: unknown;
}) {
  if (!verifyCheckoutSignature(input)) {
    throw new Error('INVALID_RAZORPAY_SIGNATURE');
  }

  const campaign = await findCampaignRowById(input.campaignId);
  if (!campaign) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const order = await findAdOrderRowByRazorpayOrderId(input.razorpayOrderId);
  if (!order || order.campaign_id !== input.campaignId) {
    throw new Error('AD_ORDER_NOT_FOUND');
  }

  const existingPayment = await findAdPaymentRowByRazorpayPaymentId(input.razorpayPaymentId);
  if (!existingPayment) {
    await createAdPaymentRow({
      campaignId: input.campaignId,
      orderId: order.id,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      status: 'captured',
      amountPaise: order.external_payable_paise || order.total_paise,
      rawPayloadJson: input.rawPayload ? JSON.stringify(input.rawPayload) : null,
      capturedAt: new Date(),
    });
  }

  if (order.wallet_credit_paise > 0) {
    await applyUserAdWalletTransaction({
      userId: campaign.owner_user_id,
      type: 'debit',
      amountPaise: order.wallet_credit_paise,
      referenceType: 'ad_order_wallet_debit',
      referenceId: order.id,
      relatedCampaignId: input.campaignId,
      notes: 'Applied wallet balance to ad campaign payment.',
    });
  }

  await updateAdOrderRow(order.id, { status: 'paid' });
  await finalizeCampaignAsPaid({
    campaignId: input.campaignId,
    durationDays: campaign.duration_days,
    paidAt: new Date(),
  });

  const updated = await findCampaignRowById(input.campaignId);
  return {
    campaign: mapCampaignRow(updated),
    creative: mapCreativeRow(updated),
  };
}

export async function handleRazorpayWebhook(payload: string, signature: string | null) {
  if (!verifyRazorpayWebhookSignature(payload, signature)) {
    throw new Error('INVALID_RAZORPAY_WEBHOOK_SIGNATURE');
  }

  const parsed = JSON.parse(payload) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
        };
      };
    };
  };

  const payment = parsed.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id || typeof payment.amount !== 'number') {
    return { handled: false };
  }
  const paymentId = payment.id;
  const orderId = payment.order_id;
  const paymentAmount = payment.amount;

  const order = await findAdOrderRowByRazorpayOrderId(orderId);
  if (!order) {
    return { handled: false };
  }

  const existingPayment = await findAdPaymentRowByRazorpayPaymentId(paymentId);
  if (existingPayment) {
    return { handled: true };
  }

  return verifyCampaignPayment({
    campaignId: order.campaign_id,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: '',
    rawPayload: parsed,
  }).catch(async () => {
    const campaign = await findCampaignRowById(order.campaign_id);
    if (!campaign) {
      return { handled: false };
    }

    await createAdPaymentRow({
      campaignId: order.campaign_id,
      orderId: order.id,
      razorpayPaymentId: paymentId,
      status: 'captured',
      amountPaise: paymentAmount,
      rawPayloadJson: payload,
      capturedAt: new Date(),
    });

    await updateAdOrderRow(order.id, { status: 'paid' });
    if (order.wallet_credit_paise > 0) {
      await applyUserAdWalletTransaction({
        userId: campaign.owner_user_id,
        type: 'debit',
        amountPaise: order.wallet_credit_paise,
        referenceType: 'ad_order_wallet_debit',
        referenceId: order.id,
        relatedCampaignId: order.campaign_id,
        notes: 'Applied wallet balance to ad campaign payment.',
      }).catch(() => null);
    }
    await finalizeCampaignAsPaid({
      campaignId: order.campaign_id,
      durationDays: campaign.duration_days,
      paidAt: new Date(),
    });

    return { handled: true };
  });
}

async function notifyCampaignApproved(campaign: AdCampaignWithCreativeRow) {
  await createUserNotification({
    userId: campaign.owner_user_id,
    type: 'ad_approved',
    title: 'Your ad is approved',
    body: `"${campaign.title || 'Your ad'}" is approved and now eligible for delivery.`,
    severity: 'success',
    relatedCampaignId: campaign.id,
    ctaLabel: 'Open Studio Ads',
    ctaTarget: '/studio/ads',
    metadata: {
      campaignTitle: campaign.title || 'Your ad',
      status: 'active',
      reviewStatus: 'approved',
    },
  });
}

async function notifyCampaignRejected(input: {
  campaign: AdCampaignWithCreativeRow;
  reasonCode: AdRejectionReasonCode;
  reasonLabel: string;
  customReason?: string | null;
  notifyMode: AdNotifyMode;
}) {
  const { campaign, reasonCode, reasonLabel, customReason, notifyMode } = input;

  if (notifyMode === 'in_app' || notifyMode === 'both') {
    await createUserNotification({
      userId: campaign.owner_user_id,
      type: 'ad_rejected',
      title: 'Your ad was removed',
      body: customReason?.trim()
        ? `${reasonLabel}: ${customReason.trim()}`
        : `${reasonLabel}. See the full details to edit and resubmit.`,
      severity: 'error',
      relatedCampaignId: campaign.id,
      ctaLabel: 'See details',
      ctaTarget: '/studio/ads?view=history',
      metadata: {
        campaignTitle: campaign.title || 'Your ad',
        reasonCode,
        reasonLabel,
        customReason: customReason || '',
        reviewedAt: new Date().toISOString(),
      },
    });
  }

  if (notifyMode === 'email' || notifyMode === 'both') {
    const owner = await getAuthUserById(campaign.owner_user_id);
    if (!owner?.email) {
      return { emailDeliveryStatus: 'skipped', emailDeliveryError: 'USER_EMAIL_NOT_FOUND' };
    }

    try {
      await sendAdRejectedEmail({
        to: owner.email,
        campaignTitle: campaign.title || 'Your ad',
        reasonLabel,
        customReason: customReason || null,
      });
      return { emailDeliveryStatus: 'sent', emailDeliveryError: null };
    } catch (error) {
      return {
        emailDeliveryStatus: 'failed',
        emailDeliveryError: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
      };
    }
  }

  return { emailDeliveryStatus: 'not_requested', emailDeliveryError: null };
}

export async function reviewCampaign(input: {
  campaignId: string;
  reviewerStaffId?: string | null;
  reviewerUserId?: string | null;
  action: Exclude<AdReviewAction, 'pending'>;
  notes?: string | null;
  rejectionReasonCode?: AdRejectionReasonCode | null;
  rejectionCustomReason?: string | null;
  notifyMode?: AdNotifyMode | null;
}) {
  const campaign = await findCampaignRowById(input.campaignId);
  if (!campaign) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const reviewedAt = new Date();

  if (input.action === 'approved') {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);
    await updateCampaignRow(input.campaignId, {
      review_status: 'approved',
      status: 'active',
      review_notes: input.notes || null,
      rejection_reason_code: null,
      rejection_reason_label: null,
      rejection_custom_reason: null,
      rejection_notify_mode: null,
      last_reviewed_at: reviewedAt,
      start_at: startAt,
      end_at: endAt,
    });
  } else {
    if (!input.rejectionReasonCode) {
      throw new Error('AD_REJECTION_REASON_REQUIRED');
    }
    const reasonCode = input.rejectionReasonCode;
    const reasonLabel = AD_REJECTION_REASON_LABELS[reasonCode];
    const notifyMode = input.notifyMode || 'both';
    await updateCampaignRow(input.campaignId, {
      review_status: 'rejected',
      status: 'rejected',
      review_notes: input.rejectionCustomReason || input.notes || reasonLabel,
      rejection_reason_code: reasonCode,
      rejection_reason_label: reasonLabel,
      rejection_custom_reason: input.rejectionCustomReason || null,
      rejection_notify_mode: notifyMode,
      last_reviewed_at: reviewedAt,
    });
  }

  const updated = await findCampaignRowById(input.campaignId);
  if (!updated) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  let emailDeliveryStatus: string | null = null;
  let emailDeliveryError: string | null = null;
  let reasonCode: AdRejectionReasonCode | null = null;
  let reasonLabel: string | null = null;

  if (input.action === 'approved') {
    await notifyCampaignApproved(updated);
  } else {
    reasonCode = updated.rejection_reason_code || input.rejectionReasonCode || 'other';
    reasonLabel = updated.rejection_reason_label || AD_REJECTION_REASON_LABELS[reasonCode];
    const delivery = await notifyCampaignRejected({
      campaign: updated,
      reasonCode,
      reasonLabel,
      customReason: updated.rejection_custom_reason || input.rejectionCustomReason || input.notes || null,
      notifyMode: updated.rejection_notify_mode || input.notifyMode || 'both',
    });
    emailDeliveryStatus = delivery.emailDeliveryStatus;
    emailDeliveryError = delivery.emailDeliveryError;
  }

  await createAdReviewRow({
    campaignId: input.campaignId,
    reviewerStaffId: input.reviewerStaffId || null,
    reviewerUserId: input.reviewerUserId || null,
    action: input.action,
    notes: input.notes || null,
    reasonCode,
    reasonLabelSnapshot: reasonLabel,
    customReason: input.rejectionCustomReason || null,
    notifyMode: input.notifyMode || null,
    emailDeliveryStatus,
    emailDeliveryError,
  });

  return {
    campaign: mapCampaignRow(updated),
    creative: mapCreativeRow(updated),
  };
}

export async function resubmitRejectedCampaign(ownerUserId: string, campaignId: string) {
  const campaign = await findCampaignRowById(campaignId);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const canResubmit = campaign.status === 'rejected' || campaignNeedsResubmissionState(campaign);

  if (!canResubmit) {
    throw new Error('AD_CAMPAIGN_NOT_REJECTED');
  }

  if (campaign.payment_status === 'paid') {
    await updateCampaignRow(campaignId, {
      status: 'paid_pending_review',
      review_status: 'pending',
      review_notes: null,
      rejection_reason_code: null,
      rejection_reason_label: null,
      rejection_custom_reason: null,
      rejection_notify_mode: null,
    });
  } else {
    await updateCampaignRow(campaignId, {
      status: 'draft',
      review_status: 'pending',
      review_notes: null,
      rejection_reason_code: null,
      rejection_reason_label: null,
      rejection_custom_reason: null,
      rejection_notify_mode: null,
    });
  }

  await createAdReviewRow({
    campaignId,
    action: 'pending',
    notes: campaign.payment_status === 'paid' ? 'Advertiser resubmitted the campaign for review.' : 'Advertiser resubmitted the campaign and still needs to complete payment.',
  });

  return getStudioAdsOverview(ownerUserId);
}

export async function pauseCampaign(ownerUserId: string, campaignId: string) {
  const campaign = await findCampaignRowById(campaignId);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  await updateCampaignRow(campaignId, { status: 'paused' });
  return mapCampaignRow(await findCampaignRowById(campaignId));
}

export async function resumeCampaign(ownerUserId: string, campaignId: string) {
  const campaign = await findCampaignRowById(campaignId);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  if (campaign.review_status !== 'approved' || campaign.payment_status !== 'paid') {
    throw new Error('AD_CAMPAIGN_NOT_READY');
  }

  await updateCampaignRow(campaignId, { status: 'active' });
  return mapCampaignRow(await findCampaignRowById(campaignId));
}

export async function archiveCampaign(ownerUserId: string, campaignId: string) {
  const campaign = await findCampaignRowById(campaignId);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  await updateCampaignRow(campaignId, {
    status: 'archived',
    archived_at: new Date(),
  });
  return mapCampaignRow(await findCampaignRowById(campaignId));
}

export async function deleteCampaign(ownerUserId: string, campaignId: string) {
  const campaign = await findCampaignRowById(campaignId);
  if (!campaign || campaign.owner_user_id !== ownerUserId) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const canDeleteHistoricalPaidCampaign =
    campaign.payment_status === 'paid' &&
    (campaign.status === 'rejected' || campaign.status === 'completed' || campaign.status === 'archived');

  if (!canDeleteHistoricalPaidCampaign && (campaign.payment_status === 'paid' || campaign.review_status === 'approved' || campaign.status === 'active')) {
    throw new Error('AD_CAMPAIGN_DELETE_NOT_ALLOWED');
  }

  let refundedAmountPaise = 0;
  if (canDeleteHistoricalPaidCampaign && campaign.total_paise > 0) {
    const credit = await applyUserAdWalletTransaction({
      userId: ownerUserId,
      type: 'credit',
      amountPaise: campaign.total_paise,
      referenceType: 'ad_campaign_delete_refund',
      referenceId: campaignId,
      relatedCampaignId: campaignId,
      notes: `Refund for deleted ${campaign.status} ad campaign.`,
      notification: {
        type: 'wallet_credit',
        title: 'Money added to your wallet',
        body: `${formatCurrency(campaign.total_paise, campaign.currency)} was returned to your ad wallet after deleting "${campaign.title || 'your ad'}".`,
        severity: 'success',
        ctaLabel: 'Open wallet',
        ctaTarget: 'wallet://open',
        metadata: {
          campaignTitle: campaign.title || 'Your ad',
          amount: formatCurrency(campaign.total_paise, campaign.currency),
          source: 'Deleted ad refund',
          campaignStatus: campaign.status,
        },
      },
    });
    refundedAmountPaise = credit.amountPaise;
  }

  await deleteCampaignRow(campaignId);
  return {
    overview: await getStudioAdsOverview(ownerUserId),
    refundedAmountPaise,
  };
}

export async function getEligibleSponsoredAds(input: {
  surface: AdSurface;
  limit: number;
  viewerUserId?: string | null;
}) {
  const rows = await listEligibleCampaignRows(input);
  return rows.map(mapSponsoredAd);
}

export async function getDismissedSponsoredAdIds(viewerUserId: string) {
  return listDismissedCampaignIdsByViewerUserId(viewerUserId);
}

export async function recordSponsoredAdEvent(input: {
  campaignId: string;
  eventType: 'impression' | 'click' | 'dismiss' | 'watch';
  surface: AdSurface;
  viewerUserId?: string | null;
  viewerKey?: string | null;
  searchQuery?: string | null;
}) {
  const campaign = mapCampaignRow(await findCampaignRowById(input.campaignId));
  if (!campaign) {
    throw new Error('AD_CAMPAIGN_NOT_FOUND');
  }

  const eventCostPaise = input.eventType === 'impression' ? calculateImpressionCostPaise(campaign) : 0;
  await recordAdDeliveryEventRow({
    campaignId: input.campaignId,
    eventType: input.eventType,
    surface: input.surface,
    viewerUserId: input.viewerUserId || null,
    viewerKey: input.viewerKey || null,
    searchQuery: input.searchQuery || null,
    eventCostPaise,
  });

  return mapCampaignRow(await findCampaignRowById(input.campaignId));
}

export async function getPendingAdReviews() {
  const rows = await listPendingReviewCampaignRows();
  return rows.map((row) => ({
    campaign: mapCampaignRow(row),
    creative: mapCreativeRow(row),
  }));
}
