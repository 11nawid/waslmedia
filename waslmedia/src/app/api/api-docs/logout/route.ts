import { NextResponse } from 'next/server';
import { clearApiDocsSessionCookie, isApiDocsEnabled } from '@/server/utils/api-docs-auth';

export const runtime = 'nodejs';

export async function POST() {
  if (!isApiDocsEnabled()) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  clearApiDocsSessionCookie(response);
  return response;
}
