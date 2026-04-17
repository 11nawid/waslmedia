import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { deletePost } from '@/server/services/posts';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { postId } = await context.params;
  await deletePost(postId, user.id);
  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'posts.updated');
  return NextResponse.json({ success: true });
}
