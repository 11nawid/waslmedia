import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface AudioTrackRow extends RowDataPacket {
  id: string;
  uploader_id: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
  url: string;
  created_at: Date | string;
}

export async function listAudioTracks() {
  const [rows] = await dbPool.query<AudioTrackRow[]>(
    `SELECT id, uploader_id, title, artist, genre, mood, duration, url, created_at
     FROM audio_tracks
     ORDER BY created_at DESC`
  );

  return rows;
}

export async function createAudioTrack(input: {
  uploaderId: string;
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
  url: string;
}) {
  const id = randomUUID();

  await dbPool.query(
    `INSERT INTO audio_tracks (id, uploader_id, title, artist, genre, mood, duration, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.uploaderId, input.title, input.artist, input.genre, input.mood, input.duration, input.url]
  );

  const [rows] = await dbPool.query<AudioTrackRow[]>(
    `SELECT id, uploader_id, title, artist, genre, mood, duration, url, created_at
     FROM audio_tracks
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}
