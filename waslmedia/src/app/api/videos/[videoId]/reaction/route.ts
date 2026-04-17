import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getVideoById, reactToVideo } from '@/server/services/videos';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { videoId } = await context.params;
  const body = await request.json();
  const status = await reactToVideo(videoId, user.id, body.reaction);
  const video = await getVideoById(videoId, { viewerId: user.id });

  if (video?.authorId) {
    publishRealtimeEvent(`analytics:${video.authorId}`, 'analytics.updated');
    publishRealtimeEvent(`studio:${video.authorId}`, 'analytics.updated');
  }
  publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');

  return NextResponse.json({ status, video });
}
