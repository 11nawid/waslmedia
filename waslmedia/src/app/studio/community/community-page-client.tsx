'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AuthUser } from '@/lib/auth/types';
import type { Post } from '@/lib/types';
import type { StudioCommunityBootstrapPage, StudioCommunityComment } from '@/lib/studio/bootstrap-types';
import { createPost, deleteComment, deletePost, getCommentsForUserVideos, getPostsByAuthorId } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, MessageSquare, Trash2, ShieldCheck, Flag, Image as ImageIcon, X, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/empty-state';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';
import type { ApiProgressMode } from '@/hooks/use-global-load-progress';

type CommunityTab = 'posts' | 'comments';

const COMMUNITY_CACHE_TTL_MS = 30_000;
const communityPostsCache = new Map<string, { posts: Post[]; fetchedAt: number }>();
const communityCommentsCache = new Map<string, { comments: StudioCommunityComment[]; fetchedAt: number }>();

function isCommunityTab(value: string | null): value is CommunityTab {
  return value === 'posts' || value === 'comments';
}

function getFreshPosts(userId: string) {
  const cached = communityPostsCache.get(userId);
  if (!cached || Date.now() - cached.fetchedAt >= COMMUNITY_CACHE_TTL_MS) {
    return null;
  }

  return cached.posts;
}

function getFreshComments(userId: string) {
  const cached = communityCommentsCache.get(userId);
  if (!cached || Date.now() - cached.fetchedAt >= COMMUNITY_CACHE_TTL_MS) {
    return null;
  }

  return cached.comments;
}

