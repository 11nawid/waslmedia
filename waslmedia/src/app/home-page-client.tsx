'use client';

import { VideoCard } from '@/components/video-card';
import { Search, Compass } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { HomeBootstrapPage, Video } from '@/lib/types';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useLocationStore } from '@/hooks/use-location-store';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref } from '@/lib/video-links';
import { SponsoredAdCard } from '@/components/sponsored-ad-card';
import { insertSponsoredAds } from '@/lib/ads/feed';
import type { SponsoredFeedEntry } from '@/lib/ads/types';
import { useDismissedFeedItems } from '@/hooks/use-dismissed-feed-items';

function ShortsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.13 8.32a3.38 3.38 0 0 0-3.26 4.34l3.26-4.34Z" />
      <path d="M16.57 5.05a3.38 3.38 0 0 0-4.34 3.27l4.34-3.27Z" />
      <path d="M7.43 18.95a3.38 3.38 0 0 0 4.34-3.27l-4.34 3.27Z" />
      <path d="m14 14-4 2" />
      <path d="M8.87 15.68a3.38 3.38 0 0 0 3.26-4.34l-3.26 4.34Z" />
      <path d="M17.66 11.98A3.38 3.38 0 0 0 16 7.43l-2 4.55" />
      <path d="M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function ShortsCard({ video }: { video: Video }) {
  return (
    <Link href={buildVideoHref(video)} className="block group">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-secondary">
        <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="(max-width: 1024px) 33vw, 220px" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 text-white">
          <p className="line-clamp-2 text-sm font-semibold">{video.title}</p>
          <p className="text-xs text-white/80">{video.viewCount.toLocaleString()} views</p>
        </div>
      </div>
    </Link>
  );
}

function ShortsSection({ shorts }: { shorts: Video[] }) {
  if (shorts.length === 0) return null;
  return (
    <div className="border-t py-8">
      <div className="mb-4 flex items-center gap-2">
        <ShortsIcon className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-bold">Shorts</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shorts.slice(0, 6).map((short) => (
          <ShortsCard key={short.id} video={short} />
        ))}
      </div>
    </div>
  );
}

function splitFeedEntriesByVideoCount(entries: SponsoredFeedEntry<Video>[], firstVideoCount: number) {
  const first: SponsoredFeedEntry<Video>[] = [];
  const second: SponsoredFeedEntry<Video>[] = [];
  let seenVideos = 0;

  for (const entry of entries) {
    if (seenVideos < firstVideoCount) {
      first.push(entry);
      if (entry.type === 'item') {
        seenVideos += 1;
      }
    } else {
      second.push(entry);
    }
  }

  return [first, second] as const;
}

