import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AdminPermission, AdminViewer } from '@/lib/admin/types';
import { readApiDocsSessionFromCookieStore, readApiDocsSessionFromRequest } from '@/server/utils/api-docs-auth';
import { isInternalToolsEnabled } from '@/server/utils/runtime-config';
import { hasAdminPermission, resolveAdminViewer } from '@/server/services/admin';

type RequireAdminResult =
  | { viewer: AdminViewer; response?: never }
  | { response: NextResponse; viewer?: never };

function notFoundResponse() {
  return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}

export async function requireAdminRoutePermission(permission?: AdminPermission): Promise<RequireAdminResult> {
  if (!isInternalToolsEnabled()) {
    return { response: notFoundResponse() };
  }

  const session = await readApiDocsSessionFromCookieStore();
  const viewer = await resolveAdminViewer(session);
  if (!viewer) {
    return { response: unauthorizedResponse() };
  }

  if (permission && !hasAdminPermission(viewer.permissions, permission)) {
    return { response: forbiddenResponse() };
  }

  return { viewer };
}

export async function requireAdminRoutePermissionFromRequest(
  request: NextRequest,
  permission?: AdminPermission
): Promise<RequireAdminResult> {
  if (!isInternalToolsEnabled()) {
    return { response: notFoundResponse() };
  }

  const session = readApiDocsSessionFromRequest(request);
  const viewer = await resolveAdminViewer(session);
  if (!viewer) {
    return { response: unauthorizedResponse() };
  }

  if (permission && !hasAdminPermission(viewer.permissions, permission)) {
    return { response: forbiddenResponse() };
  }

  return { viewer };
}
