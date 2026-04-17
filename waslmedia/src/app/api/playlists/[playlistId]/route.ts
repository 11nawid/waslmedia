import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { deletePlaylist, getPlaylistById, updatePlaylist } from '@/server/services/playlists';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ playlistId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { playlistId } = await context.params;
  const playlist = await getPlaylistById(playlistId);

  if (!playlist) {
    return NextResponse.json({ error: 'PLAYLIST_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ playlist });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const body = await request.json();
  const playlist = await updatePlaylist(user.id, playlistId, body);
  publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');
  return NextResponse.json({ playlist });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { playlistId } = await context.params;
  await deletePlaylist(user.id, playlistId);
  publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');
  return NextResponse.json({ success: true });
}
