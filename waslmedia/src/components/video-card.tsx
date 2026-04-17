
'use client';

import type { Video } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { VideoCardMenu } from './video-card-menu';
import { VideoThumbnail } from './video-thumbnail';
import { getPlaybackBlobUrl } from '@/lib/media/client';
import { buildChannelHref } from '@/lib/channel-links';
import { buildVideoHref, isShortVideo } from '@/lib/video-links';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  variant?: 'default' | 'list' | 'search' | 'mobile';
  playlistId?: string;
  isActive?: boolean;
  sourceContext?: string;
  onDismiss?: (videoId: string) => void;
  trailingActions?: ReactNode;
}

function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(0)}K views`;
  }
  return `${views} views`;
}

export function VideoCard({
  video,
  variant = 'default',
  playlistId,
  isActive,
  sourceContext,
  onDismiss,
  trailingActions,
}: VideoCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverSource, setHoverSource] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const previewTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => {
        setIsHovering(true);
        if (!hoverSource && video.previewSessionUrl) {
          getPlaybackBlobUrl(video.id, 'preview')
            .then((objectUrl) => {
              setHoverSource(objectUrl);
            })
            .catch((error) => {
              console.error('Failed to load hover preview session', error);
            });
        }
    }, 500); // 0.5 second delay
  };

  const handleMouseLeave = () => {
    if(hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
    }
    if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
    }
    setIsHovering(false);
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (!isHovering || !hoverSource || !videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => null);
    previewTimeout.current = setTimeout(() => {
      videoRef.current?.pause();
    }, 3000);

    return () => {
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
      }
    };
  }, [hoverSource, isHovering]);

  const channelLink = buildChannelHref(video.channelHandle || video.authorId);
  const isShortContent = isShortVideo(video);
  const resolvedSourceContext =
    sourceContext ||
    (variant === 'search' ? 'search' : variant === 'list' ? 'watch-recommendation' : 'home');
  const watchLink = buildVideoHref(video, {
    playlistId,
    sourceContext: resolvedSourceContext,
  });
  const contentBadgeLabel = isShortContent ? 'Short' : 'Video';

  if (variant === 'search') {
    return (
      <div className="group flex gap-6">
        <Link href={watchLink} className="block w-full max-w-[420px] shrink-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
            <VideoThumbnail
                thumbnailUrl={video.thumbnailUrl}
                videoUrl={video.videoUrl}
                alt={video.title}
                sizes="(max-width: 1280px) 40vw, 420px"
                className="group-hover:scale-[1.02]"
            />
            <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 text-xs text-white">
              {video.duration}
            </Badge>
            <Badge variant="secondary" className="absolute left-2 top-2 bg-black/80 px-1.5 py-0.5 text-xs text-white">
              {contentBadgeLabel}
            </Badge>
          </div>
        </Link>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="min-w-0 flex-1">
            <Link href={watchLink} className="block">
              <h3 className="line-clamp-2 text-[1.35rem] font-medium leading-[1.35] text-foreground group-hover:text-primary">
                {video.title}
              </h3>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">{formatViews(video.viewCount)} • {video.uploadedAt}</p>
            <Link href={channelLink} className="mt-3 flex items-center gap-3 hover:text-primary">
              <Avatar className="h-9 w-9">
                <AvatarImage src={video.channelImageUrl} alt={video.channelName} data-ai-hint="channel avatar" />
                <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{video.channelName}</span>
            </Link>
            {video.description ? (
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{video.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {trailingActions}
            <VideoCardMenu video={video} onDismiss={onDismiss} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="flex gap-3 group">
        <Link href={watchLink} className="block shrink-0">
            <div className={cn(
              'relative overflow-hidden rounded-lg bg-secondary',
              isShortContent ? 'h-40 w-[5.7rem]' : 'aspect-video w-40'
            )}>
            <VideoThumbnail
                thumbnailUrl={video.thumbnailUrl}
                videoUrl={video.videoUrl}
                alt={video.title}
                sizes={isShortContent ? '92px' : '160px'}
                className="group-hover:scale-105"
            />
            <Badge variant="secondary" className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5">{video.duration}</Badge>
            <Badge variant="secondary" className="absolute left-1 top-1 bg-black/80 text-white text-xs px-1 py-0.5">{contentBadgeLabel}</Badge>
            </div>
        </Link>
        <div className="flex flex-1 items-start">
          <div className="flex flex-col">
            <Link href={watchLink} className="block">
              <h3 className="text-base font-medium leading-snug text-foreground group-hover:text-primary line-clamp-2">{video.title}</h3>
            </Link>
             <Link href={channelLink} className="flex items-center gap-2 mt-1.5 hover:text-primary">
                <span className="text-xs text-muted-foreground">{video.channelName}</span>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">{formatViews(video.viewCount)} &bull; {video.uploadedAt}</p>
            {video.isNew && <Badge className="bg-secondary text-secondary-foreground text-xs mt-2 w-fit">New</Badge>}
          </div>
          <div className="ml-auto flex items-start gap-1">
            {trailingActions}
            <VideoCardMenu video={video} onDismiss={onDismiss} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'mobile') {
      return (
        <div className="border-b border-border/50 py-3 last:border-b-0">
             <div className={cn(
               'relative overflow-hidden rounded-none bg-black sm:rounded-lg',
               isShortContent ? 'mx-auto aspect-[9/16] w-[min(14rem,58vw)]' : 'aspect-video w-full'
             )}>
                <Link href={watchLink} className="block">
                    <VideoThumbnail
                        thumbnailUrl={video.thumbnailUrl}
                        videoUrl={video.videoUrl}
                        alt={video.title}
                        sizes="100vw"
                    />
                </Link>
                <Badge variant="secondary" className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5">{video.duration}</Badge>
                <Badge variant="secondary" className="absolute left-1 top-1 bg-black/80 text-white text-xs px-1 py-0.5">{contentBadgeLabel}</Badge>
            </div>
            <div className="flex items-start gap-3 px-3 pt-2">
                 <Link href={channelLink}>
                    <Avatar>
                        <AvatarImage src={video.channelImageUrl} alt={video.channelName} data-ai-hint="channel avatar" />
                        <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1">
                     <Link href={watchLink} className="block">
                        <h3 className="text-base font-semibold leading-tight line-clamp-2">{video.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">{video.channelName} &bull; {formatViews(video.viewCount)} &bull; {video.uploadedAt}</p>
                </div>
                <div className="self-start -mr-2 flex items-start gap-1">
                    {trailingActions}
                    <VideoCardMenu video={video} onDismiss={onDismiss} />
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className={cn(
        'relative mb-2 overflow-hidden rounded-lg bg-black',
        isShortContent ? 'aspect-[9/16] w-full' : 'aspect-video w-full'
      )}>
        <Link href={watchLink} className="block w-full h-full">
          {isHovering && hoverSource ? (
             <video
              ref={videoRef}
              src={hoverSource}
              className="w-full h-full object-cover transition-opacity duration-300"
              muted
              loop
              playsInline
             />
          ) : (
            <VideoThumbnail
                thumbnailUrl={video.thumbnailUrl}
                videoUrl={video.videoUrl}
                alt={video.title}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="group-hover:scale-105"
            />
          )}
        </Link>
        <Badge variant="secondary" className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5">{video.duration}</Badge>
        <Badge variant="secondary" className="absolute left-1 top-1 bg-black/80 text-white text-xs px-1 py-0.5">{contentBadgeLabel}</Badge>
      </div>
      <div className="flex items-start gap-3">
        <Link href={channelLink}>
          <Avatar>
            <AvatarImage src={video.channelImageUrl} alt={video.channelName} data-ai-hint="channel avatar" />
            <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={watchLink} className="block">
            <h3 className="text-base font-semibold leading-tight group-hover:text-primary line-clamp-2">{video.title}</h3>
          </Link>
          <Link href={channelLink} className="block hover:text-primary">
            <p className="text-sm text-muted-foreground mt-1">{video.channelName}</p>
          </Link>
          <p className="text-sm text-muted-foreground">{formatViews(video.viewCount)} &bull; {video.uploadedAt}</p>
        </div>
        <div className="-mr-2 flex items-start gap-1">
            {trailingActions}
            <VideoCardMenu video={video} onDismiss={onDismiss} />
        </div>
      </div>
    </div>
  );
}
