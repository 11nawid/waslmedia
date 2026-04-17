import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth/cookies';
import { loginUser } from '@/server/services/auth';
import { verifyHumanCheckChallenge } from '@/server/utils/human-check';
import { enforceRateLimit } from '@/server/utils/rate-limit';
import { getRequestIpAddress, verifyTurnstileToken } from '@/server/utils/turnstile';

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, 'auth:login', 10, 1000 * 60 * 10);
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const turnstileVerification = await verifyTurnstileToken({
      token: typeof body.turnstileToken === 'string' ? body.turnstileToken : null,
      remoteIp: getRequestIpAddress(request),
      action: 'login',
    });

    let verification = turnstileVerification;
    if (!turnstileVerification.success) {
      verification = verifyHumanCheckChallenge({
        action: 'login',
        token: typeof body.humanCheckToken === 'string' ? body.humanCheckToken : null,
        answer: typeof body.humanCheckAnswer === 'string' ? body.humanCheckAnswer : null,
      });
    }

    if (!verification.success) {
      return NextResponse.json({ error: verification.error || 'VERIFICATION_FAILED' });
    }

    const result = await loginUser(body.email, body.password, {
      ipAddress: getRequestIpAddress(request),
      userAgent: request.headers.get('user-agent'),
    });
    await setSessionCookie(result.token);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LOGIN_FAILED';
    if (message === 'INVALID_CREDENTIALS') {
      return NextResponse.json({ error: message });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
