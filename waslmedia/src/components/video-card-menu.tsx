'use client';

import { useTransition } from 'react';
import { Ban, Check, Clock, Flag, ListPlus, ListVideo, Share, UserMinus } from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { useSaveToPlaylistDialog } from '@/hooks/use-save-to-playlist-dialog';
import { useToast } from '@/hooks/use-toast';
import { shareVideo, toggleWatchLater } from '@/lib/data';
import { buildVideoHref } from '@/lib/video-links';

interface VideoCardMenuProps {
  video: Video;
  onDismiss?: (videoId: string) => void;
}

export function VideoCardMenu({ video, onDismiss }: VideoCardMenuProps) {
  const { onOpen: openSaveDialog } = useSaveToPlaylistDialog();
  const { user, isInWatchLater } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSaveToWatchLater = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast({ title: 'Please sign in to save to Watch Later.' });
      return;
    }

    startTransition(async () => {
      try {
        await toggleWatchLater(video.id, user.uid);
        toast({ title: isInWatchLater(video.id) ? 'Removed from Watch Later' : 'Saved to Watch Later' });
      } catch (error) {
        console.error('Failed to toggle Watch Later:', error);
        toast({ title: 'Something went wrong', variant: 'destructive' });
      }
    });
  };

  const handleShare = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = `${window.location.origin}${buildVideoHref(video, { ref: 'share' })}`;
    const shareData = {
      title: video.title,
      text: `Check out this video: ${video.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
      await shareVideo(video.id);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      await shareVideo(video.id);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  const openComingSoonToast = (label: string) => {
    toast({
      title: `${label} is coming soon`,
      description: 'This action is not available yet.',
    });
  };

  const isSavedToWatchLater = isInWatchLater(video.id);

  const handleDismiss = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!onDismiss) {
      openComingSoonToast('Not interested');
      return;
    }

    onDismiss(video.id);
    toast({
      title: 'Video dismissed',
      description: 'We will hide this video from your feed.',
    });
  };

  const comingSoonBadge = (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
      Coming soon
    </span>
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 self-start rounded-full opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:bg-secondary data-[state=open]:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <ListVideo className="sr-only" />
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl border border-border bg-background p-2 text-foreground shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <DropdownMenuItem onClick={() => openComingSoonToast('Add to queue')} className="gap-3 rounded-xl px-3 py-3">
          <ListVideo className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1">Add to queue</span>
          {comingSoonBadge}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSaveToWatchLater} disabled={isPending} className="gap-3 rounded-xl px-3 py-3">
          {isSavedToWatchLater ? <Check className="mr-3 h-4 w-4" /> : <Clock className="mr-3 h-4 w-4" />}
          <span className="min-w-0 flex-1">{isSavedToWatchLater ? 'Added to Watch Later' : 'Save to Watch Later'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openSaveDialog(video.id);
          }}
          className="gap-3 rounded-xl px-3 py-3"
        >
          <ListPlus className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1">Save to playlist</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} className="gap-3 rounded-xl px-3 py-3">
          <Share className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1">Share</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDismiss} className="gap-3 rounded-xl px-3 py-3">
          <Ban className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1">Not interested</span>
          {!onDismiss ? comingSoonBadge : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openComingSoonToast(`Don't recommend ${video.channelName}`)}
          className="items-start gap-3 rounded-xl px-3 py-3"
        >
          <UserMinus className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1 whitespace-normal">Don't recommend channel</span>
          {comingSoonBadge}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openComingSoonToast('Report')} className="gap-3 rounded-xl px-3 py-3">
          <Flag className="mr-3 h-4 w-4" />
          <span className="min-w-0 flex-1">Report</span>
          {comingSoonBadge}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
