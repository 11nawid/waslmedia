import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getUserInteractionStatus } from '@/server/services/videos';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ status: { liked: false, disliked: false, watchLater: false } });
  }

  const { videoId } = await context.params;
  const status = await getUserInteractionStatus(videoId, user.id);
  return NextResponse.json({ status });
}
