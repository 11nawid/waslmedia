import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import type { SearchFilters } from '@/components/search-filter-dialog';
import { searchCatalog } from '@/server/services/search';
import { getCurrentAuthUser } from '@/server/services/auth';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const viewer = await getCurrentAuthUser();
  const query = request.nextUrl.searchParams.get('q') || '';
  const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') || 20), 50));
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset') || 0));

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const filters: SearchFilters = {
    uploadDate: (request.nextUrl.searchParams.get('uploadDate') as SearchFilters['uploadDate']) || 'anytime',
    type: (request.nextUrl.searchParams.get('type') as SearchFilters['type']) || 'all',
    duration: (request.nextUrl.searchParams.get('duration') as SearchFilters['duration']) || 'any',
    sortBy: (request.nextUrl.searchParams.get('sortBy') as SearchFilters['sortBy']) || 'relevance',
  };

  const { items, total, ads } = await searchCatalog(query, filters, {
    limit,
    offset,
    viewerUserId: viewer?.id || null,
  });

  return NextResponse.json({
    items,
    results: items,
    ads,
    pagination: {
      total,
      limit,
      offset,
      count: items.length,
      hasNextPage: offset + items.length < total,
      hasPreviousPage: offset > 0,
    },
  });
}
