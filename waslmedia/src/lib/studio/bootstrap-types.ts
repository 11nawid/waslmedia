import type { AudioTrack } from '@/lib/audio/types';
import type { ChannelAnalytics } from '@/lib/analytics/types';
import type { PageBootstrap, PageInfo, Playlist, Post, Video, Comment } from '@/lib/types';
import type { StudioDashboardData } from '@/lib/studio/session-types';

export type StudioUploadTab = 'videos' | 'shorts' | 'posts' | 'playlists';
export type StudioCommunityTab = 'posts' | 'comments';

export interface StudioCollectionSlice<T> {
  items: T[];
  pageInfo?: PageInfo;
}

export interface StudioDashboardBootstrapPage {
  dashboard: StudioDashboardData;
}

export interface StudioAnalyticsBootstrapPage {
  days: number;
  analytics: ChannelAnalytics;
}

export interface StudioUploadBootstrapPage {
  activeTab: StudioUploadTab;
  videos?: StudioCollectionSlice<Video>;
  shorts?: StudioCollectionSlice<Video>;
  posts?: StudioCollectionSlice<Post>;
  playlists?: StudioCollectionSlice<Playlist>;
}

export interface StudioCommunityComment extends Comment {
  videoTitle: string;
}

export interface StudioCommunityBootstrapPage {
  activeTab: StudioCommunityTab;
  posts: Post[];
  comments: StudioCommunityComment[];
}

export interface StudioLibraryBootstrapPage {
  tracks: AudioTrack[];
}

export interface StudioBootstrap<TPage> extends PageBootstrap<TPage> {}
