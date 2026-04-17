import type {
  ChannelBootstrapPage,
  HomeBootstrapPage,
  PageBootstrap,
  ShortsBootstrapPage,
  TrendingBootstrapPage,
  WatchBootstrapPage,
} from '@/lib/types';
import type {
  StudioAnalyticsBootstrapPage,
  StudioBootstrap,
  StudioCommunityBootstrapPage,
  StudioCommunityTab,
  StudioDashboardBootstrapPage,
  StudioLibraryBootstrapPage,
  StudioUploadBootstrapPage,
  StudioUploadTab,
} from '@/lib/studio/bootstrap-types';
import type { StudioDashboardData } from '@/lib/studio/session-types';
import { withRedisCache } from '@/server/cache';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getChannelAnalytics } from '@/server/services/analytics';
import { getAudioLibraryTracks } from '@/server/services/audio-tracks';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';
import { getComments, getCommentsForUserVideos } from '@/server/services/comments';
import { getUserPlaylists } from '@/server/services/playlists';
import { getPostsByAuthorId } from '@/server/services/posts';
import { createRealtimeScopeToken } from '@/server/realtime/tokens';
import { getEligibleSponsoredAds } from '@/server/services/ads';
import { getAdsRuntimeConfig } from '@/server/utils/runtime-config';
import {
  getPaginatedFeedVideos,
  getPaginatedVideosByAuthorId,
  getRecommendedVideos,
  getUserInteractionStatus,
  getVideoById,
} from '@/server/services/videos';

function createBootstrap<TPage>(
  viewer: Awaited<ReturnType<typeof getCurrentAuthUser>>,
  page: TPage,
  options?: Omit<PageBootstrap<TPage>, 'viewer' | 'page' | 'generatedAt'>
): PageBootstrap<TPage> {
  return {
    viewer,
    page,
    pagination: options?.pagination,
    realtime: options?.realtime,
    generatedAt: new Date().toISOString(),
  };
}

function cacheAnonymousBootstrap<TPage>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<PageBootstrap<TPage>>
) {
  return withRedisCache<PageBootstrap<TPage>>(key, ttlSeconds, loader);
}

function createStudioRealtime(viewerId: string) {
  const scope = `studio:${viewerId}`;
  return {
    studio: {
      scope,
      token: createRealtimeScopeToken(scope, { userId: viewerId }),
    },
  };
}

function buildStudioDashboardData(input: {
  analytics: Awaited<ReturnType<typeof getChannelAnalytics>>;
  user: NonNullable<Awaited<ReturnType<typeof getCurrentAuthUser>>>;
}): StudioDashboardData {
  const { analytics, user } = input;

  return {
    latestVideo: analytics.videos.length > 0 ? analytics.videos[0] : null,
    analytics,
    latestComments: analytics.latestComments,
    recentSubscribers: analytics.recentSubscribers,
    channel:
      analytics.channel || {
        id: user.id,
        uid: user.id,
        name: user.displayName,
        handle: user.handle,
        profilePictureUrl: user.profilePictureUrl || user.photoURL || '',
        subscriberCount: analytics.totalSubscribers || 0,
        bannerUrl: user.bannerUrl || '',
        description: user.description || '',
        videos: [],
        posts: [],
        playlists: [],
      },
  };
}

