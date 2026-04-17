'use client';

import { create } from 'zustand';
import type { ChannelAnalytics, VideoAnalytics } from '@/lib/analytics/types';
import type { AudioTrack } from '@/lib/audio/types';
import type { Channel, Playlist, Post, Video } from '@/lib/types';
import type {
  CachedValue,
  StudioDashboardData,
  StudioLibraryFilters,
  StudioPlaylistFilters,
  StudioPostFilters,
  StudioSessionCaches,
  StudioShortFilters,
  StudioVideoFilters,
} from '@/lib/studio/session-types';
import type { ChannelSettings, UploadDefaults } from '@/lib/studio/types';

const emptyCache = <T,>(): CachedValue<T> => ({
  data: null,
  loaded: false,
  fetchedAt: null,
});

export const defaultVideoFilters: StudioVideoFilters = {
  visibility: 'all',
  restrictions: 'all',
  sortBy: 'date_desc',
  viewOperator: 'gt',
  viewValue: '',
};

export const defaultShortFilters: StudioShortFilters = {
  visibility: 'all',
  sortBy: 'date_desc',
};

export const defaultPostFilters: StudioPostFilters = {
  sortBy: 'date_desc',
};

export const defaultPlaylistFilters: StudioPlaylistFilters = {
  visibility: 'all',
  sortBy: 'updated_desc',
};

export const defaultLibraryFilters: StudioLibraryFilters = {
  searchTerm: '',
  genre: 'All',
  mood: 'All',
};

interface StudioState extends StudioSessionCaches {
  searchQuery: string;
  activeContentTab: 'videos' | 'shorts' | 'posts' | 'playlists';
  videoFilters: StudioVideoFilters;
  shortFilters: StudioShortFilters;
  postFilters: StudioPostFilters;
  playlistFilters: StudioPlaylistFilters;
  libraryFilters: StudioLibraryFilters;
  setSearchQuery: (query: string) => void;
  setActiveContentTab: (tab: StudioState['activeContentTab']) => void;
  setVideoFilters: (filters: Partial<StudioVideoFilters>) => void;
  resetVideoFilters: () => void;
  setShortFilters: (filters: Partial<StudioShortFilters>) => void;
  resetShortFilters: () => void;
  setPostFilters: (filters: Partial<StudioPostFilters>) => void;
  resetPostFilters: () => void;
  setPlaylistFilters: (filters: Partial<StudioPlaylistFilters>) => void;
  resetPlaylistFilters: () => void;
  setLibraryFilters: (filters: Partial<StudioLibraryFilters>) => void;
  resetLibraryFilters: () => void;
  setDashboardCache: (data: StudioDashboardData) => void;
  setChannelAnalyticsCache: (data: ChannelAnalytics) => void;
  setStudioVideosCache: (data: Video[]) => void;
  setStudioShortsCache: (data: Video[]) => void;
  setStudioPostsCache: (data: Post[]) => void;
  setStudioPlaylistsCache: (data: Playlist[]) => void;
  setStudioLibraryCache: (data: AudioTrack[]) => void;
  setCustomisationCache: (data: ChannelSettings | null) => void;
  setUploadDefaultsCache: (data: UploadDefaults | null) => void;
  setVideoAnalyticsCache: (videoId: string, data: VideoAnalytics) => void;
  clearVideoAnalyticsCache: (videoId: string) => void;
}

function withCache<T>(data: T): CachedValue<T> {
  return {
    data,
    loaded: true,
    fetchedAt: Date.now(),
  };
}

export const useStudioStore = create<StudioState>((set) => ({
  searchQuery: '',
  activeContentTab: 'videos',
  videoFilters: defaultVideoFilters,
  shortFilters: defaultShortFilters,
  postFilters: defaultPostFilters,
  playlistFilters: defaultPlaylistFilters,
  libraryFilters: defaultLibraryFilters,
  dashboard: emptyCache<StudioDashboardData>(),
  channelAnalytics: emptyCache<ChannelAnalytics>(),
  studioVideos: emptyCache<Video[]>(),
  studioShorts: emptyCache<Video[]>(),
  studioPosts: emptyCache<Post[]>(),
  studioPlaylists: emptyCache<Playlist[]>(),
  studioLibrary: emptyCache<AudioTrack[]>(),
  customisation: emptyCache<ChannelSettings | null>(),
  uploadDefaults: emptyCache<UploadDefaults | null>(),
  videoAnalytics: {},
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveContentTab: (tab) => set({ activeContentTab: tab }),
  setVideoFilters: (filters) => set((state) => ({ videoFilters: { ...state.videoFilters, ...filters } })),
  resetVideoFilters: () => set({ videoFilters: defaultVideoFilters }),
  setShortFilters: (filters) => set((state) => ({ shortFilters: { ...state.shortFilters, ...filters } })),
  resetShortFilters: () => set({ shortFilters: defaultShortFilters }),
  setPostFilters: (filters) => set((state) => ({ postFilters: { ...state.postFilters, ...filters } })),
  resetPostFilters: () => set({ postFilters: defaultPostFilters }),
  setPlaylistFilters: (filters) => set((state) => ({ playlistFilters: { ...state.playlistFilters, ...filters } })),
  resetPlaylistFilters: () => set({ playlistFilters: defaultPlaylistFilters }),
  setLibraryFilters: (filters) => set((state) => ({ libraryFilters: { ...state.libraryFilters, ...filters } })),
  resetLibraryFilters: () => set({ libraryFilters: defaultLibraryFilters }),
  setDashboardCache: (data) => set({ dashboard: withCache(data) }),
  setChannelAnalyticsCache: (data) => set({ channelAnalytics: withCache(data) }),
  setStudioVideosCache: (data) => set({ studioVideos: withCache(data) }),
  setStudioShortsCache: (data) => set({ studioShorts: withCache(data) }),
  setStudioPostsCache: (data) => set({ studioPosts: withCache(data) }),
  setStudioPlaylistsCache: (data) => set({ studioPlaylists: withCache(data) }),
  setStudioLibraryCache: (data) => set({ studioLibrary: withCache(data) }),
  setCustomisationCache: (data) => set({ customisation: withCache(data) }),
  setUploadDefaultsCache: (data) => set({ uploadDefaults: withCache(data) }),
  setVideoAnalyticsCache: (videoId, data) =>
    set((state) => ({
      videoAnalytics: {
        ...state.videoAnalytics,
        [videoId]: withCache(data),
      },
    })),
  clearVideoAnalyticsCache: (videoId) =>
    set((state) => {
      const next = { ...state.videoAnalytics };
      delete next[videoId];
      return { videoAnalytics: next };
    }),
}));