function HomeFeedBlock({
  entries,
  isMobile,
  onDismissVideo,
  onDismissAd,
}: {
  entries: SponsoredFeedEntry<Video>[];
  isMobile: boolean;
  onDismissVideo: (videoId: string) => void;
  onDismissAd: (adId: string) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  const wrapperClass = isMobile
    ? 'flex flex-col'
    : 'grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] 2xl:[grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]';

  return (
    <div className={wrapperClass}>
      {entries.map((entry) =>
        entry.type === 'ad' ? (
          <div key={entry.ad.id}>
            <SponsoredAdCard ad={entry.ad} layout="home" onDismiss={onDismissAd} />
          </div>
        ) : (
          <VideoCard key={entry.item.id} video={entry.item} variant={isMobile ? 'mobile' : 'default'} onDismiss={onDismissVideo} />
        )
      )}
    </div>
  );
}

export function HomePageClient({ initialPage }: { initialPage: HomeBootstrapPage }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const { location, isLocationDefault } = useLocationStore();
  const isMobile = useIsMobile();
  const scrollDirection = useScrollDirection('main-content');
  const { dismissedAdIds, dismissedVideoIds, dismissAd, dismissVideo } = useDismissedFeedItems();
  const allContent = useMemo(
    () => [...initialPage.items, ...initialPage.shorts],
    [initialPage.items, initialPage.shorts]
  );

  const { videos, shorts } = useMemo(() => {
    let filteredContent = allContent;

    if (!isLocationDefault) {
      filteredContent = filteredContent.filter((video) => video.location === location);
    }

    if (activeCategory !== 'All') {
      filteredContent = filteredContent.filter((video) => video.category === activeCategory);
    }

    filteredContent = filteredContent.filter((video) => !dismissedVideoIds.includes(video.id));

    return {
      videos: filteredContent.filter((video) => video.category !== 'Shorts'),
      shorts: initialPage.shorts.filter((video) => !dismissedVideoIds.includes(video.id)),
    };
  }, [activeCategory, allContent, dismissedVideoIds, initialPage.shorts, isLocationDefault, location]);

  const availableAds = useMemo(
    () => initialPage.sponsoredAds.filter((ad) => !dismissedAdIds.includes(ad.id)),
    [dismissedAdIds, initialPage.sponsoredAds]
  );
  const { primaryAd: primaryHomeAd, entries: sponsoredVideoEntries } = useMemo(
    () => insertSponsoredAds(videos, availableAds, 12, true),
    [availableAds, videos]
  );
  const hasHomeFeedContent = Boolean(primaryHomeAd) || sponsoredVideoEntries.length > 0;
  const [videosFirstHalf, videosSecondHalf] = useMemo(
    () => splitFeedEntriesByVideoCount(sponsoredVideoEntries, 8),
    [sponsoredVideoEntries]
  );

  return (
    <div className="flex h-screen flex-col">
      <div
        className={cn(
          'sticky top-0 z-50 bg-background transition-transform duration-300',
          isMobile && scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
        )}
      >
        <Header />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-y-auto no-scrollbar transition-[margin] duration-300',
            isMobile && scrollDirection === 'down' ? '-mt-16' : 'mt-0'
          )}
        >
          <div
            className={cn(
              'sticky top-0 z-[45] border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'
            )}
          >
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2 md:gap-3 md:px-6 md:py-3">
              <Button asChild variant="secondary" className="h-10 shrink-0 rounded-full border border-border/60 bg-secondary/70 px-4 shadow-sm">
                <Link href="/trending">
                  <Compass />
                </Link>
              </Button>
              {initialPage.categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'primary' : 'secondary'}
                  className={cn(
                    'h-10 shrink-0 rounded-full border px-4 font-medium shadow-sm transition-all',
                    activeCategory === category
                      ? 'border-primary/80 bg-primary text-primary-foreground'
                      : 'border-border/60 bg-secondary/70 text-secondary-foreground hover:bg-secondary'
                  )}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative z-0 md:px-6">
            {!isLocationDefault && !isMobile ? (
              <div className="pt-4 text-center text-sm text-muted-foreground">
                Showing content for: <span className="font-semibold text-foreground">{location}</span>
              </div>
            ) : null}
            <div className="pb-16 md:pb-20">
              {primaryHomeAd ? (
                <div className={cn(Boolean(isMobile) ? 'pb-4' : 'grid max-w-[420px] pb-6 pt-4')}>
                  <SponsoredAdCard ad={primaryHomeAd} layout="home" onDismiss={dismissAd} />
                </div>
              ) : null}
              {hasHomeFeedContent ? (
                <>
                  <HomeFeedBlock entries={videosFirstHalf} isMobile={Boolean(isMobile)} onDismissVideo={dismissVideo} onDismissAd={dismissAd} />
                  {!Boolean(isMobile) ? <ShortsSection shorts={shorts} /> : null}
                  <HomeFeedBlock entries={videosSecondHalf} isMobile={Boolean(isMobile)} onDismissVideo={dismissVideo} onDismissAd={dismissAd} />
                </>
              ) : (
                <div className="px-4 py-10">
                  <EmptyState
                    icon={Search}
                    title="No videos found"
                    description="Try a different category or change your location filter to refresh your feed."
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
