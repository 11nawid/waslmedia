import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import type {
  AdminDocsAccess,
  AdminPermission,
  AdminPermissionEffect,
  AdminPermissionOverride,
  AdminRole,
  AdminStaffAccount,
  AdminStaffStatus,
} from '@/lib/admin/types';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

type AdminStaffRow = RowDataPacket & {
  id: string;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  status: AdminStaffStatus;
  notes: string | null;
  docs_access_json: string | null;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type AdminPermissionOverrideRow = RowDataPacket & {
  id: string;
  staff_id: string;
  permission_key: AdminPermission;
  effect: AdminPermissionEffect;
  created_at: Date | string;
  updated_at: Date | string;
};

type AdminStaffInput = {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: AdminRole;
  status: AdminStaffStatus;
  notes?: string | null;
  docsAccess?: Partial<AdminDocsAccess> | null;
  permissionOverrides?: AdminPermissionOverride[] | null;
};

type AdminStaffRecord = AdminStaffAccount & {
  passwordHash?: string;
};

function normalizeStringList(values: string[] | undefined) {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function normalizeDocsAccess(input: Partial<AdminDocsAccess> | null | undefined): AdminDocsAccess {
  return {
    allowedTags: normalizeStringList(input?.allowedTags),
    allowedPathPrefixes: normalizeStringList(input?.allowedPathPrefixes),
    allowedExactPaths: normalizeStringList(input?.allowedExactPaths),
  };
}

function parseDocsAccess(value: string | null): AdminDocsAccess {
  if (!value) {
    return normalizeDocsAccess({});
  }

  try {
    return normalizeDocsAccess(JSON.parse(value) as Partial<AdminDocsAccess>);
  } catch {
    return normalizeDocsAccess({});
  }
}

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createAdminError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function normalizeInput(input: Partial<AdminStaffInput>) {
  return {
    name: input.name?.trim() ?? '',
    username: input.username?.trim() ?? '',
    email: input.email?.trim().toLowerCase() ?? '',
    password: input.password?.trim() ?? '',
    role: input.role ?? 'developer',
    status: input.status ?? 'active',
    notes: input.notes?.trim() || null,
    docsAccess: normalizeDocsAccess(input.docsAccess),
    permissionOverrides: (input.permissionOverrides ?? [])
      .filter((item): item is AdminPermissionOverride => Boolean(item?.permission && item?.effect))
      .map((item) => ({
        permission: item.permission,
        effect: item.effect,
      })),
  };
}

function mapStaffRow(
  row: AdminStaffRow,
  overrides: AdminPermissionOverrideRow[],
  includePasswordHash = false
): AdminStaffRecord {
  const mapped: AdminStaffRecord = {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status,
    notes: row.notes,
    lastLoginAt: toIso(row.last_login_at),
    docsAccess: parseDocsAccess(row.docs_access_json),
    permissionOverrides: overrides.map((item) => ({
      permission: item.permission_key,
      effect: item.effect,
    })),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };

  if (includePasswordHash) {
    mapped.passwordHash = row.password_hash;
  }

  return mapped;
}

async function listOverridesForStaffIds(staffIds: string[]) {
  if (staffIds.length === 0) {
    return new Map<string, AdminPermissionOverrideRow[]>();
  }

  const placeholders = staffIds.map(() => '?').join(', ');
  const [rows] = await dbPool.query<AdminPermissionOverrideRow[]>(
    `SELECT id, staff_id, permission_key, effect, created_at, updated_at
     FROM admin_staff_permission_overrides
     WHERE staff_id IN (${placeholders})
     ORDER BY created_at ASC`,
    staffIds
  );

  const result = new Map<string, AdminPermissionOverrideRow[]>();
  for (const row of rows) {
    const current = result.get(row.staff_id) ?? [];
    current.push(row);
    result.set(row.staff_id, current);
  }

  return result;
}

async function replaceOverrides(staffId: string, overrides: AdminPermissionOverride[]) {
  await dbPool.query('DELETE FROM admin_staff_permission_overrides WHERE staff_id = ?', [staffId]);

  for (const item of overrides) {
    await dbPool.query(
      `INSERT INTO admin_staff_permission_overrides (id, staff_id, permission_key, effect)
       VALUES (?, ?, ?, ?)`,
      [randomUUID(), staffId, item.permission, item.effect]
    );
  }
}

export async function listAdminStaffAccounts() {
  const [rows] = await dbPool.query<AdminStaffRow[]>(
    `SELECT id, name, username, email, password_hash, role, status, notes, docs_access_json, last_login_at, created_at, updated_at
     FROM admin_staff_accounts
     ORDER BY created_at DESC`
  );

  const overridesByStaff = await listOverridesForStaffIds(rows.map((row) => row.id));
  return rows.map((row) => mapStaffRow(row, overridesByStaff.get(row.id) ?? []));
}

export async function findAdminStaffById(staffId: string, options?: { includePasswordHash?: boolean }) {
  const [rows] = await dbPool.query<AdminStaffRow[]>(
    `SELECT id, name, username, email, password_hash, role, status, notes, docs_access_json, last_login_at, created_at, updated_at
     FROM admin_staff_accounts
     WHERE id = ?
     LIMIT 1`,
    [staffId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const overridesByStaff = await listOverridesForStaffIds([row.id]);
  return mapStaffRow(row, overridesByStaff.get(row.id) ?? [], options?.includePasswordHash);
}

export async function findAdminStaffByEmail(email: string, options?: { includePasswordHash?: boolean }) {
  const normalizedEmail = email.trim().toLowerCase();
  const [rows] = await dbPool.query<AdminStaffRow[]>(
    `SELECT id, name, username, email, password_hash, role, status, notes, docs_access_json, last_login_at, created_at, updated_at
     FROM admin_staff_accounts
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  const overridesByStaff = await listOverridesForStaffIds([row.id]);
  return mapStaffRow(row, overridesByStaff.get(row.id) ?? [], options?.includePasswordHash);
}

export async function verifyAdminStaffCredentials(email: string, password: string) {
  const staff = await findAdminStaffByEmail(email, { includePasswordHash: true });
  if (!staff || staff.status !== 'active' || !staff.passwordHash) {
    return null;
  }

  const matches = await verifyPassword(password, staff.passwordHash);
  if (!matches) {
    return null;
  }

  return staff;
}

export async function createAdminStaffAccount(input: Partial<AdminStaffInput>) {
  const normalized = normalizeInput(input);
  if (!normalized.name || !normalized.username || !normalized.email || !normalized.password) {
    throw createAdminError('INVALID_ADMIN_STAFF', 'Name, username, email, and password are required.');
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(normalized.password);
  const docsAccessJson = JSON.stringify(normalized.docsAccess);

  try {
    await dbPool.query<ResultSetHeader>(
      `INSERT INTO admin_staff_accounts (
        id, name, username, email, password_hash, role, status, notes, docs_access_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        normalized.name,
        normalized.username,
        normalized.email,
        passwordHash,
        normalized.role,
        normalized.status,
        normalized.notes,
        docsAccessJson,
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Duplicate entry .*email|idx_admin_staff_accounts_email|for key 'email'/i.test(message)) {
      throw createAdminError('ADMIN_STAFF_EMAIL_EXISTS', 'That staff email already exists.');
    }
    if (/Duplicate entry .*username|idx_admin_staff_accounts_username|for key 'username'/i.test(message)) {
      throw createAdminError('ADMIN_STAFF_USERNAME_EXISTS', 'That staff username already exists.');
    }
    throw error;
  }

  await replaceOverrides(id, normalized.permissionOverrides);
  const created = await findAdminStaffById(id);
  if (!created) {
    throw createAdminError('ADMIN_STAFF_NOT_FOUND', 'The staff account could not be loaded after creation.');
  }

  return created;
}

export async function updateAdminStaffAccount(staffId: string, input: Partial<AdminStaffInput>) {
  const existing = await findAdminStaffById(staffId, { includePasswordHash: true });
  if (!existing) {
    throw createAdminError('ADMIN_STAFF_NOT_FOUND', 'The staff account was not found.');
  }

  const normalized = normalizeInput({
    name: input.name ?? existing.name,
    username: input.username ?? existing.username,
    email: input.email ?? existing.email,
    password: input.password ?? '',
    role: input.role ?? existing.role,
    status: input.status ?? existing.status,
    notes: input.notes ?? existing.notes,
    docsAccess: input.docsAccess ?? existing.docsAccess,
    permissionOverrides: input.permissionOverrides ?? existing.permissionOverrides,
  });

  if (!normalized.name || !normalized.username || !normalized.email) {
    throw createAdminError('INVALID_ADMIN_STAFF', 'Name, username, and email are required.');
  }

  const passwordHash =
    normalized.password && normalized.password.length > 0
      ? await hashPassword(normalized.password)
      : existing.passwordHash;

  try {
    await dbPool.query<ResultSetHeader>(
      `UPDATE admin_staff_accounts
       SET name = ?, username = ?, email = ?, password_hash = ?, role = ?, status = ?, notes = ?, docs_access_json = ?
       WHERE id = ?`,
      [
        normalized.name,
        normalized.username,
        normalized.email,
        passwordHash,
        normalized.role,
        normalized.status,
        normalized.notes,
        JSON.stringify(normalized.docsAccess),
        staffId,
      ]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Duplicate entry .*email|idx_admin_staff_accounts_email|for key 'email'/i.test(message)) {
      throw createAdminError('ADMIN_STAFF_EMAIL_EXISTS', 'That staff email already exists.');
    }
    if (/Duplicate entry .*username|idx_admin_staff_accounts_username|for key 'username'/i.test(message)) {
      throw createAdminError('ADMIN_STAFF_USERNAME_EXISTS', 'That staff username already exists.');
    }
    throw error;
  }

  await replaceOverrides(staffId, normalized.permissionOverrides);
  const updated = await findAdminStaffById(staffId);
  if (!updated) {
    throw createAdminError('ADMIN_STAFF_NOT_FOUND', 'The staff account could not be loaded after update.');
  }

  return updated;
}

export async function setAdminStaffStatus(staffId: string, status: AdminStaffStatus) {
  const [result] = await dbPool.query<ResultSetHeader>(
    `UPDATE admin_staff_accounts
     SET status = ?
     WHERE id = ?`,
    [status, staffId]
  );

  if (result.affectedRows === 0) {
    throw createAdminError('ADMIN_STAFF_NOT_FOUND', 'The staff account was not found.');
  }

  return findAdminStaffById(staffId);
}

export async function touchAdminStaffLogin(staffId: string) {
  await dbPool.query(
    `UPDATE admin_staff_accounts
     SET last_login_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [staffId]
  );
}

export async function createAdminAuditLog(input: {
  actorStaffId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await dbPool.query(
    `INSERT INTO admin_staff_audit_log (id, actor_staff_id, action, target_type, target_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      input.actorStaffId || null,
      input.action,
      input.targetType || null,
      input.targetId || null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}

