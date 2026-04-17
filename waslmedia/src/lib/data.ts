'use client';

import type { SearchFilters } from '@/components/search-filter-dialog';
import type { SponsoredAd } from '@/lib/ads/types';
import type { Channel, Comment, PageInfo, Playlist, Post, Video } from '@/lib/types';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import { syncAuthState, apiGet, apiSend } from '@/lib/api/client';
import { getOwnChannelSettings, getPublicChannel, updateOwnChannelSettings, getUploadDefaults as getStudioUploadDefaults, updateUploadDefaults as updateStudioUploadDefaults } from '@/lib/studio/client';
import { syncVideoUploadConstraints } from '@/lib/video-upload/client';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import { subscribeToSignedRealtimeScope } from '@/lib/realtime/client';

export interface VideoPaginationResult {
  videos: Video[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    count: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const interactionStatusCache = new Map<
  string,
  Promise<{ liked: boolean; disliked: boolean; watchLater: boolean }>
>();
const commentsCache = new Map<string, Promise<Comment[]>>();

export const getVideos = async (): Promise<Video[]> => {
  const payload = await apiGet<{ videos: Video[] }>('/api/videos');
  return payload.videos;
};

export const getVideosByAuthorId = async (authorId: string): Promise<Video[]> => {
  const payload = await apiGet<{ videos: Video[] }>(`/api/videos?authorId=${encodeURIComponent(authorId)}`);
  return payload.videos;
};

export const getPaginatedVideosByAuthorId = async (
  authorId: string,
  options: {
    contentType?: 'videos' | 'shorts';
    limit?: number;
    offset?: number;
    search?: string;
    visibility?: 'public' | 'private' | 'unlisted';
    audience?: 'madeForKids' | 'notMadeForKids';
    sortBy?: 'newest' | 'oldest' | 'most-viewed';
  } = {}
): Promise<VideoPaginationResult> => {
  const params = new URLSearchParams({ authorId });

  if (options.contentType) {
    params.set('contentType', options.contentType);
  }

  if (options.limit) {
    params.set('limit', String(options.limit));
  }

  if (options.offset) {
    params.set('offset', String(options.offset));
  }

  if (options.search?.trim()) {
    params.set('search', options.search.trim());
  }

  if (options.visibility) {
    params.set('visibility', options.visibility);
  }

  if (options.audience) {
    params.set('audience', options.audience);
  }

  if (options.sortBy) {
    params.set('sortBy', options.sortBy);
  }

  return apiGet<VideoPaginationResult>(`/api/videos?${params.toString()}`);
};

export const getVideoById = async (id: string, isShare = false): Promise<Video | undefined> => {
  const payload = await apiGet<{ video: Video }>(`/api/videos/${id}?share=${isShare ? 'true' : 'false'}`);
  return payload.video;
};

export const deleteVideo = async (videoId: string, _authorId: string) => {
  await apiSend(`/api/videos/${videoId}`, { method: 'DELETE' });
  syncVideoUploadConstraints();
};

export const bulkDeleteVideos = async (videoIds: string[], _authorId: string) => {
  await apiSend('/api/videos/bulk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIds }),
  });
  syncVideoUploadConstraints();
};

export const bulkUpdateVideos = async (videoIds: string[], _authorId: string, updateData: Partial<Video>) => {
  await apiSend('/api/videos/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIds, updates: updateData }),
  });
};

export const getChannelByHandle = async (handleOrId: string): Promise<Channel | null> => {
  try {
    return await getPublicChannel(handleOrId);
  } catch {
    return null;
  }
};

export const getSearchResults = async (
  queryStr: string,
  filters?: SearchFilters
): Promise<{ results: (Video | Channel)[]; ads: SponsoredAd[] }> => {
  const params = new URLSearchParams({ q: queryStr });
  if (filters) {
    params.set('uploadDate', filters.uploadDate);
    params.set('type', filters.type);
    params.set('duration', filters.duration);
    params.set('sortBy', filters.sortBy);
  }

  const payload = await apiGet<{ results: (Video | Channel)[]; ads?: SponsoredAd[] }>(`/api/search?${params.toString()}`);
  return {
    results: payload.results,
    ads: payload.ads || [],
  };
};

