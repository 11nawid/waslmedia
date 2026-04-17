'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HumanCheckValue {
  token: string | null;
  answer: string;
  ready: boolean;
}

interface HumanCheckWidgetProps {
  action: 'login' | 'signup';
  resetSignal?: number;
  onValueChange: (value: HumanCheckValue) => void;
  title?: string;
  description?: string;
}

const EMPTY_VALUE: HumanCheckValue = {
  token: null,
  answer: '',
  ready: false,
};

export function HumanCheckWidget({
  action,
  resetSignal = 0,
  onValueChange,
  title = 'Quick verification',
  description = 'Use this backup check to continue.',
}: HumanCheckWidgetProps) {
  const [prompt, setPrompt] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    onValueChange({
      token,
      answer,
      ready: Boolean(token && answer.trim()),
    });
  }, [answer, onValueChange, token]);

  useEffect(() => {
    let cancelled = false;

    const loadChallenge = async () => {
      setLoading(true);
      setError(false);
      setPrompt('');
      setToken(null);
      setAnswer('');
      onValueChange(EMPTY_VALUE);

      try {
        const response = await fetch(`/api/auth/human-check?action=${action}`, {
          credentials: 'include',
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || typeof payload.prompt !== 'string' || typeof payload.token !== 'string') {
          throw new Error('CHALLENGE_FAILED');
        }

        if (cancelled) {
          return;
        }

        setPrompt(payload.prompt);
        setToken(payload.token);
      } catch {
        if (!cancelled) {
          setError(true);
          onValueChange(EMPTY_VALUE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadChallenge();

    return () => {
      cancelled = true;
    };
  }, [action, onValueChange, refreshKey, resetSignal]);

  return (
    <div className="space-y-3 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/12 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-white/45">{description}</p>
          <p className="text-sm text-slate-500 dark:text-white/50">
            {loading
              ? 'Preparing a quick check...'
              : error
                ? 'We could not load the check yet.'
                : prompt}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => {
            setRefreshKey((value) => value + 1);
          }}
          disabled={loading}
          aria-label="Refresh verification"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`human-check-${action}`} className="auth-field-label">
          Type the number exactly as shown
        </Label>
        <Input
          id={`human-check-${action}`}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Enter the number"
          className="auth-field"
          disabled={loading || error || !token}
          inputMode="numeric"
        />
      </div>
      {error ? (
        <p className="auth-hint-error">Verification is taking longer than expected. Refresh and try again.</p>
      ) : null}
    </div>
  );
}
