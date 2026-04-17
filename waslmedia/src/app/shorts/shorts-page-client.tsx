'use client';

import { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import type { ShortsBootstrapPage, Video } from '@/lib/types';
import { dislikeVideo, likeVideo, shareVideo, toggleSubscription, toggleWatchLater } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Film,
  Loader2,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  BookmarkSimple,
  CaretDown,
  CaretUp,
  ChatCircle,
  Check,
  DotsThreeOutlineVertical,
  EnvelopeSimple,
  FacebookLogo,
  Heart,
  LinkSimple,
  MusicNotesSimple,
  PaperPlaneTilt,
  Play,
  ShareNetwork,
  ThumbsDown,
  WhatsappLogo,
  XLogo,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ShortsCommentsSheet } from '@/components/shorts-comments-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmptyState } from '@/components/empty-state';
import { apiSend } from '@/lib/api/client';
import { getViewerAnalyticsContext } from '@/lib/analytics/viewer-context';
import { createPlaybackSession, getPlaybackBlobUrl, invalidatePlaybackSession } from '@/lib/media/client';
import { buildChannelHref } from '@/lib/channel-links';
import { appConfig } from '@/config/app';

function formatCount(count: number): string {
  if (count < 10000) return count.toLocaleString();
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
}

function getNormalizedUrl(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function isFakeThumbnail(url: string) {
  return url === appConfig.defaultThumbnailUrl;
}

type ShortsInteractionState = {
  liked: boolean;
  disliked: boolean;
  watchLater: boolean;
};

type ShareActionId = 'copy' | 'facebook' | 'whatsapp' | 'email' | 'x' | 'more';
const SHORTS_MUTE_STORAGE_KEY = 'waslmedia:shorts-muted';
const SHORTS_ROUTE_PATTERN = /^\/shorts\/([^/]+)\/?$/;

function getInitialInteractionState(video: Video): ShortsInteractionState {
  return {
    liked: Boolean(video.initialInteraction?.liked),
    disliked: Boolean(video.initialInteraction?.disliked),
    watchLater: Boolean(video.initialInteraction?.watchLater),
  };
}

function ShortsPlayer({
  video,
  isActive,
  shouldLoad,
  isMuted,
  onMuteChange,
}: {
  video: Video;
  isActive: boolean;
  shouldLoad: boolean;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRegisteredQualifiedView = useRef(false);
  const hasLoadedPlayback = useRef(false);
  const hasTriedBlobFallback = useRef(false);
  const hasRetriedPlaybackSession = useRef(false);
  const hasRecoveredFromRuntimeError = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [playbackFeedback, setPlaybackFeedback] = useState<'play' | 'pause' | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const normalizedThumbnailUrl = getNormalizedUrl(video.thumbnailUrl);
  const hasDisplayThumbnail = Boolean(normalizedThumbnailUrl) && !isFakeThumbnail(normalizedThumbnailUrl);

  const loadBlobFallback = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement || hasTriedBlobFallback.current) {
      return false;
    }

    hasTriedBlobFallback.current = true;
    setLoadState('loading');

    try {
      const blobUrl = await getPlaybackBlobUrl(video.id, 'shorts', { forceRefresh: hasRetriedPlaybackSession.current });
      videoElement.src = blobUrl;
      videoElement.load();
      hasLoadedPlayback.current = true;
      return true;
    } catch {
      setLoadState('error');
      return false;
    }
  }, [video.id]);

  const refreshPlaybackSource = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return false;
    }

    setLoadState('loading');
    invalidatePlaybackSession(video.id, 'shorts');

    try {
      const session = await createPlaybackSession(video.id, 'shorts', { forceRefresh: true });
      const playbackSource = session.directSourceUrl || session.fallbackUrl || video.videoUrl;

      if (!playbackSource) {
        throw new Error('SHORTS_PLAYBACK_SOURCE_NOT_FOUND');
      }

      videoElement.removeAttribute('src');
      videoElement.src = playbackSource;
      videoElement.load();
      hasLoadedPlayback.current = true;
      return true;
    } catch {
      return false;
    }
  }, [video.id, video.videoUrl]);

  const syncPlaybackState = useCallback(() => {
    const videoElement = videoRef.current;
    const audioElement = audioRef.current;

    if (!videoElement || !hasLoadedPlayback.current) {
      return;
    }

    const hasExternalAudio = Boolean(audioElement);
    videoElement.muted = hasExternalAudio || isMuted;

    if (!isActive) {
      videoElement.pause();
      videoElement.currentTime = 0;
      setProgressPercent(0);

      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      return;
    }

    const attemptVideoPlay = async () => {
      try {
        await videoElement.play();
      } catch {
        await videoElement.play().catch(() => {});
      }
    };

    void attemptVideoPlay();

    if (!audioElement) {
      return;
    }

    audioElement.muted = isMuted;

    if (isMuted) {
      audioElement.pause();
      audioElement.currentTime = 0;
      return;
    }

    audioElement.currentTime = videoElement.currentTime;
    audioElement.play().catch(() => {});
  }, [isActive, isMuted, onMuteChange]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || loadState !== 'ready') return;
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      return;
    }

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlaybackFeedback('play');
    } else {
      videoRef.current.pause();
      setPlaybackFeedback('pause');
    }

    feedbackTimerRef.current = setTimeout(() => {
      setPlaybackFeedback(null);
    }, 900);
  }, [loadState]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    suppressTapRef.current = false;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (deltaX > 10 || deltaY > 10) {
      suppressTapRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const videoElement = videoRef.current;
    if (!videoElement || !shouldLoad || hasLoadedPlayback.current) return;
    setLoadState('loading');
    hasTriedBlobFallback.current = false;
    hasRetriedPlaybackSession.current = false;
    hasRecoveredFromRuntimeError.current = false;

    const loadPlayback = async (forceRefresh = false) => {
      const session = await createPlaybackSession(video.id, 'shorts', { forceRefresh });
      const playbackSource = session.directSourceUrl || session.fallbackUrl || video.videoUrl;

      if (!playbackSource) {
        throw new Error('SHORTS_PLAYBACK_SOURCE_NOT_FOUND');
      }

      if (cancelled) return;

      videoElement.removeAttribute('src');
      videoElement.src = playbackSource;
      videoElement.load();
      hasLoadedPlayback.current = true;
      syncPlaybackState();
    };

    loadPlayback().catch(async () => {
      if (!cancelled && !hasRetriedPlaybackSession.current) {
        hasRetriedPlaybackSession.current = true;
        invalidatePlaybackSession(video.id, 'shorts');

        try {
          await loadPlayback(true);
          return;
        } catch {
          // Fall through to source/blob fallback below.
        }
      }

      if (video.videoUrl && !cancelled) {
        videoElement.removeAttribute('src');
        videoElement.src = video.videoUrl;
        videoElement.load();
        hasLoadedPlayback.current = true;
        setLoadState('loading');
        syncPlaybackState();
        return;
      }

      if (!cancelled) {
        const loaded = await loadBlobFallback();
        if (loaded) {
          syncPlaybackState();
          return;
        }
      }

      setLoadState('error');
    });

    return () => {
      cancelled = true;
    };
  }, [loadBlobFallback, shouldLoad, syncPlaybackState, video.id, video.videoUrl]);

  useEffect(() => {
    syncPlaybackState();
  }, [syncPlaybackState]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive || hasRegisteredQualifiedView.current) {
      return;
    }

    viewTimerRef.current = setTimeout(() => {
      hasRegisteredQualifiedView.current = true;
      apiSend(`/api/videos/${video.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getViewerAnalyticsContext('shorts')),
      }).catch((error) => {
        console.error('Failed to register qualified Shorts view', error);
      });
    }, 2000);

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [isActive, video.id]);

  return (
    <div
      className="relative h-full w-full snap-center overflow-hidden bg-black"
      onClick={togglePlay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {hasDisplayThumbnail ? (
        <img
          src={normalizedThumbnailUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            loadState === 'ready' ? 'opacity-0' : 'opacity-100'
          )}
        />
      ) : null}
      <video
        ref={videoRef}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loadState === 'ready' ? 'opacity-100' : 'opacity-0'
        )}
        poster={hasDisplayThumbnail ? normalizedThumbnailUrl : undefined}
        autoPlay
        loop
        playsInline
        muted
        preload={isActive ? 'auto' : 'metadata'}
        onLoadedData={() => setLoadState('ready')}
        onPlaying={() => setLoadState('ready')}
        onWaiting={() => setLoadState((current) => (current === 'ready' ? 'loading' : current))}
        onCanPlay={() => setLoadState((current) => (current === 'error' ? current : 'ready'))}
        onLoadedMetadata={() => {
          const duration = videoRef.current?.duration || 0;
          const currentTime = videoRef.current?.currentTime || 0;
          setProgressPercent(duration > 0 ? (currentTime / duration) * 100 : 0);
        }}
        onTimeUpdate={() => {
          const duration = videoRef.current?.duration || 0;
          const currentTime = videoRef.current?.currentTime || 0;
          setProgressPercent(duration > 0 ? (currentTime / duration) * 100 : 0);
        }}
        onEnded={() => setProgressPercent(0)}
        onError={() => {
          void (async () => {
            if (!hasRecoveredFromRuntimeError.current) {
              hasRecoveredFromRuntimeError.current = true;
              const recovered = await refreshPlaybackSource();
              if (recovered) {
                syncPlaybackState();
                return;
              }
            }

            const loaded = await loadBlobFallback();
            if (loaded) {
              syncPlaybackState();
              return;
            }

            setLoadState('error');
          })();
        }}
        onContextMenu={(event) => event.preventDefault()}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
      />
      {loadState !== 'ready' ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_58%)]">
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/70" />
          {loadState === 'error' ? (
            <div className="relative z-10 flex max-w-[18rem] flex-col items-center gap-3 px-6 text-center text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Play className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">This short could not load.</p>
              <p className="text-xs text-white/75">Try the next reel or refresh the page.</p>
            </div>
          ) : (
            <div className="relative z-10 flex w-full max-w-[17rem] flex-col items-center gap-4 px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div className="w-full space-y-2">
                <Skeleton className="h-3.5 w-4/5 rounded-full bg-white/20" />
                <Skeleton className="h-3.5 w-3/5 rounded-full bg-white/15" />
              </div>
              <p className="text-xs font-medium tracking-[0.18em] text-white/70 uppercase">
                Loading reel
              </p>
            </div>
          )}
        </div>
      ) : null}
      {playbackFeedback && loadState === 'ready' ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex h-20 w-20 animate-in fade-in zoom-in-95 items-center justify-center rounded-full bg-black/45 text-white shadow-[0_18px_44px_rgba(0,0,0,0.45)] backdrop-blur-md duration-200">
            {playbackFeedback === 'play' ? <Play className="h-9 w-9" /> : <Pause className="h-9 w-9" />}
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-1 bg-white/12">
        <div
          className="h-full bg-white transition-[width] duration-150 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {video.audioUrl ? <audio ref={audioRef} src={video.audioUrl} loop preload="metadata" /> : null}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 z-20 h-10 w-10 rounded-full border border-white/15 bg-black/55 text-white shadow-[0_10px_24px_rgba(0,0,0,0.32)] backdrop-blur-sm hover:bg-black/70 hover:text-white"
        onClick={(event) => {
          event.stopPropagation();
          onMuteChange(!isMuted);
        }}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>
    </div>
  );
}

function ShortsRailButton({
  icon,
  label,
  value,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className="group flex min-w-0 flex-col items-center gap-0.5 bg-transparent px-0 py-0 text-foreground"
      onClick={onClick}
      aria-label={label}
    >
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center text-inherit transition-transform duration-150 group-hover:scale-105 sm:h-12 sm:w-12 [&_svg]:h-7 [&_svg]:w-7 sm:[&_svg]:h-[1.8rem] sm:[&_svg]:w-[1.8rem]',
          active && 'scale-105'
        )}
      >
        {icon}
      </span>
      {value ? <span className="text-[11px] font-semibold leading-none text-foreground/90">{value}</span> : null}
    </button>
  );
}

function ShortsHeaderActionButton({
  icon,
  label,
  value,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary/30 bg-primary/12 text-primary'
          : 'border-border/70 bg-background/92 text-foreground hover:bg-secondary/75'
      )}
    >
      <span className="flex items-center justify-center [&_svg]:h-[1.15rem] [&_svg]:w-[1.15rem]">
        {icon}
      </span>
      {value ? <span className="leading-none">{value}</span> : null}
    </button>
  );
}

export function ShortsPageSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-background">
          <div className="relative h-full overflow-hidden bg-[#080d12]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(44,54,72,0.2),_transparent_42%),linear-gradient(90deg,_rgba(255,255,255,0.02)_0%,_transparent_24%,_transparent_76%,_rgba(255,255,255,0.02)_100%)]" />
            <div className="relative flex h-full items-center justify-center px-6 py-3">
              <div className="relative flex items-center justify-center gap-6">
                <div className="relative h-[min(88vh,820px)] w-[min(100vw-180px,390px)] overflow-hidden rounded-[28px] border border-white/8 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <Skeleton className="absolute inset-0 bg-white/[0.06]" />
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_15%,rgba(255,255,255,0.12)_35%,transparent_55%)] animate-pulse" />
                  <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute bottom-5 left-4 right-16 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full bg-white/15" />
                      <Skeleton className="h-4 w-28 rounded-full bg-white/15" />
                      <Skeleton className="h-8 w-20 rounded-full bg-white/10" />
                    </div>
                    <Skeleton className="h-4 w-full rounded-full bg-white/10" />
                    <Skeleton className="h-4 w-4/5 rounded-full bg-white/10" />
                    <Skeleton className="h-7 w-36 rounded-full bg-white/10" />
                  </div>
                </div>

                <div className="absolute left-full bottom-6 ml-6 flex flex-col items-center gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`shorts-action-skeleton-${index}`} className="flex flex-col items-center gap-1">
                      <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                      <Skeleton className="h-3 w-8 rounded-full bg-white/10" />
                    </div>
                  ))}
                  <Skeleton className="mt-1 h-11 w-11 rounded-full bg-white/10" />
                </div>

                <div className="absolute left-full top-1/2 ml-[5.5rem] flex -translate-y-1/2 flex-col gap-4">
                  <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
                  <Skeleton className="h-14 w-14 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function ShortsPageClient({
  initialPage,
  initialVideoId,
}: {
  initialPage: ShortsBootstrapPage;
  initialVideoId?: string | null;
}) {
  const initialActiveIndexRef = useRef(
    Math.max(
      initialVideoId ? initialPage.items.findIndex((video) => video.id === initialVideoId) : 0,
      0
    )
  );
  const { userProfile, isSubscribedTo, isInWatchLater } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState(initialPage.items);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [currentInteractions, setCurrentInteractions] = useState<Record<string, ShortsInteractionState>>(() =>
    Object.fromEntries(
      initialPage.items
        .filter((video) => video.initialInteraction)
        .map((video) => [video.id, getInitialInteractionState(video)])
    )
  );
  const [, startTransition] = useTransition();
  const [activeIndex, setActiveIndex] = useState(initialActiveIndexRef.current);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null);
  const [shareVideoId, setShareVideoId] = useState<string | null>(null);
  const [copiedShareVideoId, setCopiedShareVideoId] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(true);
  const [hasLoadedMutePreference, setHasLoadedMutePreference] = useState(false);
  const isMobile = useIsMobile();
  const initialRouteVideoIdRef = useRef(initialVideoId ?? null);

  const getInteractionForVideo = useCallback(
    (video: Video): ShortsInteractionState => {
      const storedInteraction = currentInteractions[video.id];
      if (storedInteraction) {
        return storedInteraction;
      }

      const initialInteraction = getInitialInteractionState(video);
      return {
        ...initialInteraction,
        watchLater: userProfile ? isInWatchLater(video.id) : initialInteraction.watchLater,
      };
    },
    [currentInteractions, isInWatchLater, userProfile]
  );

  useEffect(() => {
    try {
      const savedPreference = window.localStorage.getItem(SHORTS_MUTE_STORAGE_KEY);
      if (savedPreference !== null) {
        setIsMuted(savedPreference === 'true');
      }
    } catch {
      // Ignore storage failures and keep the default muted state.
    } finally {
      setHasLoadedMutePreference(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedMutePreference) {
      return;
    }

    try {
      window.localStorage.setItem(SHORTS_MUTE_STORAGE_KEY, String(isMuted));
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }, [hasLoadedMutePreference, isMuted]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const index = Number((visibleEntry.target as HTMLElement).dataset.index || 0);
        if (Number.isFinite(index)) {
          setActiveIndex(index);
        }
      },
      {
        root: viewport,
        threshold: [0.55, 0.7, 0.9],
      }
    );

    slideRefs.current.forEach((slide) => {
      if (slide) {
        observer.observe(slide);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [videos.length]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, videos.length - 1));
      slideRefs.current[nextIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
    [videos.length]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      slideRefs.current[initialActiveIndexRef.current]?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const activeVideo = videos[activeIndex];
    if (!activeVideo || typeof window === 'undefined') {
      return;
    }

    const currentPath = window.location.pathname;
    const explicitRouteMatch = currentPath.match(SHORTS_ROUTE_PATTERN);
    const explicitRouteVideoId = explicitRouteMatch?.[1] || null;

    if (initialRouteVideoIdRef.current && explicitRouteVideoId === initialRouteVideoIdRef.current) {
      if (activeVideo.id === initialRouteVideoIdRef.current) {
        return;
      }
      initialRouteVideoIdRef.current = null;
    }

    const nextPath = `/shorts/${activeVideo.id}`;
    if (currentPath === nextPath) {
      return;
    }

    window.history.replaceState(window.history.state, '', nextPath);
  }, [activeIndex, videos]);

  const toggleDescriptionExpanded = useCallback((videoId: string) => {
    setExpandedDescriptions((previous) => ({
      ...previous,
      [videoId]: !previous[videoId],
    }));
  }, []);

  const handleSubscription = (channelId: string) => {
    if (!userProfile) {
      toast({ title: 'Please sign in to subscribe' });
      return;
    }
    startTransition(() => {
      const analyticsContext = getViewerAnalyticsContext('shorts');
      toggleSubscription(channelId, userProfile.uid, {
        sourceContext: analyticsContext.source,
        subscriberCountry: analyticsContext.viewerCountry,
      }).catch(() => {
        toast({ title: 'Something went wrong', variant: 'destructive' });
      });
    });
  };

  const handleLike = (video: Video) => {
    if (!userProfile) {
      toast({ title: 'Please sign in to like videos.' });
      return;
    }

    const latestVideo = videos.find((item) => item.id === video.id) ?? video;
    const originalInteraction = getInteractionForVideo(video);
    const newInteraction = {
      liked: !originalInteraction.liked,
      disliked: false,
      watchLater: originalInteraction.watchLater,
    };
    const originalVideoState = { likes: latestVideo.likes, dislikes: latestVideo.dislikes };
    const newLikes = originalVideoState.likes + (newInteraction.liked ? 1 : -1);
    const newDislikes = originalInteraction.disliked ? originalVideoState.dislikes - 1 : originalVideoState.dislikes;

    startTransition(() => {
      setCurrentInteractions((previous) => ({ ...previous, [video.id]: newInteraction }));
      setVideos((previous) =>
        previous.map((item) =>
          item.id === video.id
            ? {
                ...item,
                likes: newLikes,
                dislikes: newDislikes,
                initialInteraction: newInteraction,
              }
            : item
        )
      );
    });

    likeVideo(video.id, userProfile.uid)
      .then((payload) => {
        setCurrentInteractions((previous) => ({
          ...previous,
          [video.id]: {
            liked: payload.status.liked,
            disliked: payload.status.disliked,
            watchLater: payload.status.watchLater,
          },
        }));
        setVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  ...(payload.video ?? {}),
                  initialInteraction: payload.status,
                }
              : item
          )
        );
      })
      .catch(() => {
        setCurrentInteractions((previous) => ({ ...previous, [video.id]: originalInteraction }));
        setVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  likes: originalVideoState.likes,
                  dislikes: originalVideoState.dislikes,
                  initialInteraction: originalInteraction,
                }
              : item
          )
        );
        toast({ title: 'Something went wrong.', variant: 'destructive' });
      });
  };

  const handleDislike = (video: Video) => {
    if (!userProfile) {
      toast({ title: 'Please sign in to dislike videos.' });
      return;
    }

    const latestVideo = videos.find((item) => item.id === video.id) ?? video;
    const originalInteraction = getInteractionForVideo(video);
    const newInteraction = {
      liked: false,
      disliked: !originalInteraction.disliked,
      watchLater: originalInteraction.watchLater,
    };
    const originalVideoState = { likes: latestVideo.likes, dislikes: latestVideo.dislikes };
    const newDislikes = originalVideoState.dislikes + (newInteraction.disliked ? 1 : -1);
    const newLikes = originalInteraction.liked ? originalVideoState.likes - 1 : originalVideoState.likes;

    startTransition(() => {
      setCurrentInteractions((previous) => ({ ...previous, [video.id]: newInteraction }));
      setVideos((previous) =>
        previous.map((item) =>
          item.id === video.id
            ? {
                ...item,
                likes: newLikes,
                dislikes: newDislikes,
                initialInteraction: newInteraction,
              }
            : item
        )
      );
    });

    dislikeVideo(video.id, userProfile.uid)
      .then((payload) => {
        setCurrentInteractions((previous) => ({
          ...previous,
          [video.id]: {
            liked: payload.status.liked,
            disliked: payload.status.disliked,
            watchLater: payload.status.watchLater,
          },
        }));
        setVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  ...(payload.video ?? {}),
                  initialInteraction: payload.status,
                }
              : item
          )
        );
      })
      .catch(() => {
        setCurrentInteractions((previous) => ({ ...previous, [video.id]: originalInteraction }));
        setVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  ...originalVideoState,
                  initialInteraction: originalInteraction,
                }
              : item
          )
        );
        toast({ title: 'Something went wrong.', variant: 'destructive' });
      });
  };

  const openComments = (videoId: string) => {
    setCommentVideoId(videoId);
    setIsCommentsOpen(true);
  };

  const handleToggleWatchLater = async (video: Video) => {
    if (!userProfile) {
      toast({ title: 'Please sign in to save to Watch Later.' });
      return;
    }

    const originalInteraction = getInteractionForVideo(video);
    const nextWatchLater = !originalInteraction.watchLater;

    setCurrentInteractions((previous) => ({
      ...previous,
      [video.id]: {
        ...originalInteraction,
        watchLater: nextWatchLater,
      },
    }));

    try {
      const watchLater = await toggleWatchLater(video.id, userProfile.uid);
      setCurrentInteractions((previous) => ({
        ...previous,
        [video.id]: {
          ...(previous[video.id] ?? originalInteraction),
          watchLater,
        },
      }));
      toast({ title: watchLater ? 'Saved to Watch Later' : 'Removed from Watch Later' });
    } catch (error) {
      console.error('Failed to toggle Watch Later for short', error);
      setCurrentInteractions((previous) => ({
        ...previous,
        [video.id]: originalInteraction,
      }));
      toast({ title: 'Something went wrong', variant: 'destructive' });
    }
  };

  const updateSharedVideo = useCallback((updatedVideo: Video) => {
    setVideos((previous) =>
      previous.map((item) => (item.id === updatedVideo.id ? { ...item, ...updatedVideo } : item))
    );
  }, []);

  const buildShareUrl = useCallback((videoId: string) => {
    if (typeof window === 'undefined') {
      return `/shorts/${videoId}`;
    }

    return `${window.location.origin}/shorts/${videoId}`;
  }, []);

  const registerShare = useCallback(
    async (videoId: string) => {
      const updatedVideo = await shareVideo(videoId);
      updateSharedVideo(updatedVideo);
    },
    [updateSharedVideo]
  );

  const openExternalShare = useCallback((url: string) => {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      toast({
        title: 'Pop-up blocked',
        description: 'Please allow pop-ups to open the share link in a new tab.',
      });
    }
  }, [toast]);

  const handleShareAction = useCallback(
    async (video: Video, action: ShareActionId) => {
      const shareUrl = buildShareUrl(video.id);
      const shareText = `Check out this Short: ${video.title}`;
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(shareText);
      const encodedTitle = encodeURIComponent(video.title);

      try {
        switch (action) {
          case 'copy':
            await navigator.clipboard.writeText(shareUrl);
            await registerShare(video.id);
            setCopiedShareVideoId(video.id);
            toast({ title: 'Link copied to clipboard!' });
            break;
          case 'facebook':
            openExternalShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
            await registerShare(video.id);
            break;
          case 'whatsapp':
            openExternalShare(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
            await registerShare(video.id);
            break;
          case 'email':
            await registerShare(video.id);
            openExternalShare(`mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`);
            break;
          case 'x':
            openExternalShare(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
            await registerShare(video.id);
            break;
          case 'more':
            if (navigator.share) {
              await navigator.share({
                title: video.title,
                text: shareText,
                url: shareUrl,
              });
              await registerShare(video.id);
            } else {
              await navigator.clipboard.writeText(shareUrl);
              await registerShare(video.id);
              setCopiedShareVideoId(video.id);
              toast({ title: 'Link copied to clipboard!' });
            }
            break;
          default:
            return;
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error('Failed to share short', error);
        toast({ title: 'Could not share this short right now.', variant: 'destructive' });
      }
    },
    [buildShareUrl, openExternalShare, registerShare, toast]
  );

  if (videos.length === 0) {
    return (
      <div className="relative flex h-screen flex-col bg-background">
        {!isMobile ? <Header /> : null}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main
            className={cn(
            'flex-1 overflow-y-auto bg-background',
            isMobile ? 'h-[calc(100dvh-64px)]' : 'h-[calc(100vh-4rem)]'
          )}
        >
            <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
              <div className="w-full max-w-2xl">
                <EmptyState
                  icon={Film}
                  title="No Shorts available right now"
                  description="Fresh short-form videos will appear here as creators publish them."
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentVideo = videos[activeIndex];
  const currentInteraction = currentVideo ? getInteractionForVideo(currentVideo) : null;
  const currentChannelLink = currentVideo
    ? buildChannelHref(currentVideo.channelHandle || currentVideo.authorId)
    : '/';
  const currentChannelLabel = currentVideo ? currentVideo.channelHandle || currentVideo.channelName : '';
  const currentAuthorDisplay = currentChannelLabel
    ? currentChannelLabel.startsWith('@')
      ? currentChannelLabel
      : `@${currentChannelLabel}`
    : '';
  const shareSheetVideo = shareVideoId ? videos.find((video) => video.id === shareVideoId) ?? null : null;
  const shareActions: Array<{ id: ShareActionId; label: string; icon: React.ReactNode }> = [
    { id: 'copy', label: 'Copy link', icon: <LinkSimple weight="bold" /> },
    { id: 'facebook', label: 'Facebook', icon: <FacebookLogo weight="fill" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <WhatsappLogo weight="fill" /> },
    { id: 'email', label: 'Email', icon: <EnvelopeSimple weight="bold" /> },
    { id: 'x', label: 'X', icon: <XLogo weight="bold" /> },
    { id: 'more', label: 'More', icon: <ShareNetwork weight="bold" /> },
  ];
  const desktopShortsHeader = !isMobile && currentVideo && currentInteraction ? (
    <div className="flex w-full max-w-[52rem] items-center justify-between gap-4 rounded-full border border-border/70 bg-background/92 px-3 py-2 shadow-[0_10px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <Link href={currentChannelLink} className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 border border-border/70">
          <AvatarImage src={currentVideo.channelImageUrl} />
          <AvatarFallback>{currentVideo.channelName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 text-left">
          <div className="truncate text-sm font-semibold text-foreground">{currentAuthorDisplay}</div>
          <div className="truncate text-xs text-muted-foreground">{currentVideo.title}</div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <ShortsHeaderActionButton
          icon={<Heart weight={currentInteraction.liked ? 'fill' : 'regular'} />}
          label="Like short"
          value={formatCount(currentVideo.likes)}
          onClick={() => handleLike(currentVideo)}
          active={currentInteraction.liked}
        />
        <ShortsHeaderActionButton
          icon={<ChatCircle weight="regular" />}
          label="Open comments"
          value={formatCount(currentVideo.commentCount)}
          onClick={() => openComments(currentVideo.id)}
        />
        <ShortsHeaderActionButton
          icon={<PaperPlaneTilt weight="regular" />}
          label="Share short"
          onClick={() => setShareVideoId(currentVideo.id)}
        />
        <ShortsHeaderActionButton
          icon={<BookmarkSimple weight={currentInteraction.watchLater ? 'fill' : 'regular'} />}
          label="Save short"
          onClick={() => void handleToggleWatchLater(currentVideo)}
          active={currentInteraction.watchLater}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/92 text-foreground transition-colors hover:bg-secondary/75"
              aria-label="More actions"
            >
              <DotsThreeOutlineVertical weight="bold" className="h-[1.1rem] w-[1.1rem]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 border-white/10 bg-[#121821]/95 text-white backdrop-blur-md"
          >
            <DropdownMenuItem
              onClick={() => handleDislike(currentVideo)}
              className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 focus:bg-white/10"
            >
              <ThumbsDown
                className={cn('h-4 w-4', currentInteraction.disliked && 'fill-current')}
                weight={currentInteraction.disliked ? 'fill' : 'regular'}
              />
              <span>{currentInteraction.disliked ? 'Remove dislike' : 'Dislike'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative flex h-screen flex-col bg-background">
      {!isMobile ? <Header desktopCenterSlot={desktopShortsHeader} /> : null}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            'flex-1 overflow-y-hidden bg-background',
            isMobile ? 'h-[calc(100dvh-64px)]' : 'h-[calc(100vh-4rem)]'
          )}
        >
          <div className="relative h-full overflow-hidden bg-background">
            <Dialog
              open={Boolean(shareSheetVideo)}
              onOpenChange={(open) => {
                if (!open) {
                  setShareVideoId(null);
                  setCopiedShareVideoId(null);
                }
              }}
            >
              <DialogContent className="left-1/2 top-auto bottom-2 w-[calc(100vw-1rem)] max-w-[34rem] translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#202228] p-0 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[1.9rem]">
                <div className="border-b border-white/8 px-6 py-4 text-center">
                  <DialogTitle className="text-lg font-semibold text-white">Share</DialogTitle>
                </div>
                <div className="max-h-[min(72vh,28rem)] overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                  <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 sm:gap-x-4">
                    {shareSheetVideo
                      ? shareActions.map((action) => (
                          (() => {
                            const isCopied =
                              action.id === 'copy' &&
                              copiedShareVideoId === shareSheetVideo.id;

                            return (
                          <button
                            key={action.id}
                            type="button"
                            className={cn(
                              'flex flex-col items-center gap-2 text-center text-white transition-all duration-200 hover:scale-[1.03]',
                              isCopied && 'scale-[1.05]'
                            )}
                            onClick={() => handleShareAction(shareSheetVideo, action.id)}
                          >
                            <span
                              className={cn(
                                'flex h-14 w-14 items-center justify-center rounded-full bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm transition-all duration-200 [&_svg]:h-6 [&_svg]:w-6',
                                isCopied && 'bg-[#2d8f5a] text-white shadow-[0_12px_32px_rgba(45,143,90,0.35)]'
                              )}
                            >
                              {isCopied ? <Check weight="bold" /> : action.icon}
                            </span>
                            <span className={cn('text-xs font-medium text-white/90', isCopied && 'text-[#7df0ad]')}>
                              {isCopied ? 'Copied' : action.label}
                            </span>
                          </button>
                            );
                          })()
                        ))
                      : null}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {!isMobile ? (
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top,_rgba(44,54,72,0.2),_transparent_42%)]" />
            ) : null}
            <ShortsCommentsSheet
              isOpen={isCommentsOpen}
              onOpenChange={setIsCommentsOpen}
              videoId={commentVideoId}
              commentCount={currentVideo?.commentCount || 0}
            />
            <div
              ref={scrollViewportRef}
              className={cn(
                'relative h-full overflow-y-auto scroll-smooth snap-y snap-mandatory overscroll-y-contain',
                isMobile ? 'px-0 py-0' : 'px-3 py-0 sm:px-6'
              )}
            >
              {videos.map((video, index) => {
                const isOwner = userProfile?.uid === video.authorId;
                const isSubscribed = userProfile ? isSubscribedTo(video.authorId || '') : false;
                const interaction = getInteractionForVideo(video);
                const channelLink = buildChannelHref(video.channelHandle || video.authorId);
                const channelLabel = video.channelHandle || video.channelName;
                const authorDisplay = channelLabel.startsWith('@') ? channelLabel : `@${channelLabel}`;
                const isDescriptionExpanded = Boolean(expandedDescriptions[video.id]);
                const canToggleDescription = video.title.trim().length > 110;

                return (
                  <section
                    key={video.id}
                    ref={(node) => {
                      slideRefs.current[index] = node;
                    }}
                    data-index={index}
                    className={cn(
                      'relative flex snap-start snap-always justify-center',
                      isMobile ? 'h-full min-h-full items-center' : 'min-h-full items-end py-0'
                    )}
                  >
                    <div
                      className={cn(
                        'relative justify-center',
                        isMobile
                          ? 'flex h-full w-full'
                          : 'grid h-full w-full max-w-[1220px] grid-cols-[18rem_minmax(22rem,24rem)_18rem] items-end gap-6 xl:grid-cols-[20rem_minmax(22rem,24rem)_20rem]'
                      )}
                    >
                      {!isMobile ? (
                        <div className="hidden self-end pb-4 lg:block">
                          <div className="rounded-[28px] border border-border/60 bg-background/88 p-5 text-left text-foreground shadow-[0_18px_48px_rgba(0,0,0,0.08)] backdrop-blur-xl">
                            <Link href={channelLink} className="block text-sm font-semibold text-foreground/90 hover:text-foreground">
                              {authorDisplay}
                            </Link>
                            {canToggleDescription ? (
                              <button
                                type="button"
                                onClick={() => toggleDescriptionExpanded(video.id)}
                                className="mt-3 block w-full text-left"
                              >
                                <p
                                  className={cn(
                                    'text-sm font-medium leading-6 text-foreground/90 transition-opacity hover:opacity-85',
                                    isDescriptionExpanded ? 'line-clamp-none' : 'line-clamp-3'
                                  )}
                                >
                                  {video.title}
                                </p>
                              </button>
                            ) : (
                              <p className="mt-3 text-sm font-medium leading-6 text-foreground/90">{video.title}</p>
                            )}
                            {video.audioUrl ? (
                              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1.5 text-xs text-muted-foreground">
                                <MusicNotesSimple className="h-3.5 w-3.5" weight="fill" />
                                <span className="truncate">Original audio - {video.channelName}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div
                        className={cn(
                          'relative overflow-hidden bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]',
                          isMobile ? 'h-full w-full rounded-none' : 'h-[calc(100vh-4.35rem)] w-[min(100vw-220px,390px)] justify-self-center self-end rounded-[28px] border border-white/8'
                        )}
                      >
                        <ShortsPlayer
                          video={video}
                          isActive={index === activeIndex}
                          shouldLoad={index === activeIndex}
                          isMuted={isMuted}
                          onMuteChange={setIsMuted}
                        />

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-16">
                          <div className="max-w-[calc(100%-16px)]">
                            <div className="pointer-events-auto flex items-center gap-3">
                              <Link href={channelLink}>
                                <Avatar className="h-9 w-9 border border-white/15">
                                  <AvatarImage src={video.channelImageUrl} />
                                  <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
                                </Avatar>
                              </Link>
                              <Link href={channelLink} className="text-sm font-semibold text-white">
                                {authorDisplay}
                              </Link>
                              {!isOwner ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleSubscription(video.authorId || '')}
                                  className="h-8 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/18"
                                >
                                  {isSubscribed ? 'Following' : 'Follow'}
                                </Button>
                              ) : null}
                            </div>

                            {isMobile ? (
                              <div className="mt-3 max-w-[calc(100%-1rem)]">
                                {canToggleDescription ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleDescriptionExpanded(video.id)}
                                    className="pointer-events-auto block w-full text-left"
                                  >
                                    <p
                                      className={cn(
                                        'text-sm font-medium leading-5 text-white/95 transition-opacity hover:opacity-90',
                                        isDescriptionExpanded ? 'line-clamp-none' : 'line-clamp-3'
                                      )}
                                    >
                                      {video.title}
                                    </p>
                                  </button>
                                ) : (
                                  <p className="text-sm font-medium leading-5 text-white/95">{video.title}</p>
                                )}
                              </div>
                            ) : null}

                            {video.audioUrl ? (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/85 backdrop-blur-sm">
                                <MusicNotesSimple className="h-3.5 w-3.5" weight="fill" />
                                <span className="truncate">Original audio - {video.channelName}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'z-30 flex flex-col items-center gap-3 sm:gap-4',
                          isMobile ? 'absolute bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3' : 'hidden'
                        )}
                      >
                        <ShortsRailButton
                          icon={<Heart weight={interaction.liked ? 'fill' : 'regular'} />}
                          label="Like short"
                          value={formatCount(video.likes)}
                          onClick={() => handleLike(video)}
                          active={interaction.liked}
                        />
                        <ShortsRailButton
                          icon={<ChatCircle weight="regular" />}
                          label="Open comments"
                          value={formatCount(video.commentCount)}
                          onClick={() => openComments(video.id)}
                        />
                        <ShortsRailButton
                          icon={<PaperPlaneTilt weight="regular" />}
                          label="Share short"
                          onClick={() => setShareVideoId(video.id)}
                        />
                        <ShortsRailButton
                          icon={<BookmarkSimple weight={interaction.watchLater ? 'fill' : 'regular'} />}
                          label="Save short"
                          onClick={() => void handleToggleWatchLater(video)}
                          active={interaction.watchLater}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex h-11 w-11 items-center justify-center bg-transparent text-foreground sm:h-12 sm:w-12 [&_svg]:h-7 [&_svg]:w-7 sm:[&_svg]:h-[1.8rem] sm:[&_svg]:w-[1.8rem]"
                              aria-label="More actions"
                            >
                              <DotsThreeOutlineVertical weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 border-white/10 bg-[#121821]/95 text-white backdrop-blur-md"
                          >
                            <DropdownMenuItem
                              onClick={() => handleDislike(video)}
                              className="cursor-pointer gap-3 rounded-lg px-3 py-2.5 focus:bg-white/10"
                            >
                              <ThumbsDown className={cn('h-4 w-4', interaction.disliked && 'fill-current')} weight={interaction.disliked ? 'fill' : 'regular'} />
                              <span>{interaction.disliked ? 'Remove dislike' : 'Dislike'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Link href={channelLink} className="mt-1">
                          <Avatar className="h-11 w-11 border border-white/20 shadow-lg">
                            <AvatarImage src={video.channelImageUrl} />
                            <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </Link>
                      </div>

                    </div>
                  </section>
                );
              })}
            </div>
            {!isMobile ? (
              <div className="absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-4 xl:right-6 2xl:right-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-[4.1rem] w-[4.1rem] rounded-full border border-border/60 bg-background/80 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-md hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => scrollToIndex(activeIndex - 1)}
                  disabled={activeIndex === 0}
                >
                  <CaretUp className="h-8 w-8" weight="bold" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-[4.1rem] w-[4.1rem] rounded-full border border-border/60 bg-background/80 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-md hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => scrollToIndex(activeIndex + 1)}
                  disabled={activeIndex === videos.length - 1}
                >
                  <CaretDown className="h-8 w-8" weight="bold" />
                </Button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
