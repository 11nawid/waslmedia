import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { toggleCommentReaction } from '@/server/services/comments';

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { commentId } = await context.params;
  const result = await toggleCommentReaction(commentId, user.id);
  return NextResponse.json(result);
}
