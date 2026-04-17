import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { createRealtimeScopeToken } from '@/server/realtime/tokens';
import { findVideoRowById } from '@/server/repositories/videos';
import { enforceRateLimit } from '@/server/rate-limit';

async function canIssueScopeToken(userId: string, scope: string) {
  if (scope === `studio:${userId}` || scope === `analytics:${userId}`) {
    return true;
  }

  const videoScope = scope.match(/^analytics:video:(.+)$/);
  if (videoScope) {
    const row = await findVideoRowById(videoScope[1]);
    return row?.author_id === userId;
  }

  return false;
}

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const rateLimit = await enforceRateLimit(request, {
    key: 'realtime-token',
    limit: 120,
    windowSeconds: 60,
    discriminator: user.id,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  const scope = request.nextUrl.searchParams.get('scope')?.trim();
  if (!scope) {
    return NextResponse.json({ error: 'MISSING_SCOPE' }, { status: 400 });
  }

  const allowed = await canIssueScopeToken(user.id, scope);
  if (!allowed) {
    return NextResponse.json({ error: 'FORBIDDEN_SCOPE' }, { status: 403 });
  }

  return NextResponse.json({
    scope,
    token: createRealtimeScopeToken(scope, { userId: user.id }),
  });
}
