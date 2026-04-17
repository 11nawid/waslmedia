import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { publishRealtimeEvent } from '@/server/realtime/events';
import { registerQualifiedVideoView } from '@/server/services/videos';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();
  const { videoId } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const video = await registerQualifiedVideoView(videoId, user?.id, {
    trafficSource: typeof payload.source === 'string' ? payload.source : null,
    viewerCountry:
      (typeof payload.viewerCountry === 'string' && payload.viewerCountry) || user?.country || null,
    viewerKey: typeof payload.viewerKey === 'string' ? payload.viewerKey : null,
    deviceType: typeof payload.deviceType === 'string' ? payload.deviceType : null,
  });

  if (!video) {
    return NextResponse.json({ error: 'VIDEO_NOT_FOUND' }, { status: 404 });
  }

  if (video.authorId) {
    publishRealtimeEvent(`analytics:${video.authorId}`, 'analytics.updated');
    publishRealtimeEvent(`studio:${video.authorId}`, 'analytics.updated');
    publishRealtimeEvent(`channel:${video.authorId}`, 'channel.updated');
  }
  publishRealtimeEvent(`analytics:video:${videoId}`, 'analytics.updated');

  return NextResponse.json({ video });
}
