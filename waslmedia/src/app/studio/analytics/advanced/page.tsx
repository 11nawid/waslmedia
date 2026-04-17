import { ChannelAnalyticsAdvanced } from '@/components/studio/channel-analytics-advanced';

type PageProps = {
  searchParams: Promise<{ report?: string }>;
};

export default async function StudioAnalyticsAdvancedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <ChannelAnalyticsAdvanced initialReport={params.report} />;
}
