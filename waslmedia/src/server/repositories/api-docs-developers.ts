import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export type ApiDocsDeveloperAccess = {
  allowedTags: string[];
  allowedPathPrefixes: string[];
  allowedExactPaths: string[];
};

export type ApiDocsDeveloperRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  docsAccess: ApiDocsDeveloperAccess;
  createdAt: string;
  updatedAt: string;
};

type ApiDocsDeveloperRow = RowDataPacket & {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  docs_access_json: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ApiDocsDeveloperRowWithPassword = ApiDocsDeveloperRow & {
  password_hash: string;
};

type DeveloperAccountInput = {
  name: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
  password?: string;
  docsAccess?: Partial<ApiDocsDeveloperAccess> | null;
};

declare global {
  var __waslmediaApiDocsDevelopersTablePromise: Promise<void> | undefined;
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await dbPool.query<Array<{ count: number } & RowDataPacket>>(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  try {
    await dbPool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Duplicate column name/i.test(message)) {
      return;
    }

    throw error;
  }
}

function normalizeInput(input: Partial<DeveloperAccountInput>) {
  return {
    name: input.name?.trim() ?? '',
    username: input.username?.trim() ?? '',
    email: input.email?.trim().toLowerCase() ?? '',
    role: input.role?.trim() ?? 'developer',
    status: input.status?.trim() ?? 'active',
    password: input.password?.trim() ?? '',
    docsAccess: normalizeDocsAccess(input.docsAccess),
  };
}

function createDeveloperError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function toIsoTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeStringList(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function normalizeDocsAccess(input: Partial<ApiDocsDeveloperAccess> | null | undefined): ApiDocsDeveloperAccess {
  return {
    allowedTags: normalizeStringList(input?.allowedTags),
    allowedPathPrefixes: normalizeStringList(input?.allowedPathPrefixes),
    allowedExactPaths: normalizeStringList(input?.allowedExactPaths),
  };
}

function parseDocsAccess(value: string | null): ApiDocsDeveloperAccess {
  if (!value) {
    return normalizeDocsAccess({});
  }

  try {
    const parsed = JSON.parse(value) as Partial<ApiDocsDeveloperAccess>;
    return normalizeDocsAccess(parsed);
  } catch {
    return normalizeDocsAccess({});
  }
}

function mapRow(row: ApiDocsDeveloperRow): ApiDocsDeveloperRecord {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status,
    docsAccess: parseDocsAccess(row.docs_access_json),
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

async function ensureApiDocsDevelopersTable() {
  if (!global.__waslmediaApiDocsDevelopersTablePromise) {
    global.__waslmediaApiDocsDevelopersTablePromise = dbPool
      .query(`
        CREATE TABLE IF NOT EXISTS api_docs_developers (
          id CHAR(36) PRIMARY KEY,
          name VARCHAR(120) NOT NULL,
          username VARCHAR(80) NOT NULL UNIQUE,
          email VARCHAR(191) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(80) NOT NULL DEFAULT 'developer',
          status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
          docs_access_json LONGTEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_api_docs_developers_email (email),
          INDEX idx_api_docs_developers_username (username)
        )
      `)
      .then(async () => {
        await addColumnIfMissing('api_docs_developers', 'docs_access_json', 'LONGTEXT NULL');
      })
      .then(() => undefined)
      .catch((error) => {
        global.__waslmediaApiDocsDevelopersTablePromise = undefined;
        throw error;
      });
  }

  return global.__waslmediaApiDocsDevelopersTablePromise;
}

export async function listApiDocsDevelopers() {
  await ensureApiDocsDevelopersTable();

  const [rows] = await dbPool.query<ApiDocsDeveloperRow[]>(
    `SELECT id, name, username, email, role, status, docs_access_json, created_at, updated_at
     FROM api_docs_developers
     ORDER BY created_at DESC`
  );

  return rows.map(mapRow);
}

async function findDeveloperById(id: string) {
  await ensureApiDocsDevelopersTable();

  const [rows] = await dbPool.query<ApiDocsDeveloperRowWithPassword[]>(
    `SELECT id, name, username, email, password_hash, role, status, docs_access_json, created_at, updated_at
     FROM api_docs_developers
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function findDeveloperByIdPublic(id: string) {
  const developer = await findDeveloperById(id);
  return developer ? mapRow(developer) : null;
}

export async function createApiDocsDeveloper(input: Partial<DeveloperAccountInput>) {
  await ensureApiDocsDevelopersTable();

  const normalized = normalizeInput(input);
  if (!normalized.name || !normalized.username || !normalized.email || !normalized.password) {
    throw createDeveloperError('INVALID_DEVELOPER_ACCOUNT', 'Name, username, email, and password are required.');
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(normalized.password);
  const docsAccessJson = JSON.stringify(normalized.docsAccess);

  try {
    await dbPool.query<ResultSetHeader>(
      `INSERT INTO api_docs_developers (id, name, username, email, password_hash, role, status, docs_access_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, normalized.name, normalized.username, normalized.email, passwordHash, normalized.role, normalized.status, docsAccessJson]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/for key 'email'|for key 'idx_api_docs_developers_email'|Duplicate entry .*email/i.test(message)) {
      throw createDeveloperError('DEVELOPER_EMAIL_EXISTS', 'That developer email already exists.');
    }
    if (/for key 'username'|for key 'idx_api_docs_developers_username'|Duplicate entry .*username/i.test(message)) {
      throw createDeveloperError('DEVELOPER_USERNAME_EXISTS', 'That developer username already exists.');
    }
    throw error;
  }

  const developer = await findDeveloperById(id);
  if (!developer) {
    throw createDeveloperError('DEVELOPER_NOT_FOUND', 'The developer account could not be loaded after creation.');
  }

  return mapRow(developer);
}

export async function updateApiDocsDeveloper(id: string, input: Partial<DeveloperAccountInput>) {
  await ensureApiDocsDevelopersTable();

  const existing = await findDeveloperById(id);
  if (!existing) {
    throw createDeveloperError('DEVELOPER_NOT_FOUND', 'The developer account was not found.');
  }

  const normalized = normalizeInput({
    name: input.name ?? existing.name,
    username: input.username ?? existing.username,
    email: input.email ?? existing.email,
    role: input.role ?? existing.role,
    status: input.status ?? existing.status,
    password: input.password ?? '',
    docsAccess: input.docsAccess ?? parseDocsAccess(existing.docs_access_json),
  });

  if (!normalized.name || !normalized.username || !normalized.email) {
    throw createDeveloperError('INVALID_DEVELOPER_ACCOUNT', 'Name, username, and email are required.');
  }

  const passwordHash = normalized.password ? await hashPassword(normalized.password) : existing.password_hash;
  const docsAccessJson = JSON.stringify(normalized.docsAccess);

  try {
    await dbPool.query<ResultSetHeader>(
      `UPDATE api_docs_developers
       SET name = ?, username = ?, email = ?, password_hash = ?, role = ?, status = ?, docs_access_json = ?
       WHERE id = ?`,
      [normalized.name, normalized.username, normalized.email, passwordHash, normalized.role, normalized.status, docsAccessJson, id]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/for key 'email'|for key 'idx_api_docs_developers_email'|Duplicate entry .*email/i.test(message)) {
      throw createDeveloperError('DEVELOPER_EMAIL_EXISTS', 'That developer email already exists.');
    }
    if (/for key 'username'|for key 'idx_api_docs_developers_username'|Duplicate entry .*username/i.test(message)) {
      throw createDeveloperError('DEVELOPER_USERNAME_EXISTS', 'That developer username already exists.');
    }
    throw error;
  }

  const developer = await findDeveloperById(id);
  if (!developer) {
    throw createDeveloperError('DEVELOPER_NOT_FOUND', 'The developer account was not found after update.');
  }

  return mapRow(developer);
}

export async function deleteApiDocsDeveloper(id: string) {
  await ensureApiDocsDevelopersTable();

  const [result] = await dbPool.query<ResultSetHeader>('DELETE FROM api_docs_developers WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw createDeveloperError('DEVELOPER_NOT_FOUND', 'The developer account was not found.');
  }
}

export async function findApiDocsDeveloperByEmail(email: string) {
  await ensureApiDocsDevelopersTable();

  const [rows] = await dbPool.query<ApiDocsDeveloperRowWithPassword[]>(
    `SELECT id, name, username, email, password_hash, role, status, docs_access_json, created_at, updated_at
     FROM api_docs_developers
     WHERE email = ?
     LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  return rows[0] ?? null;
}

export async function verifyApiDocsDeveloperCredentials(email: string, password: string) {
  const developer = await findApiDocsDeveloperByEmail(email);
  if (!developer || developer.status !== 'active') {
    return null;
  }

  const passwordMatches = await verifyPassword(password, developer.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return mapRow(developer);
}
