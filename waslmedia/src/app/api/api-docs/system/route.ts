import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { listAdminSystemSummary } from '@/server/services/admin';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'view_system');
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(await listAdminSystemSummary());
}