function resolvePositiveNumber(value: string | null | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveStudioUploadTab(value: string | null | undefined): StudioUploadTab {
  return value === 'shorts' || value === 'posts' || value === 'playlists' ? value : 'videos';
}

function resolveStudioCommunityTab(value: string | null | undefined): StudioCommunityTab {
  return value === 'comments' ? 'comments' : 'posts';
}

function filterPosts(posts: Awaited<ReturnType<typeof getPostsByAuthorId>>, search?: string | null) {
  const normalizedSearch = search?.trim().toLowerCase();
  if (!normalizedSearch) {
    return posts;
  }

  return posts.filter((post) => post.text.toLowerCase().includes(normalizedSearch));
}

function filterPlaylists(playlists: Awaited<ReturnType<typeof getUserPlaylists>>, search?: string | null) {
  const normalizedSearch = search?.trim().toLowerCase();
  if (!normalizedSearch) {
    return playlists;
  }

  return playlists.filter((playlist) => playlist.name.toLowerCase().includes(normalizedSearch));
}

async function attachInitialVideoInteractions(
  videos: ShortsBootstrapPage['items'],
  viewerId?: string | null
) {
  if (!viewerId || videos.length === 0) {
    return videos;
  }

  const interactions = await Promise.all(
    videos.map((video) => getUserInteractionStatus(video.id, viewerId).catch(() => undefined))
  );

  return videos.map((video, index) =>
    interactions[index] ? { ...video, initialInteraction: interactions[index] } : video
  );
}

export async function getHomeBootstrap(): Promise<PageBootstrap<HomeBootstrapPage>> {
  const viewer = await getCurrentAuthUser();
  if (viewer) {
    return loadHomeBootstrap(viewer);
  }

  return cacheAnonymousBootstrap('bootstrap:home', 30, () => loadHomeBootstrap(null));
}

export async function getTrendingBootstrap(): Promise<PageBootstrap<TrendingBootstrapPage>> {
  const viewer = await getCurrentAuthUser();
  if (viewer) {
    return loadTrendingBootstrap(viewer);
  }

  return cacheAnonymousBootstrap('bootstrap:trending', 30, () => loadTrendingBootstrap(null));
}

export async function getShortsBootstrap(): Promise<PageBootstrap<ShortsBootstrapPage>> {
  const viewer = await getCurrentAuthUser();
  if (viewer) {
    return loadShortsFeedBootstrap(viewer);
  }

  return cacheAnonymousBootstrap('bootstrap:shorts', 30, () => loadShortsFeedBootstrap(null));
}

export async function getShortsBootstrapForVideo(
  videoId: string
): Promise<PageBootstrap<ShortsBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (viewer) {
    return loadShortsBootstrapForVideo(viewer, videoId);
  }

  return withRedisCache<PageBootstrap<ShortsBootstrapPage> | null>(`bootstrap:shorts:${videoId}`, 30, () =>
    loadShortsBootstrapForVideo(null, videoId)
  );
}

export async function getWatchBootstrap(
  videoId: string,
  options?: { isShare?: boolean }
): Promise<PageBootstrap<WatchBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  const basePayload = viewer
    ? await loadWatchBootstrapPage(videoId, viewer?.id || null, options?.isShare)
    : await withRedisCache<WatchBootstrapPage | null>(`bootstrap:watch:${videoId}`, 20, () =>
        loadWatchBootstrapPage(videoId, null, options?.isShare)
      );

  const video = basePayload?.video;

  if (!basePayload || !video) {
    return null;
  }
  const commentsScope = `comments:video:${videoId}`;

  return createBootstrap(
    viewer,
    basePayload,
    {
      realtime: {
        comments: {
          scope: commentsScope,
          token: createRealtimeScopeToken(commentsScope),
        },
      },
    }
  );
}

export async function getChannelBootstrap(
  channelId: string
): Promise<PageBootstrap<ChannelBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  const channel = viewer
    ? await getPublicChannelByHandleOrId(channelId)
    : await withRedisCache<Awaited<ReturnType<typeof getPublicChannelByHandleOrId>>>(
        `bootstrap:channel:${channelId}`,
        30,
        () => getPublicChannelByHandleOrId(channelId)
      );

  if (!channel) {
    return null;
  }

  const channelScope = `channel:${channel.id}`;
  const postCommentTokens = Object.fromEntries(
    (channel.posts || []).map((post) => {
      const scope = `comments:post:${post.id}`;
      return [
        post.id,
        {
          scope,
          token: createRealtimeScopeToken(scope),
        },
      ];
    })
  );

  return createBootstrap(
    viewer,
    {
      channel,
    },
    {
      realtime: {
        channel: {
          scope: channelScope,
          token: createRealtimeScopeToken(channelScope),
        },
        postComments: postCommentTokens,
      },
    }
  );
}

export async function getStudioDashboardBootstrap(): Promise<StudioBootstrap<StudioDashboardBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (!viewer) {
    return null;
  }

  const analytics = await getChannelAnalytics(viewer.id, 28);
  return createBootstrap(
    viewer,
    {
      dashboard: buildStudioDashboardData({
        analytics,
        user: viewer,
      }),
    },
    {
      realtime: createStudioRealtime(viewer.id),
    }
  );
}

