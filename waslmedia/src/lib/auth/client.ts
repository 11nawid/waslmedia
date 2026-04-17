import { invalidateApiGet, syncAuthState } from '@/lib/api/client';

interface VerificationPayload {
  turnstileToken?: string | null;
  humanCheckToken?: string | null;
  humanCheckAnswer?: string | null;
}

export async function loginWithPassword(
  email: string,
  password: string,
  verification?: VerificationPayload,
) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
      turnstileToken: verification?.turnstileToken || null,
      humanCheckToken: verification?.humanCheckToken || null,
      humanCheckAnswer: verification?.humanCheckAnswer || null,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || typeof payload.error === 'string') {
    throw new Error(payload.error || 'LOGIN_FAILED');
  }

  invalidateApiGet('/api/auth/me');
  syncAuthState();
  return payload;
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  channelName: string;
  handle: string;
  photoURL?: string | null;
  turnstileToken?: string | null;
  humanCheckToken?: string | null;
  humanCheckAnswer?: string | null;
}) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || typeof payload.error === 'string') {
    throw new Error(payload.error || 'REGISTER_FAILED');
  }

  invalidateApiGet('/api/auth/me');
  syncAuthState();
  return payload;
}

export async function logoutUser() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('LOGOUT_FAILED');
  }

  invalidateApiGet('/api/auth/me');
  syncAuthState();
}
