import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface PlaylistRow extends RowDataPacket {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private' | 'unlisted';
  created_at: Date | string;
  updated_at: Date | string;
  creator_name: string;
}

const BASE_PLAYLIST_SELECT = `
  SELECT
    p.id,
    p.creator_id,
    p.name,
    p.description,
    p.visibility,
    p.created_at,
    p.updated_at,
    ch.name AS creator_name
  FROM playlists p
  INNER JOIN channels ch ON ch.user_id = p.creator_id
`;

export async function listPlaylistRowsByUser(userId: string) {
  const [rows] = await dbPool.query<PlaylistRow[]>(
    `${BASE_PLAYLIST_SELECT}
     WHERE p.creator_id = ?
     ORDER BY p.updated_at DESC`,
    [userId]
  );

  return rows;
}

export async function listPublicPlaylistRowsByUser(userId: string) {
  const [rows] = await dbPool.query<PlaylistRow[]>(
    `${BASE_PLAYLIST_SELECT}
     WHERE p.creator_id = ? AND p.visibility = 'public'
     ORDER BY p.updated_at DESC`,
    [userId]
  );

  return rows;
}

export async function findPlaylistRowById(playlistId: string) {
  const [rows] = await dbPool.query<PlaylistRow[]>(
    `${BASE_PLAYLIST_SELECT}
     WHERE p.id = ?
     LIMIT 1`,
    [playlistId]
  );

  return rows[0] || null;
}

export async function createPlaylistRow(input: {
  creatorId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
}) {
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO playlists (id, creator_id, name, description, visibility)
     VALUES (?, ?, ?, ?, ?)`,
    [id, input.creatorId, input.name, input.description || '', input.visibility]
  );

  return id;
}

export async function updatePlaylistRow(playlistId: string, creatorId: string, updates: {
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
}) {
  await dbPool.query(
    `UPDATE playlists
     SET name = ?, description = ?, visibility = ?
     WHERE id = ? AND creator_id = ?`,
    [updates.name, updates.description || '', updates.visibility, playlistId, creatorId]
  );
}

export async function deletePlaylistRow(playlistId: string, creatorId: string) {
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM playlist_videos WHERE playlist_id = ?`, [playlistId]);
    await connection.query(`DELETE FROM playlists WHERE id = ? AND creator_id = ?`, [playlistId, creatorId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listPlaylistVideoRows(playlistId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT video_id, position
     FROM playlist_videos
     WHERE playlist_id = ?
     ORDER BY position ASC, created_at ASC`,
    [playlistId]
  );

  return rows.map((row) => ({ videoId: String(row.video_id), position: Number(row.position) }));
}

export async function addVideoToPlaylist(playlistId: string, videoId: string) {
  const [countRows] = await dbPool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM playlist_videos WHERE playlist_id = ?`,
    [playlistId]
  );
  const position = Number(countRows[0]?.total || 0);

  await dbPool.query(
    `INSERT IGNORE INTO playlist_videos (playlist_id, video_id, position)
     VALUES (?, ?, ?)`,
    [playlistId, videoId, position]
  );
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string) {
  await dbPool.query(
    `DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?`,
    [playlistId, videoId]
  );
}

export async function listPlaylistIdsContainingVideo(userId: string, videoId: string) {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT pv.playlist_id
     FROM playlist_videos pv
     INNER JOIN playlists p ON p.id = pv.playlist_id
     WHERE p.creator_id = ? AND pv.video_id = ?`,
    [userId, videoId]
  );

  return rows.map((row) => String(row.playlist_id));
}
