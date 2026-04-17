import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { findUserByHandle } from '@/server/repositories/users';
import { enforceRateLimit } from '@/server/utils/rate-limit';

export async function GET(request: Request) {
  const rateLimit = enforceRateLimit(request, 'auth:check-handle', 30, 1000 * 60 * 10);
  if (rateLimit.limited) {
    return NextResponse.json(
      { available: false, error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  await ensureDatabaseSetup();
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const user = await findUserByHandle(handle.replace(/^@/, ''));
  return NextResponse.json({ available: !user });
}
