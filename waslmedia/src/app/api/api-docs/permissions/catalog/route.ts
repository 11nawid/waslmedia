import { NextResponse } from 'next/server';
import { getAdminPermissionsCatalog } from '@/server/services/admin';
import { requireAdminRoutePermission } from '@/server/http/admin-route-auth';

export async function GET() {
  const auth = await requireAdminRoutePermission();
  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(getAdminPermissionsCatalog());
}

