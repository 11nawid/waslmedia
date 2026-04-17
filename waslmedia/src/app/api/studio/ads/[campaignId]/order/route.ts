import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { createCampaignOrder } from '@/server/services/ads';

const bodySchema = z.object({
  packageId: z.string().trim().min(1),
  useWalletBalance: z.boolean().optional(),
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
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_AD_PACKAGE_SELECTION' }, { status: 400 });
  }

  try {
    const payload = await createCampaignOrder(auth.user.id, campaignId, parsed.data.packageId, {
      useWalletBalance: parsed.data.useWalletBalance,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AD_ORDER_CREATE_FAILED';
    const status =
      message === 'AD_CAMPAIGN_NOT_FOUND' || message === 'AD_PACKAGE_NOT_FOUND'
        ? 404
        : message === 'RAZORPAY_NOT_CONFIGURED'
          ? 503
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
