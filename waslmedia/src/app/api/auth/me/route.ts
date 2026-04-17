import { NextResponse } from 'next/server';
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/cookies';
import { getCurrentSession } from '@/server/services/auth';
import { getRequestIpAddress } from '@/server/utils/turnstile';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession({
      renew: true,
      sessionMetadata: {
        ipAddress: getRequestIpAddress(request),
        userAgent: request.headers.get('user-agent'),
      },
    });

    if (session.shouldClearCookie) {
      await clearSessionCookie();
    } else if (session.renewed && session.token) {
      await setSessionCookie(session.token);
    }

    return NextResponse.json({
      user: session.user,
      authenticated: Boolean(session.user),
    });
  } catch (error) {
    console.error('Failed to resolve current auth session', error);
    return NextResponse.json({ error: 'AUTH_LOOKUP_FAILED' }, { status: 500 });
  }
}
