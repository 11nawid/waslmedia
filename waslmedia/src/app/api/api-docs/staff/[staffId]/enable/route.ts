import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { setStaffStatusAsAdmin } from '@/server/services/admin';

type RouteContext = {
  params: Promise<{ staffId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'manage_staff');
  if (auth.response) {
    return auth.response;
  }

  const { staffId } = await context.params;
  const staff = await setStaffStatusAsAdmin(auth.viewer, staffId, 'active');
  return NextResponse.json({ staff });
}

