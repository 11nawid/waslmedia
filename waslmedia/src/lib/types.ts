

import type { AuthUser } from '@/lib/auth/types';
import type { SponsoredAd } from '@/lib/ads/types';

export interface Video {
  id: string;
  thumbnailUrl: string;
  title: string;
  channelName: string;
  channelHandle: string;
  channelImageUrl: string;
  viewCount: number;
  uploadedAt: string;
  rawCreatedAt?: string; // To hold the serializable timestamp for sorting
  duration: string;
  videoUrl?: string;
  watchSessionUrl?: string;
  previewSessionUrl?: string;
  playbackModeHint?: 'mse' | 'compat-hls' | 'compat-source';
  transcodeStatus?: 'pending' | 'processing' | 'ready' | 'failed';
  initialInteraction?: {
    liked: boolean;
    disliked: boolean;
    watchLater: boolean;
  };
  audioUrl?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  authorId?: string;
  likes: number;
  dislikes: number;
  commentCount: number;
  shareCount: number;
  channelSubscriberCount: number;
  type?: 'video';
  audience: 'madeForKids' | 'notMadeForKids';
  tags: string[];
  language?: string;
  category?: string;
  commentsEnabled: boolean;
  showLikes: boolean;
  isNew?: boolean;
  location?: string;
  keywords?: string[];
  summary?: string;
  timestamps?: string;
  credits?: string;
}

export interface Channel {
  id: string;
  uid: string;
  name: string;
  handle: string;
  profilePictureUrl: string;
  bannerUrl: string;
  subscriberCount: number;
  videos: Video[];
  type?: 'channel';
  description?: string;
  email?: string;
  country?: string;
  showCountry?: boolean;
  posts?: Post[];
  playlists?: Playlist[];
  joinedAt?: string;
  totalViews?: number;
  recentSubscriptionAt?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorImageUrl: string;
  createdAt: string;
  rawCreatedAt?: string; // To hold the serializable timestamp for sorting
  videoId?: string;
  postId?: string;
  parentId: string | null;
  replies?: Comment[];
  likes: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'unlisted';
  creatorId: string;
  creatorName?: string;
  videoIds: string[];
  videoCount: number;
  firstVideoThumbnail?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorImageUrl: string;
    authorHandle: string;
    text: string;
    imageUrl?: string;
    poll?: {
        question: string;
        options: {
            text: string;
            votes: number;
        }[];
        voters?: { [userId: string]: number }; // userId: optionIndex
    };
    likes: number;
    dislikes: number;
    commentCount: number;
    createdAt: string;
    rawCreatedAt?: any;
}

export interface PageInfo {
  total?: number;
  limit?: number;
  offset?: number;
  count?: number;
  nextCursor?: string | null;
  prevCursor?: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RealtimeScopeToken {
  scope: string;
  token: string;
}

export interface PageBootstrap<TPage> {
  viewer: AuthUser | null;
  page: TPage;
  pagination?: PageInfo;
  realtime?: Record<string, RealtimeScopeToken | Record<string, RealtimeScopeToken>>;
  generatedAt: string;
}

export interface HomeBootstrapPage {
  items: Video[];
  shorts: Video[];
  categories: string[];
  sponsoredAds: SponsoredAd[];
}

export interface TrendingBootstrapPage {
  items: Video[];
}

export interface ShortsBootstrapPage {
  items: Video[];
}

export interface WatchBootstrapPage {
  video: Video;
  comments: Comment[];
  suggestedVideos: Video[];
}

export interface ChannelBootstrapPage {
  channel: Channel;
}
