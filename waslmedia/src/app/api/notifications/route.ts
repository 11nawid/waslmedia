import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { listUserNotifications } from '@/server/services/user-notifications';

export async function GET(_request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(await listUserNotifications(auth.user.id));
}
