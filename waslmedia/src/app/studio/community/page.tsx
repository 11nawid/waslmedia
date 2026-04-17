import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getStudioCommunityBootstrap } from '@/server/services/bootstrap';
import { CommunityPageClient } from './community-page-client';

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureDatabaseSetup();
  const resolvedSearchParams = (await searchParams) || {};
  const rawTab = resolvedSearchParams.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const bootstrap = await getStudioCommunityBootstrap({ tab });

  if (!bootstrap || !bootstrap.viewer) {
    redirect('/login');
  }

  return <CommunityPageClient currentUser={bootstrap.viewer} initialPage={bootstrap.page} />;
}
