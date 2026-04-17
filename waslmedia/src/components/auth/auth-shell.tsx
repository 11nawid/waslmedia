'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Globe2, Monitor, Moon, Sun } from 'lucide-react';
import { WaslmediaLogo } from '@/components/waslmedia-logo';
import { useLanguageStore } from '@/hooks/use-language-store';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { uiAssetUrls } from '@/lib/ui-assets';

interface AuthShellProps {
  children: ReactNode;
}

interface AuthProviderButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  primary?: boolean;
}

export function AuthPanelFrame({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="auth-title">{title}</h1>
      </div>
      {children}
      {footer}
    </div>
  );
}

export function AuthPanelSkeleton({
  titleWidth = 'w-64',
  showProviders = true,
}: {
  titleWidth?: string;
  showProviders?: boolean;
}) {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-4 text-center">
        <div className={cn('auth-skeleton mx-auto h-6 rounded-full sm:h-8', titleWidth)} />
      </div>

      <div className="space-y-3">
        {showProviders ? (
          <>
            <div className="auth-skeleton h-[58px] w-full rounded-full" />
            <div className="auth-skeleton h-[58px] w-full rounded-full" />
            <div className="auth-skeleton h-[58px] w-full rounded-full" />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="auth-skeleton h-4 w-20 rounded-full" />
              <div className="auth-skeleton h-14 w-full rounded-sm" />
            </div>
            <div className="space-y-2">
              <div className="auth-skeleton h-4 w-24 rounded-full" />
              <div className="auth-skeleton h-14 w-full rounded-sm" />
            </div>
            <div className="auth-skeleton h-[52px] w-full rounded-full" />
            <div className="auth-skeleton h-[52px] w-full rounded-full" />
          </>
        )}
      </div>

      <div className="space-y-4 text-center">
        <div className="auth-skeleton mx-auto h-4 w-52 rounded-full" />
        <div className="auth-skeleton mx-auto h-3 w-72 rounded-full" />
      </div>
    </div>
  );
}

export function AuthLegalNotice() {
  return (
    <p className="auth-footer-copy">
      By continuing, you agree to Waslmedia&apos;s{' '}
      <Link href="/help-center/legal/terms" className="auth-copy-link">
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link href="/help-center/legal/privacy" className="auth-copy-link">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

export function GoogleMark() {
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-[11px] font-bold text-slate-900 shadow-sm">
      G
    </span>
  );
}

export function AzravibeMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-200 via-white to-slate-400 text-[10px] font-bold text-slate-900 shadow-sm">
      A
    </span>
  );
}

