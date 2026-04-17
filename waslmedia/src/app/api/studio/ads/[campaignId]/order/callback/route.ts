import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getAppBaseUrl } from '@/server/utils/runtime-config';
import { verifyCampaignPayment } from '@/server/services/ads';

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

function buildStudioAdsRedirect(status: 'success' | 'failed') {
  return new URL(`/studio/ads?payment=${status}`, getAppBaseUrl());
}

function extractPaymentPayload(searchParams: URLSearchParams) {
  const razorpayOrderId = searchParams.get('razorpay_order_id') || '';
  const razorpayPaymentId = searchParams.get('razorpay_payment_id') || '';
  const razorpaySignature = searchParams.get('razorpay_signature') || '';

  return {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    valid: Boolean(razorpayOrderId && razorpayPaymentId && razorpaySignature),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { campaignId } = await context.params;
  const payload = extractPaymentPayload(request.nextUrl.searchParams);

  if (!payload.valid) {
    return NextResponse.redirect(buildStudioAdsRedirect('failed'));
  }

  try {
    await verifyCampaignPayment({
      campaignId,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
      rawPayload: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });
    return NextResponse.redirect(buildStudioAdsRedirect('success'));
  } catch {
    return NextResponse.redirect(buildStudioAdsRedirect('failed'));
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { campaignId } = await context.params;
  const formData = await request.formData().catch(() => null);

  const razorpayOrderId = String(formData?.get('razorpay_order_id') || '');
  const razorpayPaymentId = String(formData?.get('razorpay_payment_id') || '');
  const razorpaySignature = String(formData?.get('razorpay_signature') || '');

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.redirect(buildStudioAdsRedirect('failed'));
  }

  try {
    await verifyCampaignPayment({
      campaignId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      rawPayload: Object.fromEntries(formData?.entries() || []),
    });
    return NextResponse.redirect(buildStudioAdsRedirect('success'));
  } catch {
    return NextResponse.redirect(buildStudioAdsRedirect('failed'));
  }
}
