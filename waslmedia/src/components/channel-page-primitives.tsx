'use client';

import { useEffect, useState } from 'react';
import { Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveProtectedAssetUrl } from '@/lib/media/protected-assets-client';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Playlist, Post, Video } from '@/lib/types';

export type VideoSortMode = 'newest' | 'oldest' | 'views';

export function SecureImage({
  src,
  alt,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setResolvedSrc('');
    setIsLoaded(false);

    resolveProtectedAssetUrl(src)
      .then((nextSrc) => {
        if (active) {
          setResolvedSrc(nextSrc || '');
        }
      })
      .catch(() => {
        if (active) {
          setResolvedSrc('');
        }
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden', fallbackClassName)}>
        <Skeleton className="h-full w-full rounded-none bg-secondary/60" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-background/15 to-transparent opacity-70" />
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full overflow-hidden', fallbackClassName)}>
      {!isLoaded ? (
        <div className="absolute inset-0">
          <Skeleton className="h-full w-full rounded-none bg-secondary/60" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-background/15 to-transparent opacity-70" />
        </div>
      ) : null}
      <img
        src={resolvedSrc}
        alt={alt}
        className={cn(className, !isLoaded && 'opacity-0', isLoaded && 'opacity-100 transition-opacity duration-200')}
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
      />
    </div>
  );
}

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ChannelPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="h-40 animate-pulse rounded-[28px] bg-secondary/60 sm:h-56 lg:h-72" />
      <div className="-mt-12 flex flex-col gap-5 sm:-mt-16 lg:-mt-20 lg:flex-row lg:items-end">
        <div className="h-24 w-24 animate-pulse rounded-full border-4 border-background bg-secondary sm:h-32 sm:w-32 lg:h-40 lg:w-40" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-10 w-56 animate-pulse rounded-full bg-secondary/60" />
          <div className="h-5 w-72 animate-pulse rounded-full bg-secondary/60" />
          <div className="h-5 w-80 animate-pulse rounded-full bg-secondary/60" />
        </div>
      </div>
    </div>
  );
}

export function ChannelNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <EmptyState
        icon={Rss}
        title="Channel not found"
        description="This channel may have been removed, renamed, or is no longer public."
        compact
      />
    </div>
  );
}

export function formatSubscribers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${Math.floor(count / 1000)}K subscribers`;
  return `${count} subscribers`;
}

export function formatCompactViews(count?: number) {
  return `${(count || 0).toLocaleString()} views`;
}

function getVideoTimestamp(video: Video) {
  const rawValue = video.rawCreatedAt || video.uploadedAt || '';
  const timestamp = Date.parse(String(rawValue));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortVideos(items: Video[], mode: VideoSortMode) {
  return [...items].sort((left, right) => {
    if (mode === 'views') {
      return right.viewCount - left.viewCount;
    }

    const difference = getVideoTimestamp(right) - getVideoTimestamp(left);
    return mode === 'oldest' ? -difference : difference;
  });
}

function matchesSearch(query: string, values: Array<string | string[] | undefined | null>) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) => item.toLowerCase().includes(normalized));
    }

    return String(value || '').toLowerCase().includes(normalized);
  });
}

export function filterVideosByQuery(items: Video[], query: string) {
  return items.filter((video) =>
    matchesSearch(query, [
      video.title,
      video.description,
      video.tags,
      video.channelName,
      video.channelHandle,
      video.category,
    ]),
  );
}

export function filterPlaylistsByQuery(items: Playlist[], query: string) {
  return items.filter((playlist) => matchesSearch(query, [playlist.name, playlist.description]));
}

export function filterPostsByQuery(items: Post[], query: string) {
  return items.filter((post) =>
    matchesSearch(query, [
      post.text,
      post.poll?.question,
      post.poll?.options.map((option) => option.text),
    ]),
  );
}

export function SortFilters({
  value,
  onChange,
}: {
  value: VideoSortMode;
  onChange: (value: VideoSortMode) => void;
}) {
  const options: Array<{ value: VideoSortMode; label: string }> = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'views', label: 'Most viewed' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? 'secondary' : 'ghost'}
          className="h-9 rounded-full px-4"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
