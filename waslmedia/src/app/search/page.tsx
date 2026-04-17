import type { Metadata } from 'next';
import SearchPageClient from './search-page-client';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import type { SearchFilters } from '@/components/search-filter-dialog';
import { buildNoIndexMetadata } from '@/lib/seo';
import { searchCatalog } from '@/server/services/search';
import { getCurrentAuthUser } from '@/server/services/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Search | Waslmedia',
  description: 'Search results on Waslmedia.',
});

function resolveSearchFilters(searchParams?: Record<string, string | string[] | undefined>): SearchFilters {
  const getValue = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    sortBy: (getValue('sortBy') as SearchFilters['sortBy']) || 'relevance',
    uploadDate: (getValue('uploadDate') as SearchFilters['uploadDate']) || 'anytime',
    type: (getValue('type') as SearchFilters['type']) || 'all',
    duration: (getValue('duration') as SearchFilters['duration']) || 'any',
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureDatabaseSetup();
  const viewer = await getCurrentAuthUser();

  const resolvedSearchParams = (await searchParams) || {};
  const rawQuery = resolvedSearchParams.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery) || '';
  const filters = resolveSearchFilters(resolvedSearchParams);
  const { items, ads } = await searchCatalog(query, filters, {
    limit: 20,
    offset: 0,
    viewerUserId: viewer?.id || null,
  });

  return (
    <SearchPageClient
      initialQuery={query}
      initialFilters={filters}
      initialResults={items}
      initialAds={ads}
      initialLoaded={true}
    />
  );
}
