import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { bulkDeleteVideos, bulkUpdateVideos } from '@/server/services/videos';
import { publishRealtimeEvent } from '@/server/realtime/events';

export async function PATCH(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  await bulkUpdateVideos(body.videoIds || [], user.id, body.updates || {});

  publishRealtimeEvent(`studio:${user.id}`, 'videos.updated');
  publishRealtimeEvent(`analytics:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  await bulkDeleteVideos(body.videoIds || [], user.id);

  publishRealtimeEvent(`studio:${user.id}`, 'videos.updated');
  publishRealtimeEvent(`analytics:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`studio:${user.id}`, 'analytics.updated');
  publishRealtimeEvent(`channel:${user.id}`, 'channel.updated');

  return NextResponse.json({ success: true });
}
