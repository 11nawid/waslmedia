import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getTrendingBootstrap } from '@/server/services/bootstrap';
import { TrendingPageClient } from '@/app/trending/trending-page-client';

export default async function TrendingPage() {
  await ensureDatabaseSetup();
  const bootstrap = await getTrendingBootstrap();
  return <TrendingPageClient initialPage={bootstrap.page} />;
}
