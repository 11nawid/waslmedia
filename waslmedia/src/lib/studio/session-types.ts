import type { Channel, Playlist, Post, Video } from '@/lib/types';
import type { AudioTrack } from '@/lib/audio/types';
import type { ChannelAnalytics, VideoAnalytics } from '@/lib/analytics/types';
import type { ChannelSettings, UploadDefaults } from './types';

export interface StudioDashboardData {
  latestVideo: Video | null;
  analytics: ChannelAnalytics;
  latestComments: import('@/lib/types').Comment[];
  recentSubscribers: Channel[];
  channel: Channel | null;
}

export interface CachedValue<T> {
  data: T | null;
  loaded: boolean;
  fetchedAt: number | null;
}

export interface StudioVideoFilters {
  visibility: 'all' | 'public' | 'private' | 'unlisted';
  restrictions: 'all' | 'madeForKids' | 'notMadeForKids';
  sortBy: 'date_desc' | 'date_asc' | 'views_desc' | 'views_asc' | 'likes_desc';
  viewOperator: 'gt' | 'lt';
  viewValue: string;
}

export interface StudioShortFilters {
  visibility: 'all' | 'public' | 'private' | 'unlisted';
  sortBy: 'date_desc' | 'date_asc' | 'views_desc' | 'views_asc' | 'likes_desc';
}

export interface StudioPostFilters {
  sortBy: 'date_desc' | 'date_asc' | 'engagement_desc';
}

export interface StudioPlaylistFilters {
  visibility: 'all' | 'public' | 'private' | 'unlisted';
  sortBy: 'updated_desc' | 'updated_asc' | 'videos_desc' | 'videos_asc' | 'name_asc';
}

export interface StudioLibraryFilters {
  searchTerm: string;
  genre: string;
  mood: string;
}

export interface StudioSessionCaches {
  dashboard: CachedValue<StudioDashboardData>;
  channelAnalytics: CachedValue<ChannelAnalytics>;
  studioVideos: CachedValue<Video[]>;
  studioShorts: CachedValue<Video[]>;
  studioPosts: CachedValue<Post[]>;
  studioPlaylists: CachedValue<Playlist[]>;
  studioLibrary: CachedValue<AudioTrack[]>;
  customisation: CachedValue<ChannelSettings | null>;
  uploadDefaults: CachedValue<UploadDefaults | null>;
  videoAnalytics: Record<string, CachedValue<VideoAnalytics>>;
}
