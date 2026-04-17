

'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import type { Comment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { addComment, likeComment, editComment, deleteComment } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface CommentItemProps {
  comment: Comment;
  parentId: string;
  parentType: 'video' | 'post';
  isReply?: boolean;
}

export function CommentItem({ comment, parentId, parentType, isReply = false }: CommentItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showReplies, setShowReplies] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [likes, setLikes] = useState(comment.likes);
  const [isLiked, setIsLiked] = useState(false); 
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isDeleting, setIsDeleting] = useState(false);

  const canModify = user?.uid === comment.authorId;


  const handleReplySubmit = () => {
    if (!user) {
      toast({ title: 'Please sign in to reply.', variant: 'destructive' });
      return;
    }
    if (!replyText.trim()) return;

    startTransition(async () => {
        try {
            // If the current comment is a reply, the new reply should still be parented to the top-level comment.
            const topLevelCommentId = comment.parentId || comment.id;

            await addComment(
                parentId,
                parentType,
                user.uid,
                user.displayName || 'anonymous',
                user.photoURL || '',
                replyText,
                topLevelCommentId
            );
            setReplyText('');
            setShowReplyForm(false);
        } catch (error: any) {
             toast({ title: 'Failed to post reply', description: error.message, variant: 'destructive' });
        }
    });
  };

  const handleEditSubmit = () => {
      if (!editText.trim()) return;
      startTransition(async () => {
          try {
              await editComment(comment.id, editText);
              setIsEditing(false);
              toast({ title: 'Comment updated.' });
          } catch(error: any) {
              toast({ title: 'Failed to update comment', description: error.message, variant: 'destructive' });
          }
      })
  }

  const handleDelete = () => {
      startTransition(async () => {
          try {
              await deleteComment(comment.id);
              toast({ title: 'Comment deleted.' });
          } catch (error: any) {
               toast({ title: 'Failed to delete comment', description: error.message, variant: 'destructive' });
          } finally {
              setIsDeleting(false);
          }
      })
  }

  const handleLike = async () => {
    if (!user) {
        toast({ title: 'Please sign in to like comments.' });
        return;
    }
    startTransition(async () => {
        try {
            const newLikedState = !isLiked;
            const newLikeCount = likes + (newLikedState ? 1 : -1);
            setIsLiked(newLikedState);
            setLikes(newLikeCount);

            await likeComment(comment.id, user.uid);
        } catch (error) {
            toast({ title: 'Something went wrong.', variant: 'destructive' });
            const newLikedState = !isLiked;
            const newLikeCount = likes + (newLikedState ? 1 : -1);
            setIsLiked(newLikedState);
            setLikes(newLikeCount);
        }
    });
  }

  const handleShowReplyForm = () => {
      if (showReplyForm) {
          setShowReplyForm(false);
      } else {
          setReplyText(`@${comment.authorName} `);
          setShowReplyForm(true);
      }
  }

  useEffect(() => {
    if (showReplyForm && textareaRef.current) {
        textareaRef.current.focus();
    }
  }, [showReplyForm]);
  
  const mentionRegex = /^(@[^\s]+)/;
  const match = comment.text.match(mentionRegex);
  const mention = match ? match[1] : '';
  const restOfText = match ? comment.text.substring(match[0].length) : comment.text;


  return (
    <div className="flex items-start gap-4 group">
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                    <AlertDialogDescription>This comment will be permanently deleted.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                        {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <Avatar>
        <AvatarImage src={comment.authorImageUrl} alt={comment.authorName} />
        <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-sm">{comment.authorName}</p>
          <p className="text-xs text-muted-foreground">{comment.createdAt}</p>
        </div>

        {isEditing ? (
            <div className="mt-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-secondary" autoFocus />
                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleEditSubmit} disabled={isPending || !editText.trim()}>Save</Button>
                </div>
            </div>
        ) : (
             <p className="text-sm mt-1 whitespace-pre-wrap">
                {mention && <span className="text-accent font-medium mr-1">{mention}</span>}
                {restOfText}
            </p>
        )}
       
        <div className="flex items-center gap-1 mt-1 text-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleLike} disabled={isPending || !user}>
            <ThumbsUp className={cn("h-4 w-4", isLiked && "fill-current")} />
          </Button>
          <span className="text-xs text-muted-foreground">{likes > 0 && likes}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!user}>
            <ThumbsDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-8 px-3 rounded-full text-xs" onClick={handleShowReplyForm}>
            Reply
          </Button>
        </div>

        {showReplyForm && (
          <div className="flex items-start gap-4 mt-4">
             <Avatar className="w-8 h-8">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder={`Reply to ${comment.authorName}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                variant="flushed"
                className="min-h-[24px] h-6"
                onFocus={() => setIsInputFocused(true)}
              />
               {(isInputFocused || replyText) && (
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" onClick={() => setShowReplyForm(false)}>Cancel</Button>
                        <Button onClick={handleReplySubmit} disabled={isPending || !replyText.trim()}>
                            {isPending ? 'Replying...' : 'Reply'}
                        </Button>
                    </div>
                )}
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && !isReply && (
          <>
            <Button
                variant="ghost"
                className="mt-2 h-auto rounded-full px-4 py-2 text-accent hover:bg-accent/10 hover:text-accent"
                onClick={() => setShowReplies(!showReplies)}
            >
                {showReplies ? <ChevronUp className="h-5 w-5 mr-2" /> : <ChevronDown className="h-5 w-5 mr-2" />}
                {comment.replies.length} {comment.replies.length > 1 ? 'replies' : 'reply'}
            </Button>
            {showReplies && (
              <div className="mt-4 space-y-6">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} parentId={parentId} parentType={parentType} isReply={true} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
       {canModify && !isEditing && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={() => setIsDeleting(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
    </div>
  );
}
