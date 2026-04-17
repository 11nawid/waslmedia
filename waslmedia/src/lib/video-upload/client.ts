import { apiGet } from '@/lib/api/client';
import type { VideoUploadConstraints } from '@/lib/video-upload/rules';

export const UPLOAD_CONSTRAINTS_SYNC_EVENT = 'waslmedia:upload-constraints-sync';

export async function getVideoUploadConstraintsClient() {
  return apiGet<VideoUploadConstraints>('/api/videos/upload-constraints', {
    cache: 'no-store',
    progressMode: 'silent',
  });
}

export function syncVideoUploadConstraints() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UPLOAD_CONSTRAINTS_SYNC_EVENT));
  }
}
