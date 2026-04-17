import { mapVideo } from '@/server/mappers/content';
import {
  countVideoReturningViewers,
  countVideoUniqueViewers,
  listVideoDeviceTypeBreakdown,
  listVideoTrafficSourceBreakdown,
  listVideoViewerCountryBreakdown,
  listRecentVideoAnalyticsEvents,
  listVideoAnalyticsDaily,
  recordVideoAnalyticsDelta,
} from '@/server/repositories/video-analytics';
import { findVideoRowById } from '@/server/repositories/videos';
import {
  formatDeviceTypeLabel,
  formatTrafficSourceLabel,
  normalizeBreakdown,
} from '@/server/services/analytics-formatters';
import type { AnalyticsSeriesPoint, VideoAnalytics, VideoAnalyticsActivity } from '@/lib/analytics/types';

function toIsoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function createDateRange(start: Date, end: Date) {
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}

function mapActivityLabel(activity: VideoAnalyticsActivity) {
  const actor = activity.actorName || 'A viewer';
  const magnitude = Math.abs(activity.value);

  if (activity.type === 'view') {
    return magnitude > 1 ? `${magnitude} views were recorded` : `${actor} viewed this content`;
  }

  if (activity.type === 'comment') {
    return activity.value < 0 ? `${actor} removed a comment` : `${actor} commented on this content`;
  }

  if (activity.type === 'share') {
    return magnitude > 1 ? `${magnitude} share events were recorded` : `${actor} shared this content`;
  }

  if (activity.value < 0) {
    return `${actor} removed a ${activity.type}`;
  }

  return `${actor} left a ${activity.type}`;
}

export async function recordAnalyticsActivity(input: {
  videoId: string;
  actorUserId?: string | null;
  type: 'view' | 'like' | 'dislike' | 'comment' | 'share';
  value?: number;
  deltas: {
    views?: number;
    likes?: number;
    dislikes?: number;
    comments?: number;
    shares?: number;
  };
  trafficSource?: string | null;
  viewerCountry?: string | null;
  viewerKey?: string | null;
  deviceType?: string | null;
}) {
  await recordVideoAnalyticsDelta(input);
}

export async function getOwnedVideoAnalytics(userId: string, videoId: string, days = 28): Promise<VideoAnalytics | null> {
  const row = await findVideoRowById(videoId);
  if (!row || row.author_id !== userId) {
    return null;
  }

  const video = mapVideo(row);
  const [dailyRows, recentEventRows, uniqueViewers, returningViewers, rawTrafficSources, rawViewerCountries, rawDeviceTypes] = await Promise.all([
    listVideoAnalyticsDaily(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
    listRecentVideoAnalyticsEvents(videoId, 20),
    countVideoUniqueViewers(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
    countVideoReturningViewers(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
    listVideoTrafficSourceBreakdown(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
    listVideoViewerCountryBreakdown(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
    listVideoDeviceTypeBreakdown(videoId, days === Number.POSITIVE_INFINITY ? undefined : days),
  ]);

  const endDate = new Date();
  const startDate =
    days === Number.POSITIVE_INFINITY
      ? new Date(row.created_at instanceof Date ? row.created_at : new Date(row.created_at))
      : new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);

  const range = createDateRange(startDate, endDate);
  const byDate = new Map(
    dailyRows.map((item) => [
      toIsoDate(item.activity_date),
      {
        views: item.views_delta,
        likes: item.likes_delta,
        dislikes: item.dislikes_delta,
        comments: item.comments_delta,
        shares: item.shares_delta,
      },
    ])
  );

  const dailyMetrics: AnalyticsSeriesPoint[] = range.map((date) => ({
    date,
    views: Number(byDate.get(date)?.views || 0),
    likes: Number(byDate.get(date)?.likes || 0),
    dislikes: Number(byDate.get(date)?.dislikes || 0),
    comments: Number(byDate.get(date)?.comments || 0),
    shares: Number(byDate.get(date)?.shares || 0),
  }));

  const views = Math.max(video.viewCount, 1);
  const recentActivity: VideoAnalyticsActivity[] = recentEventRows.map((rowItem) => {
    const activity: VideoAnalyticsActivity = {
      id: rowItem.id,
      type: rowItem.event_type,
      value: Number(rowItem.event_value || 0),
      createdAt: String(rowItem.created_at),
      actorName: rowItem.actor_name || 'A viewer',
      actorImageUrl: rowItem.actor_image_url || null,
      label: '',
    };

    activity.label = mapActivityLabel(activity);
    return activity;
  });

  return {
    range: {
      days: Number.isFinite(days) ? Math.max(1, Math.ceil(days)) : Number.POSITIVE_INFINITY,
      label: Number.isFinite(days) ? `Last ${Math.max(1, Math.ceil(days))} days` : 'Lifetime',
    },
    video,
    totals: {
      views: video.viewCount,
      likes: video.likes,
      dislikes: video.dislikes,
      comments: video.commentCount,
      shares: video.shareCount,
    },
    uniqueViewers,
    returningViewers,
    rates: {
      likeRate: roundRate((video.likes / views) * 100),
      dislikeRate: roundRate((video.dislikes / views) * 100),
      commentRate: roundRate((video.commentCount / views) * 100),
      shareRate: roundRate((video.shareCount / views) * 100),
      engagementRate: roundRate(((video.likes + video.commentCount + video.shareCount) / views) * 100),
    },
    dailyMetrics,
    trafficSources: normalizeBreakdown(rawTrafficSources, formatTrafficSourceLabel),
    viewerCountries: normalizeBreakdown(rawViewerCountries),
    deviceTypes: normalizeBreakdown(rawDeviceTypes, formatDeviceTypeLabel),
    recentActivity,
  };
}
