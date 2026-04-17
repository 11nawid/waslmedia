import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { editComment, removeComment } from '@/server/services/comments';
import { publishRealtimeEvent } from '@/server/realtime/events';
import { findVideoRowById } from '@/server/repositories/videos';

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { commentId } = await context.params;
  const body = await request.json();
  const comment = await editComment(commentId, user.id, body.text);
  return NextResponse.json({ comment });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { commentId } = await context.params;
  const comment = await removeComment(commentId, user.id);

  if (comment?.videoId) {
    const videoRow = await findVideoRowById(comment.videoId);
    publishRealtimeEvent(`comments:video:${comment.videoId}`, 'comments.updated');
    publishRealtimeEvent(`analytics:video:${comment.videoId}`, 'analytics.updated');
    if (videoRow?.author_id) {
      publishRealtimeEvent(`analytics:${videoRow.author_id}`, 'analytics.updated');
      publishRealtimeEvent(`studio:${videoRow.author_id}`, 'analytics.updated');
    }
  }
  if (comment?.postId) {
    publishRealtimeEvent(`comments:post:${comment.postId}`, 'comments.updated');
  }

  return NextResponse.json({ success: true });
}
