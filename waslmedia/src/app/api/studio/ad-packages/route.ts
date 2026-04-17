import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getAdPackages } from '@/server/services/ads';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const placement = request.nextUrl.searchParams.get('placement');
  const packages = await getAdPackages(
    placement === 'home' || placement === 'search' || placement === 'both' ? placement : undefined
  );
  return NextResponse.json({ packages });
}
