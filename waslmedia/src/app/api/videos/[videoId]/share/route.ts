import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { shareVideo } from '@/server/services/videos';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { videoId } = await context.params;
  const user = await getCurrentAuthUser();
  const video = await shareVideo(videoId, user?.id || null);

  if (!video) {
    return NextResponse.json({ error: 'VIDEO_NOT_FOUND' }, { status: 404 });
  }

  if (video.authorId) {
    publishRealtimeEvent(`analytics:${video.authorId}`, 'analytics.updated');
    publishRealtimeEvent(`studio:${video.authorId}`, 'analytics.updated');
  }
  publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');

  return NextResponse.json({ video });
}