export async function getStudioAnalyticsBootstrap(
  days = 28
): Promise<StudioBootstrap<StudioAnalyticsBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (!viewer) {
    return null;
  }

  const analytics = await getChannelAnalytics(viewer.id, days);
  return createBootstrap(
    viewer,
    {
      days,
      analytics,
    },
    {
      realtime: createStudioRealtime(viewer.id),
    }
  );
}

export async function getStudioUploadBootstrap(options?: {
  tab?: string | null;
  page?: string | null;
  limit?: string | null;
  search?: string | null;
  visibility?: string | null;
  audience?: string | null;
  sortBy?: string | null;
}): Promise<StudioBootstrap<StudioUploadBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (!viewer) {
    return null;
  }

  const activeTab = resolveStudioUploadTab(options?.tab);
  const page = resolvePositiveNumber(options?.page, 1);
  const limit = resolvePositiveNumber(options?.limit, 30);
  const offset = (page - 1) * limit;
  const search = options?.search?.trim() || undefined;

  if (activeTab === 'videos') {
    const feed = await getPaginatedVideosByAuthorId(viewer.id, {
      contentType: 'videos',
      limit,
      offset,
      search,
      visibility:
        options?.visibility === 'public' || options?.visibility === 'private' || options?.visibility === 'unlisted'
          ? options.visibility
          : undefined,
      audience:
        options?.audience === 'madeForKids' || options?.audience === 'notMadeForKids'
          ? options.audience
          : undefined,
      sortBy:
        options?.sortBy === 'oldest' || options?.sortBy === 'most-viewed'
          ? options.sortBy
          : 'newest',
    });

    return createBootstrap(
      viewer,
      {
        activeTab,
        videos: {
          items: feed.videos,
          pageInfo: feed.pagination,
        },
      },
      {
        pagination: feed.pagination,
        realtime: createStudioRealtime(viewer.id),
      }
    );
  }

  if (activeTab === 'shorts') {
    const feed = await getPaginatedVideosByAuthorId(viewer.id, {
      contentType: 'shorts',
      limit,
      offset,
      search,
      visibility:
        options?.visibility === 'public' || options?.visibility === 'private' || options?.visibility === 'unlisted'
          ? options.visibility
          : undefined,
      sortBy:
        options?.sortBy === 'oldest' || options?.sortBy === 'most-viewed'
          ? options.sortBy
          : 'newest',
    });

    return createBootstrap(
      viewer,
      {
        activeTab,
        shorts: {
          items: feed.videos,
          pageInfo: feed.pagination,
        },
      },
      {
        pagination: feed.pagination,
        realtime: createStudioRealtime(viewer.id),
      }
    );
  }

  if (activeTab === 'posts') {
    const posts = filterPosts(await getPostsByAuthorId(viewer.id), search);
    return createBootstrap(
      viewer,
      {
        activeTab,
        posts: {
          items: posts,
        },
      },
      {
        realtime: createStudioRealtime(viewer.id),
      }
    );
  }

  const playlists = filterPlaylists(await getUserPlaylists(viewer.id), search);
  return createBootstrap(
    viewer,
    {
      activeTab,
      playlists: {
        items: playlists,
      },
    },
    {
      realtime: createStudioRealtime(viewer.id),
    }
  );
}

export async function getStudioCommunityBootstrap(options?: {
  tab?: string | null;
}): Promise<StudioBootstrap<StudioCommunityBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (!viewer) {
    return null;
  }

  const activeTab = resolveStudioCommunityTab(options?.tab);
  const [posts, comments] = await Promise.all([
    activeTab === 'posts' ? getPostsByAuthorId(viewer.id) : Promise.resolve([]),
    activeTab === 'comments' ? getCommentsForUserVideos(viewer.id) : Promise.resolve([]),
  ]);

  return createBootstrap(
    viewer,
    {
      activeTab,
      posts,
      comments,
    },
    {
      realtime: createStudioRealtime(viewer.id),
    }
  );
}

