import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getPlaylistVideoStatus } from '@/server/services/playlists';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const videoId = request.nextUrl.searchParams.get('videoId');
  if (!videoId) {
    return NextResponse.json({ error: 'VIDEO_ID_REQUIRED' }, { status: 400 });
  }

  const playlistIds = await getPlaylistVideoStatus(user.id, videoId);
  return NextResponse.json({ playlistIds });
}
