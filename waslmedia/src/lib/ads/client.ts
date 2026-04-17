import { apiGet, apiSend, invalidateApiGet } from '@/lib/api/client';
import { ADS_SYNC_EVENT } from '@/lib/ads/feed';
import type {
  AdNotifyMode,
  AdPlacement,
  AdRejectionReasonCode,
  CreateAdDraftInput,
  StudioAdsOverview,
  SponsoredAd,
  UserNotification,
} from '@/lib/ads/types';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

export type AdCheckoutClientResult =
  | { kind: 'verified'; overview: StudioAdsOverview }
  | { kind: 'redirected' };

function emitAdsSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADS_SYNC_EVENT));
  }
  invalidateApiGet((key) => key.includes('/api/studio/ads'));
}

function releaseStaleModalLocks() {
  if (typeof document === 'undefined') {
    return;
  }

  document.body.style.removeProperty('pointer-events');
  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('pointer-events');
  document.documentElement.style.removeProperty('overflow');
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');

  document.querySelectorAll('[data-radix-portal]').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.remove();
    }
  });
}

export function getReadableRazorpayError(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'UNKNOWN_RAZORPAY_ERROR';

  if (rawMessage === 'RAZORPAY_CHECKOUT_DISMISSED') {
    return {
      code: rawMessage,
      title: 'Payment not completed',
      description: 'Razorpay checkout was closed before the payment finished.',
    };
  }

  if (
    rawMessage === 'Failed to fetch' ||
    rawMessage === 'RAZORPAY_SCRIPT_LOAD_FAILED' ||
    rawMessage === 'RAZORPAY_SCRIPT_UNAVAILABLE' ||
    rawMessage === 'RAZORPAY_WINDOW_UNAVAILABLE' ||
    rawMessage === 'RAZORPAY_CHECKOUT_BLOCKED'
  ) {
    return {
      code: 'RAZORPAY_CHECKOUT_BLOCKED',
      title: 'Payment window was blocked',
      description:
        'Your browser or webview blocked Razorpay checkout or denied access to the secure payment service. Allow it and try again.',
    };
  }

  return {
    code: rawMessage,
    title: 'Payment could not be completed',
    description: rawMessage,
  };
}

function buildAdCheckoutFallbackUrl(input: {
  campaignId: string;
  title: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  customer?: {
    name?: string;
    email?: string;
  };
}) {
  const params = new URLSearchParams({
    campaignId: input.campaignId,
    title: input.title,
    orderId: input.orderId,
    amountPaise: String(input.amountPaise),
    currency: input.currency,
    keyId: input.keyId,
  });
  if (input.customer?.name) {
    params.set('customerName', input.customer.name);
  }
  if (input.customer?.email) {
    params.set('customerEmail', input.customer.email);
  }
  return `/studio/ads/checkout?${params.toString()}`;
}

export function startAdCheckoutRedirectFallback(input: {
  campaignId: string;
  title: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  customer?: {
    name?: string;
    email?: string;
  };
}) {
  if (typeof window === 'undefined') {
    throw new Error('RAZORPAY_WINDOW_UNAVAILABLE');
  }

  releaseStaleModalLocks();
  window.location.assign(buildAdCheckoutFallbackUrl(input));
}

export async function getStudioAdsOverviewClient(options?: { progressMode?: 'foreground' | 'silent' }) {
  return apiGet<StudioAdsOverview>('/api/studio/ads', {
    cache: 'no-store',
    progressMode: options?.progressMode,
  });
}

export async function getStudioAdCampaignClient(campaignId: string) {
  return apiGet<{
    campaign: StudioAdsOverview['campaign'];
    creative: StudioAdsOverview['creative'];
  }>(`/api/studio/ads/${campaignId}`, { cache: 'no-store' });
}

export async function getAdPackagesClient(placement?: AdPlacement) {
  const suffix = placement ? `?placement=${encodeURIComponent(placement)}` : '';
  return apiGet<{ packages: StudioAdsOverview['packages'] }>(`/api/studio/ad-packages${suffix}`, { cache: 'no-store' });
}

