import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getTrendingBootstrap } from '@/server/services/bootstrap';

export async function GET() {
  await ensureDatabaseSetup();
  const bootstrap = await getTrendingBootstrap();
  return NextResponse.json(bootstrap);
}
