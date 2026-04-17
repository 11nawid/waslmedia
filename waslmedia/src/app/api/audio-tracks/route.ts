import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getAudioLibraryTracks, publishAudioTrack } from '@/server/services/audio-tracks';

export async function GET() {
  await ensureDatabaseSetup();
  const tracks = await getAudioLibraryTracks();
  return NextResponse.json({ tracks });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const title = String(body.title || '').trim();
  const artist = String(body.artist || '').trim();
  const genre = String(body.genre || '').trim();
  const mood = String(body.mood || '').trim();
  const duration = String(body.duration || '').trim();
  const url = String(body.url || '').trim();

  if (!title || !artist || !genre || !mood || !duration || !url) {
    return NextResponse.json({ error: 'INVALID_AUDIO_TRACK' }, { status: 400 });
  }

  const track = await publishAudioTrack({
    uploaderId: user.id,
    title,
    artist,
    genre,
    mood,
    duration,
    url,
  });

  return NextResponse.json({ track }, { status: 201 });
}
