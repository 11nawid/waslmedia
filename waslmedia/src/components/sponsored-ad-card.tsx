'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, DotsThreeVertical, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SponsoredAd } from '@/lib/ads/types';
import { recordSponsoredAdEventClient } from '@/lib/ads/client';

interface SponsoredAdCardProps {
  ad: SponsoredAd;
  layout?: 'home' | 'search';
  onDismiss?: (adId: string) => void;
}

const VIEWER_KEY_STORAGE_KEY = 'waslmedia.ads.viewerKey';
const IMPRESSION_MIN_VISIBLE_MS = 900;
const IMPRESSION_MIN_VISIBLE_RATIO = 0.65;

function getViewerKey() {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = `viewer_${crypto.randomUUID()}`;
  window.localStorage.setItem(VIEWER_KEY_STORAGE_KEY, next);
  return next;
}

function getSearchQueryFromLocation() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('q');
}

function AdCreative({ ad, layout }: { ad: SponsoredAd; layout: 'home' | 'search' }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_30%),linear-gradient(135deg,#35235b_0%,#6d28d9_48%,#7c3aed_100%)] text-white',
        layout === 'home' ? 'aspect-[16/10] w-full' : 'aspect-video w-full max-w-[560px]'
      )}
    >
      {ad.thumbnailUrl ? (
        <Image
          src={ad.thumbnailUrl}
          alt={ad.headline}
          fill
          className="object-cover opacity-80"
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.45)_100%)]" />
      <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-black/25 text-lg font-semibold backdrop-blur">
              {ad.sponsor.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold tracking-[0.26em] text-white/80">SPONSORED</p>
              <p className="truncate text-sm font-semibold">{ad.domain}</p>
            </div>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/35 backdrop-blur">
            <ArrowUpRight size={26} weight="bold" />
          </div>
        </div>
        <div className="max-w-[85%]">
          <p className="line-clamp-2 text-[2.1rem] font-black leading-[1.04] text-white drop-shadow-sm md:text-[2.5rem]">
            {ad.headline}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SponsoredAdCard({ ad, layout = 'home', onDismiss }: SponsoredAdCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const previewKey = useMemo(() => `${ad.id}-${isPreviewOpen ? 'open' : 'closed'}`, [ad.id, isPreviewOpen]);
  const { toast } = useToast();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const visibleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || impressionRecorded) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_MIN_VISIBLE_RATIO) {
          if (visibleTimeoutRef.current === null) {
            visibleTimeoutRef.current = window.setTimeout(async () => {
              try {
                await recordSponsoredAdEventClient({
                  campaignId: ad.campaignId,
                  eventType: 'impression',
                  surface: layout,
                  viewerKey: getViewerKey(),
                  searchQuery: layout === 'search' ? getSearchQueryFromLocation() : null,
                });
                setImpressionRecorded(true);
              } catch {
                // Keep feed resilient if analytics logging fails.
              }
            }, IMPRESSION_MIN_VISIBLE_MS);
          }
        } else if (visibleTimeoutRef.current !== null) {
          window.clearTimeout(visibleTimeoutRef.current);
          visibleTimeoutRef.current = null;
        }
      },
      { threshold: [IMPRESSION_MIN_VISIBLE_RATIO] }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (visibleTimeoutRef.current !== null) {
        window.clearTimeout(visibleTimeoutRef.current);
      }
    };
  }, [ad.campaignId, impressionRecorded, layout]);

  const handleWatch = async () => {
    setIsPreviewOpen(true);
    try {
      await recordSponsoredAdEventClient({
        campaignId: ad.campaignId,
        eventType: 'watch',
        surface: layout,
        viewerKey: getViewerKey(),
        searchQuery: layout === 'search' ? getSearchQueryFromLocation() : null,
      });
    } catch {
      // no-op
    }
  };

  const handleStart = async () => {
    try {
      await recordSponsoredAdEventClient({
        campaignId: ad.campaignId,
        eventType: 'click',
        surface: layout,
        viewerKey: getViewerKey(),
        searchQuery: layout === 'search' ? getSearchQueryFromLocation() : null,
      });
    } catch {
      // no-op
    }

    window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = async () => {
    try {
      await recordSponsoredAdEventClient({
        campaignId: ad.campaignId,
        eventType: 'dismiss',
        surface: layout,
        viewerKey: getViewerKey(),
        searchQuery: layout === 'search' ? getSearchQueryFromLocation() : null,
      });
    } catch {
      // no-op
    }

    if (onDismiss) {
      onDismiss(ad.id);
      toast({
        title: 'Ad dismissed',
        description: 'We will hide this ad from your feed.',
      });
      return;
    }

    toast({
      title: 'Dismiss is unavailable here',
      description: 'This ad can only be dismissed from supported feeds.',
    });
  };

  if (layout === 'search') {
    return (
      <>
        <div ref={rootRef} className="group flex gap-6">
          <div className="w-full max-w-[420px] shrink-0">
            <AdCreative ad={ad} layout="search" />
          </div>
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[1.35rem] font-medium leading-[1.35] text-foreground group-hover:text-primary">
                {ad.headline}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ad.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">{ad.sponsor.charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Sponsored</span>
                  {' · '}
                  {ad.domain}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={handleWatch} variant="secondary" className="min-w-36 rounded-full">
                  Watch
                </Button>
                <Button type="button" onClick={handleStart} className="min-w-36 rounded-full">
                  {ad.ctaLabel}
                </Button>
              </div>
            </div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                  <DotsThreeVertical size={20} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem onClick={handleDismiss}>Dismiss ad</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl border-border/60 bg-[#111111] p-0 text-white">
            <div className="overflow-hidden rounded-[1.2rem]">
              <video
                key={previewKey}
                src={ad.previewVideoUrl}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full bg-black object-cover"
              />
              <DialogHeader className="px-6 pb-6 pt-5 text-left">
                <DialogTitle className="text-xl text-white">{ad.headline}</DialogTitle>
                <DialogDescription className="text-white/70">{ad.description}</DialogDescription>
              </DialogHeader>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div ref={rootRef} className="group">
        <div className="relative mb-3 overflow-hidden rounded-lg bg-black">
          <AdCreative ad={ad} layout="home" />
        </div>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{ad.sponsor.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-base font-semibold leading-tight group-hover:text-primary">
                  {ad.headline}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Sponsored</span>
                  {' · '}
                  {ad.domain}
                </p>
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-2 shrink-0 rounded-full">
                    <DotsThreeVertical size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuItem onClick={handleDismiss}>Dismiss ad</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" onClick={handleWatch} variant="secondary" className="h-10 rounded-full">
                Watch
              </Button>
              <Button type="button" onClick={handleStart} className="h-10 rounded-full">
                {ad.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl border-border/60 bg-[#111111] p-0 text-white">
          <div className="overflow-hidden rounded-[1.2rem]">
            <video
              key={previewKey}
              src={ad.previewVideoUrl}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full bg-black object-cover"
            />
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-xl font-semibold text-white">{ad.headline}</h3>
                <p className="mt-1 text-sm text-white/70">{ad.description}</p>
              </div>
              <Button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                variant="ghost"
                size="icon"
                className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X size={18} weight="bold" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
