'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { appConfig } from '@/config/app';
import { cn } from '@/lib/utils';
import { resolveProtectedAssetUrl } from '@/lib/media/protected-assets-client';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoThumbnailProps {
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  dataAiHint?: string;
}

function getNormalizedUrl(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function isFakeThumbnail(url: string) {
  return url === appConfig.defaultThumbnailUrl;
}

const generatedVideoFrameCache = new Map<string, string>();

async function generateVideoFrameDataUrl(videoSrc: string) {
  const cached = generatedVideoFrameCache.get(videoSrc);
  if (cached) {
    return cached;
  }

  const videoElement = document.createElement('video');
  videoElement.preload = 'metadata';
  videoElement.src = videoSrc;
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.crossOrigin = 'anonymous';

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();
    };

    const finish = (result: { ok: true; value: string } | { ok: false; error: Error }) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (result.ok) {
        generatedVideoFrameCache.set(videoSrc, result.value);
        resolve(result.value);
        return;
      }
      reject(result.error);
    };

    videoElement.onerror = () => finish({ ok: false, error: new Error('VIDEO_FRAME_LOAD_FAILED') });

    videoElement.onloadedmetadata = () => {
      const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : 0;
      const seekTarget = duration > 0 ? Math.min(Math.max(duration * 0.2, 0.15), Math.max(duration - 0.05, 0.15)) : 0.15;

      try {
        videoElement.currentTime = seekTarget;
      } catch {
        finish({ ok: false, error: new Error('VIDEO_FRAME_SEEK_FAILED') });
      }
    };

    videoElement.onseeked = () => {
      const width = videoElement.videoWidth || 720;
      const height = videoElement.videoHeight || 1280;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        finish({ ok: false, error: new Error('VIDEO_FRAME_CONTEXT_FAILED') });
        return;
      }

      context.drawImage(videoElement, 0, 0, width, height);

      try {
        finish({ ok: true, value: canvas.toDataURL('image/jpeg', 0.88) });
      } catch {
        finish({ ok: false, error: new Error('VIDEO_FRAME_EXPORT_FAILED') });
      }
    };
  });
}

export function VideoThumbnail({
  thumbnailUrl,
  videoUrl,
  alt,
  sizes,
  className,
  dataAiHint = 'video thumbnail',
}: VideoThumbnailProps) {
  const rawThumbnailUrl = getNormalizedUrl(thumbnailUrl);
  const rawVideoUrl = getNormalizedUrl(videoUrl);
  const [resolvedImageSrc, setResolvedImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const shouldUseVideoFallback = useMemo(
    () => Boolean(rawVideoUrl) && (!rawThumbnailUrl || isFakeThumbnail(rawThumbnailUrl)),
    [rawThumbnailUrl, rawVideoUrl]
  );
  const imageSrc = useMemo(
    () => (rawThumbnailUrl && !isFakeThumbnail(rawThumbnailUrl) ? rawThumbnailUrl : appConfig.defaultThumbnailUrl),
    [rawThumbnailUrl]
  );

  useEffect(() => {
    let active = true;
    setIsLoaded(false);
    setResolvedImageSrc('');

    const resolveThumbnail = async () => {
      if (shouldUseVideoFallback && rawVideoUrl) {
        try {
          const generatedFrame = await generateVideoFrameDataUrl(rawVideoUrl);
          if (active) {
            setResolvedImageSrc(generatedFrame);
          }
          return;
        } catch {
          // Fall back to the normal image path below.
        }
      }

      try {
        const nextSrc = await resolveProtectedAssetUrl(imageSrc);
        if (active) {
          setResolvedImageSrc(nextSrc || appConfig.defaultThumbnailUrl);
        }
      } catch {
        if (active) {
          setResolvedImageSrc(imageSrc);
        }
      }
    };

    resolveThumbnail().catch(() => {
      if (active) {
        setResolvedImageSrc(imageSrc);
      }
    });

    return () => {
      active = false;
    };
  }, [imageSrc, rawVideoUrl, shouldUseVideoFallback]);

  const displaySrc = resolvedImageSrc || (shouldUseVideoFallback ? '' : imageSrc);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [resolvedImageSrc, imageSrc]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {!isLoaded ? (
        <div className="absolute inset-0">
          <Skeleton className="h-full w-full rounded-none bg-muted/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent opacity-70 animate-pulse" />
        </div>
      ) : null}
      {displaySrc ? (
        <img
          ref={imageRef}
          src={displaySrc}
          alt={alt}
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          onLoad={() => setIsLoaded(true)}
          onError={(event) => {
            const target = event.currentTarget;
            if (target.src !== appConfig.defaultThumbnailUrl) {
              setResolvedImageSrc(appConfig.defaultThumbnailUrl);
              return;
            }
            setIsLoaded(true);
          }}
          className={cn(
            'h-full w-full object-cover transition-transform select-none duration-300',
            !isLoaded && 'opacity-0',
            isLoaded && 'opacity-100',
            className
          )}
          data-ai-hint={dataAiHint}
          loading={sizes.includes('100vw') ? 'eager' : 'lazy'}
        />
      ) : null}
    </div>
  );
}
