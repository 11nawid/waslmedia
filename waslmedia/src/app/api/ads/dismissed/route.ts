import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getDismissedSponsoredAdIds } from '@/server/services/ads';

export async function GET() {
  await ensureDatabaseSetup();

  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const adIds = await getDismissedSponsoredAdIds(user.id);
  return NextResponse.json({ adIds });
}
