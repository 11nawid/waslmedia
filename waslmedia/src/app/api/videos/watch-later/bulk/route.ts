import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { bulkToggleWatchLater } from '@/server/services/videos';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  await bulkToggleWatchLater(body.videoIds || [], user.id, Boolean(body.shouldExist));
  return NextResponse.json({ success: true });
}
