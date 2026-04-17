import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export type PlaybackMode = 'mse' | 'compat-hls' | 'compat-source';
export type PlaybackSessionMode = 'watch' | 'preview' | 'shorts' | 'owner-download';

export interface PlaybackSessionRow extends RowDataPacket {
  id: string;
  video_id: string;
  viewer_user_id: string | null;
  mode: PlaybackSessionMode;
  playback_mode: PlaybackMode;
  payload_json: string;
  ip_hash: string | null;
  user_agent_hash: string | null;
  expires_at: Date | string;
}

export async function createPlaybackSessionRow(input: {
  videoId: string;
  viewerUserId?: string | null;
  mode: PlaybackSessionMode;
  playbackMode: PlaybackMode;
  payloadJson: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  expiresAt: Date;
}) {
  const id = randomUUID();

  await dbPool.query(
    `INSERT INTO playback_sessions (
      id,
      video_id,
      viewer_user_id,
      mode,
      playback_mode,
      payload_json,
      ip_hash,
      user_agent_hash,
      expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.videoId,
      input.viewerUserId || null,
      input.mode,
      input.playbackMode,
      input.payloadJson,
      input.ipHash || null,
      input.userAgentHash || null,
      input.expiresAt,
    ]
  );

  return id;
}

export async function findPlaybackSessionRowById(sessionId: string) {
  const [rows] = await dbPool.query<PlaybackSessionRow[]>(
    `SELECT
      id,
      video_id,
      viewer_user_id,
      mode,
      playback_mode,
      payload_json,
      ip_hash,
      user_agent_hash,
      expires_at
     FROM playback_sessions
     WHERE id = ?
     LIMIT 1`,
    [sessionId]
  );

  return rows[0] || null;
}

export async function touchPlaybackSessionRow(sessionId: string, expiresAt: Date) {
  await dbPool.query(
    `UPDATE playback_sessions
     SET expires_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [expiresAt, sessionId]
  );
}

export async function deleteExpiredPlaybackSessions() {
  await dbPool.query(`DELETE FROM playback_sessions WHERE expires_at < CURRENT_TIMESTAMP`);
}
