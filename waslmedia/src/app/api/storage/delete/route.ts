import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { deleteObjectFromStorage } from '@/lib/storage/server';
import { parseStorageUrl } from '@/lib/storage/shared';
import { requireRouteUser } from '@/server/http/route-auth';
import { canDeleteStorageObject } from '@/server/utils/upload-intents';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'INVALID_DELETE_REQUEST' }, { status: 400 });
    }

    const parsed =
      typeof body.fileUrl === 'string'
        ? parseStorageUrl(body.fileUrl)
        : body.bucket && body.objectKey
          ? { bucket: String(body.bucket), objectKey: String(body.objectKey) }
          : null;

    if (!parsed || !canDeleteStorageObject({ userId: auth.user.id, bucket: parsed.bucket, objectKey: parsed.objectKey })) {
      return NextResponse.json({ error: 'STORAGE_DELETE_FORBIDDEN' }, { status: 403 });
    }

    await deleteObjectFromStorage(parsed.bucket, parsed.objectKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Storage delete failed', error);
    return NextResponse.json({ error: 'STORAGE_DELETE_FAILED' }, { status: 500 });
  }
}
