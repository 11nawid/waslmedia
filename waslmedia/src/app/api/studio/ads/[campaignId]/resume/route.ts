import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getStudioAdsOverview, resumeCampaign } from '@/server/services/ads';

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;
  await resumeCampaign(auth.user.id, campaignId);
  return NextResponse.json({ overview: await getStudioAdsOverview(auth.user.id) });
}
