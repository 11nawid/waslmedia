import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from './constants';
import { isProductionRuntime } from '@/server/utils/runtime-config';

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionRuntime(),
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionRuntime(),
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}
