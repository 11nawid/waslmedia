import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getPostInteractionStatus } from '@/server/services/posts';

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ status: { liked: false, disliked: false } });
  }

  const { postId } = await context.params;
  const status = await getPostInteractionStatus(postId, user.id);
  return NextResponse.json({ status });
}
