'use client';

import { toggleSubscription, getComments, addComment as addCommentToDb, likePost, dislikePost, getPostInteractionStatus, voteOnPoll } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/video-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clapperboard, Check, Rss, ThumbsUp, ThumbsDown, MessageSquare, Film, BarChart2, Calendar, PlayCircle, ListVideo, Search } from 'lucide-react';
import type { Channel, Video, Post, Comment, Playlist, RealtimeScopeToken } from '@/lib/types';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { CommentItem } from '@/components/comment-item';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref } from '@/lib/video-links';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { getViewerAnalyticsContext } from '@/lib/analytics/viewer-context';
import {
  ChannelNotFound,
  ChannelPageSkeleton,
  PageSection,
  SecureImage,
  SortFilters,
  filterPlaylistsByQuery,
  filterPostsByQuery,
  filterVideosByQuery,
  formatCompactViews,
  formatSubscribers,
  sortVideos,
  type VideoSortMode,
} from '@/components/channel-page-primitives';
import { useProgressRouter } from '@/hooks/use-progress-router';
async function fetchChannelBootstrap(channelId: string) {
    const response = await fetch(`/api/bootstrap/channel/${encodeURIComponent(channelId)}`, {
        credentials: 'include',
        cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'CHANNEL_BOOTSTRAP_FAILED');
    }
    return payload as {
        page: { channel: Channel };
        realtime?: {
            channel?: RealtimeScopeToken;
            postComments?: Record<string, RealtimeScopeToken>;
        };
    };
}

