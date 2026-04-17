import type { NextRequest, NextResponse } from 'next/server';
import { decryptSecret, encryptSecret } from '@/server/utils/secret-box';
import { getInternalAdminBootstrapConfig } from '@/server/utils/runtime-config';
import { isInternalToolsEnabled, isProductionRuntime } from '@/server/utils/runtime-config';
import type { AdminRole, AdminSession } from '@/lib/admin/types';

export type ApiDocsRole = AdminRole;
export type ApiDocsSession = AdminSession;

export const API_DOCS_SESSION_COOKIE = 'waslmedia_api_docs_session';
const API_DOCS_SESSION_TTL_SECONDS = 60 * 60 * 12;

function normalizeEnvValue(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

export function isApiDocsEnabled() {
  return isInternalToolsEnabled();
}

export function getApiDocsAdminEmailHint() {
  return getInternalAdminBootstrapConfig().email;
}

export function verifyApiDocsAdminPassword(password: string) {
  const bootstrap = getInternalAdminBootstrapConfig();
  return normalizeEnvValue(password) === bootstrap.password;
}

export function verifyApiDocsAdminCredentials(email: string, password: string) {
  const bootstrap = getInternalAdminBootstrapConfig();
  return normalizeEnvValue(email).toLowerCase() === bootstrap.email.toLowerCase() && verifyApiDocsAdminPassword(password);
}

export function createApiDocsSessionToken(session: ApiDocsSession) {
  return encryptSecret(
    JSON.stringify({
      role: session.role,
      staffId: session.staffId ?? null,
      source: session.source,
      exp: Date.now() + API_DOCS_SESSION_TTL_SECONDS * 1000,
    })
  );
}

function isAdminRole(value: string | undefined): value is AdminRole {
  return (
    value === 'super_admin' ||
    value === 'developer' ||
    value === 'ads_manager' ||
    value === 'content_manager' ||
    value === 'support_manager' ||
    value === 'analytics_manager' ||
    value === 'finance_manager'
  );
}

export function readApiDocsSessionToken(token: string | undefined | null): ApiDocsSession | null {
  if (!token) {
    return null;
  }

  try {
    const parsed = JSON.parse(decryptSecret(token)) as {
      role?: string;
      staffId?: string | null;
      source?: string;
      exp?: number;
    };
    if (
      isAdminRole(parsed.role) &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now() &&
      (parsed.source === 'bootstrap' || parsed.source === 'staff')
    ) {
      return {
        role: parsed.role,
        staffId: typeof parsed.staffId === 'string' ? parsed.staffId : null,
        source: parsed.source,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function readApiDocsRoleFromRequest(request: NextRequest) {
  return readApiDocsSessionToken(request.cookies.get(API_DOCS_SESSION_COOKIE)?.value)?.role ?? null;
}

export function readApiDocsSessionFromRequest(request: NextRequest) {
  return readApiDocsSessionToken(request.cookies.get(API_DOCS_SESSION_COOKIE)?.value);
}

export async function readApiDocsRoleFromCookieStore() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return readApiDocsSessionToken(cookieStore.get(API_DOCS_SESSION_COOKIE)?.value)?.role ?? null;
}

export async function readApiDocsSessionFromCookieStore() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return readApiDocsSessionToken(cookieStore.get(API_DOCS_SESSION_COOKIE)?.value);
}

export function setApiDocsSessionCookie(response: NextResponse, session: ApiDocsSession) {
  response.cookies.set(API_DOCS_SESSION_COOKIE, createApiDocsSessionToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionRuntime(),
    path: '/',
    maxAge: API_DOCS_SESSION_TTL_SECONDS,
  });
}

export function clearApiDocsSessionCookie(response: NextResponse) {
  response.cookies.set(API_DOCS_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionRuntime(),
    path: '/',
    maxAge: 0,
  });
}