async function reactToVideo(videoId: string, reaction: 'like' | 'dislike') {
  const payload = await apiSend<{ status: { liked: boolean; disliked: boolean; watchLater: boolean }; video?: Video }>(
    `/api/videos/${videoId}/reaction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    }
  );
  interactionStatusCache.set(videoId, Promise.resolve(payload.status));
  return payload;
}

export const likeVideo = async (videoId: string, _userId: string) => {
  return reactToVideo(videoId, 'like');
};

export const dislikeVideo = async (videoId: string, _userId: string) => {
  return reactToVideo(videoId, 'dislike');
};

export const getUserInteractionStatus = async (videoId: string, _userId: string) => {
  const cached = interactionStatusCache.get(videoId);
  if (cached) {
    return cached;
  }

  const request = apiGet<{ status: { liked: boolean; disliked: boolean; watchLater: boolean } }>(
    `/api/videos/${videoId}/status`
  )
    .then((payload) => payload.status)
    .catch((error) => {
      interactionStatusCache.delete(videoId);
      throw error;
    });

  interactionStatusCache.set(videoId, request);
  return request;
};

export const getLikedVideos = async (_userId: string, videoIds?: string[]): Promise<Video[]> => {
  const params = new URLSearchParams({ mode: 'liked' });
  if (videoIds?.length) {
    params.set('orderedIds', videoIds.join(','));
  }
  const payload = await apiGet<{ videos: Video[] }>(`/api/videos?${params.toString()}`);
  return payload.videos;
};

export const toggleSubscription = async (
  channelId: string,
  _userId: string,
  metadata?: { sourceContext?: string | null; subscriberCountry?: string | null }
) => {
  const payload = await apiSend<{ subscribed: boolean }>(`/api/subscriptions/${channelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata || {}),
  });
  syncAuthState();
  return payload.subscribed;
};

export const getSubscriptions = async (_userId: string): Promise<Channel[]> => {
  const payload = await apiGet<{ channels: Channel[] }>('/api/subscriptions');
  return payload.channels;
};

export interface RecentSubscribersResult {
  channels: Channel[];
  pagination: PageInfo;
}

export const getRecentSubscribers = async (
  channelId: string,
  options?: { count?: number; offset?: number; sort?: 'recent' | 'oldest' | 'largest' },
): Promise<RecentSubscribersResult> => {
  const params = new URLSearchParams({ mode: 'recent', channelId });
  if (options?.count) {
    params.set('count', String(options.count));
  }
  if (options?.offset) {
    params.set('offset', String(options.offset));
  }
  if (options?.sort) {
    params.set('sort', options.sort);
  }
  const payload = await apiGet<RecentSubscribersResult>(`/api/subscriptions?${params.toString()}`);
  return payload;
};

export const getSubscribedVideos = async (_userId: string): Promise<Video[]> => {
  const payload = await apiGet<{ videos: Video[] }>('/api/subscriptions?mode=videos');
  return payload.videos;
};

export const addComment = async (
  parentId: string,
  parentType: 'video' | 'post',
  _authorId: string,
  _authorName: string,
  _authorImageUrl: string,
  text: string,
  replyToCommentId: string | null
) => {
  const payload = await apiSend<{ comment: Comment }>('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId, parentType, text, replyToCommentId }),
  });
  commentsCache.delete(`${parentType}:${parentId}`);
  return payload.comment;
};

export const likeComment = async (commentId: string, _userId: string) => {
  return apiSend<{ liked: boolean; comment: Comment | null }>(`/api/comments/${commentId}/like`, {
    method: 'POST',
  });
};

