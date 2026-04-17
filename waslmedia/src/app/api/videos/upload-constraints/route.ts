import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getVideoUploadConstraints } from '@/server/services/video-upload-constraints';

export async function GET() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const constraints = await getVideoUploadConstraints(user.id);
  return NextResponse.json(constraints);
}
