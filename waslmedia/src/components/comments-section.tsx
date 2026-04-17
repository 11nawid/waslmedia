
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { getComments } from '@/lib/data';
import { CommentItem } from './comment-item';
import { ListFilter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommentInput } from './comment-input';
import { EmptyState } from './empty-state';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';

interface CommentsSectionProps {
  videoId: string;
  showInput?: boolean;
  initialComments?: Comment[];
  realtimeToken?: string | null;
}

export function CommentsSection({
  videoId,
  showInput = true,
  initialComments = [],
  realtimeToken = null,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes'>('createdAt');
  const [loading, setLoading] = useState(initialComments.length === 0);

  const sortedComments = useMemo(() => {
    const nextComments = [...comments];
    if (sortBy === 'likes') {
      nextComments.sort((left, right) => right.likes - left.likes);
      return nextComments;
    }

    nextComments.sort((left, right) => {
      const leftTime = left.rawCreatedAt ? new Date(left.rawCreatedAt).getTime() : 0;
      const rightTime = right.rawCreatedAt ? new Date(right.rawCreatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
    return nextComments;
  }, [comments, sortBy]);

  useEffect(() => {
    let active = true;
    const eventSource = realtimeToken
      ? new EventSource(`/api/realtime?token=${encodeURIComponent(realtimeToken)}`)
      : null;

    const loadComments = async (force = false) => {
      const fetchedComments = await trackGlobalForegroundTask(getComments(videoId, 'video', { force }), force ? 'silent' : 'foreground');
      if (active) {
        setComments(fetchedComments);
        setLoading(false);
      }
    };

    if (initialComments.length === 0) {
      loadComments().catch((error) => {
        console.error(error);
        if (active) {
          setLoading(false);
        }
      });
    }
    eventSource?.addEventListener('comments.updated', () => {
      loadComments(true).catch(console.error);
    });

    return () => {
      active = false;
      eventSource?.close();
    };
  }, [initialComments, realtimeToken, videoId]);

  return (
    <div className="text-foreground">
      <div className="flex items-center gap-6 mb-6">
        <h2 className="text-xl font-bold">{comments.length} Comments</h2>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                    <ListFilter className="w-5 h-5" />
                    <span>Sort by</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSortBy('likes')}>
                    Top comments
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortBy('createdAt')}>
                    Newest first
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {showInput && (
        <div className="mb-8">
            <CommentInput videoId={videoId} parentType="video" />
        </div>
      )}
      

      <div className="space-y-8">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading comments...</div>
        ) : sortedComments.length > 0 ? (
          sortedComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} parentId={videoId} parentType="video" />
          ))
        ) : (
          <EmptyState
            icon={ListFilter}
            title="No comments yet"
            description="Start the conversation. Thoughtful comments help your audience engage with the video."
            compact
          />
        )}
      </div>
    </div>
  );
}
