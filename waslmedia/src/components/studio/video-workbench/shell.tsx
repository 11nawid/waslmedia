'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Captions,
  Clapperboard,
  Copyright,
  Film,
  MessageSquare,
  PencilLine,
  Scissors,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useVideoWorkbench } from './provider';
import { VideoThumbnail } from '@/components/video-thumbnail';

const primaryNav = [
  { label: 'Details', href: 'details', icon: PencilLine },
  { label: 'Analytics', href: 'analytics', icon: BarChart3 },
  { label: 'Editor', href: 'editor', icon: Film },
  { label: 'Comments', href: 'comments', icon: MessageSquare },
  { label: 'Subtitles', href: 'subtitles', icon: Captions },
  { label: 'Copyright', href: 'copyright', icon: Copyright },
  { label: 'Clips', href: 'clips', icon: Scissors },
];

const secondaryNav = [
  { label: 'Settings', href: 'settings', icon: Settings },
  { label: 'Send feedback', href: '/studio/feedback?source=video-workbench', icon: MessageSquare, absolute: true },
];

function VideoWorkbenchSkeleton() {
  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="hidden h-full w-[320px] shrink-0 border-r border-border/70 bg-card/50 lg:flex lg:flex-col">
        <div className="space-y-4 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-10">
        <Skeleton className="mb-6 h-10 w-72" />
        <Skeleton className="h-[520px] w-full rounded-[28px]" />
      </main>
    </div>
  );
}

export function VideoWorkbenchShell({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const { video, loading, error } = useVideoWorkbench();
  const contentTab = video?.category === 'Shorts' ? 'shorts' : 'videos';

  if (loading) {
    return <VideoWorkbenchSkeleton />;
  }

  if (!video || error) {
      return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-xl rounded-[28px] border border-border/70 bg-card/70 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">This video workspace is unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The content may have been removed, or your account does not own this item.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/studio/upload?tab=${contentTab}`}>Back to channel content</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="hidden h-full w-[320px] shrink-0 border-r border-border/70 bg-card/60 lg:flex lg:flex-col">
        <div className="border-b border-border/70 px-5 py-4">
          <Button variant="ghost" asChild className="justify-start px-2 text-sm text-muted-foreground hover:text-foreground">
            <Link href={`/studio/upload?tab=${contentTab}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Channel content
            </Link>
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-5">
            <div className="overflow-hidden rounded-[22px] border border-border/70 bg-secondary/30">
              <div className="relative aspect-video w-full bg-secondary">
                <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="288px" />
              </div>
              <div className="space-y-1 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Your video</p>
                <p className="line-clamp-2 text-sm font-semibold">{video.title}</p>
                <p className="text-xs text-muted-foreground">{video.duration}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {primaryNav.map((item) => {
                const href = `/studio/video/${videoId}/${item.href}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </ScrollArea>
        <div className="border-t border-border/70 p-5">
          <div className="space-y-1">
            {secondaryNav.map((item) => {
              const href = item.absolute ? item.href : `/studio/video/${videoId}/${item.href}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-border/70 px-4 py-4 lg:hidden">
          <Button variant="ghost" asChild className="justify-start px-2 text-sm text-muted-foreground hover:text-foreground">
            <Link href={`/studio/upload?tab=${contentTab}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to channel content
            </Link>
          </Button>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-16 w-28 overflow-hidden rounded-2xl bg-secondary">
              <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="112px" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold">{video.title}</p>
              <p className="text-xs text-muted-foreground">{video.duration}</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
