export type AdCampaignStatus =
  | 'draft'
  | 'payment_pending'
  | 'paid_pending_review'
  | 'active'
  | 'paused'
  | 'rejected'
  | 'completed'
  | 'archived';

export type AdReviewStatus = 'pending' | 'approved' | 'rejected';
export type AdPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type AdPlacement = 'home' | 'search' | 'both';
export type AdDeliveryEventType = 'impression' | 'click' | 'dismiss' | 'watch';
export type AdSurface = 'home' | 'search';
export type AdOrderStatus = 'created' | 'paid' | 'failed' | 'cancelled';
export type AdPaymentRecordStatus = 'captured' | 'authorized' | 'failed' | 'refunded';
export type AdReviewAction = 'pending' | 'approved' | 'rejected';
export type AdNotifyMode = 'in_app' | 'email' | 'both';
export type UserNotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type UserNotificationType =
  | 'ad_rejected'
  | 'ad_approved'
  | 'ad_live'
  | 'ad_completed'
  | 'ad_payment_required'
  | 'wallet_credit';

export type AdRejectionReasonCode =
  | 'misleading_claims'
  | 'landing_page_mismatch'
  | 'invalid_website'
  | 'copyright_issue'
  | 'unsafe_or_prohibited'
  | 'low_quality_creative'
  | 'invalid_format'
  | 'other';

export interface AdPackage {
  id: string;
  code: string;
  name: string;
  placement: AdPlacement;
  durationDays: number;
  impressionCap: number;
  pricePaise: number;
  gstPercent: number;
  currency: string;
  active: boolean;
  displayOrder: number;
}

export interface AdCreative {
  campaignId: string;
  title: string;
  description: string;
  sponsorName: string;
  sponsorDomain: string;
  websiteUrl: string;
  ctaLabel: string;
  videoStorageRef: string;
  videoPlaybackUrl: string;
  thumbnailStorageRef: string;
  thumbnailUrl: string;
  extractedThumbnailStorageRef: string | null;
  selectedThumbnailSource: 'extracted' | 'custom';
  videoDurationSeconds: number;
  videoWidth: number;
  videoHeight: number;
  videoMimeType: string;
  thumbnailMimeType: string | null;
}

export interface SponsoredAd {
  id: string;
  campaignId: string;
  headline: string;
  description: string;
  sponsor: string;
  domain: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: AdPlacement;
  status: AdCampaignStatus;
  reviewStatus: AdReviewStatus;
  paymentStatus: AdPaymentStatus;
  budgetPaise: number;
  spendPaise: number;
  impressionCap: number;
  impressions: number;
  clicks: number;
  dismissals: number;
  watchPreviews: number;
  durationDays: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudioAdCampaign extends SponsoredAd {
  packageId: string | null;
  packageName: string | null;
  taxPaise: number;
  totalPaise: number;
  reviewNotes: string;
  rejectionReasonCode: AdRejectionReasonCode | null;
  rejectionReasonLabel: string | null;
  rejectionCustomReason: string | null;
  rejectionNotifyMode: AdNotifyMode | null;
  lastReviewedAt: string | null;
}

export interface AdAnalyticsPoint {
  date: string;
  impressions: number;
  clicks: number;
  dismissals: number;
  watchPreviews: number;
  spendPaise: number;
}

export interface StudioAdsOverview {
  campaign: StudioAdCampaign | null;
  creative: AdCreative | null;
  history: StudioAdCampaign[];
  packages: AdPackage[];
  analytics: AdAnalyticsPoint[];
  canCreateAd: boolean;
  walletBalancePaise: number;
  placementBreakdown: Array<{ label: string; value: number; note: string }>;
}

export interface UserNotification {
  id: string;
  type: UserNotificationType;
  title: string;
  body: string;
  severity: UserNotificationSeverity;
  readAt: string | null;
  createdAt: string;
  relatedCampaignId: string | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
  metadata: Record<string, unknown> | null;
}

export interface WalletHistoryPoint {
  label: string;
  balancePaise: number;
  changePaise: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amountPaise: number;
  balanceAfterPaise: number;
  referenceType: string;
  referenceId: string;
  relatedCampaignId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface WalletOverview {
  balancePaise: number;
  totalCreditedPaise: number;
  totalDebitedPaise: number;
  transactions: WalletTransaction[];
  trend: WalletHistoryPoint[];
}

export interface SponsoredFeedEntry<TItem> {
  type: 'item' | 'ad';
  item: TItem;
  ad: SponsoredAd;
}

export interface SponsoredFeedInsertResult<TItem> {
  primaryAd: SponsoredAd | null;
  entries: SponsoredFeedEntry<TItem>[];
}

export interface CreateAdDraftInput {
  title: string;
  description: string;
  websiteUrl: string;
  ctaLabel: string;
  placement: AdPlacement;
  videoStorageRef: string;
  thumbnailStorageRef: string;
  extractedThumbnailStorageRef?: string | null;
  selectedThumbnailSource: 'extracted' | 'custom';
  videoDurationSeconds: number;
  videoWidth: number;
  videoHeight: number;
  videoMimeType: string;
  thumbnailMimeType?: string | null;
}
