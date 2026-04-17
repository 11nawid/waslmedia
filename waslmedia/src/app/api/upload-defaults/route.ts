import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import {
  findUploadDefaultsByUserId,
  upsertUploadDefaults,
} from '@/server/repositories/upload-defaults';
import { getCurrentAuthUser } from '@/server/services/auth';

function mapUploadDefaults(row: Awaited<ReturnType<typeof findUploadDefaultsByUserId>>) {
  if (!row) {
    return null;
  }

  return {
    title: row.title || '',
    description: row.description || '',
    visibility: row.visibility || 'private',
    category: row.category || '',
    tags: row.tags || '',
  };
}

export async function GET() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const defaults = mapUploadDefaults(await findUploadDefaultsByUserId(user.id));
  return NextResponse.json({ defaults });
}

export async function PUT(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const visibility = ['private', 'public', 'unlisted'].includes(body.visibility)
    ? body.visibility
    : 'private';

  const defaults = await upsertUploadDefaults(user.id, {
    title: String(body.title || ''),
    description: String(body.description || ''),
    visibility,
    category: String(body.category || ''),
    tags: String(body.tags || ''),
  });

  return NextResponse.json({ defaults: mapUploadDefaults(defaults) });
}
