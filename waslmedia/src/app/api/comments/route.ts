import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { createComment, getComments } from '@/server/services/comments';
import { getCurrentAuthUser } from '@/server/services/auth';
import { publishRealtimeEvent } from '@/server/realtime/events';
import { findVideoRowById } from '@/server/repositories/videos';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode');
  const parentId = searchParams.get('parentId');
  const parentType = searchParams.get('parentType') as 'video' | 'post' | null;
  const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'likes' | null) || 'createdAt';

  if (mode === 'studio') {
    const user = await getCurrentAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { getCommentsForUserVideos } = await import('@/server/services/comments');
    const comments = await getCommentsForUserVideos(user.id);
    return NextResponse.json({ comments });
  }

  if (!parentId || !parentType) {
    return NextResponse.json({ error: 'INVALID_COMMENT_QUERY' }, { status: 400 });
  }

  const comments = await getComments(parentId, parentType, sortBy);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  const comment = await createComment({
    parentId: body.parentId,
    parentType: body.parentType,
    authorId: user.id,
    text: body.text,
    replyToCommentId: body.replyToCommentId,
  });

  if (body.parentType === 'video') {
    const videoRow = await findVideoRowById(body.parentId);
    publishRealtimeEvent(`comments:video:${body.parentId}`, 'comments.updated');
    publishRealtimeEvent(`analytics:video:${body.parentId}`, 'analytics.updated');
    if (videoRow?.author_id) {
      publishRealtimeEvent(`analytics:${videoRow.author_id}`, 'analytics.updated');
      publishRealtimeEvent(`studio:${videoRow.author_id}`, 'analytics.updated');
    }
  }
  if (body.parentType === 'post') {
    publishRealtimeEvent(`comments:post:${body.parentId}`, 'comments.updated');
  }

  return NextResponse.json({ comment }, { status: 201 });
}
