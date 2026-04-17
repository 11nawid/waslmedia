import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermission } from '@/server/http/admin-route-auth';
import { getAdminDashboardPayload } from '@/server/services/admin';

export async function GET() {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermission('view_dashboard');
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(await getAdminDashboardPayload());
}

