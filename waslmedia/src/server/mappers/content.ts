import { formatDistanceToNow, format } from 'date-fns';
import { DEFAULT_BANNER, DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import type { Channel, Comment, Playlist, Post, Video } from '@/lib/types';
import type { ChannelSettingsRow } from '@/server/repositories/channel-settings';
import type { CommentRow } from '@/server/repositories/comments';
import type { PlaylistRow } from '@/server/repositories/playlists';
import type { PostRow } from '@/server/repositories/posts';
import type { VideoAssetRow } from '@/server/repositories/video-assets';
import type { VideoRow } from '@/server/repositories/videos';
import { appConfig } from '@/config/app';
import { resolveStoredAssetUrl } from '@/server/utils/protected-asset';
import { buildVideoSourceUrl, buildVideoThumbnailUrl } from '@/server/utils/media';
import { parseJsonArray, parseJsonObject } from '@/server/utils/json';

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toRelativeTime(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) {
    return 'just now';
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

export function mapVideo(
  row: VideoRow,
  asset?: VideoAssetRow | null,
  options?: { includeDirectSource?: boolean; viewerId?: string | null }
): Video {
  const createdAt = toDate(row.created_at);
  const hasVideoAsset = Boolean(row.video_url || asset);
  const proxiedThumbnailUrl = resolveThumbnailUrl(row, asset);
  const needsGeneratedThumbnailFallback =
    !proxiedThumbnailUrl || proxiedThumbnailUrl === appConfig.defaultThumbnailUrl;

  return {
    id: row.id,
    thumbnailUrl: proxiedThumbnailUrl,
    title: row.title,
    channelName: row.channel_name,
    channelHandle: row.channel_handle,
    channelImageUrl: resolveStoredAssetUrl(row.channel_image_url, DEFAULT_PROFILE_PICTURE),
    viewCount: row.view_count || 0,
    uploadedAt: toRelativeTime(createdAt),
    rawCreatedAt: createdAt?.toISOString(),
    duration: row.duration || '0:00',
    ...(hasVideoAsset
      ? {
          watchSessionUrl: '/api/playback/session',
          previewSessionUrl: '/api/playback/session',
          playbackModeHint:
            asset?.transcode_status === 'ready' && asset.manifest_object_key ? 'mse' : 'compat-source',
        }
      : {}),
    ...(hasVideoAsset && (options?.includeDirectSource || needsGeneratedThumbnailFallback)
      ? { videoUrl: buildVideoSourceUrl(row.id, options?.viewerId || null) }
      : {}),
    transcodeStatus: asset?.transcode_status || 'pending',
    description: row.description || '',
    visibility: row.visibility,
    authorId: row.author_id,
    likes: row.likes || 0,
    dislikes: row.dislikes || 0,
    commentCount: row.comment_count || 0,
    shareCount: row.share_count || 0,
    channelSubscriberCount: row.channel_subscriber_count || 0,
    type: 'video',
    audience: row.audience,
    tags: parseJsonArray(row.tags),
    language: row.language || 'None',
    category: row.category || 'People & Blogs',
    commentsEnabled: Boolean(row.comments_enabled),
    showLikes: Boolean(row.show_likes),
    location: row.location || undefined,
    summary: row.summary || '',
    timestamps: row.timestamps || '',
    credits: row.credits || '',
  };
}

function resolveThumbnailUrl(row: VideoRow, asset?: VideoAssetRow | null) {
  if (asset?.thumbnail_bucket && asset.thumbnail_object_key) {
    return buildVideoThumbnailUrl(row.id);
  }

  return resolveStoredAssetUrl(row.thumbnail_url, appConfig.defaultThumbnailUrl);
}

export function mapComment(row: CommentRow): Comment {
  const createdAt = toDate(row.created_at);

  return {
    id: row.id,
    text: row.text,
    authorId: row.author_id,
    authorName: row.author_name,
    authorImageUrl: resolveStoredAssetUrl(row.author_image_url, DEFAULT_PROFILE_PICTURE),
    createdAt: toRelativeTime(createdAt),
    rawCreatedAt: createdAt?.toISOString(),
    videoId: row.video_id || undefined,
    postId: row.post_id || undefined,
    parentId: row.parent_id,
    replies: [],
    likes: row.likes || 0,
  };
}

export function nestComments(comments: Comment[]) {
  const byId = new Map<string, Comment & { replies: Comment[] }>();
  const roots: (Comment & { replies: Comment[] })[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const current = byId.get(comment.id);
    if (!current) {
      continue;
    }

    if (!comment.parentId) {
      roots.push(current);
      continue;
    }

    const parent = byId.get(comment.parentId);
    if (parent) {
      parent.replies.push(current);
    } else {
      roots.push(current);
    }
  }

  for (const comment of roots) {
    comment.replies.sort((left, right) => {
      const leftTime = left.rawCreatedAt ? new Date(left.rawCreatedAt).getTime() : 0;
      const rightTime = right.rawCreatedAt ? new Date(right.rawCreatedAt).getTime() : 0;
      return leftTime - rightTime;
    });
  }

  return roots;
}

export function mapPlaylist(
  row: PlaylistRow,
  extras?: { videoIds?: string[]; videoCount?: number; firstVideoThumbnail?: string | null }
): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    visibility: row.visibility,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    videoIds: extras?.videoIds || [],
    videoCount: extras?.videoCount ?? extras?.videoIds?.length ?? 0,
    firstVideoThumbnail: extras?.firstVideoThumbnail || undefined,
    createdAt: toDate(row.created_at)?.toISOString(),
    updatedAt: toDate(row.updated_at)?.toISOString(),
  };
}

export function mapPost(row: PostRow): Post {
  const createdAt = toDate(row.created_at);

  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorImageUrl: resolveStoredAssetUrl(row.author_image_url, DEFAULT_PROFILE_PICTURE),
    authorHandle: row.author_handle,
    text: row.text,
    imageUrl: resolveStoredAssetUrl(row.image_url, ''),
    poll: parseJsonObject(row.poll, undefined),
    likes: row.likes || 0,
    dislikes: row.dislikes || 0,
    commentCount: row.comment_count || 0,
    createdAt: toRelativeTime(createdAt),
    rawCreatedAt: createdAt?.toISOString(),
  };
}

export function mapChannel(
  row: ChannelSettingsRow,
  extras?: {
    videos?: Video[];
    posts?: Post[];
    playlists?: Playlist[];
    totalViews?: number;
  }
): Channel {
  return {
    id: row.user_id,
    uid: row.user_id,
    name: row.name,
    handle: row.handle,
    profilePictureUrl: resolveStoredAssetUrl(row.profile_picture_url, DEFAULT_PROFILE_PICTURE),
    bannerUrl: resolveStoredAssetUrl(row.banner_url, DEFAULT_BANNER),
    subscriberCount: row.subscriber_count || 0,
    videos: extras?.videos || [],
    posts: extras?.posts || [],
    playlists: extras?.playlists || [],
    description: row.description || '',
    email: row.contact_email || '',
    country: row.country || '',
    showCountry: Boolean(row.show_country),
    joinedAt: row.joined_at ? format(new Date(row.joined_at), 'MMM d, yyyy') : 'N/A',
    totalViews: extras?.totalViews || 0,
  };
}
