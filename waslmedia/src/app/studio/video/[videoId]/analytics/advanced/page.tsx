import { VideoAnalyticsAdvanced } from '@/components/studio/video-analytics-advanced';

type PageProps = {
  searchParams: Promise<{ report?: string }>;
};

export default async function VideoAnalyticsAdvancedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <VideoAnalyticsAdvanced initialReport={params.report} />;
}
