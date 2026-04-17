import { apiGet, apiSend } from '@/lib/api/client';
import type { Comment, Video } from '@/lib/types';

export async function fetchOwnedStudioVideo(videoId: string) {
  const payload = await apiGet<{ video: Video }>(`/api/videos/${encodeURIComponent(videoId)}`);
  return payload.video;
}

export async function updateOwnedStudioVideo(videoId: string, updates: Partial<Video>) {
  const payload = await apiSend<{ video: Video }>(`/api/videos/${encodeURIComponent(videoId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  return payload.video;
}

export async function fetchStudioVideoComments(videoId: string) {
  const params = new URLSearchParams({
    parentId: videoId,
    parentType: 'video',
  });
  const payload = await apiGet<{ comments: Comment[] }>(`/api/comments?${params.toString()}`);
  return payload.comments;
}
