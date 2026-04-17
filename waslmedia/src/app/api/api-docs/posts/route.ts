import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { getAdminSectionData } from '@/server/services/admin';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'view_posts');
  if (auth.response) {
    return auth.response;
  }

  const query = request.nextUrl.searchParams.get('q') || '';
  return NextResponse.json(await getAdminSectionData('posts', query));
}

