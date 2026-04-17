'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, Loader2, Maximize2, Pause, Play, RefreshCw, WifiOff, X } from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPlaybackSession } from '@/lib/media/client';
import { useProgressRouter } from '@/hooks/use-progress-router';

type MiniPlayerState = {
  video: Video;
  sourceUrl: string;
  startTime: number;
  autoplay: boolean;
  muted: boolean;
  volume: number;
};

type MiniPlayerContextValue = {
  miniPlayer: MiniPlayerState | null;
  openMiniPlayer: (state: MiniPlayerState) => Promise<void>;
  closeMiniPlayer: () => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue>({
  miniPlayer: null,
  openMiniPlayer: async () => {},
  closeMiniPlayer: () => {},
});

const MINI_PLAYER_WIDTH = 360;
const MINI_PLAYER_HEIGHT = 232;
const MINI_PLAYER_POSITION_STORAGE_KEY = 'waslmedia-mini-player-position';
const MINI_PLAYER_SIZE_STORAGE_KEY = 'waslmedia-mini-player-size';
const MINI_PLAYER_STATE_STORAGE_KEY = 'waslmedia-mini-player-state';
const MINI_PLAYER_MIN_WIDTH = 280;
const MINI_PLAYER_MIN_HEIGHT = 158;
const MINI_PLAYER_MAX_WIDTH = 720;
const MINI_PLAYER_MAX_HEIGHT = 420;
const MINI_PLAYER_MOBILE_BOTTOM_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)';
const CONTROL_BUTTON_CLASS =
  'inline-flex h-9 w-9 items-center justify-center rounded-full text-current transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';

function clampPosition(x: number, y: number) {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  return {
    x: Math.min(Math.max(16, x), Math.max(16, window.innerWidth - MINI_PLAYER_WIDTH - 16)),
    y: Math.min(Math.max(16, y), Math.max(16, window.innerHeight - MINI_PLAYER_HEIGHT - 16)),
  };
}

function clampSize(width: number, height: number) {
  if (typeof window === 'undefined') {
    return { width, height };
  }

  return {
    width: Math.min(Math.max(MINI_PLAYER_MIN_WIDTH, width), Math.min(MINI_PLAYER_MAX_WIDTH, window.innerWidth - 32)),
    height: Math.min(Math.max(MINI_PLAYER_MIN_HEIGHT, height), Math.min(MINI_PLAYER_MAX_HEIGHT, window.innerHeight - 32)),
  };
}

