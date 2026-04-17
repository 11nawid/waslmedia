'use client';

import Link from 'next/link';
import { BarChart3, Download, Lightbulb, Megaphone, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface VideoActionsMenuProps {
  video: Video;
  analyticsHref: string;
  shareHref: string;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
}

export function VideoActionsMenu({
  video,
  analyticsHref,
  shareHref,
  onEdit,
  onDelete,
}: VideoActionsMenuProps) {
  const { toast } = useToast();

  const copyShareLink = async () => {
    try {
      const baseUrl = typeof window === 'undefined' ? '' : window.location.origin;
      const url = new URL(shareHref, baseUrl).toString();
      await navigator.clipboard.writeText(url);
      toast({ title: 'Share link copied', description: 'The shareable link is ready to paste.' });
    } catch (error) {
      console.error('Failed to copy share link:', error);
      toast({
        title: 'Unable to copy link',
        description: 'Please try again in a supported browser.',
        variant: 'destructive',
      });
    }
  };

  const downloadVideo = () => {
    if (!video.videoUrl) {
      toast({
        title: 'Download unavailable',
        description: 'This video file is not ready to download yet.',
        variant: 'destructive',
      });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = video.videoUrl;
    anchor.download = `${video.title || 'video'}.mp4`;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem asChild>
          <Link href={analyticsHref}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(video)}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Edit title and description</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyShareLink}>
          <Share2 className="mr-2 h-4 w-4" />
          <span>Get shareable link</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadVideo}>
          <Download className="mr-2 h-4 w-4" />
          <span>Download</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Megaphone className="mr-2 h-4 w-4" />
          <span>Promote</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Coming soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Lightbulb className="mr-2 h-4 w-4" />
          <span>Brainstorm video ideas</span>
          <span className="ml-auto text-[11px] text-muted-foreground">Coming soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-500" onClick={() => onDelete(video)}>
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete forever</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