export function AuthProviderButton({ label, icon, onClick, primary }: AuthProviderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-3 rounded-full border px-5 py-3.5 text-sm font-medium transition-all',
        primary
          ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_45px_-22px_rgba(15,23,42,0.45)] hover:bg-slate-800 dark:border-white/70 dark:bg-white dark:text-slate-950 dark:shadow-[0_16px_45px_-22px_rgba(255,255,255,0.65)] dark:hover:bg-white/90'
          : 'border-slate-200 bg-white/75 text-slate-900 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.035] dark:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.06]'
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AuthVisual({ darkMode }: { darkMode: boolean }) {
  const forwardVideoRef = useRef<HTMLVideoElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const handoffInProgressRef = useRef(false);
  const playRetryTimeoutRef = useRef<number | null>(null);
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [forwardReady, setForwardReady] = useState(false);
  const [reverseReady, setReverseReady] = useState(false);
  const [visualVisible, setVisualVisible] = useState(false);
  const [activeClip, setActiveClip] = useState<'forward' | 'reverse'>('forward');
  const [pendingClip, setPendingClip] = useState<'forward' | 'reverse' | null>('forward');
  const [hasCompletedInitialForward, setHasCompletedInitialForward] = useState(false);
  const [logoSrc, setLogoSrc] = useState(uiAssetUrls.brandLogo);
  const visualDate = '02 APR 2026';
  const visualCaption = 'Quiet access. Clear intent.';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisualVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!videoAvailable) {
      return;
    }

    const setupVideo = (video: HTMLVideoElement | null) => {
      if (!video) {
        return;
      }

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = false;
      video.pause();
      video.playbackRate = 0.82;
    };

    setupVideo(forwardVideoRef.current);
    setupVideo(reverseVideoRef.current);

    return () => {
      forwardVideoRef.current?.pause();
      reverseVideoRef.current?.pause();
      if (playRetryTimeoutRef.current !== null) {
        window.clearTimeout(playRetryTimeoutRef.current);
        playRetryTimeoutRef.current = null;
      }
    };
  }, [videoAvailable]);

  const playClip = async (clip: 'forward' | 'reverse', attempt = 0) => {
    const nextVideo = clip === 'forward' ? forwardVideoRef.current : reverseVideoRef.current;
    const previousVideo = clip === 'forward' ? reverseVideoRef.current : forwardVideoRef.current;
    const isReady = clip === 'forward' ? forwardReady : reverseReady;

    if (!nextVideo || !isReady || !Number.isFinite(nextVideo.duration) || nextVideo.duration <= 0) {
      return;
    }

    nextVideo.pause();
    nextVideo.currentTime =
      clip === 'forward' && hasCompletedInitialForward
        ? Math.min(2, Math.max(0, nextVideo.duration - 0.05))
        : 0;
    nextVideo.playbackRate = 0.82;

    try {
      await nextVideo.play();
      window.requestAnimationFrame(() => {
        setActiveClip(clip);
        setPendingClip(null);
        handoffInProgressRef.current = false;

        window.setTimeout(() => {
          previousVideo?.pause();
        }, 90);
      });
    } catch {
      if (attempt >= 4) {
        handoffInProgressRef.current = false;
        setVideoAvailable(false);
        return;
      }

      playRetryTimeoutRef.current = window.setTimeout(() => {
        void playClip(clip, attempt + 1);
      }, 120);
    }
  };

  const beginClipSwitch = (clip: 'forward' | 'reverse') => {
    if (handoffInProgressRef.current) {
      return;
    }

    handoffInProgressRef.current = true;
    setPendingClip(clip);
  };

  useEffect(() => {
    if (!videoAvailable || !pendingClip) {
      return;
    }

    if (pendingClip === 'forward' && forwardReady) {
      void playClip('forward');
    }

    if (pendingClip === 'reverse' && reverseReady) {
      void playClip('reverse');
    }
  }, [videoAvailable, forwardReady, reverseReady, pendingClip, hasCompletedInitialForward]);

  const recoverPlayback = (clip: 'forward' | 'reverse') => {
    if (!videoAvailable || pendingClip || activeClip !== clip || document.visibilityState !== 'visible') {
      return;
    }

    const video = clip === 'forward' ? forwardVideoRef.current : reverseVideoRef.current;
    if (!video || video.ended) {
      return;
    }

    window.setTimeout(() => {
      if (activeClip !== clip || pendingClip || document.visibilityState !== 'visible') {
        return;
      }

      void video.play().catch(() => {
        // Keep current visuals and let the normal handoff/fallback path decide if playback truly failed.
      });
    }, 80);
  };

  return (
    <section
      className={cn(
        'pointer-events-none relative z-0 hidden overflow-hidden transition-opacity duration-700 ease-out lg:block',
        visualVisible ? 'opacity-100' : 'opacity-0',
        darkMode ? 'bg-[#04070c]' : 'bg-[#05070b]',
      )}
      aria-hidden="true"
    >
      {videoAvailable ? (
        <>
          <video
            ref={forwardVideoRef}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            onLoadedMetadata={() => {
              if (!forwardVideoRef.current) {
                return;
              }
              forwardVideoRef.current.currentTime = 0;
              forwardVideoRef.current.playbackRate = 0.82;
            }}
            onCanPlay={() => setForwardReady(true)}
            onTimeUpdate={() => {
              if (!forwardVideoRef.current || activeClip !== 'forward' || handoffInProgressRef.current) {
                return;
              }

              const remaining = forwardVideoRef.current.duration - forwardVideoRef.current.currentTime;
              if (remaining <= 0.18) {
                setHasCompletedInitialForward(true);
                beginClipSwitch('reverse');
              }
            }}
            onEnded={() => {
              setHasCompletedInitialForward(true);
              beginClipSwitch('reverse');
            }}
            onPause={() => recoverPlayback('forward')}
            onError={() => setVideoAvailable(false)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-150 will-change-[opacity]',
              activeClip === 'forward' ? 'opacity-100' : 'opacity-0',
            )}
          >
            <source src={uiAssetUrls.authMotionForward} type="video/mp4" />
          </video>

          <video
            ref={reverseVideoRef}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            onLoadedMetadata={() => {
              if (!reverseVideoRef.current) {
                return;
              }
              reverseVideoRef.current.currentTime = 0;
              reverseVideoRef.current.playbackRate = 0.82;
            }}
            onCanPlay={() => setReverseReady(true)}
            onTimeUpdate={() => {
              if (!reverseVideoRef.current || activeClip !== 'reverse' || handoffInProgressRef.current) {
                return;
              }

              const remaining = reverseVideoRef.current.duration - reverseVideoRef.current.currentTime;
              if (remaining <= 0.18) {
                beginClipSwitch('forward');
              }
            }}
            onEnded={() => {
              beginClipSwitch('forward');
            }}
            onPause={() => recoverPlayback('reverse')}
            onError={() => setVideoAvailable(false)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-150 will-change-[opacity]',
              activeClip === 'reverse' ? 'opacity-100' : 'opacity-0',
            )}
          >
            <source src={uiAssetUrls.authMotionReverse} type="video/mp4" />
          </video>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#04070c]">
          <div className="relative h-[66%] w-[66%] max-h-[640px] max-w-[640px]">
            <Image
              src={logoSrc}
              alt="Waslmedia logo"
              fill
              priority
              unoptimized
              onError={() => setLogoSrc(uiAssetUrls.brandLogo)}
              className="object-contain"
            />
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-8 py-7 xl:px-11 xl:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/78 xl:text-xs">
          {visualDate}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-8 py-8 xl:px-11 xl:py-10">
        <p className="max-w-xs text-[12px] font-semibold tracking-[0.22em] text-white/70 xl:text-[13px]">
          {visualCaption}
        </p>
      </div>
    </section>
  );
}

