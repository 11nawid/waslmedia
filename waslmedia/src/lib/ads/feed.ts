import type { SponsoredAd, SponsoredFeedEntry, SponsoredFeedInsertResult } from '@/lib/ads/types';

export const ADS_SYNC_EVENT = 'waslmedia:ads-sync';

export function insertSponsoredAds<TItem>(
  items: TItem[],
  ads: SponsoredAd[],
  interval: number,
  includeFirstSlot = true
): SponsoredFeedInsertResult<TItem> {
  if (items.length === 0) {
    return {
      primaryAd: includeFirstSlot ? ads[0] ?? null : null,
      entries: [],
    };
  }

  const remainingAds = includeFirstSlot ? ads.slice(1) : ads.slice();
  const entries: SponsoredFeedEntry<TItem>[] = [];
  let adIndex = 0;

  items.forEach((item, index) => {
    entries.push({
      type: 'item',
      item,
      ad: null as never,
    });

    const organicCount = index + 1;
    const shouldInsertAd = interval > 0 && organicCount % interval === 0 && adIndex < remainingAds.length;
    if (shouldInsertAd) {
      entries.push({
        type: 'ad',
        item: null as never,
        ad: remainingAds[adIndex],
      });
      adIndex += 1;
    }
  });

  return {
    primaryAd: includeFirstSlot ? ads[0] ?? null : null,
    entries,
  };
}
