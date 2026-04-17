import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getStudioLibraryBootstrap } from '@/server/services/bootstrap';
import { AudioLibraryPageClient } from '@/app/studio/library/library-page-client';

export default async function AudioLibraryPage() {
  await ensureDatabaseSetup();
  const bootstrap = await getStudioLibraryBootstrap();

  if (!bootstrap) {
    redirect('/login');
  }

  return <AudioLibraryPageClient initialTracks={bootstrap.page.tracks} hasInitialData />;
}
