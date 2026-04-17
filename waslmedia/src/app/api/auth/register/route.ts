import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth/cookies';
import { registerUser } from '@/server/services/auth';
import { verifyHumanCheckChallenge } from '@/server/utils/human-check';
import { getRequestIpAddress, verifyTurnstileToken } from '@/server/utils/turnstile';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const turnstileVerification = await verifyTurnstileToken({
      token: typeof body.turnstileToken === 'string' ? body.turnstileToken : null,
      remoteIp: getRequestIpAddress(request),
      action: 'signup',
    });

    let verification = turnstileVerification;
    if (!turnstileVerification.success) {
      verification = verifyHumanCheckChallenge({
        action: 'signup',
        token: typeof body.humanCheckToken === 'string' ? body.humanCheckToken : null,
        answer: typeof body.humanCheckAnswer === 'string' ? body.humanCheckAnswer : null,
      });
    }

    if (!verification.success) {
      return NextResponse.json({ error: verification.error || 'VERIFICATION_FAILED' });
    }

    const result = await registerUser(
      {
        email: body.email,
        password: body.password,
        displayName: body.channelName,
        handle: body.handle,
        photoUrl: body.photoURL,
      },
      {
        ipAddress: getRequestIpAddress(request),
        userAgent: request.headers.get('user-agent'),
      }
    );
    await setSessionCookie(result.token);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REGISTER_FAILED';
    if (['EMAIL_ALREADY_EXISTS', 'HANDLE_ALREADY_EXISTS'].includes(message)) {
      return NextResponse.json({ error: message });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
