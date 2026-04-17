import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { resubmitRejectedCampaign } from '@/server/services/ads';

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    return NextResponse.json({ overview: await resubmitRejectedCampaign(auth.user.id, campaignId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AD_RESUBMIT_FAILED';
    const status =
      message === 'AD_CAMPAIGN_NOT_FOUND'
        ? 404
        : message === 'AD_CAMPAIGN_NOT_REJECTED'
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