export async function getStudioLibraryBootstrap(): Promise<StudioBootstrap<StudioLibraryBootstrapPage> | null> {
  const viewer = await getCurrentAuthUser();
  if (!viewer) {
    return null;
  }

  const tracks = await getAudioLibraryTracks();
  return createBootstrap(
    viewer,
    {
      tracks,
    },
    {
      realtime: createStudioRealtime(viewer.id),
    }
  );
}

async function loadHomeBootstrap(
  viewer: Awaited<ReturnType<typeof getCurrentAuthUser>>
): Promise<PageBootstrap<HomeBootstrapPage>> {
  const adsConfig = getAdsRuntimeConfig();
  const [feed, shortsFeed] = await Promise.all([
    getPaginatedFeedVideos({ limit: 24, contentType: 'videos' }),
    getPaginatedFeedVideos({ limit: 12, contentType: 'shorts' }),
  ]);
  const homeAdSlots =
    Math.ceil(feed.videos.length / Math.max(adsConfig.homeInsertInterval, 1)) + 1;
  const sponsoredAds = await getEligibleSponsoredAds({
    surface: 'home',
    limit: Math.max(homeAdSlots, 1),
    viewerUserId: viewer?.id || null,
  });

  const categories = [
    'All',
    ...Array.from(
      new Set(
        feed.videos
          .map((video) => video.category)
          .filter((value): value is string => Boolean(value))
          .filter((value) => value !== 'Shorts')
      )
    ),
  ];

  return createBootstrap(
    viewer,
    {
      items: feed.videos,
      shorts: shortsFeed.videos,
      categories,
      sponsoredAds,
    },
    { pagination: feed.pagination }
  );
}

async function loadTrendingBootstrap(
  viewer: Awaited<ReturnType<typeof getCurrentAuthUser>>
): Promise<PageBootstrap<TrendingBootstrapPage>> {
  const feed = await getPaginatedFeedVideos({
    limit: 24,
    contentType: 'videos',
    filters: {
      uploadDate: 'anytime',
      type: 'all',
      duration: 'any',
      sortBy: 'viewcount',
    },
  });

  return createBootstrap(viewer, { items: feed.videos }, { pagination: feed.pagination });
}

async function loadShortsFeedBootstrap(
  viewer: Awaited<ReturnType<typeof getCurrentAuthUser>>
): Promise<PageBootstrap<ShortsBootstrapPage>> {
  const feed = await getPaginatedFeedVideos({
    limit: 24,
    contentType: 'shorts',
  });

  const items = await attachInitialVideoInteractions(feed.videos, viewer?.id || null);

  return createBootstrap(viewer, { items }, { pagination: feed.pagination });
}

async function loadShortsBootstrapForVideo(
  viewer: Awaited<ReturnType<typeof getCurrentAuthUser>>,
  activeVideoId: string
): Promise<PageBootstrap<ShortsBootstrapPage> | null> {
  const feed = await getPaginatedFeedVideos({
    limit: 24,
    contentType: 'shorts',
  });

  const activeVideo = await getVideoById(activeVideoId, {
    viewerId: viewer?.id || null,
  });

  if (!activeVideo || activeVideo.category !== 'Shorts') {
    return null;
  }

  const items = await attachInitialVideoInteractions(
    [activeVideo, ...feed.videos.filter((video) => video.id !== activeVideo.id)],
    viewer?.id || null
  );

  return createBootstrap(viewer, { items }, { pagination: feed.pagination });
}

async function loadWatchBootstrapPage(
  videoId: string,
  viewerId?: string | null,
  isShare?: boolean
): Promise<WatchBootstrapPage | null> {
  const video = await getVideoById(videoId, {
    viewerId,
    isShare,
  });

  if (!video) {
    return null;
  }

  const [comments, suggestedVideos, initialInteraction] = await Promise.all([
    video.commentsEnabled ? getComments(videoId, 'video') : Promise.resolve([]),
    getRecommendedVideos({
      videoId,
      authorId: video.authorId,
      category: video.category,
      limit: 16,
    }),
    viewerId ? getUserInteractionStatus(videoId, viewerId) : Promise.resolve(undefined),
  ]);

  return {
    video: initialInteraction ? { ...video, initialInteraction } : video,
    comments,
    suggestedVideos,
  };
}
