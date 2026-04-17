import { defaultAudioTracks } from '@/lib/default-audios';
import { createAudioTrack, listAudioTracks } from '@/server/repositories/audio-tracks';
import { buildProtectedAssetUrlFromStorageUrl } from '@/server/utils/protected-asset';

export async function getAudioLibraryTracks() {
  const rows = await listAudioTracks();
  const customTracks = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    genre: row.genre,
    mood: row.mood,
    url: buildProtectedAssetUrlFromStorageUrl(row.url) || row.url,
  }));

  return [...defaultAudioTracks, ...customTracks];
}

export async function publishAudioTrack(input: {
  uploaderId: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
  url: string;
}) {
  const row = await createAudioTrack(input);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    genre: row.genre,
    mood: row.mood,
    url: buildProtectedAssetUrlFromStorageUrl(row.url) || row.url,
  };
}
