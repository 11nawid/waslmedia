import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { isWatchHistoryEnabled, setWatchHistoryEnabled } from '@/server/services/videos';

export async function GET() {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();

  if (auth.response) {
    return auth.response;
  }

  const enabled = await isWatchHistoryEnabled(auth.user.id);
  return NextResponse.json({ enabled });
}

export async function PUT(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();

  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const enabled = await setWatchHistoryEnabled(auth.user.id, body.enabled);
  return NextResponse.json({ enabled });
}
