import type { Video } from '@/lib/types';

export interface AnalyticsSeriesPoint {
  date: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
}

export interface AnalyticsBreakdownItem {
  label: string;
  value: number;
}

export interface AnalyticsDateRange {
  days: number;
  label: string;
}

export interface VideoAnalyticsActivity {
  id: string;
  type: 'view' | 'like' | 'dislike' | 'comment' | 'share';
  value: number;
  createdAt: string;
  actorName: string;
  actorImageUrl: string | null;
  label: string;
}

export interface ChannelAnalytics {
  range: AnalyticsDateRange;
  totalViews: number;
  totalShares: number;
  totalSubscribers: number;
  totalVideos: number;
  viewsLast48Hours: number;
  uniqueViewers: number;
  returningViewers: number;
  newViewers: number;
  dailyMetrics: AnalyticsSeriesPoint[];
  trafficSources: AnalyticsBreakdownItem[];
  subscriberSources: AnalyticsBreakdownItem[];
  viewerCountries: AnalyticsBreakdownItem[];
  subscriberCountries: AnalyticsBreakdownItem[];
  deviceTypes: AnalyticsBreakdownItem[];
  formatViews: AnalyticsBreakdownItem[];
  videos: Video[];
  latestComments: import('@/lib/types').Comment[];
  recentSubscribers: import('@/lib/types').Channel[];
  subscriberHistory: { date: string; count: number; change?: number }[];
  channel: import('@/lib/types').Channel | null;
}

export interface VideoAnalytics {
  range: AnalyticsDateRange;
  video: Video;
  totals: {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
  };
  uniqueViewers: number;
  returningViewers: number;
  rates: {
    likeRate: number;
    dislikeRate: number;
    commentRate: number;
    shareRate: number;
    engagementRate: number;
  };
  dailyMetrics: AnalyticsSeriesPoint[];
  trafficSources: AnalyticsBreakdownItem[];
  viewerCountries: AnalyticsBreakdownItem[];
  deviceTypes: AnalyticsBreakdownItem[];
  recentActivity: VideoAnalyticsActivity[];
}
