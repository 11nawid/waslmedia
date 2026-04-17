import type { AnalyticsBreakdownItem } from '@/lib/analytics/types';

const trafficSourceLabels: Record<string, string> = {
  home: 'Home feed',
  search: 'Waslmedia search',
  channel: 'Channel pages',
  watch: 'Watch page',
  'watch-recommendation': 'Suggested videos',
  subscriptions: 'Subscriptions',
  history: 'History',
  liked: 'Liked videos',
  'watch-later': 'Watch later',
  playlist: 'Playlists',
  shorts: 'Shorts feed',
  share: 'Shared links',
  external: 'External links',
  direct_or_unknown: 'Direct or unknown',
};

const deviceTypeLabels: Record<string, string> = {
  mobile_phone: 'Mobile phone',
  tablet: 'Tablet',
  computer: 'Computer',
};

export function formatTrafficSourceLabel(source: string) {
  return trafficSourceLabels[source] || source.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDeviceTypeLabel(deviceType: string) {
  return deviceTypeLabels[deviceType] || deviceType.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeBreakdown(
  items: Array<{ label: string; value: number }>,
  labelFormatter?: (label: string) => string
): AnalyticsBreakdownItem[] {
  return items
    .map((item) => ({
      label: labelFormatter ? labelFormatter(item.label) : item.label,
      value: Number(item.value || 0),
    }))
    .filter((item) => item.value > 0);
}