export const getComments = async (
  parentId: string,
  parentType: 'video' | 'post',
  options?: { force?: boolean }
): Promise<Comment[]> => {
  const cacheKey = `${parentType}:${parentId}`;
  if (!options?.force) {
    const cached = commentsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const params = new URLSearchParams({ parentId, parentType });
  const request = apiGet<{ comments: Comment[] }>(`/api/comments?${params.toString()}`)
    .then((payload) => payload.comments)
    .catch((error) => {
      commentsCache.delete(cacheKey);
      throw error;
    });

  commentsCache.set(cacheKey, request);
  return request;
};

export const updateChannelDetails = async (
  _userId: string,
  data: {
    name: string;
    handle: string;
    profilePicture?: File | null;
    bannerImage?: File | null;
    description?: string;
    email?: string;
    country?: string;
    showCountry?: boolean;
  }
) => {
  return updateOwnChannelSettings(data);
};

export const getCommentsForUserVideos = async (_userId: string): Promise<(Comment & { videoTitle: string })[]> => {
  const payload = await apiGet<{ comments: (Comment & { videoTitle: string })[] }>('/api/comments?mode=studio');
  return payload.comments;
};

export async function editComment(commentId: string, newText: string) {
  const payload = await apiSend<{ comment: Comment }>(`/api/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: newText }),
  });
  if (payload.comment.videoId) {
    commentsCache.delete(`video:${payload.comment.videoId}`);
  }
  if (payload.comment.postId) {
    commentsCache.delete(`post:${payload.comment.postId}`);
  }
  return payload.comment;
}

export const deleteComment = async (commentId: string) => {
  await apiSend(`/api/comments/${commentId}`, { method: 'DELETE' });
};

export const toggleWatchLater = async (videoId: string, _userId: string) => {
  const payload = await apiSend<{ watchLater: boolean }>(`/api/videos/${videoId}/watch-later`, {
    method: 'POST',
  });
  const current = await getUserInteractionStatus(videoId, _userId).catch(() => ({
    liked: false,
    disliked: false,
    watchLater: payload.watchLater,
  }));
  interactionStatusCache.set(
    videoId,
    Promise.resolve({
      ...current,
      watchLater: payload.watchLater,
    })
  );
  syncAuthState();
  return payload.watchLater;
};

export async function bulkToggleWatchLater(videoIds: string[], _userId: string, shouldBeInWatchLater: boolean) {
  await apiSend('/api/videos/watch-later/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIds, shouldExist: shouldBeInWatchLater }),
  });
  syncAuthState();
}

export const getWatchLaterVideos = async (_userId: string): Promise<Video[]> => {
  const payload = await apiGet<{ videos: Video[] }>('/api/videos?mode=watch-later');
  return payload.videos;
};

export async function getPlaylistVideoStatus(_userId: string, videoId: string): Promise<string[]> {
  const payload = await apiGet<{ playlistIds: string[] }>(`/api/playlists/status?videoId=${encodeURIComponent(videoId)}`);
  return payload.playlistIds;
}

export async function createPlaylist(
  _userId: string,
  name: string,
  visibility: 'public' | 'private' | 'unlisted',
  firstVideoId?: string,
  description?: string
) {
  const payload = await apiSend<{ playlist: Playlist }>('/api/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, visibility, description, firstVideoId }),
  });
  return payload.playlist;
}

export async function updatePlaylist(
  _userId: string,
  playlistId: string,
  data: { name: string; description?: string; visibility: 'public' | 'private' | 'unlisted' }
) {
  const payload = await apiSend<{ playlist: Playlist }>(`/api/playlists/${playlistId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return payload.playlist;
}

export async function deletePlaylist(_userId: string, playlistId: string) {
  await apiSend(`/api/playlists/${playlistId}`, { method: 'DELETE' });
}

export async function toggleVideoInPlaylist(_userId: string, playlistId: string, videoId: string, isInPlaylist: boolean) {
  const payload = await apiSend<{ playlist: Playlist }>(`/api/playlists/${playlistId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, isInPlaylist }),
  });
  return payload.playlist;
}

export async function bulkAddToPlaylists(_userId: string, playlistId: string, videoIds: string[]) {
  const payload = await apiSend<{ playlist: Playlist }>(`/api/playlists/${playlistId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoIds }),
  });
  return payload.playlist;
}

export async function getUserPlaylists(_userId: string): Promise<Playlist[]> {
  const payload = await apiGet<{ playlists: Playlist[] }>('/api/playlists');
  return payload.playlists;
}

export async function getPlaylistById(playlistId: string): Promise<(Playlist & { videos: Video[] }) | null> {
  try {
    const payload = await apiGet<{ playlist: Playlist & { videos: Video[] } }>(`/api/playlists/${playlistId}`);
    return payload.playlist;
  } catch {
    return null;
  }
}

export async function createPost(
  _authorId: string,
  text: string,
  imageFile?: File,
  poll?: { question: string; options: { text: string; votes: number }[] }
) {
  let imageUrl: string | undefined;

  if (imageFile) {
    const uploadResult = await uploadFileToStorage({
      bucket: 'postimages',
      objectKey: `posts/${Date.now()}_${sanitizeFileName(imageFile.name)}`,
      file: imageFile,
    });
    imageUrl = uploadResult.storageRef;
  }

  const payload = await apiSend<{ post: Post }>('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, imageUrl, poll }),
  });
  return payload.post;
}

