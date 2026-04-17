import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getChannelAnalytics } from '@/server/services/analytics';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }
  const { userId } = await context.params;

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get('days');
  const days =
    daysParam === 'lifetime' ? 3650 : Math.max(Number.parseInt(daysParam || '28', 10) || 28, 1);
  const analytics = await getChannelAnalytics(userId, days);
  return NextResponse.json({ analytics });
}
