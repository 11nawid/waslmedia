'use client';

import { useCallback, useState } from 'react';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LiveCounterModal } from '@/components/live-counter-modal';
import { RecentSubscribersDialog } from '@/components/studio/dashboard/recent-subscribers-dialog';
import { EmptyState } from '@/components/empty-state';
import { Clapperboard } from 'lucide-react';
import { LatestVideoCard } from '@/components/studio/dashboard/latest-video-card';
import { AnalyticsSummaryCard } from '@/components/studio/dashboard/analytics-summary-card';
import { RecentSubscribersCard } from '@/components/studio/dashboard/recent-subscribers-card';
import { LatestCommentsCard } from '@/components/studio/dashboard/latest-comments-card';
import { PerformanceInsightsCard } from '@/components/studio/dashboard/performance-insights-card';
import { ChannelRecommendationsCard } from '@/components/studio/dashboard/channel-recommendations-card';
import type { StudioDashboardBootstrapPage } from '@/lib/studio/bootstrap-types';
import { getStudioBootstrap } from '@/lib/studio/client';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
      <div className="space-y-4">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

function MobileDashboard({ data }: { data: StudioDashboardBootstrapPage['dashboard'] }) {
  const { channel, analytics, latestVideo, latestComments, recentSubscribers } = data;
  const { onOpen } = useUploadDialog();

  return (
    <div className="space-y-6 p-0 md:p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={channel?.profilePictureUrl} />
          <AvatarFallback>{channel?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{channel?.name}</h1>
          <p className="text-muted-foreground">{channel?.subscriberCount} Total subscribers</p>
        </div>
      </div>

      {latestVideo ? (
        <LatestVideoCard video={latestVideo} />
      ) : (
        <EmptyState
          icon={Clapperboard}
          title="No videos uploaded yet"
          description="Upload your first video to start tracking performance, comments, and audience activity here."
          actionLabel="Upload video"
          onAction={() => onOpen()}
          compact
          className="max-w-none"
        />
      )}

      <AnalyticsSummaryCard analytics={analytics} />
      <LatestCommentsCard comments={latestComments} />
      <RecentSubscribersCard subscribers={recentSubscribers} />
      <PerformanceInsightsCard analytics={analytics} />
      <ChannelRecommendationsCard analytics={analytics} latestVideo={latestVideo} latestComments={latestComments} />
    </div>
  );
}

export function DashboardPageClient({ initialPage }: { initialPage: StudioDashboardBootstrapPage }) {
  const { onOpen } = useUploadDialog();
  const [data, setData] = useState(initialPage.dashboard);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const refreshDashboard = useCallback(() => {
    setLoading(true);
    getStudioBootstrap<StudioDashboardBootstrapPage>('dashboard')
      .then((bootstrap) => {
        setData(bootstrap.page.dashboard);
      })
      .catch((error) => {
        console.error('Failed to refresh studio dashboard', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useStudioRealtimeEvent('analytics.updated', refreshDashboard);
  useStudioRealtimeEvent('videos.updated', refreshDashboard);
  useStudioRealtimeEvent('posts.updated', refreshDashboard);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return <div className="text-foreground">Could not load dashboard data.</div>;
  }

  const { latestVideo, analytics, latestComments, recentSubscribers } = data;

  if (isMobile) {
    return (
      <>
        <LiveCounterModal />
        <RecentSubscribersDialog />
        <MobileDashboard data={data} />
      </>
    );
  }

  return (
    <div className="text-foreground">
      <LiveCounterModal />
      <RecentSubscribersDialog />
      <h1 className="mb-6 text-2xl font-bold">Channel dashboard</h1>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
        <div className="space-y-4">
          {latestVideo ? (
            <LatestVideoCard video={latestVideo} />
          ) : (
            <EmptyState
              icon={Clapperboard}
              title="No videos uploaded yet"
              description="Upload your first video to see its performance, comments, and audience activity here."
              actionLabel="Upload video"
              onAction={() => onOpen()}
              compact
              className="max-w-none"
            />
          )}
          <RecentSubscribersCard subscribers={recentSubscribers} />
        </div>
        <div className="space-y-4">
          <AnalyticsSummaryCard analytics={analytics} />
          <PerformanceInsightsCard analytics={analytics} />
        </div>
        <div className="space-y-4">
          <LatestCommentsCard comments={latestComments} />
          <ChannelRecommendationsCard analytics={analytics} latestVideo={latestVideo} latestComments={latestComments} />
        </div>
      </div>
    </div>
  );
}
