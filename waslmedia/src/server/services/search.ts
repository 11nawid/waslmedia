import type { SearchFilters } from '@/components/search-filter-dialog';
import type { SponsoredAd } from '@/lib/ads/types';
import { getPaginatedPublicChannelsByQuery } from '@/server/services/channels';
import { getEligibleSponsoredAds } from '@/server/services/ads';
import { getPaginatedSearchVideos } from '@/server/services/videos';
import { getAdsRuntimeConfig } from '@/server/utils/runtime-config';
import type { Channel, Video } from '@/lib/types';

export async function searchCatalog(
  query: string,
  filters: SearchFilters,
  options?: {
    limit?: number;
    offset?: number;
    viewerUserId?: string | null;
  }
): Promise<{
  items: (Video | Channel)[];
  total: number;
  limit: number;
  offset: number;
  ads: SponsoredAd[];
}> {
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 50));
  const offset = Math.max(0, options?.offset ?? 0);
  const adsConfig = getAdsRuntimeConfig();

  if (!query.trim()) {
    return {
      items: [],
      total: 0,
      limit,
      offset,
      ads: [],
    };
  }

  const [channelResult, videoResult] = await Promise.all([
    getPaginatedPublicChannelsByQuery(query, { limit, offset }),
    getPaginatedSearchVideos(query, filters, { limit, offset }),
  ]);

  const items =
    filters.type === 'channel'
      ? channelResult.channels
      : filters.type === 'video' || filters.type === 'film'
        ? videoResult.videos
        : [...channelResult.channels, ...videoResult.videos].slice(0, limit);

  const total =
    filters.type === 'channel'
      ? channelResult.pagination.total
      : filters.type === 'video' || filters.type === 'film'
        ? videoResult.pagination.total
        : channelResult.pagination.total + videoResult.pagination.total;
  const adSlots = Math.ceil(videoResult.videos.length / Math.max(adsConfig.searchInsertInterval, 1)) + 1;
  const ads = await getEligibleSponsoredAds({
    surface: 'search',
    limit: Math.max(adSlots, 1),
    viewerUserId: options?.viewerUserId || null,
  });

  return {
    items,
    total,
    limit,
    offset,
    ads,
  };
}
