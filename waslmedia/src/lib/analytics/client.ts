import { apiGet } from '@/lib/api/client';
import type { ChannelAnalytics, VideoAnalytics } from './types';
import { subscribeToSignedRealtimeScope } from '@/lib/realtime/client';

export function subscribeToAnalyticsScope(scope: string, onReload: () => void) {
  return subscribeToSignedRealtimeScope(scope, 'analytics.updated', onReload);
}

export async function fetchChannelAnalytics(userId: string, days?: string | number) {
  const params = new URLSearchParams();
  if (days) {
    params.set('days', String(days));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiGet<{ analytics: ChannelAnalytics }>(`/api/analytics/channel/${userId}${suffix}`);
  return payload.analytics;
}

export async function fetchVideoAnalytics(videoId: string, days?: string | number) {
  const params = new URLSearchParams();
  if (days) {
    params.set('days', String(days));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiGet<{ analytics: VideoAnalytics }>(
    `/api/analytics/video/${encodeURIComponent(videoId)}${suffix}`
  );
  return payload.analytics;
}
