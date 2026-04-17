'use client';

import { getSearchResults } from '@/lib/data';
import { VideoCard } from '@/components/video-card';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Film, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import type { Video, Channel } from '@/lib/types';
import type { SponsoredAd } from '@/lib/ads/types';
import { useEffect, useMemo, useRef, useState, Suspense, useCallback } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { SearchFilterDialog } from '@/components/search-filter-dialog';
import type { SearchFilters } from '@/components/search-filter-dialog';
import { ChannelListCard } from '@/components/channel-list-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref } from '@/lib/video-links';
import { SponsoredAdCard } from '@/components/sponsored-ad-card';
import { insertSponsoredAds } from '@/lib/ads/feed';
import { cn } from '@/lib/utils';
import { useDismissedFeedItems } from '@/hooks/use-dismissed-feed-items';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';

const filterChips = ['All', 'Videos', 'Shorts', 'Channels'];
const SEARCH_CACHE_TTL_MS = 30_000;
const searchResultsCache = new Map<
  string,
  { results: (Video | Channel)[]; ads: SponsoredAd[]; fetchedAt: number }
>();

function buildSearchRequestKey(query: string, filters: SearchFilters) {
  return JSON.stringify({
    q: query.trim(),
    sortBy: filters.sortBy,
    uploadDate: filters.uploadDate,
    type: filters.type,
    duration: filters.duration,
  });
}

function resolveInitialChip(filters: SearchFilters) {
  if (filters.type === 'channel') {
    return 'Channels';
  }

  if (filters.type === 'film') {
    return 'Shorts';
  }

  if (filters.type === 'video') {
    return 'Videos';
  }

  return 'All';
}

function ShortsCard({ video }: { video: Video }) {
  return (
    <Link href={buildVideoHref(video)} className="block group">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-secondary">
        <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="(max-width: 1024px) 33vw, 220px" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 text-white">
          <p className="font-semibold text-sm line-clamp-2">{video.title}</p>
          <p className="text-xs text-white/80">{video.viewCount.toLocaleString()} views</p>
        </div>
      </div>
    </Link>
  );
}

