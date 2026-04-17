import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { addVideoToHistory, removeVideoFromHistory } from '@/server/services/videos';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { videoId } = await context.params;
  const saved = await addVideoToHistory(user.id, videoId);
  return NextResponse.json({ success: true, saved });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { videoId } = await context.params;
  await removeVideoFromHistory(user.id, videoId);
  return NextResponse.json({ success: true });
}
