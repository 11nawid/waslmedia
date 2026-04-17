import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getHomeBootstrap } from '@/server/services/bootstrap';

export async function GET() {
  await ensureDatabaseSetup();
  const bootstrap = await getHomeBootstrap();
  return NextResponse.json(bootstrap);
}
