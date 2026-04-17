import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { createClientUploadIntent } from '@/server/services/storage-upload';
import type { UploadMediaKind } from '@/lib/video-upload/rules';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const scope = body.scope === 'signup-profile' ? 'signup-profile' : 'default';
  const auth = scope === 'signup-profile' ? null : await requireRouteUser();
  if (auth?.response) {
    return auth.response;
  }

  const result = await createClientUploadIntent({
    bucket: typeof body.bucket === 'string' ? body.bucket : '',
    filename: typeof body.filename === 'string' ? body.filename : '',
    contentType: typeof body.contentType === 'string' ? body.contentType : 'application/octet-stream',
    scope,
    userId: auth?.user.id ?? null,
    mediaKind: body.mediaKind === 'long' || body.mediaKind === 'short' ? (body.mediaKind as UploadMediaKind) : null,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
