import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getStudioUploadBootstrap } from '@/server/services/bootstrap';
import { UploadPageClient } from '@/app/studio/upload/upload-page-client';

type UploadPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentPage({ searchParams }: UploadPageProps) {
  await ensureDatabaseSetup();
  const resolvedSearchParams = (await searchParams) || {};
  const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  const bootstrap = await getStudioUploadBootstrap({
    tab: firstValue(resolvedSearchParams.tab),
    page: firstValue(resolvedSearchParams.page),
    limit: firstValue(resolvedSearchParams.limit),
    search: firstValue(resolvedSearchParams.search),
    visibility: firstValue(resolvedSearchParams.visibility),
    audience: firstValue(resolvedSearchParams.audience),
    sortBy: firstValue(resolvedSearchParams.sortBy),
  });

  if (!bootstrap) {
    redirect('/login');
  }

  return <UploadPageClient initialPage={bootstrap.page} />;
}
