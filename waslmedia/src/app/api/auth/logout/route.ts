import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/cookies';
import { logoutCurrentSession } from '@/server/services/auth';

export async function POST() {
  await logoutCurrentSession();
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
