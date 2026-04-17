'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Video } from '@/lib/types';
import { fetchOwnedStudioVideo, updateOwnedStudioVideo } from '@/lib/studio/video-workbench-client';

type VideoWorkbenchContextValue = {
  video: Video | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveVideo: (updates: Partial<Video>) => Promise<Video>;
};

const VideoWorkbenchContext = createContext<VideoWorkbenchContextValue | null>(null);

export function VideoWorkbenchProvider({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextVideo = await fetchOwnedStudioVideo(videoId);
      setVideo(nextVideo);
    } catch (refreshError: any) {
      setError(refreshError?.message || 'VIDEO_WORKBENCH_FETCH_FAILED');
      setVideo(null);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const saveVideo = useCallback(
    async (updates: Partial<Video>) => {
      setSaving(true);
      setError(null);

      try {
        const nextVideo = await updateOwnedStudioVideo(videoId, updates);
        setVideo(nextVideo);
        return nextVideo;
      } catch (saveError: any) {
        const message = saveError?.message || 'VIDEO_WORKBENCH_SAVE_FAILED';
        setError(message);
        throw new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [videoId]
  );

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(
    () => ({
      video,
      loading,
      saving,
      error,
      refresh,
      saveVideo,
    }),
    [error, loading, refresh, saveVideo, saving, video]
  );

  return <VideoWorkbenchContext.Provider value={value}>{children}</VideoWorkbenchContext.Provider>;
}

export function useVideoWorkbench() {
  const context = useContext(VideoWorkbenchContext);

  if (!context) {
    throw new Error('useVideoWorkbench must be used within VideoWorkbenchProvider');
  }

  return context;
}
