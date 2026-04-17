import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { bulkAddToPlaylists, toggleVideoInPlaylist } from '@/server/services/playlists';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ playlistId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const body = await request.json();

  if (Array.isArray(body.videoIds)) {
    const playlist = await bulkAddToPlaylists(user.id, playlistId, body.videoIds);
    publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');
    return NextResponse.json({ playlist });
  }

  const playlist = await toggleVideoInPlaylist(user.id, playlistId, body.videoId, Boolean(body.isInPlaylist));
  publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');
  return NextResponse.json({ playlist });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const body = await request.json();
  const playlist = await toggleVideoInPlaylist(user.id, playlistId, body.videoId, true);
  publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');
  return NextResponse.json({ playlist });
}
