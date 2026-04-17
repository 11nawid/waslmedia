'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, MessageSquareReply } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { fetchStudioVideoComments } from '@/lib/studio/video-workbench-client';
import type { Comment } from '@/lib/types';
import { useVideoWorkbench } from '@/components/studio/video-workbench/provider';
import { WorkbenchPageHeader, WorkbenchSurface } from '@/components/studio/video-workbench/page-shell';
import { buildVideoHref } from '@/lib/video-links';

export default function VideoWorkbenchCommentsPage() {
  const { video } = useVideoWorkbench();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!video) {
      return;
    }

    let active = true;
    fetchStudioVideoComments(video.id)
      .then((rows) => {
        if (active) {
          setComments(rows);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [video]);

  if (!video) {
    return null;
  }

  return (
    <div className="space-y-8">
      <WorkbenchPageHeader
        title="Comments"
        description="Read the latest conversation on this content without leaving the dedicated video workspace."
        aside={
          <Button variant="secondary" asChild className="rounded-full">
            <Link href={buildVideoHref(video)} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open watch page
            </Link>
          </Button>
        }
      />

      <WorkbenchSurface>
        <div className="divide-y divide-border/70">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading comments...</div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 p-6">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.authorImageUrl} alt={comment.authorName} />
                  <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{comment.authorName}</p>
                    <p className="text-xs text-muted-foreground">{comment.createdAt}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{comment.text}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{comment.likes.toLocaleString()} likes</span>
                    <span>{comment.replies?.length || 0} replies</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <MessageSquareReply className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">No comments yet</p>
              <p className="mt-2 text-sm text-muted-foreground">When viewers start commenting on this content, the full thread will appear here.</p>
            </div>
          )}
        </div>
      </WorkbenchSurface>
    </div>
  );
}
