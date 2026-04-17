import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { createStaffAccountAsAdmin, listAdminStaffAccounts } from '@/server/services/admin';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'view_staff');
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ staff: await listAdminStaffAccounts() });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);

  try {
    const staff = await createStaffAccountAsAdmin(auth.viewer, body ?? {});
    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create the staff account.';
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: code, message }, { status: code === 'ADMIN_PERMISSION_DENIED' ? 403 : 400 });
  }
}

