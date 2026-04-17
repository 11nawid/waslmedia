import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { createPlaylist, getUserPlaylists } from '@/server/services/playlists';
import { publishRealtimeEvent } from '@/server/realtime/events';

export async function GET() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const playlists = await getUserPlaylists(user.id);
  return NextResponse.json({ playlists });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json();
  const playlist = await createPlaylist({
    userId: user.id,
    name: body.name,
    visibility: body.visibility,
    description: body.description,
    firstVideoId: body.firstVideoId,
  });

  publishRealtimeEvent(`studio:${user.id}`, 'playlists.updated');

  return NextResponse.json({ playlist }, { status: 201 });
}
