import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import {
  getStudioAnalyticsBootstrap,
  getStudioCommunityBootstrap,
  getStudioDashboardBootstrap,
  getStudioLibraryBootstrap,
  getStudioUploadBootstrap,
} from '@/server/services/bootstrap';

type RouteContext = {
  params: Promise<{ surface: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  await ensureDatabaseSetup();
  const { surface } = await context.params;
  const { searchParams } = new URL(request.url);

  const bootstrap =
    surface === 'dashboard'
      ? await getStudioDashboardBootstrap()
      : surface === 'analytics'
        ? await getStudioAnalyticsBootstrap(
            searchParams.get('days') === 'lifetime'
              ? 3650
              : Math.max(Number.parseInt(searchParams.get('days') || '28', 10) || 28, 1)
          )
        : surface === 'upload'
          ? await getStudioUploadBootstrap({
              tab: searchParams.get('tab'),
              page: searchParams.get('page'),
              limit: searchParams.get('limit'),
              search: searchParams.get('search'),
              visibility: searchParams.get('visibility'),
              audience: searchParams.get('audience'),
              sortBy: searchParams.get('sortBy'),
            })
          : surface === 'community'
            ? await getStudioCommunityBootstrap({
                tab: searchParams.get('tab'),
              })
            : surface === 'library'
              ? await getStudioLibraryBootstrap()
              : null;

  if (!bootstrap) {
    return NextResponse.json({ error: surface ? 'UNAUTHORIZED_OR_SURFACE_NOT_FOUND' : 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json(bootstrap);
}
