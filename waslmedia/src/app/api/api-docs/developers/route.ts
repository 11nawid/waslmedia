import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import {
  createStaffAccountAsAdmin,
  listAdminStaffAccounts,
  setStaffStatusAsAdmin,
  updateStaffAccountAsAdmin,
} from '@/server/services/admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'view_staff');
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ developers: await listAdminStaffAccounts() });
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const developer = await createStaffAccountAsAdmin(auth.viewer, body ?? {});
  return NextResponse.json({ developer }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const developer = await updateStaffAccountAsAdmin(auth.viewer, id, body ?? {});
  return NextResponse.json({ developer });
}

export async function DELETE(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  await setStaffStatusAsAdmin(auth.viewer, id, 'disabled');
  return NextResponse.json({ ok: true });
}
