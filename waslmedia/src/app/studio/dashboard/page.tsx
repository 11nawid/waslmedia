import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getStudioDashboardBootstrap } from '@/server/services/bootstrap';
import { DashboardPageClient } from '@/app/studio/dashboard/dashboard-page-client';

export default async function DashboardPage() {
  await ensureDatabaseSetup();
  const bootstrap = await getStudioDashboardBootstrap();

  if (!bootstrap) {
    redirect('/login');
  }

  return <DashboardPageClient initialPage={bootstrap.page} />;
}