export async function saveAdDraftClient(input: CreateAdDraftInput) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>('/api/studio/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  emitAdsSync();
  return payload.overview;
}

export async function updateAdDraftClient(campaignId: string, input: Partial<CreateAdDraftInput>) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  emitAdsSync();
  return payload.overview;
}

export async function resubmitAdCampaignClient(campaignId: string) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${campaignId}/resubmit`, {
    method: 'POST',
  });
  emitAdsSync();
  return payload.overview;
}

export async function getStudioNotificationsClient() {
  return apiGet<{ items: UserNotification[]; unreadCount: number }>('/api/studio/notifications', {
    cache: 'no-store',
    progressMode: 'silent',
  });
}

export async function getStudioNotificationDetailClient(notificationId: string) {
  return apiGet<{ notification: UserNotification }>(`/api/studio/notifications/${notificationId}`, {
    cache: 'no-store',
    progressMode: 'silent',
  });
}

export async function markStudioNotificationReadClient(notificationId: string) {
  return apiSend<{ notification: UserNotification }>(`/api/studio/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export type AdminAdReviewPayload = {
  action: 'approved' | 'rejected';
  notes?: string | null;
  rejectionReasonCode?: AdRejectionReasonCode | null;
  rejectionCustomReason?: string | null;
  notifyMode?: AdNotifyMode | null;
};

export async function reviewAdminAdCampaignClient(campaignId: string, payload: AdminAdReviewPayload) {
  return apiSend<Record<string, unknown>>(`/api/api-docs/ads/${campaignId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createAdOrderClient(
  campaignId: string,
  packageId: string,
  options?: { useWalletBalance?: boolean }
) {
  return apiSend<{
    orderId: string;
    package: StudioAdsOverview['packages'][number];
    payment: {
      kind: 'wallet' | 'razorpay';
      walletCreditPaise: number;
      externalPayablePaise: number;
      totalPaise: number;
      balanceRemainingPaise: number;
    };
    razorpay?: {
      orderId: string;
      amountPaise: number;
      currency: string;
      keyId: string;
      campaignId: string;
      packageId: string;
      totalPaise: number;
      customer: {
        name: string;
        email: string;
      };
    };
    overview?: StudioAdsOverview;
  }>(`/api/studio/ads/${campaignId}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId, useWalletBalance: options?.useWalletBalance }),
  });
}

async function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    throw new Error('RAZORPAY_WINDOW_UNAVAILABLE');
  }

  releaseStaleModalLocks();

  if (window.Razorpay) {
    return window.Razorpay;
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');
      if (existing) {
        existing.remove();
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        script.remove();
        reject(new Error('RAZORPAY_SCRIPT_LOAD_FAILED'));
      };
      document.body.appendChild(script);
    });
  }

  await razorpayScriptPromise.catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  if (!window.Razorpay) {
    razorpayScriptPromise = null;
    throw new Error('RAZORPAY_SCRIPT_UNAVAILABLE');
  }

  return window.Razorpay;
}

