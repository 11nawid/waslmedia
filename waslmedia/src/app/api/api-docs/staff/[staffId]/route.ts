import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { updateStaffAccountAsAdmin } from '@/server/services/admin';

type RouteContext = {
  params: Promise<{ staffId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const { staffId } = await context.params;

  try {
    const staff = await updateStaffAccountAsAdmin(auth.viewer, staffId, body ?? {});
    return NextResponse.json({ staff });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the staff account.';
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: code, message }, { status: code === 'ADMIN_PERMISSION_DENIED' ? 403 : 400 });
  }
}

