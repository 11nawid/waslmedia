'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Rss } from 'lucide-react';
import type { Post } from '@/lib/types';
import type { StudioUploadBootstrapPage } from '@/lib/studio/bootstrap-types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPostsByAuthorId } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudioStore } from '@/hooks/use-studio-store';
import { PlaylistsTab } from './playlists-tab';
import { ShortsTab } from './shorts-tab';
import { VideosTab } from './videos-tab';
import { useStudioContentTab } from '@/hooks/use-studio-content-tab';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';
import { useStudioSession } from '@/components/studio/studio-session-provider';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';
import type { ApiProgressMode } from '@/hooks/use-global-load-progress';
import { cn } from '@/lib/utils';

const STUDIO_POSTS_CACHE_TTL_MS = 30_000;
const studioPostsCache = new Map<string, { posts: Post[]; fetchedAt: number }>();

function PostsTab({
  initialPosts = [],
  hasInitialData = false,
}: {
  initialPosts?: Post[];
  hasInitialData?: boolean;
}) {
  const { viewer } = useStudioSession();
  const router = useProgressRouter();
  const isMobile = useIsMobile();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const { searchQuery } = useStudioStore();
  const consumedInitialRef = useRef(hasInitialData);

  const refreshPosts = async (force = false, progressMode: ApiProgressMode = 'foreground') => {
    if (!viewer) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (!force) {
      const cached = studioPostsCache.get(viewer.id);
      if (cached && Date.now() - cached.fetchedAt < STUDIO_POSTS_CACHE_TTL_MS) {
        setPosts(cached.posts);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const data = await trackGlobalForegroundTask(getPostsByAuthorId(viewer.id), progressMode);
      studioPostsCache.set(viewer.id, { posts: data, fetchedAt: Date.now() });
      setPosts(data);
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!viewer) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (consumedInitialRef.current) {
      studioPostsCache.set(viewer.id, { posts: initialPosts, fetchedAt: Date.now() });
      consumedInitialRef.current = false;
      return;
    }

    void refreshPosts();
  }, [viewer, hasInitialData, initialPosts]);

  useStudioRealtimeEvent('posts.updated', () => {
    if (!viewer) {
      return;
    }

    studioPostsCache.delete(viewer.id);
    void refreshPosts(true, 'silent');
  });

  const filteredPosts = useMemo(() => {
    if (!searchQuery) {
      return posts;
    }

    return posts.filter((post) => post.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [posts, searchQuery]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading posts...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={() => router.push('/studio/community')}>
          NEW POST
        </Button>
      </div>

      <div className={cn('rounded-sm border', isMobile && 'border-none')}>
        <div className="hidden grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-center border-b px-4 py-2 text-sm font-semibold text-muted-foreground md:grid">
          <div>Post</div>
          <div>Date</div>
          <div>Likes</div>
          <div>Comments</div>
        </div>

        {filteredPosts.length > 0 ? (
          <>
            <div className="hidden md:block">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="group grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] items-center border-b px-4 py-2 text-sm"
                >
                  <p className="line-clamp-2">{post.text}</p>
                  <p>{post.createdAt}</p>
                  <p>{post.likes}</p>
                  <p>{post.commentCount}</p>
                </div>
              ))}
            </div>
            <div className="md:hidden">
              {filteredPosts.map((post) => (
                <article key={post.id} className="border-b px-4 py-3 last:border-b-0">
                  <p className="line-clamp-3 text-sm font-medium leading-6">{post.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{post.createdAt}</span>
                    <span>&bull;</span>
                    <span>{post.likes} likes</span>
                    <span>&bull;</span>
                    <span>{post.commentCount} comments</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            <Rss className="mx-auto mb-4 h-16 w-16" />
            <p>No posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const contentTabs = [
  { value: 'videos', label: 'Videos' },
  { value: 'shorts', label: 'Shorts' },
  { value: 'posts', label: 'Posts' },
  { value: 'playlists', label: 'Playlists' },
];

export function UploadPageClient({ initialPage }: { initialPage: StudioUploadBootstrapPage }) {
  const isMobile = useIsMobile();
  const { activeTab, setActiveTab } = useStudioContentTab();

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Channel content</h1>

      <div>
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              {contentTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 gap-6 rounded-none border-b bg-transparent p-0">
              {contentTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      <div>
        {activeTab === 'videos' ? <VideosTab initialSlice={initialPage.videos} /> : null}
        {activeTab === 'shorts' ? <ShortsTab initialSlice={initialPage.shorts} /> : null}
        {activeTab === 'posts' ? (
          <PostsTab initialPosts={initialPage.posts?.items} hasInitialData={Boolean(initialPage.posts)} />
        ) : null}
        {activeTab === 'playlists' ? (
          <PlaylistsTab initialPlaylists={initialPage.playlists?.items} hasInitialData={Boolean(initialPage.playlists)} />
        ) : null}
      </div>
    </div>
  );
}
