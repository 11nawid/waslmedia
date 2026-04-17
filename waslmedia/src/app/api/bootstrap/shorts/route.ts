import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getShortsBootstrap } from '@/server/services/bootstrap';

export async function GET() {
  await ensureDatabaseSetup();
  const bootstrap = await getShortsBootstrap();
  return NextResponse.json(bootstrap);
}
