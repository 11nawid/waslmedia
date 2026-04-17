
'use client';

import { useAuth } from '@/hooks/use-auth';
import type { Video } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, Check, Share, Bookmark } from 'lucide-react';
import { dislikeVideo, getUserInteractionStatus, likeVideo, shareVideo, toggleSubscription } from '@/lib/data';
import { useEffect, useState, useTransition, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSaveToPlaylistDialog } from '@/hooks/use-save-to-playlist-dialog';
import { getViewerAnalyticsContext } from '@/lib/analytics/viewer-context';
import { buildChannelHref } from '@/lib/channel-links';
import { buildVideoHref } from '@/lib/video-links';
import { useProgressRouter } from '@/hooks/use-progress-router';


function VideoDescription({ video }: { video: Video }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (descriptionRef.current) {
            // Check if the content is overflowing the container (clamped)
            const computedStyle = window.getComputedStyle(descriptionRef.current);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const maxHeight = lineHeight * 3; // Corresponds to line-clamp-3
            setIsClamped(descriptionRef.current.scrollHeight > maxHeight);
        }
    }, [video.description]);

    return (
        <div className="bg-secondary/50 rounded-xl p-4 my-4">
             <div className="flex items-center gap-4 font-semibold text-sm mb-2">
                <span>{video.viewCount.toLocaleString()} views</span>
                <span>{video.uploadedAt}</span>
                 {(video.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                        {video.tags.slice(0,3).map(tag => (
                            <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="text-accent hover:underline">
                                #{tag}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <p
                ref={descriptionRef}
                className={cn(
                    "text-sm whitespace-pre-wrap",
                    !isExpanded && "line-clamp-3"
                )}
            >
                {video.description || 'No description provided.'}
            </p>
            {isClamped && (
                 <button onClick={() => setIsExpanded(!isExpanded)} className="font-semibold text-sm mt-2">
                    {isExpanded ? 'Show less' : '...more'}
                </button>
            )}

             {(video.category) && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm"><span className="font-semibold">Category:</span> <Link href={`/search?q=${encodeURIComponent(video.category)}`} className="text-accent hover:underline">{video.category}</Link></p>
                </div>
            )}
        </div>
    )
}


export function WatchPageContent({ video }: { video: Video }) {
    const { userProfile: user, isSubscribedTo } = useAuth();
    const router = useProgressRouter();
    const { toast } = useToast();
    const isOwner = user?.uid === video.authorId;
    const channelLink = buildChannelHref(video.channelHandle || video.authorId);
    
    const [likes, setLikes] = useState(video.likes);
    const [dislikes, setDislikes] = useState(video.dislikes);
    const [userInteraction, setUserInteraction] = useState(video.initialInteraction ?? { liked: false, disliked: false, watchLater: false });
    const [isPending, startTransition] = useTransition();
    const { onOpen: openSaveDialog } = useSaveToPlaylistDialog();
    
    const isSubscribed = video.authorId ? isSubscribedTo(video.authorId) : false;

    useEffect(() => {
        if (user && !video.initialInteraction) {
            getUserInteractionStatus(video.id, user.uid).then(setUserInteraction);
        }
    }, [user, video.id, video.initialInteraction]);
    
    const handleLike = useCallback(async () => {
        if (!user) {
            toast({ title: 'Please sign in to like videos.' });
            return;
        }

        const originalInteraction = { ...userInteraction };
        const originalLikes = likes;
        const originalDislikes = dislikes;

        const newLikedState = !originalInteraction.liked;
        const newDislikedState = false;

        startTransition(() => {
            setUserInteraction(prev => ({...prev, liked: newLikedState, disliked: newDislikedState }));
            setLikes(prev => prev + (newLikedState ? 1 : -1));
            if (originalInteraction.disliked) {
                setDislikes(prev => prev - 1);
            }
        });
        
        try {
            await likeVideo(video.id, user.uid);
        } catch (error) {
            console.error("Like video error:", error);
            setUserInteraction(originalInteraction);
            setLikes(originalLikes);
            setDislikes(originalDislikes);
            toast({ title: "Something went wrong", description: "Your like could not be saved.", variant: "destructive" });
        }
    }, [user, video.id, toast, userInteraction, likes, dislikes]);

    const handleDislike = useCallback(async () => {
        if (!user) {
            toast({ title: 'Please sign in to dislike videos.' });
            return;
        }

        const originalInteraction = { ...userInteraction };
        const originalLikes = likes;
        const originalDislikes = dislikes;

        const newDislikedState = !originalInteraction.disliked;
        const newLikedState = false;
        
        startTransition(() => {
            setUserInteraction(prev => ({...prev, liked: newLikedState, disliked: newDislikedState }));
            setDislikes(prev => prev + (newDislikedState ? 1 : -1));
            if (originalInteraction.liked) {
                setLikes(prev => prev - 1);
            }
        });

        try {
            await dislikeVideo(video.id, user.uid);
        } catch (error) {
            console.error("Dislike video error:", error);
            setUserInteraction(originalInteraction);
            setLikes(originalLikes);
            setDislikes(originalDislikes);
            toast({ title: "Something went wrong", description: "Your dislike could not be saved.", variant: "destructive" });
        }
    }, [user, video.id, toast, userInteraction, likes, dislikes]);

    const handleSubscribe = async () => {
        if (!user || !video.authorId) {
            toast({ title: 'Please sign in to subscribe.' });
            return;
        }
        if (isOwner) return;

        startTransition(async () => {
            try {
                const analyticsContext = getViewerAnalyticsContext('watch');
                await toggleSubscription(video.authorId!, user.uid, {
                    sourceContext: analyticsContext.source,
                    subscriberCountry: analyticsContext.viewerCountry,
                });
            } catch (error) {
                console.error("Subscription error:", error);
                toast({ title: "Something went wrong", description: "Could not update subscription.", variant: "destructive" });
            }
        });
    };
    
    const handleShare = async () => {
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
             // Fallback to clipboard
            if (error.name === 'AbortError') {
                return;
            }
            await navigator.clipboard.writeText(shareUrl);
            await shareVideo(video.id);
            toast({ title: 'Link copied to clipboard!' });
        }
    };

     const formatSubscribers = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${Math.floor(count/1000)}K`;
        return `${count}`;
    }
    
    const formatLikes = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    }
    
    const handleSaveClick = () => {
        if (!user) {
            toast({ title: 'Please sign in to save videos.' });
            return;
        }
        openSaveDialog(video.id);
    }

    return (
        <>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Link href={channelLink}>
                  <Avatar>
                      <AvatarImage src={video.channelImageUrl} alt={video.channelName} data-ai-hint="channel avatar" />
                      <AvatarFallback>{video.channelName.charAt(0)}</AvatarFallback>
                  </Avatar>
              </Link>
              <div>
                <Link href={channelLink} className="font-semibold">{video.channelName}</Link>
                <p className="text-sm text-muted-foreground">{video.channelSubscriberCount.toLocaleString()} subscribers</p>
              </div>
              {isOwner ? (
                 <div className="flex gap-2">
                    <Button variant="secondary" className="rounded-full" onClick={() => router.push('/studio/upload')}>Manage videos</Button>
                </div>
              ) : (
                <Button 
                    onClick={handleSubscribe} 
                    disabled={isPending || !user}
                    variant={isSubscribed ? 'secondary' : 'primary'} 
                    className="rounded-full ml-4"
                >
                    {isSubscribed ? <><Check className="mr-2" /> Subscribed</> : 'Subscribe'}
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar">
              <div className="flex items-center rounded-full bg-secondary">
                 <Button variant="secondary" className="rounded-l-full rounded-r-none pr-3" onClick={handleLike} disabled={isPending || !user}>
                  <ThumbsUp className={cn("w-5 h-5 mr-2", userInteraction.liked && "fill-current")} /> 
                  {formatLikes(likes)}
                </Button>
                <Button variant="secondary" className="rounded-r-full rounded-l-none pl-3" onClick={handleDislike} disabled={isPending || !user}>
                  <ThumbsDown className={cn("w-5 h-5", userInteraction.disliked && "fill-current")} />
                </Button>
              </div>
              <Button variant="secondary" className="rounded-full" onClick={handleShare}><Share className="w-5 h-5 mr-2" /> Share</Button>
              <Button variant="secondary" className="rounded-full" onClick={handleSaveClick}><Bookmark className="w-5 h-5 mr-2" /> Save</Button>
            </div>
        </div>
        <VideoDescription video={video} />
        </>
    )
}
