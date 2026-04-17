import { NextRequest, NextResponse } from 'next/server';
import { getOpenApiDocument } from '@/lib/api/openapi';
import { resolveAdminViewer } from '@/server/services/admin';
import { isApiDocsEnabled, readApiDocsSessionFromRequest } from '@/server/utils/api-docs-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isApiDocsEnabled()) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const session = readApiDocsSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const viewer = await resolveAdminViewer(session);
  if (!viewer || !viewer.permissions.includes('view_api_docs')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json(getOpenApiDocument({ role: viewer.role, developerAccess: viewer.docsAccess ?? undefined }), {
    headers: {
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
    },
  });
}
