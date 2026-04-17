import { mapChannel } from '@/server/mappers/content';
import { findChannelSettingsByUserId } from '@/server/repositories/channel-settings';
import {
  listRecentSubscribers,
  listSubscriberCountryBreakdown,
  listSubscriberSourceBreakdown,
} from '@/server/repositories/engagement-analytics';
import { listSubscriptionHistory } from '@/server/repositories/subscription-history';
import {
  countAuthorReturningViewers,
  countAuthorUniqueViewers,
  listAuthorDeviceTypeBreakdown,
  listAuthorFormatViewBreakdown,
  listAuthorTrafficSourceBreakdown,
  listAuthorVideoAnalyticsDaily,
  listAuthorViewerCountryBreakdown,
} from '@/server/repositories/video-analytics';
import { getCommentsForUserVideos } from '@/server/services/comments';
import {
  formatDeviceTypeLabel,
  formatTrafficSourceLabel,
  normalizeBreakdown,
} from '@/server/services/analytics-formatters';
import { getVideosByAuthorId } from '@/server/services/videos';
import type { AnalyticsSeriesPoint, ChannelAnalytics } from '@/lib/analytics/types';

function toIsoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function createDateRange(days: number) {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function getChannelAnalytics(userId: string, days = 28): Promise<ChannelAnalytics> {
  const normalizedDays = Number.isFinite(days) ? Math.max(1, Math.ceil(days)) : 28;
  const [videos, latestComments, recentSubscribers, channelRow, dailyRows, uniqueViewers, returningViewers, rawTrafficSources, rawViewerCountries, rawDeviceTypes, rawSubscriberCountries, rawSubscriberSources, rawFormatViews] = await Promise.all([
    getVideosByAuthorId(userId, { publicOnly: true }),
    getCommentsForUserVideos(userId),
    listRecentSubscribers(userId, 10),
    findChannelSettingsByUserId(userId),
    listAuthorVideoAnalyticsDaily(userId, normalizedDays),
    countAuthorUniqueViewers(userId, normalizedDays),
    countAuthorReturningViewers(userId, normalizedDays),
    listAuthorTrafficSourceBreakdown(userId, normalizedDays),
    listAuthorViewerCountryBreakdown(userId, normalizedDays),
    listAuthorDeviceTypeBreakdown(userId, normalizedDays),
    listSubscriberCountryBreakdown(userId, normalizedDays),
    listSubscriberSourceBreakdown(userId, normalizedDays),
    listAuthorFormatViewBreakdown(userId, normalizedDays),
  ]);
  const subscriberHistory = await listSubscriptionHistory(userId, normalizedDays, channelRow?.subscriber_count || 0);

  const totalViews = videos.reduce((sum, video) => sum + video.viewCount, 0);
  const totalShares = videos.reduce((sum, video) => sum + (video.shareCount || 0), 0);
  const totalSubscribers = channelRow?.subscriber_count || 0;
  const byDate = new Map(
    dailyRows.map((row) => [
      toIsoDate(row.activity_date),
      {
        views: row.views_delta,
        likes: row.likes_delta,
        dislikes: row.dislikes_delta,
        comments: row.comments_delta,
        shares: row.shares_delta,
      },
    ])
  );
  const dailyMetrics: AnalyticsSeriesPoint[] = createDateRange(normalizedDays).map((date) => ({
    date,
    views: Number(byDate.get(date)?.views || 0),
    likes: Number(byDate.get(date)?.likes || 0),
    dislikes: Number(byDate.get(date)?.dislikes || 0),
    comments: Number(byDate.get(date)?.comments || 0),
    shares: Number(byDate.get(date)?.shares || 0),
  }));
  const viewsLast48Hours = dailyMetrics.slice(-2).reduce((sum, point) => sum + point.views, 0);
  const newViewers = Math.max(uniqueViewers - returningViewers, 0);

  return {
    range: {
      days: normalizedDays,
      label: normalizedDays >= 3650 ? 'Lifetime' : `Last ${normalizedDays} days`,
    },
    totalViews,
    totalShares,
    totalSubscribers,
    totalVideos: videos.length,
    viewsLast48Hours,
    uniqueViewers,
    returningViewers,
    newViewers,
    dailyMetrics,
    trafficSources: normalizeBreakdown(rawTrafficSources, formatTrafficSourceLabel),
    subscriberSources: normalizeBreakdown(rawSubscriberSources, formatTrafficSourceLabel),
    viewerCountries: normalizeBreakdown(rawViewerCountries),
    subscriberCountries: normalizeBreakdown(rawSubscriberCountries),
    deviceTypes: normalizeBreakdown(rawDeviceTypes, formatDeviceTypeLabel),
    formatViews: normalizeBreakdown(rawFormatViews),
    videos,
    latestComments: latestComments.slice(0, 3),
    recentSubscribers,
    subscriberHistory,
    channel: channelRow ? mapChannel(channelRow, { videos, totalViews }) : null,
  };
}
