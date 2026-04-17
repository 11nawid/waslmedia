import { NextResponse } from 'next/server';
import { createHumanCheckChallenge } from '@/server/utils/human-check';
import { enforceRateLimit } from '@/server/utils/rate-limit';

export async function GET(request: Request) {
  const rateLimit = enforceRateLimit(request, 'auth:human-check', 20, 1000 * 60 * 10);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action') === 'signup' ? 'signup' : 'login';
  return NextResponse.json(createHumanCheckChallenge(action));
}
