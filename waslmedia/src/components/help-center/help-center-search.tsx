'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowUpRight, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { helpCenterQuickLinks, type HelpCenterSearchDocument } from '@/lib/help-center-content';
import { cn } from '@/lib/utils';

type SearchSuggestion = Omit<HelpCenterSearchDocument, 'body'> & { score?: number };

export function HelpCenterSearch({
  variant = 'header',
  initialQuery = '',
  className,
}: {
  variant?: 'header' | 'hero';
  initialQuery?: string;
  className?: string;
}) {
  const router = useProgressRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchSuggestion[]>([]);

  const trimmedQuery = query.trim();
  const isHero = variant === 'hero';

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (pathname === '/help-center/search') {
      setQuery(searchParams?.get('q') || '');
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || trimmedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/help-center/search?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error('HELP_CENTER_SEARCH_FAILED');
        }

        const payload = await response.json();
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, trimmedQuery]);

  const quickLinks = useMemo(() => helpCenterQuickLinks.slice(0, 3), []);

  const submitSearch = () => {
    const normalized = query.trim();
    if (!normalized) {
      router.push('/help-center');
      setIsOpen(false);
      return;
    }

    router.push(`/help-center/search?q=${encodeURIComponent(normalized)}`);
    setIsOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const dropdown = (
    <div
      className={cn(
        'absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[1.35rem] border border-[#d9e0e8] bg-white shadow-[0_30px_70px_-38px_rgba(15,23,42,0.28)]',
        isHero ? 'max-w-[44rem]' : ''
      )}
    >
      {trimmedQuery.length >= 2 ? (
        <div className="py-2">
          <div className="flex items-center justify-between px-4 pb-2 pt-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#728197]">
              Search results
            </p>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#728197]" /> : null}
          </div>

          {!isLoading && results.length === 0 ? (
            <div className="px-4 pb-5 pt-2">
              <p className="text-sm font-medium text-[#111827]">No help-center pages matched that search.</p>
              <p className="mt-1 text-sm text-[#667085]">
                Try a broader phrase or open one of the main sections below.
              </p>
            </div>
          ) : null}

          {results.map((result) => (
            <button
              key={result.href}
              type="button"
              onClick={() => {
                router.push(result.href);
                setIsOpen(false);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f5f8fb]"
            >
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-[#728197]" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#728197]">
                  {result.sectionLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{result.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#667085]">{result.summary}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#728197]">
            Popular topics
          </p>
          <div className="mt-3 grid gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-[#fbfcfd] px-4 py-3 text-sm font-medium text-[#111827] transition hover:bg-white"
              >
                <span>{item.label}</span>
                <ArrowUpRight className="h-4 w-4 text-[#728197]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="relative" onClick={() => setIsOpen(true)}>
        <div
          className={cn(
            'flex items-center overflow-hidden border transition focus-within:border-[#c8d2df]',
            isHero
              ? 'rounded-[1.2rem] border-white/80 bg-white shadow-[0_26px_70px_-40px_rgba(15,23,42,0.55)]'
              : 'rounded-full border-[#d9e0e8] bg-[#f8fafc]'
          )}
        >
          <Search className={cn('ml-4 shrink-0 text-[#728197]', isHero ? 'h-5 w-5' : 'h-4 w-4')} />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search the help center"
            className={cn(
              'border-0 bg-transparent text-[#111827] placeholder:text-[#94a3b8] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
              isHero ? 'h-[4.35rem] px-4 text-[1.06rem]' : 'h-11 px-3 text-sm'
            )}
          />
          <Button
            type="submit"
            variant="ghost"
            className={cn(
              'mr-1 shrink-0 text-[#111827] hover:bg-transparent',
              isHero ? 'h-14 rounded-[1rem] px-5 text-[1rem]' : 'h-10 rounded-full px-4 text-sm'
            )}
          >
            Search
          </Button>
        </div>
      </form>

      {isOpen ? dropdown : null}
    </div>
  );
}
