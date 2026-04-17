import type { AudioTrack } from '@/lib/audio/types';

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

export async function getAudioTracks() {
  const response = await fetch('/api/audio-tracks', {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'AUDIO_TRACKS_FETCH_FAILED');
  }

  return (payload.tracks || []) as AudioTrack[];
}

export async function createPublishedAudioTrack(input: {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
  url: string;
}) {
  const response = await fetch('/api/audio-tracks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(payload.error || 'AUDIO_TRACK_PUBLISH_FAILED');
  }

  return payload.track as AudioTrack;
}