function PostComments({ post, initialComments, realtimeToken }: { post: Post, initialComments: Comment[]; realtimeToken?: string | null }) {
    const { userProfile: user } = useAuth();
    const { toast } = useToast();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [commentText, setCommentText] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let active = true;
        const eventSource = realtimeToken
            ? new EventSource(`/api/realtime?token=${encodeURIComponent(realtimeToken)}`)
            : null;

        const loadComments = async () => {
            const fetchedComments = await getComments(post.id, 'post');
            if (active) {
                setComments(fetchedComments);
            }
        };

        loadComments().catch(console.error);
        eventSource?.addEventListener('comments.updated', () => {
            loadComments().catch(console.error);
        });

        return () => {
            active = false;
            eventSource?.close();
        };
    }, [post.id, realtimeToken]);

    const handleAddComment = () => {
        if (!user || !commentText.trim()) return;
        startTransition(async () => {
            try {
                await addCommentToDb(post.id, 'post', user.uid, user.displayName!, user.photoURL!, commentText, null);
                setCommentText('');
            } catch (error: any) {
                console.error("Failed to add comment:", error);
                toast({ title: "Failed to add comment", description: "Please try again later.", variant: "destructive" });
            }
        });
    };

    return (
        <div className="mt-4 pt-4 border-t">
            {user && (
                <div className="flex items-start gap-3 mb-4">
                    <Avatar>
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Textarea 
                            placeholder="Add a comment..." 
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            className="bg-transparent border-b rounded-none px-0 focus-visible:ring-0"
                         />
                         {commentText && (
                            <div className="flex justify-end gap-2 mt-2">
                                <Button variant="ghost" onClick={() => setCommentText('')}>Cancel</Button>
                                <Button onClick={handleAddComment} disabled={isPending}>Comment</Button>
                            </div>
                         )}
                    </div>
                </div>
            )}
            <div className="space-y-4">
                {comments.map(comment => <CommentItem key={comment.id} comment={comment} parentId={post.id} parentType="post" />)}
            </div>
        </div>
    );
}
function PostCard({ post, realtimeToken }: { post: Post; realtimeToken?: string | null }) {
    const { userProfile: user } = useAuth();
    const { toast } = useToast();
    const [currentPost, setCurrentPost] = useState(post);
    const [interaction, setInteraction] = useState({ liked: false, disliked: false });
    const [isPending, startTransition] = useTransition();
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);

    useEffect(() => {
        if (user && currentPost.id) {
            getPostInteractionStatus(currentPost.id, user.uid).then(setInteraction);
        }
    }, [user, currentPost.id]);

    const handleVote = (optionIndex: number) => {
        if (!user) { toast({ title: 'Please sign in to vote.' }); return; }
        startTransition(async () => {
            try {
                const updatedPost = await voteOnPoll(currentPost.id, user.uid, optionIndex);
                setCurrentPost(updatedPost);
            } catch (error: any) {
                console.error("Error voting on poll:", error);
                toast({ title: 'Error voting', description: "Your vote could not be recorded. Please try again.", variant: 'destructive' });
            }
        });
    }

    const handleLike = () => {
        if (!user) { toast({ title: 'Please sign in' }); return; }
        startTransition(async () => {
            const originalInteraction = { ...interaction };
            const originalLikes = currentPost.likes;
            const originalDislikes = currentPost.dislikes;
            
            const newLikedState = !interaction.liked;
            
            setInteraction(prev => ({ liked: !prev.liked, disliked: false }));
            setCurrentPost(prev => ({
                ...prev,
                likes: prev.likes + (newLikedState ? 1 : -1),
                dislikes: interaction.disliked ? prev.dislikes - 1 : prev.dislikes
            }));

            try { await likePost(currentPost.id, user.uid); }
            catch(error) { 
                console.error("Failed to like post:", error);
                toast({ title: 'Something went wrong', description: 'Your like could not be saved.', variant: 'destructive' });
                setInteraction(originalInteraction); 
                 setCurrentPost(prev => ({ ...prev, likes: originalLikes, dislikes: originalDislikes }));
            }
        });
    };

     const handleDislike = () => {
        if (!user) { toast({ title: 'Please sign in' }); return; }
        startTransition(async () => {
            const originalInteraction = { ...interaction };
            const originalLikes = currentPost.likes;
            const originalDislikes = currentPost.dislikes;
            
            const newDislikedState = !interaction.disliked;

            setInteraction(prev => ({ disliked: !prev.disliked, liked: false }));
            setCurrentPost(prev => ({
                ...prev,
                dislikes: prev.dislikes + (newDislikedState ? 1 : -1),
                likes: interaction.liked ? prev.likes - 1 : prev.likes
            }));

            try { await dislikePost(currentPost.id, user.uid); }
            catch(error) { 
                console.error("Failed to dislike post:", error);
                toast({ title: 'Something went wrong', description: 'Your dislike could not be saved.', variant: 'destructive' });
                setInteraction(originalInteraction); 
                setCurrentPost(prev => ({ ...prev, likes: originalLikes, dislikes: originalDislikes }));
            }
        });
    };

    const toggleComments = async () => {
        const newShowComments = !showComments;
        setShowComments(newShowComments);
        if (newShowComments && comments.length === 0) {
            try {
              const fetchedComments = await getComments(currentPost.id, 'post');
              setComments(fetchedComments);
            } catch (error) {
              console.error("Error fetching comments:", error);
              toast({title: "Could not load comments."});
            }
        }
    };
    
    const totalVotes = currentPost.poll?.options.reduce((sum, option) => sum + option.votes, 0) || 0;
    const userVotedOption = user ? currentPost.poll?.voters?.[user.uid] : undefined;

    return (
        <div className="rounded-[28px] border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
                <Avatar>
                    <AvatarImage src={currentPost.authorImageUrl} alt={currentPost.authorName} />
                    <AvatarFallback>{currentPost.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{currentPost.authorName} <span className="font-normal text-muted-foreground">{currentPost.authorHandle}</span></p>
                    <p className="text-sm text-muted-foreground">{currentPost.createdAt}</p>
                </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{currentPost.text}</p>
            {currentPost.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-border/60 bg-secondary/40">
                    <SecureImage
                        src={currentPost.imageUrl}
                        alt="Post image"
                        className="h-auto w-full object-cover"
                        fallbackClassName="aspect-[4/3]"
                    />
                </div>
            )}
             {currentPost.poll && (
                <div className="mt-4 space-y-2">
                    <p className="font-semibold">{currentPost.poll.question}</p>
                    {currentPost.poll.options.map((option, index) => {
                        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                        const hasVoted = userVotedOption !== undefined;
                        const isVotedOption = userVotedOption === index;

                        return (
                            <div key={index}>
                                {hasVoted ? (
                                     <div className="relative bg-secondary p-2 rounded-md text-left">
                                        <Progress value={percentage} className="absolute inset-0 h-full -z-10 bg-transparent group-hover:bg-transparent [&>span:first-child>span]:bg-accent/30" />
                                        <div className="flex justify-between items-center z-10">
                                            <span className={cn("font-medium", isVotedOption && "font-bold")}>{option.text}</span>
                                            <span className={cn("text-sm", isVotedOption && "font-bold")}>{percentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ) : (
                                     <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => handleVote(index)}
                                        disabled={isPending}
                                    >
                                        {option.text}
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                    <p className="text-xs text-muted-foreground">{totalVotes} votes</p>
                </div>
            )}
             <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={handleLike} disabled={isPending}>
                        <ThumbsUp className={cn("w-5 h-5", interaction.liked && "fill-current text-foreground")} />
                    </Button>
                    <span className="text-sm">{currentPost.likes > 0 && currentPost.likes}</span>
                </div>
                 <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={handleDislike} disabled={isPending}>
                        <ThumbsDown className={cn("w-5 h-5", interaction.disliked && "fill-current text-foreground")} />
                    </Button>
                    <span className="text-sm ml-1">{currentPost.dislikes > 0 && currentPost.dislikes}</span>
                </div>
                <Button variant="ghost" className="flex items-center gap-2 rounded-full" onClick={toggleComments}>
                    <MessageSquare className="w-5 h-5" />
                    <span>{currentPost.commentCount}</span>
                </Button>
            </div>
            {showComments && <PostComments post={currentPost} initialComments={comments} realtimeToken={realtimeToken} />}
        </div>
    )
}
function PlaylistCard({ playlist }: { playlist: Playlist }) {
    return (
        <Link href={`/playlist/${playlist.id}`} className="block group rounded-[24px]">
            <div className="relative aspect-video w-full overflow-hidden rounded-[24px] bg-secondary">
                {playlist.firstVideoThumbnail ? (
                    <SecureImage
                        src={playlist.firstVideoThumbnail}
                        alt={playlist.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Clapperboard className="w-12 h-12 text-muted-foreground" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-semibold">VIEW PLAYLIST</p>
                </div>
            </div>
            <h3 className="mt-3 text-base font-semibold">{playlist.name}</h3>
            <p className="text-sm text-muted-foreground">{playlist.videoCount} videos</p>
        </Link>
    )
}
function ShortsCard({ video }: { video: Video }) {
    return (
        <Link href={buildVideoHref(video)} className="block group">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-black">
                 <VideoThumbnail thumbnailUrl={video.thumbnailUrl} videoUrl={video.videoUrl} alt={video.title} sizes="(max-width: 1024px) 33vw, 220px" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                 <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="font-semibold text-sm line-clamp-2">{video.title}</p>
                    <p className="text-xs text-white/80">{video.viewCount.toLocaleString()} views</p>
                </div>
            </div>
        </Link>
    )
}
function ShortsSection({ shorts }: { shorts: Video[] }) {
    if (shorts.length === 0) return null;
    return (
        <div className="py-8 border-t">
            <div className="flex items-center gap-2 mb-4">
                <Film className="w-7 h-7 text-primary" />
                <h2 className="text-2xl font-bold">Shorts</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {shorts.map(short => (
                    <ShortsCard key={short.id} video={short} />
                ))}
            </div>
        </div>
    )
}
export default function ChannelPageContent({
  channelId,
  initialChannel,
  initialRealtime,
}: {
  channelId: string;
  initialChannel: Channel | null;
  initialRealtime?: {
    channel?: RealtimeScopeToken;
    postComments?: Record<string, RealtimeScopeToken>;
  };
}) {
  const router = useProgressRouter();
  const { userProfile: user, isSubscribedTo } = useAuth();
  const { toast } = useToast();
  const [channel, setChannel] = useState<Channel | null>(initialChannel);
  const [loading, setLoading] = useState(false);
  const [missingChannel, setMissingChannel] = useState(!initialChannel);
  const [realtimeTokens, setRealtimeTokens] = useState(initialRealtime);
  const [isPending, startTransition] = useTransition();
  const [videoSort, setVideoSort] = useState<VideoSortMode>('newest');
  const [shortSort, setShortSort] = useState<VideoSortMode>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const isOwner = user?.uid === channel?.id;
  const isSubscribed = channel ? isSubscribedTo(channel.id) : false;

  const { videos, shorts } = useMemo(() => {
    const allVideos = channel?.videos || [];
    return {
        videos: allVideos.filter(v => v.category !== 'Shorts'),
        shorts: allVideos.filter(v => v.category === 'Shorts'),
    };
  }, [channel?.videos]);

  const filteredVideos = useMemo(() => filterVideosByQuery(videos, searchQuery), [searchQuery, videos]);
  const filteredShorts = useMemo(() => filterVideosByQuery(shorts, searchQuery), [searchQuery, shorts]);
  const filteredPlaylists = useMemo(() => filterPlaylistsByQuery(channel?.playlists || [], searchQuery), [channel?.playlists, searchQuery]);
  const filteredPosts = useMemo(() => filterPostsByQuery(channel?.posts || [], searchQuery), [channel?.posts, searchQuery]);
  const sortedVideos = useMemo(() => sortVideos(filteredVideos, videoSort), [filteredVideos, videoSort]);
  const sortedShorts = useMemo(() => sortVideos(filteredShorts, shortSort), [filteredShorts, shortSort]);
  const hasVideos = videos.length > 0;
  const hasShorts = shorts.length > 0;
  const hasPlaylists = Boolean(channel?.playlists && channel.playlists.length > 0);
  const hasPosts = Boolean(channel?.posts && channel.posts.length > 0);

  useEffect(() => {
    setChannel(initialChannel);
    setRealtimeTokens(initialRealtime);
    setMissingChannel(!initialChannel);
    setLoading(false);
  }, [initialChannel, initialRealtime]);

  useEffect(() => {
    if (!channel?.id || !realtimeTokens?.channel?.token) {
        return;
    }

    const eventSource = new EventSource(`/api/realtime?token=${encodeURIComponent(realtimeTokens.channel.token)}`);
    eventSource.addEventListener('channel.updated', () => {
        fetchChannelBootstrap(decodeURIComponent(channelId))
            .then((payload) => {
                setChannel(payload.page.channel);
                setRealtimeTokens(payload.realtime);
                setMissingChannel(false);
            })
            .catch(console.error);
    });

    return () => {
        eventSource.close();
    };
  }, [channel?.id, channelId, realtimeTokens?.channel?.token]);


  const handleSubscribe = async () => {
    if (!user || !channel?.id) {
        toast({ title: 'Please sign in to subscribe.' });
        return;
    }
    if (isOwner) return;

    startTransition(async () => {
        try {
            const analyticsContext = getViewerAnalyticsContext('channel');
            await toggleSubscription(channel.id, user.uid, {
              sourceContext: analyticsContext.source,
              subscriberCountry: analyticsContext.viewerCountry,
            });
        } catch (error) {
            console.error("Subscription error:", error);
            toast({ title: "Something went wrong", description: "Could not update subscription.", variant: "destructive" });
        }
    });
  };

  if (loading) {
    return <ChannelPageSkeleton />;
  }

  if (missingChannel || !channel) {
    return <ChannelNotFound />;
  }

  return (
    <Tabs defaultValue="home" className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-border/60 bg-secondary/25">
            <div className="relative h-40 w-full sm:h-56 lg:h-72">
                <SecureImage
                    src={channel.bannerUrl}
                    alt={`${channel.name} banner`}
                    className="absolute inset-0 h-full w-full object-cover"
                    fallbackClassName="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.72))]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
            </div>
        </div>

        <div className="relative z-10 -mt-10 flex flex-col gap-5 sm:-mt-14 lg:-mt-16 lg:flex-row lg:items-start">
            <Avatar className="h-28 w-28 border-4 border-background shadow-2xl sm:h-36 sm:w-36 lg:h-44 lg:w-44">
                <AvatarImage src={channel.profilePictureUrl} alt={channel.name} data-ai-hint="channel profile" />
                <AvatarFallback>{channel.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 pt-1 sm:pt-3">
                <div className="flex min-w-0 flex-col items-start gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[3.35rem]">{channel.name}</h1>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:text-base">
                            <span className="font-medium">{channel.handle}</span>
                            <span>•</span>
                            <span>{formatSubscribers(channel.subscriberCount)}</span>
                            <span>•</span>
                            <span>{videos.length + shorts.length} videos</span>
                        </div>
                        {channel.description ? (
                            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[0.98rem]">
                                {channel.description}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                    {isOwner ? (
                        <>
                            <Button className="rounded-full px-5" onClick={() => router.push('/studio/customisation')}>Customize channel</Button>
                            <Button variant="secondary" className="rounded-full px-5" onClick={() => router.push('/studio/upload')}>Manage videos</Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleSubscribe}
                            disabled={isPending || !user}
                            variant={isSubscribed ? 'secondary' : 'primary'}
                            className="rounded-full px-5"
                        >
                            {isSubscribed ? <><Check className="mr-2 h-4 w-4" /> Subscribed</> : 'Subscribe'}
                        </Button>
                    )}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-b border-border/60 pb-2 lg:flex-row lg:items-end lg:justify-between">
            <ScrollArea className="min-w-0 flex-1 whitespace-nowrap">
                <TabsList className="h-auto bg-transparent p-0">
                    {[
                        { value: 'home', label: 'Home', visible: true },
                        { value: 'videos', label: 'Videos', visible: hasVideos },
                        { value: 'shorts', label: 'Shorts', visible: hasShorts },
                        { value: 'playlists', label: 'Playlists', visible: hasPlaylists },
                        { value: 'posts', label: 'Posts', visible: hasPosts },
                        { value: 'about', label: 'About', visible: true },
                    ].filter((tab) => tab.visible).map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="relative mr-8 rounded-none border-b-2 border-transparent px-0 pb-4 pt-0 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-[1.02rem]"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
            <div className="relative mb-1 w-full shrink-0 lg:max-w-xs">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={`Search ${channel.name}`}
                    className="h-11 rounded-full border-border/70 bg-secondary/35 pl-10"
                    aria-label="Search channel content"
                />
            </div>
        </div>

        <TabsContent value="home" className="mt-6">
            {filteredVideos.length > 0 || filteredShorts.length > 0 ? (
                <div className="space-y-12">
                    {filteredVideos.length > 0 ? (
                        <PageSection title="Videos">
                            <SortFilters value={videoSort} onChange={setVideoSort} />
                            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
                                {sortedVideos.slice(0, 6).map((video) => (
                    <VideoCard key={video.id} video={video} sourceContext="channel" />
                                ))}
                            </div>
                        </PageSection>
                    ) : null}
                    <div className="space-y-5">
                        {filteredShorts.length > 0 ? <SortFilters value={shortSort} onChange={setShortSort} /> : null}
                        <ShortsSection shorts={sortedShorts.slice(0, 6)} />
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={Clapperboard}
                    title={searchQuery ? 'No matching uploads found' : 'No public uploads yet'}
                    description={searchQuery ? 'Try a different search inside this channel.' : 'When this channel publishes videos or Shorts, they’ll show up here.'}
                    actionLabel={isOwner ? 'Upload video' : undefined}
                    onAction={isOwner ? () => router.push('/studio/upload') : undefined}
                />
            )}
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
            {videos.length > 0 ? (
                <PageSection title="Videos">
                    <SortFilters value={videoSort} onChange={setVideoSort} />
                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
                        {sortedVideos.map((video) => (
                    <VideoCard key={video.id} video={video} sourceContext="channel" />
                        ))}
                    </div>
                </PageSection>
            ) : (
                <EmptyState
                    icon={ListVideo}
                    title={searchQuery ? 'No matching videos found' : 'No videos yet'}
                    description={searchQuery ? 'Try a different search inside this channel.' : 'This channel hasn’t published any standard videos yet.'}
                    compact
                />
            )}
        </TabsContent>

        <TabsContent value="shorts" className="mt-6">
            {shorts.length > 0 ? (
                <PageSection title="Shorts" description={`${shorts.length} quick vertical uploads`}>
                    <SortFilters value={shortSort} onChange={setShortSort} />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                        {sortedShorts.map((short) => (
                            <ShortsCard key={short.id} video={short} />
                        ))}
                    </div>
                </PageSection>
            ) : (
                <EmptyState
                    icon={Film}
                    title={searchQuery ? 'No matching Shorts found' : 'No Shorts yet'}
                    description={searchQuery ? 'Try a different search inside this channel.' : 'This channel hasn’t published any Shorts yet.'}
                    compact
                />
            )}
        </TabsContent>

        <TabsContent value="playlists" className="mt-6">
            {filteredPlaylists.length > 0 ? (
                <PageSection title="Playlists" description="Curated collections from this channel.">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {filteredPlaylists.map((playlist) => (
                            <PlaylistCard key={playlist.id} playlist={playlist} />
                        ))}
                    </div>
                </PageSection>
            ) : (
                <EmptyState
                    icon={PlayCircle}
                    title={searchQuery ? 'No matching playlists found' : 'No public playlists'}
                    description={searchQuery ? 'Try a different search inside this channel.' : 'Public playlists from this channel will appear here.'}
                    compact
                />
            )}
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
           {filteredPosts.length > 0 ? (
               <PageSection title="Posts" description="Updates, polls, and community posts.">
                   <div className="mx-auto max-w-3xl space-y-6">
                       {filteredPosts.map((post) => (
                           <PostCard key={post.id} post={post} realtimeToken={realtimeTokens?.postComments?.[post.id]?.token} />
                       ))}
                   </div>
               </PageSection>
            ) : (
                <EmptyState
                    icon={Rss}
                    title={searchQuery ? 'No matching posts found' : 'No posts yet'}
                    description={searchQuery ? 'Try a different search inside this channel.' : 'Community posts from this channel will appear here.'}
                    actionLabel={isOwner ? 'Create post' : undefined}
                    onAction={isOwner ? () => router.push('/studio/community') : undefined}
                />
            )}
        </TabsContent>

        <TabsContent value="about" className="mt-6">
           <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)]">
                <div className="space-y-4 rounded-[28px] border border-border/60 bg-card/35 p-6">
                    <h3 className="text-xl font-bold">Description</h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">
                        {channel.description || 'No description provided yet.'}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[28px] border border-border/60 bg-card/35 p-6">
                        <h3 className="mb-4 text-xl font-bold">Stats</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Calendar className="h-5 w-5" />
                                <span className="text-sm sm:text-base">Joined {channel.joinedAt || 'recently'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <BarChart2 className="h-5 w-5" />
                                <span className="text-sm sm:text-base">{formatCompactViews(channel.totalViews)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-border/60 bg-card/35 p-6">
                        <h3 className="mb-4 text-xl font-bold">Details</h3>
                        <div className="space-y-4 text-sm sm:text-base">
                            {channel.email ? (
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold text-muted-foreground">Email for business enquiries</h4>
                                    <a href={`mailto:${channel.email}`} className="break-all text-accent hover:underline">{channel.email}</a>
                                </div>
                            ) : null}
                            {channel.showCountry && channel.country ? (
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold text-muted-foreground">Location</h4>
                                    <p>{channel.country}</p>
                                </div>
                            ) : null}
                            {!channel.email && !(channel.showCountry && channel.country) ? (
                                <p className="text-muted-foreground">No public details provided.</p>
                            ) : null}
                        </div>
                    </div>
                </div>
           </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
