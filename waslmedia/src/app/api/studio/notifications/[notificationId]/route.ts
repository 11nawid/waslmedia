import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getUserNotification } from '@/server/services/user-notifications';

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { notificationId } = await context.params;
  const notification = await getUserNotification(auth.user.id, notificationId);
  if (!notification) {
    return NextResponse.json({ error: 'NOTIFICATION_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ notification });
}
