import { NextResponse } from 'next/server';
import { resolveAdminViewer } from '@/server/services/admin';
import { readApiDocsSessionFromCookieStore } from '@/server/utils/api-docs-auth';
import { isInternalToolsEnabled } from '@/server/utils/runtime-config';

export async function GET() {
  if (!isInternalToolsEnabled()) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const viewer = await resolveAdminViewer(await readApiDocsSessionFromCookieStore());
  if (!viewer) {
    return NextResponse.json({ viewer: null }, { status: 401 });
  }

  return NextResponse.json({ viewer });
}

