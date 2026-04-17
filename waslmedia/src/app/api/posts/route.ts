import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { createPost, getPostsByAuthorId } from '@/server/services/posts';
import { publishRealtimeEvent } from '@/server/realtime/events';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const authorId = request.nextUrl.searchParams.get('authorId');
  if (!authorId) {
    return NextResponse.json({ error: 'AUTHOR_ID_REQUIRED' }, { status: 400 });
  }

  const posts = await getPostsByAuthorId(authorId);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  const post = await createPost({
    authorId: user.id,
    text: body.text,
    imageUrl: body.imageUrl,
    poll: body.poll,
  });

  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'posts.updated');

  return NextResponse.json({ post }, { status: 201 });
}