function AuthControls() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);
  const darkMode = mounted ? resolvedTheme === 'dark' : false;
  const activeTheme = mounted ? theme || 'light' : 'light';
  const activeLanguage = mounted ? language : 'en';

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div
        className={cn(
          'inline-flex flex-wrap items-center rounded-full border p-1',
          darkMode ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200 bg-white/70 backdrop-blur-sm',
        )}
      >
        {themeOptions.map(({ value, label, icon: Icon }) => {
          const active = activeTheme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition',
                active
                  ? darkMode
                    ? 'bg-white text-slate-950'
                    : 'bg-slate-950 text-white'
                  : darkMode
                    ? 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
              aria-label={`Switch to ${label} theme`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          'inline-flex flex-wrap items-center rounded-full border p-1',
          darkMode ? 'border-white/10 bg-white/[0.035]' : 'border-slate-200 bg-white/70 backdrop-blur-sm',
        )}
      >
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 text-xs font-medium',
            darkMode ? 'text-white/45' : 'text-slate-500',
          )}
        >
          <Globe2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Language</span>
        </div>
        {languageOptions.map(({ value, label }) => {
          const active = activeLanguage === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLanguage(value)}
              className={cn(
                'rounded-full px-3 py-2 text-xs font-medium transition',
                active
                  ? darkMode
                    ? 'bg-white text-slate-950'
                    : 'bg-slate-950 text-white'
                  : darkMode
                    ? 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
              aria-label={`Switch language to ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AuthShell({ children }: AuthShellProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const darkMode = mounted ? resolvedTheme === 'dark' : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.add('auth-scroll-mode');

    return () => {
      document.body.classList.remove('auth-scroll-mode');
    };
  }, []);

  return (
    <div className={cn('min-h-screen min-h-[100dvh] bg-background text-foreground', darkMode && 'bg-[#07090d]')}>
      <div className="isolate grid min-h-screen min-h-[100dvh] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section
          className={cn(
            'relative z-10 overflow-x-hidden border-b lg:border-b-0 lg:border-r',
            darkMode
              ? 'border-white/10 bg-[#171717] lg:border-white/8'
              : 'border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,252,0.96))] lg:border-slate-200',
          )}
        >
          <div
            className={cn(
              'absolute inset-0',
              darkMode
                ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_34%)]',
            )}
          />
          <div className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Link href="/" className="inline-flex items-center gap-2">
                <WaslmediaLogo className="h-8 w-8" />
                <span className={cn('text-base font-semibold tracking-tight sm:text-lg', darkMode ? 'text-white' : 'text-slate-950')}>
                  Waslmedia
                </span>
              </Link>
              <div className="flex flex-col items-end gap-2">
                <AuthControls />
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col justify-start py-8 sm:py-12 lg:justify-center lg:py-16">
              {children}
            </div>
          </div>
        </section>

        <AuthVisual darkMode={darkMode} />
      </div>
    </div>
  );
}
