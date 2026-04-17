import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser, notFoundRouteResponse } from '@/server/http/route-auth';
import { getOwnedVideoAnalytics } from '@/server/services/video-analytics';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { videoId } = await context.params;
  const daysParam = request.nextUrl.searchParams.get('days');
  const days = daysParam === 'lifetime' ? Number.POSITIVE_INFINITY : Math.max(Number(daysParam || 28), 1);
  const analytics = await getOwnedVideoAnalytics(auth.user.id, videoId, days);

  if (!analytics) {
    return notFoundRouteResponse();
  }

  return NextResponse.json({ analytics });
}
