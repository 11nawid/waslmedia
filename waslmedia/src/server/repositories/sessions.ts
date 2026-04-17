import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

interface SessionRow extends RowDataPacket {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
  user_agent_hash: string | null;
  ip_hash: string | null;
}

export async function createSession(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgentHash?: string | null;
  ipHash?: string | null;
  rotatedFromSessionId?: string | null;
}) {
  const sessionId = randomUUID();

  await dbPool.query(
    `INSERT INTO sessions (
      id, user_id, token_hash, expires_at, last_seen_at, user_agent_hash, ip_hash, rotated_from_session_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.lastSeenAt,
      input.userAgentHash || null,
      input.ipHash || null,
      input.rotatedFromSessionId || null,
    ]
  );
}

export async function findActiveSessionByTokenHash(tokenHash: string) {
  const [rows] = await dbPool.query<SessionRow[]>(
    `SELECT id, user_id, token_hash, expires_at, last_seen_at, revoked_at, user_agent_hash, ip_hash
     FROM sessions
     WHERE token_hash = ? AND expires_at > NOW() AND revoked_at IS NULL
     LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

export async function touchSessionByTokenHash(input: {
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgentHash?: string | null;
  ipHash?: string | null;
}) {
  await dbPool.query(
    `UPDATE sessions
     SET expires_at = ?,
         last_seen_at = ?,
         user_agent_hash = COALESCE(user_agent_hash, ?),
         ip_hash = COALESCE(ip_hash, ?)
     WHERE token_hash = ? AND revoked_at IS NULL`,
    [input.expiresAt, input.lastSeenAt, input.userAgentHash || null, input.ipHash || null, input.tokenHash]
  );
}

export async function revokeSessionByTokenHash(tokenHash: string) {
  await dbPool.query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE token_hash = ?`,
    [tokenHash]
  );
}

export async function deleteExpiredSessions() {
  await dbPool.query(
    `DELETE FROM sessions
     WHERE expires_at <= NOW()
        OR (revoked_at IS NOT NULL AND revoked_at <= DATE_SUB(NOW(), INTERVAL 7 DAY))`
  );
}
