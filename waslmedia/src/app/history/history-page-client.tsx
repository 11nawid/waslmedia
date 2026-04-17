'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { History, Loader2, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { VideoCard } from '@/components/video-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { clearWatchHistory, removeVideoFromHistory, setWatchHistoryPreference } from '@/lib/data';
import type { Video } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface HistoryPageClientProps {
  initialVideos: Video[];
  initialHistoryEnabled: boolean;
}

export function HistoryPageClient({ initialVideos, initialHistoryEnabled }: HistoryPageClientProps) {
  const { toast } = useToast();
  const [videos, setVideos] = useState(initialVideos);
  const [historyEnabled, setHistoryEnabled] = useState(initialHistoryEnabled);
  const [removingVideoIds, setRemovingVideoIds] = useState<string[]>([]);
  const [isClearing, startClearingTransition] = useTransition();
  const [isSavingPreference, startSavingPreferenceTransition] = useTransition();

  const handleRemove = async (videoId: string) => {
    setRemovingVideoIds((current) => (current.includes(videoId) ? current : [...current, videoId]));

    try {
      await removeVideoFromHistory(videoId);
      setVideos((current) => current.filter((video) => video.id !== videoId));
      toast({
        title: 'Removed from history',
        description: 'That video will no longer appear in your watch history.',
      });
    } catch (error) {
      console.error('Failed to remove history item', error);
      toast({
        title: 'Could not remove video',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setRemovingVideoIds((current) => current.filter((id) => id !== videoId));
    }
  };

  const handleClearAll = () => {
    if (videos.length === 0 || isClearing) {
      return;
    }

    startClearingTransition(async () => {
      try {
        await clearWatchHistory();
        setVideos([]);
        toast({
          title: 'Watch history cleared',
          description: 'Your existing watch history has been removed.',
        });
      } catch (error) {
        console.error('Failed to clear watch history', error);
        toast({
          title: 'Could not clear history',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleHistoryToggle = (enabled: boolean) => {
    const previousEnabled = historyEnabled;
    setHistoryEnabled(enabled);

    startSavingPreferenceTransition(async () => {
      try {
        const savedEnabled = await setWatchHistoryPreference(enabled);
        setHistoryEnabled(savedEnabled);
        toast({
          title: savedEnabled ? 'Watch history is on' : 'Watch history is paused',
          description: savedEnabled
            ? 'Videos you watch will be saved here again.'
            : 'New videos you watch will no longer be added here.',
        });
      } catch (error) {
        console.error('Failed to update watch history preference', error);
        setHistoryEnabled(previousEnabled);
        toast({
          title: 'Could not update history setting',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      }
    });
  };

  const hasVideos = videos.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_40%),linear-gradient(135deg,rgba(36,36,36,0.96),rgba(18,18,18,1))] px-6 py-7 text-white shadow-[0_22px_70px_-38px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
              <History className="h-3.5 w-3.5" />
              Watch history
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pick up where you left off.</h1>
              <p className="max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                Review what you watched, remove anything you do not want saved, or pause history whenever you want a cleaner private session.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/75">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'}
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
              {historyEnabled ? 'Saving new history' : 'History paused'}
            </div>
          </div>
        </div>
      </section>

      <Card className="rounded-[1.75rem] border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {historyEnabled ? (
                <PlayCircle className="h-5 w-5 text-primary" />
              ) : (
                <PauseCircle className="h-5 w-5 text-amber-500" />
              )}
              <p className="text-base font-medium text-foreground">Save watch history</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              When turned off, videos you watch will not be added to your watch history anymore.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-border/70 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {isSavingPreference ? 'Updating...' : historyEnabled ? 'On' : 'Off'}
              </span>
              <Switch checked={historyEnabled} onCheckedChange={handleHistoryToggle} disabled={isSavingPreference} />
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleClearAll}
              disabled={!hasVideos || isClearing}
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear all
            </Button>
          </div>
        </CardContent>
      </Card>

      {!historyEnabled && hasVideos ? (
        <div className="rounded-[1.5rem] border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          History is paused. Your existing items stay here until you remove them, but anything new you watch will not be saved.
        </div>
      ) : null}

      {hasVideos ? (
        <div className="space-y-4">
          {videos.map((video) => {
            const isRemoving = removingVideoIds.includes(video.id);

            return (
              <div
                key={video.id}
                className={isRemoving ? 'pointer-events-none rounded-2xl opacity-60 transition-opacity' : 'rounded-2xl transition-opacity'}
              >
                <VideoCard
                  video={video}
                  variant="list"
                  sourceContext="history"
                  trailingActions={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleRemove(video.id);
                      }}
                      disabled={isRemoving}
                    >
                      {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="sr-only">Remove from watch history</span>
                    </Button>
                  }
                />
              </div>
            );
          })}
        </div>
      ) : historyEnabled ? (
        <div className="rounded-[2rem] border border-dashed border-border/70 bg-card px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Your watch history is empty</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            The videos you watch will appear here so you can quickly revisit them later.
          </p>
          <Button asChild className="mt-6 rounded-full px-5">
            <Link href="/">Browse videos</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border/70 bg-card px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
            <PauseCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Watch history is paused</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Turn it back on any time if you want Waslmedia to remember the videos you watch here.
          </p>
          <Button
            className="mt-6 rounded-full px-5"
            onClick={() => handleHistoryToggle(true)}
            disabled={isSavingPreference}
          >
            {isSavingPreference ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Turn history on
          </Button>
        </div>
      )}
    </div>
  );
}
