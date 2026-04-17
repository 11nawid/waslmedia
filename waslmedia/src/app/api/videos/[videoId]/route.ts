import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { deleteVideo, getVideoById, updateVideo } from '@/server/services/videos';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();
  const { videoId } = await context.params;
  const isShare = request.nextUrl.searchParams.get('share') === 'true';
  const incrementView = request.nextUrl.searchParams.get('incrementView') === 'true';

  const video = await getVideoById(videoId, {
    viewerId: user?.id,
    isShare,
    incrementView,
  });

  if (!video) {
    return NextResponse.json({ error: 'VIDEO_NOT_FOUND' }, { status: 404 });
  }

  if (incrementView && video.authorId) {
    publishRealtimeEvent(`analytics:${video.authorId}`, 'analytics.updated');
    publishRealtimeEvent(`studio:${video.authorId}`, 'analytics.updated');
  }
  if (incrementView) {
    publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');
  }

  return NextResponse.json({ video });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { videoId } = await context.params;
  const body = await request.json();
  const video = await updateVideo(videoId, user.id, body);

  publishRealtimeEvent(`studio:${user.id}`, 'videos.updated');
  publishRealtimeEvent(`analytics:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');
  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');

  return NextResponse.json({ video });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { videoId } = await context.params;
  await deleteVideo(videoId, user.id);

  publishRealtimeEvent(`studio:${user.id}`, 'videos.updated');
  publishRealtimeEvent(`analytics:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');
  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');

  return NextResponse.json({ success: true });
}
