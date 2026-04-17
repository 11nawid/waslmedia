import { NextResponse } from 'next/server';
import type { AuthUser } from '@/lib/auth/types';
import { getCurrentAuthUser } from '@/server/services/auth';

type RouteUserResult =
  | { user: AuthUser; response?: never }
  | { response: NextResponse; user?: never };

export async function requireRouteUser(): Promise<RouteUserResult> {
  const user = await getCurrentAuthUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  return { user };
}

export function notFoundRouteResponse() {
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}
