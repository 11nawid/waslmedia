import { SESSION_DURATION_MS, SESSION_RENEWAL_INTERVAL_MS } from '@/lib/auth/constants';
import { AuthUser } from '@/lib/auth/types';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getSessionCookie } from '@/lib/auth/cookies';
import { createSessionToken, hashFingerprintValue, hashSessionToken } from '@/lib/auth/token';
import {
  createUserWithChannel,
  findUserByEmail,
  findUserByHandle,
  findUserById,
  getSubscriptionsForUser,
  getWatchLaterForUser,
} from '@/server/repositories/users';
import {
  createSession,
  deleteExpiredSessions,
  findActiveSessionByTokenHash,
  revokeSessionByTokenHash,
  touchSessionByTokenHash,
} from '@/server/repositories/sessions';
import { resolveStoredAssetUrl } from '@/server/utils/protected-asset';
import { DEFAULT_BANNER, DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';

export interface AuthSessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface CurrentSessionResult {
  token: string | null;
  user: AuthUser | null;
  shouldClearCookie: boolean;
  renewed: boolean;
}

function mapUser(row: Awaited<ReturnType<typeof findUserById>>, subscriptions: string[], watchLater: string[]): AuthUser | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: resolveStoredAssetUrl(row.photo_url, DEFAULT_PROFILE_PICTURE),
    handle: row.handle.startsWith('@') ? row.handle : `@${row.handle}`,
    profilePictureUrl: resolveStoredAssetUrl(row.profile_picture_url || row.photo_url, DEFAULT_PROFILE_PICTURE),
    bannerUrl: resolveStoredAssetUrl(row.banner_url, DEFAULT_BANNER),
    subscriberCount: row.subscriber_count || 0,
    description: row.description,
    country: row.country,
    showCountry: Boolean(row.show_country),
    subscriptions,
    watchLater,
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  handle: string;
  photoUrl?: string | null;
}, sessionMetadata: AuthSessionMetadata = {}) {
  await ensureDatabaseSetup();

  const existingEmail = await findUserByEmail(input.email);
  if (existingEmail) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const handleKey = input.handle.replace(/^@/, '');
  const existingHandle = await findUserByHandle(handleKey);
  if (existingHandle) {
    throw new Error('HANDLE_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);
  const userId = await createUserWithChannel({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
    handle: handleKey,
    photoUrl: input.photoUrl,
  });

  return createUserSession(userId, sessionMetadata);
}

export async function loginUser(email: string, password: string, sessionMetadata: AuthSessionMetadata = {}) {
  await ensureDatabaseSetup();

  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    throw new Error('INVALID_CREDENTIALS');
  }

  return createUserSession(user.id, sessionMetadata);
}

function buildSessionAuditHashes(sessionMetadata: AuthSessionMetadata) {
  return {
    userAgentHash: hashFingerprintValue(sessionMetadata.userAgent),
    ipHash: hashFingerprintValue(sessionMetadata.ipAddress),
  };
}

function shouldRenewSession(lastSeenAt: Date | string | null | undefined) {
  if (!lastSeenAt) {
    return true;
  }

  const value = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(value)) {
    return true;
  }

  return Date.now() - value >= SESSION_RENEWAL_INTERVAL_MS;
}

async function createUserSession(userId: string, sessionMetadata: AuthSessionMetadata) {
  await deleteExpiredSessions();

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const lastSeenAt = new Date();
  const { userAgentHash, ipHash } = buildSessionAuditHashes(sessionMetadata);

  await createSession({
    userId,
    tokenHash,
    expiresAt,
    lastSeenAt,
    userAgentHash,
    ipHash,
  });

  const authUser = await getAuthUserById(userId);

  return {
    token,
    user: authUser,
  };
}

export async function logoutCurrentSession() {
  await ensureDatabaseSetup();

  const token = await getSessionCookie();

  if (!token) {
    return;
  }

  await revokeSessionByTokenHash(hashSessionToken(token));
}

export async function getCurrentSession(input: {
  renew?: boolean;
  sessionMetadata?: AuthSessionMetadata;
} = {}): Promise<CurrentSessionResult> {
  await ensureDatabaseSetup();

  const token = await getSessionCookie();

  if (!token) {
    return {
      token: null,
      user: null,
      shouldClearCookie: false,
      renewed: false,
    };
  }

  const tokenHash = hashSessionToken(token);
  const session = await findActiveSessionByTokenHash(tokenHash);
  if (!session) {
    return {
      token: null,
      user: null,
      shouldClearCookie: true,
      renewed: false,
    };
  }

  const user = await getAuthUserById(session.user_id);
  if (!user) {
    await revokeSessionByTokenHash(tokenHash);
    return {
      token: null,
      user: null,
      shouldClearCookie: true,
      renewed: false,
    };
  }

  let renewed = false;

  if (input.renew && shouldRenewSession(session.last_seen_at)) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const lastSeenAt = new Date();
    const { userAgentHash, ipHash } = buildSessionAuditHashes(input.sessionMetadata || {});

    await touchSessionByTokenHash({
      tokenHash,
      expiresAt,
      lastSeenAt,
      userAgentHash,
      ipHash,
    });

    renewed = true;
  }

  return {
    token,
    user,
    shouldClearCookie: false,
    renewed,
  };
}

export async function getCurrentAuthUser() {
  const session = await getCurrentSession();
  return session.user;
}

export async function getAuthUserById(userId: string) {
  const row = await findUserById(userId);
  if (!row) {
    return null;
  }

  const [subscriptions, watchLater] = await Promise.all([
    getSubscriptionsForUser(userId),
    getWatchLaterForUser(userId),
  ]);

  return mapUser(row, subscriptions, watchLater);
}
