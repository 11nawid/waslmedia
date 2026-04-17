import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { clearUserWatchHistory } from '@/server/services/videos';

export async function DELETE() {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();

  if (auth.response) {
    return auth.response;
  }

  await clearUserWatchHistory(auth.user.id);
  return NextResponse.json({ success: true });
}