export async function completeAdCheckoutClient(input: {
  campaignId: string;
  title: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  customer?: {
    name?: string;
    email?: string;
  };
}) {
  if (!input.keyId?.trim()) {
    throw new Error('RAZORPAY_KEY_ID_MISSING');
  }

  try {
    const Razorpay = await loadRazorpayCheckout();

    const verifiedOverview = await new Promise<StudioAdsOverview>((resolve, reject) => {
      try {
        const instance = new Razorpay({
          key: input.keyId,
          amount: input.amountPaise,
          currency: input.currency,
          name: 'Waslmedia Ads',
          description: input.title,
          order_id: input.orderId,
          prefill: {
            name: input.customer?.name || undefined,
            email: input.customer?.email || undefined,
          },
          readonly: {
            name: Boolean(input.customer?.name),
            email: Boolean(input.customer?.email),
          },
          hidden: {
            contact: true,
            email: Boolean(input.customer?.email),
          },
          theme: { color: '#ff3d3d' },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${input.campaignId}/order/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              emitAdsSync();
              resolve(payload.overview);
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('RAZORPAY_CHECKOUT_DISMISSED')),
          },
        });

        instance.open();
      } catch {
        reject(new Error('RAZORPAY_CHECKOUT_BLOCKED'));
      }
    });

    return { kind: 'verified', overview: verifiedOverview } satisfies AdCheckoutClientResult;
  } catch (error) {
    const paymentError = getReadableRazorpayError(error);

    if (paymentError.code !== 'RAZORPAY_CHECKOUT_BLOCKED') {
      throw error;
    }

    try {
      await completeAdCheckoutRedirectClient(input);
      return { kind: 'redirected' } satisfies AdCheckoutClientResult;
    } catch (redirectError) {
      const redirectPaymentError = getReadableRazorpayError(redirectError);
      if (redirectPaymentError.code === 'RAZORPAY_CHECKOUT_DISMISSED') {
        throw redirectError;
      }

      startAdCheckoutRedirectFallback(input);
      return { kind: 'redirected' } satisfies AdCheckoutClientResult;
    }
  }
}

export async function completeAdCheckoutRedirectClient(input: {
  campaignId: string;
  title: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  callbackUrl?: string;
  customer?: {
    name?: string;
    email?: string;
  };
}) {
  if (!input.keyId?.trim()) {
    throw new Error('RAZORPAY_KEY_ID_MISSING');
  }

  const Razorpay = await loadRazorpayCheckout();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finalize = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      fn();
    };
    const handlePageHide = () => finalize(() => resolve());

    try {
      const callbackUrl =
        input.callbackUrl ||
        `${window.location.origin}/api/studio/ads/${encodeURIComponent(input.campaignId)}/order/callback`;

      const instance = new Razorpay({
        key: input.keyId,
        amount: input.amountPaise,
        currency: input.currency,
        name: 'Waslmedia Ads',
        description: input.title,
        order_id: input.orderId,
        callback_url: callbackUrl,
        redirect: true,
        prefill: {
          name: input.customer?.name || undefined,
          email: input.customer?.email || undefined,
        },
        readonly: {
          name: Boolean(input.customer?.name),
          email: Boolean(input.customer?.email),
        },
        hidden: {
          contact: true,
          email: Boolean(input.customer?.email),
        },
        theme: { color: '#ff3d3d' },
        modal: {
          ondismiss: () => finalize(() => reject(new Error('RAZORPAY_CHECKOUT_DISMISSED'))),
        },
      });

      window.addEventListener('pagehide', handlePageHide, { once: true });
      window.addEventListener('beforeunload', handlePageHide, { once: true });
      instance.open();
    } catch {
      finalize(() => reject(new Error('RAZORPAY_CHECKOUT_BLOCKED')));
    }
  });
}

export async function pauseAdCampaignClient(campaignId: string) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${campaignId}/pause`, {
    method: 'POST',
  });
  emitAdsSync();
  return payload.overview;
}

export async function resumeAdCampaignClient(campaignId: string) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${campaignId}/resume`, {
    method: 'POST',
  });
  emitAdsSync();
  return payload.overview;
}

export async function archiveAdCampaignClient(campaignId: string) {
  const payload = await apiSend<{ overview: StudioAdsOverview }>(`/api/studio/ads/${campaignId}/archive`, {
    method: 'POST',
  });
  emitAdsSync();
  return payload.overview;
}

export async function deleteAdCampaignClient(campaignId: string) {
  const payload = await apiSend<{ overview: StudioAdsOverview; refundedAmountPaise?: number }>(`/api/studio/ads/${campaignId}`, {
    method: 'DELETE',
  });
  emitAdsSync();
  return payload;
}

export async function recordSponsoredAdEventClient(input: {
  campaignId: string;
  eventType: 'impression' | 'click' | 'dismiss' | 'watch';
  surface: 'home' | 'search';
  viewerKey?: string | null;
  searchQuery?: string | null;
}) {
  return apiSend<{ ad: SponsoredAd | null }>(`/api/ads/${input.campaignId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
