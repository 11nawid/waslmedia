'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { getTurnstileClientConfig } from '@/lib/turnstile/config';

declare global {
  interface Window {
    __waslmediaTurnstileScriptReady?: boolean;
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  action: string;
  resetSignal?: number;
  onTokenChange: (token: string | null) => void;
  onStatusChange?: (status: 'disabled' | 'loading' | 'ready' | 'failed') => void;
}

export function TurnstileWidget({
  action,
  resetSignal = 0,
  onTokenChange,
  onStatusChange,
}: TurnstileWidgetProps) {
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(() =>
    typeof window !== 'undefined' && Boolean(window.turnstile || window.__waslmediaTurnstileScriptReady)
  );
  const [mounted, setMounted] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const containerId = useId();
  const { resolvedTheme } = useTheme();
  const activeTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const config = useMemo(() => getTurnstileClientConfig(), []);

  useEffect(() => {
    onTokenChange(null);
    setWidgetFailed(false);
    setScriptReady(typeof window !== 'undefined' && Boolean(window.turnstile || window.__waslmediaTurnstileScriptReady));
  }, [action, onTokenChange, resetSignal]);

  useEffect(() => {
    if (!config.enabled) {
      onStatusChange?.('disabled');
      return;
    }

    if (widgetFailed) {
      onStatusChange?.('failed');
      return;
    }

    if (!scriptReady) {
      onStatusChange?.('loading');
      return;
    }

    onStatusChange?.('ready');
  }, [config.enabled, onStatusChange, scriptReady, widgetFailed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!config.enabled || typeof window === 'undefined') {
      return;
    }

    if (window.turnstile || window.__waslmediaTurnstileScriptReady) {
      setScriptReady(true);
      setWidgetFailed(false);
      return;
    }

    setScriptReady(false);

    let cancelled = false;
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      if (window.turnstile) {
        window.__waslmediaTurnstileScriptReady = true;
        if (!cancelled) {
          setScriptReady(true);
          setWidgetFailed(false);
        }
        window.clearInterval(intervalId);
        return;
      }

      attempts += 1;
      if (attempts < 32) {
        return;
      }

      window.clearInterval(intervalId);
      if (!cancelled) {
        setWidgetFailed(true);
        onTokenChange(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [config.enabled, onTokenChange, resetSignal]);

  useEffect(() => {
    if (!config.enabled || !scriptReady || !containerRef.current || !window.turnstile) {
      return;
    }

    if (widgetIdRef.current && window.turnstile.remove) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      containerRef.current.innerHTML = '';
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: config.siteKey,
        action,
        theme: activeTheme,
        size: 'flexible',
        callback: (token) => {
          setWidgetFailed(false);
          onTokenChange(token);
        },
        'expired-callback': () => onTokenChange(null),
        'error-callback': () => {
          setWidgetFailed(true);
          onTokenChange(null);
        },
      });
    } catch {
      setWidgetFailed(true);
      onTokenChange(null);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, activeTheme, config.enabled, config.siteKey, onTokenChange, resetSignal, scriptReady]);

  if (!config.enabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          window.__waslmediaTurnstileScriptReady = true;
          setScriptReady(true);
          setWidgetFailed(false);
        }}
        onError={() => {
          setWidgetFailed(true);
          onTokenChange(null);
        }}
      />
      <div className="w-full overflow-visible rounded-none border border-slate-300 bg-white/75 px-3 py-4 sm:px-4 dark:border-white/30 dark:bg-white/[0.02]">
        {!scriptReady && !widgetFailed ? (
          <div className="flex min-h-[65px] items-center justify-center text-sm text-slate-500 dark:text-white/45">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading verification...
          </div>
        ) : null}
        <div
          id={containerId}
          ref={containerRef}
          className={scriptReady && !widgetFailed ? 'min-h-[65px] w-full overflow-visible' : 'hidden'}
        />
      </div>
    </div>
  );
}
