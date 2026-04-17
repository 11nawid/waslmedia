import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getUserAdWalletOverview } from '@/server/services/ad-wallet';

export async function GET(_request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(await getUserAdWalletOverview(auth.user.id));
}
