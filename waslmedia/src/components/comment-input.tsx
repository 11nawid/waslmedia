
'use client';

import { useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { addComment } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CommentInputProps {
  videoId: string;
  parentType: 'video' | 'post';
  onCommentAdded?: () => void;
}

export function CommentInput({ videoId, parentType, onCommentAdded }: CommentInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isMobile = useIsMobile();

  const handleAddComment = async () => {
    if (!user) {
      toast({ title: 'Please sign in to comment.', variant: 'destructive' });
      return;
    }
    if (!commentText.trim()) return;

    startTransition(async () => {
      try {
        await addComment(
          videoId,
          parentType,
          user.uid,
          user.displayName || 'Anonymous',
          user.photoURL || '',
          commentText,
          null
        );
        setCommentText('');
        setIsInputFocused(false);
        if (onCommentAdded) {
          onCommentAdded();
        }
      } catch (error: any) {
        toast({ title: 'Failed to add comment', description: error.message, variant: 'destructive' });
      }
    });
  };

  if (!user) {
      return <p className="text-muted-foreground text-sm">Please sign in to leave a comment.</p>;
  }
  
  if (isMobile) {
      return (
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/90 p-2 shadow-sm">
            <Avatar className="w-8 h-8">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="relative flex-1">
                <input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full rounded-full bg-secondary/70 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {commentText.trim() && (
                    <Button size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full" onClick={handleAddComment} disabled={isPending}>
                       {isPending ? '...' : '↑'}
                    </Button>
                )}
            </div>
        </div>
      )
  }

  return (
    <div className="flex items-start gap-4">
        <Avatar>
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
            <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            variant="flushed"
            className="min-h-[24px] h-6"
            />
            {(isInputFocused || commentText) && (
                <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" onClick={() => { setIsInputFocused(false); setCommentText(''); }}>Cancel</Button>
                <Button onClick={handleAddComment} disabled={isPending || !commentText.trim()}>
                    {isPending ? 'Commenting...' : 'Comment'}
                </Button>
                </div>
            )}
        </div>
    </div>
  );
}
