import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getStudioAdsOverview, verifyCampaignPayment } from '@/server/services/ads';

const bodySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_RAZORPAY_VERIFY_PAYLOAD' }, { status: 400 });
  }

  await verifyCampaignPayment({
    campaignId,
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    razorpaySignature: parsed.data.razorpay_signature,
    rawPayload: body,
  });

  return NextResponse.json({ overview: await getStudioAdsOverview(auth.user.id) });
}
