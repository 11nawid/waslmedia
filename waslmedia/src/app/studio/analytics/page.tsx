import { ChannelAnalyticsDashboard } from '@/components/studio/channel-analytics-dashboard';
import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getStudioAnalyticsBootstrap } from '@/server/services/bootstrap';

export default async function AnalyticsPage() {
  await ensureDatabaseSetup();
  const bootstrap = await getStudioAnalyticsBootstrap(28);

  if (!bootstrap) {
    redirect('/login');
  }

  return <ChannelAnalyticsDashboard initialAnalytics={bootstrap.page.analytics} initialDays={bootstrap.page.days} />;
}