export async function getPostsByAuthorId(authorId: string): Promise<Post[]> {
  const payload = await apiGet<{ posts: Post[] }>(`/api/posts?authorId=${encodeURIComponent(authorId)}`);
  return payload.posts;
}

export async function deletePost(postId: string) {
  await apiSend(`/api/posts/${postId}`, { method: 'DELETE' });
}

async function reactToPost(postId: string, reaction: 'like' | 'dislike') {
  return apiSend<{ status: { liked: boolean; disliked: boolean } }>(`/api/posts/${postId}/reaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reaction }),
  });
}

export const likePost = async (postId: string, _userId: string) => {
  return reactToPost(postId, 'like');
};

export const dislikePost = async (postId: string, _userId: string) => {
  return reactToPost(postId, 'dislike');
};

export const getPostInteractionStatus = async (postId: string, userId: string): Promise<{ liked: boolean; disliked: boolean }> => {
  const payload = await apiGet<{ status: { liked: boolean; disliked: boolean } }>(`/api/posts/${postId}/status`);
  return payload.status;
};

export const voteOnPoll = async (postId: string, _userId: string, optionIndex: number): Promise<Post> => {
  const payload = await apiSend<{ post: Post }>(`/api/posts/${postId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIndex }),
  });
  return payload.post;
};

export function getChannelAnalytics(userId: string, callback: (data: ChannelAnalytics) => void) {
  let cancelled = false;

  const load = async () => {
    const payload = await apiGet<{ analytics: ChannelAnalytics }>(`/api/analytics/channel/${userId}`);
    if (!cancelled) {
      callback(payload.analytics);
    }
  };

  load().catch(console.error);

  if (typeof window !== 'undefined') {
    const reload = () => load().catch(console.error);
    const unsubscribe = subscribeToSignedRealtimeScope(`analytics:${userId}`, 'analytics.updated', reload);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }

  return () => {
    cancelled = true;
  };
}

export const addToHistory = async (_userId: string, videoId: string) => {
  return apiSend<{ success: boolean; saved: boolean }>(`/api/videos/${videoId}/history`, { method: 'POST' });
};

export const shareVideo = async (videoId: string) => {
  const payload = await apiSend<{ video: Video }>(`/api/videos/${videoId}/share`, {
    method: 'POST',
  });
  return payload.video;
};

export const getHistory = async (_userId: string): Promise<Video[]> => {
  const payload = await apiGet<{ videos: Video[] }>('/api/videos?mode=history');
  return payload.videos;
};

export const removeVideoFromHistory = async (videoId: string) => {
  await apiSend(`/api/videos/${videoId}/history`, { method: 'DELETE' });
};

export const clearWatchHistory = async () => {
  await apiSend('/api/videos/history', { method: 'DELETE' });
};

export const getWatchHistoryPreference = async () => {
  const payload = await apiGet<{ enabled: boolean }>('/api/videos/history/preferences');
  return payload.enabled;
};

export const setWatchHistoryPreference = async (enabled: boolean) => {
  const payload = await apiSend<{ enabled: boolean }>('/api/videos/history/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });

  return payload.enabled;
};

export async function getUploadDefaults(userId: string) {
  return getStudioUploadDefaults();
}

export async function updateUploadDefaults(userId: string, data: any) {
  return updateStudioUploadDefaults(data);
}