function CommentRow({
  comment,
  onCommentDeleted,
}: {
  comment: StudioCommunityComment;
  onCommentDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteComment(comment.id);
        toast({ title: 'Comment deleted successfully' });
        onCommentDeleted(comment.id);
      } catch {
        toast({ title: 'Failed to delete comment', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center border-b border-border/80 px-4 py-2 text-sm text-foreground group">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={comment.authorImageUrl} alt={comment.authorName} />
          <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{comment.authorName}</p>
          <p className="text-xs text-muted-foreground">{comment.createdAt}</p>
        </div>
      </div>
      <div>
        <p className="line-clamp-2">{comment.text}</p>
        <Link href={`/watch/${comment.videoId}`} className="mt-1 text-xs text-accent hover:underline" target="_blank">
          on: {comment.videoTitle}
        </Link>
      </div>
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary">
          <ShieldCheck className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary">
          <Flag className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function CommunityPostsTab({
  currentUser,
  initialPosts,
}: {
  currentUser: AuthUser;
  initialPosts: Post[];
}) {
  const { toast } = useToast();
  const [postText, setPostText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, startPosting] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const consumedInitialRef = useRef(true);

  const refreshPosts = async (force = false, progressMode: ApiProgressMode = 'foreground') => {
    if (!force) {
      const cached = getFreshPosts(currentUser.id);
      if (cached) {
        setPosts(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const userPosts = await trackGlobalForegroundTask(getPostsByAuthorId(currentUser.id), progressMode);
      communityPostsCache.set(currentUser.id, { posts: userPosts, fetchedAt: Date.now() });
      setPosts(userPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    communityPostsCache.set(currentUser.id, { posts: initialPosts, fetchedAt: Date.now() });

    if (consumedInitialRef.current) {
      consumedInitialRef.current = false;
      return;
    }

    void refreshPosts();
  }, [currentUser.id, initialPosts]);

  useStudioRealtimeEvent('posts.updated', () => {
    communityPostsCache.delete(currentUser.id);
    void refreshPosts(true, 'silent');
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handlePost = () => {
    const pollData = showPoll && pollQuestion.trim()
      ? { question: pollQuestion, options: pollOptions.filter((option) => option.trim()).map((option) => ({ text: option, votes: 0 })) }
      : undefined;

    if (pollData && pollData.options.length < 2) {
      toast({ title: 'Polls must have at least 2 options.', variant: 'destructive' });
      return;
    }

    if (!postText.trim() && !imageFile && !pollData) {
      toast({ title: 'Cannot create an empty post.', variant: 'destructive' });
      return;
    }

    startPosting(async () => {
      try {
        const createdPost = await createPost(currentUser.id, postText, imageFile || undefined, pollData);
        const nextPosts = [createdPost, ...posts];
        communityPostsCache.set(currentUser.id, { posts: nextPosts, fetchedAt: Date.now() });
        setPosts(nextPosts);
        setPostText('');
        handleRemoveImage();
        setShowPoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        toast({ title: 'Post published!' });
      } catch (error: any) {
        toast({ title: 'Failed to publish post', description: error.message, variant: 'destructive' });
      }
    });
  };

  const handleDeletePost = (postId: string) => {
    startPosting(async () => {
      try {
        await deletePost(postId);
        const nextPosts = posts.filter((post) => post.id !== postId);
        communityPostsCache.set(currentUser.id, { posts: nextPosts, fetchedAt: Date.now() });
        setPosts(nextPosts);
        toast({ title: 'Post deleted.' });
      } catch (error: any) {
        toast({ title: 'Failed to delete post', description: error.message, variant: 'destructive' });
      }
    });
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const nextOptions = [...pollOptions];
    nextOptions[index] = value;
    setPollOptions(nextOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const nextOptions = [...pollOptions];
      nextOptions.splice(index, 1);
      setPollOptions(nextOptions);
    }
  };

  const isPostDisabled = () => {
    const hasText = postText.trim();
    const hasImage = !!imageFile;
    const hasPoll = showPoll && pollQuestion.trim() && pollOptions.filter((option) => option.trim()).length >= 2;
    return isPosting || (!hasText && !hasImage && !hasPoll);
  };

  return (
    <div className="space-y-6">
      <div className="app-panel p-4">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={currentUser.photoURL ?? currentUser.profilePictureUrl ?? undefined} alt={currentUser.displayName} />
            <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              className="bg-transparent border-none focus-visible:ring-0 min-h-[100px]"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            {imagePreview ? (
              <div className="mt-4 relative w-48 h-48 border rounded-md">
                <Image src={imagePreview} alt="Image preview" fill className="object-cover rounded-md" />
                <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={handleRemoveImage}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {showPoll ? (
              <div className="mt-4 space-y-3 p-3 border rounded-md">
                <Input
                  placeholder="Poll question"
                  className="bg-transparent"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      className="bg-transparent"
                      value={option}
                      onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    />
                    {pollOptions.length > 2 ? (
                      <Button variant="ghost" size="icon" onClick={() => removePollOption(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {pollOptions.length < 4 ? (
                  <Button variant="outline" size="sm" onClick={addPollOption}>
                    Add option
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2 text-muted-foreground">
            <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} title="Add image">
              <ImageIcon />
            </Button>
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" />
            <Button variant="ghost" size="icon" onClick={() => setShowPoll(!showPoll)} title="Add poll">
              <ListTodo />
            </Button>
          </div>
          <Button onClick={handlePost} disabled={isPostDisabled()}>
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Posts</h2>
        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-border/80 bg-card/60 p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{post.text}</p>
                {post.imageUrl ? (
                  <div className="mt-3 rounded-md overflow-hidden max-w-sm">
                    <Image src={post.imageUrl} alt="Post image" width={400} height={400} className="w-full h-auto object-contain" />
                  </div>
                ) : null}
                {post.poll ? (
                  <div className="mt-3 space-y-2">
                    <p className="font-semibold text-sm">{post.poll.question}</p>
                    {post.poll.options.map((option, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {option.text} - {option.votes} votes
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{post.createdAt}</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> {post.commentCount}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeletePost(post.id)} disabled={isPosting}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No posts yet"
            description="Use the community tab to share updates, images, and polls with your audience."
            compact
          />
        )}
      </div>
    </div>
  );
}

function CommentsTab({
  currentUser,
  initialComments,
}: {
  currentUser: AuthUser;
  initialComments: StudioCommunityComment[];
}) {
  const [comments, setComments] = useState<StudioCommunityComment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const consumedInitialRef = useRef(true);

  const refreshComments = async (force = false, progressMode: ApiProgressMode = 'foreground') => {
    if (!force) {
      const cached = getFreshComments(currentUser.id);
      if (cached) {
        setComments(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const nextComments = await trackGlobalForegroundTask(getCommentsForUserVideos(currentUser.id), progressMode);
      communityCommentsCache.set(currentUser.id, { comments: nextComments, fetchedAt: Date.now() });
      setComments(nextComments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    communityCommentsCache.set(currentUser.id, { comments: initialComments, fetchedAt: Date.now() });

    if (consumedInitialRef.current) {
      consumedInitialRef.current = false;
      return;
    }

    void refreshComments();
  }, [currentUser.id, initialComments]);

  useStudioRealtimeEvent('comments.updated', () => {
    communityCommentsCache.delete(currentUser.id);
    void refreshComments(true, 'silent');
  });

  const handleCommentDeleted = (commentId: string) => {
    const nextComments = comments.filter((comment) => comment.id !== commentId);
    communityCommentsCache.set(currentUser.id, { comments: nextComments, fetchedAt: Date.now() });
    setComments(nextComments);
  };

  if (loading) {
    return <div className="text-center py-20">Loading comments...</div>;
  }

  return (
    <Tabs defaultValue="published">
      <TabsList className="mb-4 gap-6 rounded-none border-b border-border/80 bg-transparent p-0">
        <TabsTrigger value="published" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">
          Published
        </TabsTrigger>
        <TabsTrigger value="held" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">
          Held for review
        </TabsTrigger>
      </TabsList>
      <TabsContent value="published">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/70">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center border-b border-border/80 px-4 py-2 text-sm font-semibold text-muted-foreground">
            <div>Author</div>
            <div>Comment</div>
            <div className="text-right">Actions</div>
          </div>
          <div>
            {comments.length > 0 ? (
              comments.map((comment) => <CommentRow key={comment.id} comment={comment} onCommentDeleted={handleCommentDeleted} />)
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={MessageSquare}
                  title="No comments to display"
                  description="New audience comments on your videos will show up here."
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="held" className="py-6">
        <EmptyState
          icon={ShieldCheck}
          title="Nothing held for review"
          description="Potentially sensitive comments will show up here when moderation needs your attention."
          compact
        />
      </TabsContent>
    </Tabs>
  );
}

export function CommunityPageClient({
  currentUser,
  initialPage,
}: {
  currentUser: AuthUser;
  initialPage: StudioCommunityBootstrapPage;
}) {
  const router = useProgressRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab') || null;
  const activeTab: CommunityTab = isCommunityTab(queryTab) ? queryTab : initialPage.activeTab;

  const setActiveTab = (nextTab: string) => {
    if (!isCommunityTab(nextTab) || nextTab === activeTab) {
      return;
    }

    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', nextTab);
    router.replace(`/studio/community?${params.toString()}`, { scroll: false });
  };

  const pageTitle = useMemo(() => 'Community', []);

  return (
    <div className="text-foreground">
      <h1 className="text-2xl font-bold mb-6">{pageTitle}</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 gap-6 rounded-none border-b border-border/80 bg-transparent p-0">
          <TabsTrigger value="posts" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">
            Posts
          </TabsTrigger>
          <TabsTrigger value="comments" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">
            Comments
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {activeTab === 'posts' ? (
        <CommunityPostsTab currentUser={currentUser} initialPosts={initialPage.posts} />
      ) : (
        <CommentsTab currentUser={currentUser} initialComments={initialPage.comments} />
      )}
    </div>
  );
}