function ShortsSection({ shorts }: { shorts: Video[] }) {
  if (shorts.length === 0) return null;

  return (
    <div className="py-8 border-t">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-7 h-7 text-primary" />
        <h2 className="text-2xl font-bold">Shorts</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shorts.map((short) => (
          <ShortsCard key={short.id} video={short} />
        ))}
      </div>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-6">
          <Skeleton className="relative aspect-video w-full max-w-[420px] shrink-0 overflow-hidden rounded-2xl" />
          <div className="flex flex-col flex-1 gap-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SearchResults({
  initialQuery,
  initialFilters,
  initialResults,
  initialAds,
  initialLoaded,
}: {
  initialQuery: string;
  initialFilters: SearchFilters;
  initialResults: (Video | Channel)[];
  initialAds: SponsoredAd[];
  initialLoaded: boolean;
}) {
  const router = useProgressRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<(Video | Channel)[]>(initialResults);
  const [ads, setAds] = useState<SponsoredAd[]>(initialAds);
  const [loading, setLoading] = useState(!initialLoaded);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { dismissedAdIds, dismissedVideoIds, dismissAd, dismissVideo } = useDismissedFeedItems();
  const [activeChip, setActiveChip] = useState(resolveInitialChip(initialFilters));
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const initialRequestKeyRef = useRef(initialLoaded ? buildSearchRequestKey(initialQuery, initialFilters) : null);

  useEffect(() => {
    setQuery(initialQuery);
    setFilters(initialFilters);
    setResults(initialResults);
    setAds(initialAds);
    setLoading(!initialLoaded);
    setActiveChip(resolveInitialChip(initialFilters));
    initialRequestKeyRef.current = initialLoaded ? buildSearchRequestKey(initialQuery, initialFilters) : null;
  }, [initialAds, initialFilters, initialLoaded, initialQuery, initialResults]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => {
      if (value === 'anytime' || value === 'all' || value === 'any' || value === 'relevance') {
        return false;
      }

      return true;
    }).length;
  }, [filters]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const currentQuery = searchParams?.get('q') || '';
  const requestKey = buildSearchRequestKey(currentQuery, filters);

  useEffect(() => {
    setQuery(currentQuery);

    if (!currentQuery) {
      setResults([]);
      setAds([]);
      setLoading(false);
      return;
    }

    if (initialRequestKeyRef.current === requestKey) {
      initialRequestKeyRef.current = '__consumed__';
      setLoading(false);
      return;
    }

    const cached = searchResultsCache.get(requestKey);
    if (cached && Date.now() - cached.fetchedAt < SEARCH_CACHE_TTL_MS) {
      setResults(cached.results);
      setAds(cached.ads);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    trackGlobalForegroundTask(getSearchResults(currentQuery, filters))
      .then((searchPayload) => {
        if (!active) {
          return;
        }

        searchResultsCache.set(requestKey, {
          results: searchPayload.results,
          ads: searchPayload.ads,
          fetchedAt: Date.now(),
        });
        setResults(searchPayload.results);
        setAds(searchPayload.ads);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentQuery, filters, requestKey]);

  const { videos, shorts, channels } = useMemo(() => {
    const isVideo = (result: Video | Channel): result is Video => 'duration' in result;
    const isChannel = (result: Video | Channel): result is Channel => 'subscriberCount' in result;
    const visibleResults = results.filter((item) => {
      if (isVideo(item)) {
        return !dismissedVideoIds.includes(item.id);
      }

      return true;
    });

    return {
      videos: visibleResults.filter((item) => isVideo(item) && item.category !== 'Shorts') as Video[],
      shorts: visibleResults.filter((item) => isVideo(item) && item.category === 'Shorts') as Video[],
      channels: visibleResults.filter(isChannel) as Channel[],
    };
  }, [dismissedVideoIds, results]);
  const availableAds = useMemo(
    () => ads.filter((ad) => !dismissedAdIds.includes(ad.id)),
    [ads, dismissedAdIds]
  );
  const { primaryAd: primarySearchAd, entries: sponsoredVideoEntries } = useMemo(
    () => insertSponsoredAds(videos, availableAds, 12, true),
    [availableAds, videos]
  );
  const shouldShowSearchAds = (activeChip === 'All' || activeChip === 'Videos') && Boolean(currentQuery.trim());

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) {
      router.push(`${pathname}?${createQueryString('q', query)}`);
    }
  };

  const renderContent = () => {
    const noResults = videos.length === 0 && channels.length === 0 && shorts.length === 0;

    if (loading) return <SearchResultsSkeleton />;
    if (noResults && currentQuery) {
      return (
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
          {shouldShowSearchAds && primarySearchAd ? <SponsoredAdCard ad={primarySearchAd} layout="search" onDismiss={dismissAd} /> : null}
          <EmptyState
            icon={SearchIcon}
            title="No results found"
            description={`We couldn’t find anything for "${currentQuery}". Try a different keyword or adjust the filters.`}
            compact
            className="max-w-[960px]"
          />
        </div>
      );
    }
    if (noResults) return <div />;

    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-8">
        {(activeChip === 'All' || activeChip === 'Channels') &&
          channels.length > 0 &&
          channels.map((item) => <ChannelListCard key={item.id} channel={item} variant="search" />)}
        {shouldShowSearchAds && (
          <>
            {primarySearchAd ? <SponsoredAdCard ad={primarySearchAd} layout="search" onDismiss={dismissAd} /> : null}
            {videos.length > 0
              ? sponsoredVideoEntries.map((entry) =>
                  entry.type === 'ad' ? (
                    <SponsoredAdCard key={entry.ad.id} ad={entry.ad} layout="search" onDismiss={dismissAd} />
                  ) : (
                    <VideoCard key={entry.item.id} video={entry.item} variant="search" onDismiss={dismissVideo} />
                  )
                )
              : null}
          </>
        )}
        {(activeChip === 'All' || activeChip === 'Videos') &&
          !shouldShowSearchAds &&
          videos.length > 0 && (
            <>
              {videos.map((item) => <VideoCard key={item.id} video={item} variant="search" onDismiss={dismissVideo} />)}
            </>
          )}
        {(activeChip === 'All' || activeChip === 'Shorts') && shorts.length > 0 && <ShortsSection shorts={shorts} />}
      </div>
    );
  };

  if (isMobile) {
    return (
      <main className="p-0 bg-background h-screen flex flex-col">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 p-2 border-b">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Waslmedia"
            className="bg-secondary rounded-full"
          />
          <Button type="submit" size="icon" variant="ghost" className="rounded-full">
            <SearchIcon />
          </Button>
        </form>
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Button
              variant="secondary"
              className="rounded-full shrink-0"
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-background text-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {filterChips.map((chip) => (
              <Button
                key={chip}
                variant={activeChip === chip ? 'primary' : 'secondary'}
                onClick={() => setActiveChip(chip)}
                className="rounded-lg shrink-0"
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>
        <SearchFilterDialog
          isOpen={isFilterDialogOpen}
          onOpenChange={setIsFilterDialogOpen}
          currentFilters={filters}
          onApply={(newFilters) => setFilters(newFilters)}
        />
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1380px]">
      <div className="mx-auto mb-6 flex w-full max-w-[1280px] items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {filterChips.map((chip) => (
            <Button
              key={chip}
              variant={activeChip === chip ? 'primary' : 'ghost'}
              onClick={() => setActiveChip(chip)}
              className="rounded-full"
            >
              {chip}
            </Button>
          ))}
        </div>
        <Button
          variant="secondary"
          className="rounded-full"
          onClick={() => setIsFilterDialogOpen(true)}
        >
          <SlidersHorizontal className="mr-2 h-5 w-5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-background text-foreground rounded-full px-2 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <SearchFilterDialog
        isOpen={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        currentFilters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
      />

      {renderContent()}
    </div>
  );
}

function SearchPageWrapper(props: {
  initialQuery: string;
  initialFilters: SearchFilters;
  initialResults: (Video | Channel)[];
  initialAds: SponsoredAd[];
  initialLoaded: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults {...props} />
      </Suspense>
    );
  }

  return (
    <MainContent>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults {...props} />
      </Suspense>
    </MainContent>
  );
}

export default function SearchPageClient(props: {
  initialQuery: string;
  initialFilters: SearchFilters;
  initialResults: (Video | Channel)[];
  initialAds: SponsoredAd[];
  initialLoaded: boolean;
}) {
  return (
    <Suspense>
      <SearchPageWrapper {...props} />
    </Suspense>
  );
}