function FloatingVideoPlayerWindow({
  state,
  onClose,
  onReady,
  onStateChange,
}: {
  state: MiniPlayerState;
  onClose: () => void;
  onReady: () => void;
  onStateChange: (nextState: MiniPlayerState) => void;
}) {
  const router = useProgressRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const resizeStateRef = useRef<{ pointerId: number; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const lastSyncedTimeRef = useRef(state.startTime || 0);
  const isClosingRef = useRef(false);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isPlaying, setIsPlaying] = useState(state.autoplay);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [sourceUrl, setSourceUrl] = useState(state.sourceUrl);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: MINI_PLAYER_WIDTH, height: MINI_PLAYER_HEIGHT });
  const [showChrome, setShowChrome] = useState(isMobile);
  const [effectiveMuted, setEffectiveMuted] = useState(state.autoplay ? true : state.muted);
  const [effectiveVolume, setEffectiveVolume] = useState(state.volume > 0 ? state.volume : 1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const readyReportedRef = useRef(false);

  useEffect(() => {
    setSourceUrl(state.sourceUrl);
    readyReportedRef.current = false;
    lastSyncedTimeRef.current = state.startTime || 0;
    isClosingRef.current = false;
    setEffectiveMuted(state.autoplay ? true : state.muted);
    setEffectiveVolume(state.volume > 0 ? state.volume : 1);
    setIsInitializing(true);
    setIsBuffering(false);
    setPlaybackError(null);
  }, [state.sourceUrl, state.video.id]);

  useEffect(() => {
    if (isMobile) {
      setShowChrome(true);
      return;
    }

    setShowChrome(false);
  }, [isMobile, state.video.id]);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined' || isMobile) {
        return;
      }

      setPosition((current) => {
        if (current) {
          return clampPosition(current.x, current.y);
        }

        try {
          const raw = window.localStorage.getItem(MINI_PLAYER_POSITION_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { x?: number; y?: number };
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
              return clampPosition(parsed.x, parsed.y);
            }
          }
        } catch (error) {
          console.error('Failed to restore mini player position', error);
        }

        return clampPosition(window.innerWidth - MINI_PLAYER_WIDTH - 24, window.innerHeight - MINI_PLAYER_HEIGHT - 24);
      });

      try {
        const raw = window.localStorage.getItem(MINI_PLAYER_SIZE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { width?: number; height?: number };
          if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
            setSize(clampSize(parsed.width, parsed.height));
            return;
          }
        }
      } catch (error) {
        console.error('Failed to restore mini player size', error);
      }

      setSize(clampSize(MINI_PLAYER_WIDTH, MINI_PLAYER_HEIGHT));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile || !position || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(MINI_PLAYER_POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [isMobile, position]);

  useEffect(() => {
    if (isMobile || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(MINI_PLAYER_SIZE_STORAGE_KEY, JSON.stringify(size));
  }, [isMobile, size]);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    setIsOffline(!navigator.onLine);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const reportReady = () => {
      if (readyReportedRef.current) {
        return;
      }

      readyReportedRef.current = true;
      onReady();
    };

    const restoreAudio = () => {
      if (state.muted || !videoRef.current) {
        return;
      }

      const targetVolume = state.volume > 0 ? state.volume : 1;
      const attempt = (remaining: number) => {
        if (!videoRef.current) {
          return;
        }

        videoRef.current.muted = false;
        videoRef.current.volume = targetVolume;
        setEffectiveMuted(false);
        setEffectiveVolume(targetVolume);

        if (remaining > 0 && videoRef.current.muted) {
          window.setTimeout(() => attempt(remaining - 1), 120);
        }
      };

      attempt(4);
    };

    const syncState = () => {
      if (isClosingRef.current) {
        return;
      }

      const nextState: MiniPlayerState = {
        ...state,
        sourceUrl,
        startTime: videoElement.currentTime || state.startTime || 0,
        autoplay: !videoElement.paused,
        muted: effectiveMuted,
        volume: videoElement.volume > 0 ? videoElement.volume : effectiveVolume,
      };
      lastSyncedTimeRef.current = nextState.startTime;
      onStateChange(nextState);
    };

    const handleLoadedMetadata = () => {
      videoElement.currentTime = state.startTime || 0;
      const targetVolume = state.volume > 0 ? state.volume : 1;
      const targetMuted = state.autoplay ? true : false;
      videoElement.muted = targetMuted;
      videoElement.volume = targetVolume;
      setEffectiveMuted(targetMuted);
      setEffectiveVolume(targetVolume);
      setIsInitializing(false);
      setIsBuffering(false);
      setPlaybackError(null);
      if (state.autoplay) {
        videoElement
          .play()
          .then(() => {
            setIsPlaying(true);
            restoreAudio();
            reportReady();
          })
          .catch(() => {
            setIsPlaying(false);
            setPlaybackError('Tap play to continue playback.');
            reportReady();
          });
      } else {
        videoElement.muted = false;
        videoElement.pause();
        setIsPlaying(false);
        reportReady();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsInitializing(false);
      setIsBuffering(false);
      setPlaybackError(null);
      restoreAudio();
      syncState();
    };
    const handlePause = () => {
      setIsPlaying(false);
      syncState();
    };
    const handleVolumeChange = () => {
      setEffectiveMuted(videoElement.muted);
      setEffectiveVolume(videoElement.volume > 0 ? videoElement.volume : effectiveVolume);
      syncState();
    };
    const handleTimeUpdate = () => {
      if (Math.abs(videoElement.currentTime - lastSyncedTimeRef.current) >= 1) {
        syncState();
      }
    };
    const handleLoadStart = () => {
      setIsInitializing(true);
      setIsBuffering(true);
      setPlaybackError(null);
    };
    const handleCanPlay = () => {
      setIsInitializing(false);
      setIsBuffering(false);
      if (!state.autoplay) {
        reportReady();
      }
    };
    const handleWaiting = () => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        setIsBuffering(true);
      }
    };
    const handleSeeking = () => {
      setIsBuffering(true);
    };
    const handleSeeked = () => {
      setIsBuffering(false);
    };
    const handleStalled = () => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        setIsBuffering(true);
      }
    };
    const handleVideoError = () => {
      setIsInitializing(false);
      setIsBuffering(false);
      setPlaybackError(typeof navigator !== 'undefined' && !navigator.onLine ? 'No internet connection.' : 'Video could not load.');
    };
    const handlePageHide = () => {
      syncState();
    };
    const handleOnline = () => {
      setIsOffline(false);
      setPlaybackError(null);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsBuffering(false);
      setPlaybackError('No internet connection.');
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('playing', handleCanPlay);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('seeked', handleSeeked);
    videoElement.addEventListener('stalled', handleStalled);
    videoElement.addEventListener('error', handleVideoError);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    document.addEventListener('visibilitychange', handlePageHide);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('playing', handleCanPlay);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('seeked', handleSeeked);
      videoElement.removeEventListener('stalled', handleStalled);
      videoElement.removeEventListener('error', handleVideoError);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      document.removeEventListener('visibilitychange', handlePageHide);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onReady, onStateChange, retryNonce, sourceUrl, state.video.id]);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  const togglePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    if (videoElement.paused) {
      videoElement.muted = false;
      videoElement.volume = videoElement.volume > 0 ? videoElement.volume : 1;
      setEffectiveMuted(false);
      setEffectiveVolume(videoElement.volume > 0 ? videoElement.volume : 1);
      videoElement.play().catch(() => setIsPlaying(false));
      return;
    }

    videoElement.pause();
  };

  const maximize = () => {
    isClosingRef.current = true;
    const currentTime = Math.floor(videoRef.current?.currentTime || state.startTime || 0);
    onStateChange({
      ...state,
      sourceUrl,
      startTime: currentTime,
      autoplay: !videoRef.current?.paused,
      muted: false,
      volume: (videoRef.current?.volume ?? effectiveVolume) > 0 ? (videoRef.current?.volume ?? effectiveVolume) : 1,
    });
    onClose();
    router.push(`/watch/${state.video.id}?src=miniplayer&t=${currentTime}`);
  };

  const close = () => {
    isClosingRef.current = true;
    onStateChange({
      ...state,
      sourceUrl,
      startTime: videoRef.current?.currentTime || state.startTime || 0,
      autoplay: false,
      muted: false,
      volume: (videoRef.current?.volume ?? effectiveVolume) > 0 ? (videoRef.current?.volume ?? effectiveVolume) : 1,
    });
    videoRef.current?.pause();
    onClose();
  };

  const retryPlayback = () => {
    setPlaybackError(null);
    setIsInitializing(true);
    setIsBuffering(false);
    setRetryNonce((current) => current + 1);
    setSourceUrl(state.sourceUrl);
    if (videoRef.current) {
      videoRef.current.currentTime = state.startTime || 0;
      videoRef.current.muted = effectiveMuted;
      videoRef.current.volume = effectiveVolume > 0 ? effectiveVolume : 1;
      videoRef.current.load();
      if (state.autoplay) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  };

  const handleControlClick =
    (action: () => void) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }

    const basePosition =
      position ||
      clampPosition(
        (typeof window !== 'undefined' ? window.innerWidth : MINI_PLAYER_WIDTH) - MINI_PLAYER_WIDTH - 24,
        (typeof window !== 'undefined' ? window.innerHeight : MINI_PLAYER_HEIGHT) - MINI_PLAYER_HEIGHT - 24
      );

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - basePosition.x,
      offsetY: event.clientY - basePosition.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    setPosition(clampPosition(event.clientX - dragStateRef.current.offsetX, event.clientY - dragStateRef.current.offsetY));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }

    resizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !resizeStateRef.current || resizeStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextWidth = resizeStateRef.current.startWidth + (event.clientX - resizeStateRef.current.startX);
    const nextHeight = resizeStateRef.current.startHeight + (event.clientY - resizeStateRef.current.startY);
    setSize(clampSize(nextWidth, nextHeight));
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStateRef.current || resizeStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    resizeStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const windowStyle = isMobile
    ? {
        left: '12px',
        right: '12px',
        bottom: MINI_PLAYER_MOBILE_BOTTOM_OFFSET,
        width: 'auto',
        height: '88px',
      }
    : {
        left: `${position?.x ?? 16}px`,
        top: `${position?.y ?? 16}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      };

  const isStatusVisible = isInitializing || isBuffering;
  const showPlaybackBanner = Boolean(playbackError || isOffline);

  if (isMobile) {
    return (
      <div
        className="fixed z-[100] overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90"
        style={windowStyle}
      >
        <div className="flex h-full items-center gap-3 px-3 py-2">
          <button
            type="button"
            className="relative h-[64px] w-[116px] shrink-0 overflow-hidden rounded-xl bg-black"
            onClick={maximize}
          >
            <video
              ref={videoRef}
              src={sourceUrl}
              className="h-full w-full object-cover"
              playsInline
              autoPlay={state.autoplay}
              muted={effectiveMuted}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                togglePlayPause();
              }}
              onError={() => {
                createPlaybackSession(state.video.id, 'watch')
                  .then((session) => {
                    setSourceUrl(session.directSourceUrl);
                    setPlaybackError(null);
                    setIsInitializing(true);
                    onStateChange({
                      ...state,
                      sourceUrl: session.directSourceUrl,
                      startTime: videoRef.current?.currentTime || state.startTime || 0,
                      autoplay: !videoRef.current?.paused,
                      muted: effectiveMuted,
                      volume: (videoRef.current?.volume ?? effectiveVolume) > 0 ? (videoRef.current?.volume ?? effectiveVolume) : 1,
                    });
                  })
                  .catch((error) => {
                    console.error('Failed to load floating video fallback playback', error);
                    setPlaybackError(typeof navigator !== 'undefined' && !navigator.onLine ? 'No internet connection.' : 'Video could not load.');
                    setIsInitializing(false);
                    setIsBuffering(false);
                  });
              }}
            />
            {isStatusVisible ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-black/45 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{state.video.title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {playbackError || isOffline
                ? (isOffline ? 'Check your connection.' : 'Tap retry to keep watching.')
                : isBuffering && !isInitializing
                  ? 'Just a moment...'
                  : isInitializing
                    ? 'Getting your video ready...'
                    : state.video.channelName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {playbackError || isOffline ? (
              <button
                type="button"
                className={cn(CONTROL_BUTTON_CLASS, 'text-foreground hover:bg-secondary disabled:opacity-60')}
                onClick={handleControlClick(retryPlayback)}
                disabled={isOffline}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              className={cn(CONTROL_BUTTON_CLASS, 'text-foreground hover:bg-secondary')}
              onClick={handleControlClick(togglePlayPause)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className={cn(CONTROL_BUTTON_CLASS, 'text-foreground hover:bg-secondary')}
              onClick={handleControlClick(maximize)}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(CONTROL_BUTTON_CLASS, 'text-foreground hover:bg-secondary')}
              onClick={handleControlClick(close)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group fixed z-[100] overflow-hidden rounded-2xl border border-border/80 bg-black shadow-2xl',
        'top-4'
      )}
      style={windowStyle}
      onMouseEnter={() => setShowChrome(true)}
      onMouseLeave={() => !isMobile && setShowChrome(false)}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 py-2 transition-opacity',
          showChrome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className={cn('min-w-0 flex-1', !isMobile && 'cursor-move')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <p className="truncate text-sm font-semibold text-white">{state.video.title}</p>
          <p className="truncate text-xs text-white/75">{state.video.channelName}</p>
        </div>
        <div className="ml-3 flex items-center gap-1">
          <button
            type="button"
            className={cn(CONTROL_BUTTON_CLASS, 'h-8 w-8 text-white')}
            onClick={handleControlClick(togglePlayPause)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className={cn(CONTROL_BUTTON_CLASS, 'h-8 w-8 text-white')}
            onClick={handleControlClick(maximize)}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(CONTROL_BUTTON_CLASS, 'h-8 w-8 text-white')}
            onClick={handleControlClick(close)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative h-full w-full bg-black">
        <video
          ref={videoRef}
          src={sourceUrl}
          className="h-full w-full object-cover"
          playsInline
          autoPlay={state.autoplay}
          muted={effectiveMuted}
          onClick={togglePlayPause}
          onError={() => {
            createPlaybackSession(state.video.id, 'watch')
              .then((session) => {
                setSourceUrl(session.directSourceUrl);
                setPlaybackError(null);
                setIsInitializing(true);
                onStateChange({
                  ...state,
                  sourceUrl: session.directSourceUrl,
                  startTime: videoRef.current?.currentTime || state.startTime || 0,
                  autoplay: !videoRef.current?.paused,
                  muted: effectiveMuted,
                  volume: (videoRef.current?.volume ?? effectiveVolume) > 0 ? (videoRef.current?.volume ?? effectiveVolume) : 1,
                });
              })
              .catch((error) => {
                console.error('Failed to load floating video fallback playback', error);
                setPlaybackError(typeof navigator !== 'undefined' && !navigator.onLine ? 'No internet connection.' : 'Video could not load.');
                setIsInitializing(false);
                setIsBuffering(false);
              });
          }}
        />
        {isStatusVisible ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">{isBuffering && !isInitializing ? 'Buffering...' : 'Loading...'}</span>
            </div>
          </div>
        ) : null}
        {showPlaybackBanner ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
              {isOffline ? <WifiOff className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{isOffline ? 'You are offline' : 'Playback interrupted'}</p>
                <p className="text-xs text-white/80">{isOffline ? 'Reconnect to continue playback.' : 'The video could not keep playing right now.'}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-60"
                onClick={retryPlayback}
                disabled={isOffline}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </div>
        ) : null}
        {!isMobile ? (
          <div
            className={cn(
              'absolute bottom-2 right-2 z-20 h-4 w-4 cursor-nwse-resize rounded-sm bg-white/65 shadow-md transition-opacity',
              showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            title="Resize mini player"
          />
        ) : null}
      </div>
    </div>
  );
}

export function FloatingVideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState | null>(null);
  const [pendingMiniPlayer, setPendingMiniPlayer] = useState<MiniPlayerState | null>(null);
  const readyResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(MINI_PLAYER_STATE_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as MiniPlayerState | null;
      if (parsed?.video?.id && typeof parsed.sourceUrl === 'string') {
        setMiniPlayer(parsed);
      }
    } catch (error) {
      console.error('Failed to restore mini player state', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!miniPlayer) {
      window.localStorage.removeItem(MINI_PLAYER_STATE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(MINI_PLAYER_STATE_STORAGE_KEY, JSON.stringify(miniPlayer));
  }, [miniPlayer]);

  useEffect(() => {
    if (!pathname.startsWith('/watch/')) {
      return;
    }

    setMiniPlayer(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MINI_PLAYER_STATE_STORAGE_KEY);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith('/watch/')) {
      return;
    }

    if (!pendingMiniPlayer) {
      return;
    }

    setMiniPlayer(pendingMiniPlayer);
    setPendingMiniPlayer(null);
  }, [pathname, pendingMiniPlayer]);

  const handleReady = useCallback(() => {
    readyResolverRef.current?.();
    readyResolverRef.current = null;
  }, []);

  const openMiniPlayer = useCallback(
    (state: MiniPlayerState) =>
      new Promise<void>((resolve) => {
        readyResolverRef.current = resolve;
        if (pathname.startsWith('/watch/')) {
          setPendingMiniPlayer(state);
          return;
        }

        setMiniPlayer(state);
      }),
    [pathname]
  );

  const closeMiniPlayer = useCallback(() => {
    setMiniPlayer(null);
  }, []);

  const value = useMemo(
    () => ({
      miniPlayer,
      openMiniPlayer,
      closeMiniPlayer,
    }),
    [closeMiniPlayer, miniPlayer, openMiniPlayer]
  );

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
      {miniPlayer ? (
        <FloatingVideoPlayerWindow
          state={miniPlayer}
          onClose={closeMiniPlayer}
          onReady={handleReady}
          onStateChange={setMiniPlayer}
        />
      ) : null}
    </MiniPlayerContext.Provider>
  );
}

export function useFloatingVideoPlayer() {
  return useContext(MiniPlayerContext);
}
