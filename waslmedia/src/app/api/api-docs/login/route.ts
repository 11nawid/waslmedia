import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminLogin } from '@/server/services/admin';
import { isApiDocsEnabled, setApiDocsSessionCookie } from '@/server/utils/api-docs-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isApiDocsEnabled()) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'INVALID_LOGIN' }, { status: 400 });
  }

  const auth = await authenticateAdminLogin(email, password);
  if (!auth) {
    return NextResponse.json({ error: 'INVALID_LOGIN' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role: auth.viewer.role, viewer: auth.viewer });
  setApiDocsSessionCookie(response, auth.session);
  return response;
}
