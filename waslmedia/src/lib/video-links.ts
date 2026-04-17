import type { Video } from '@/lib/types';

function normalizeCategory(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isShortVideo(videoOrCategory?: Pick<Video, 'category'> | string | null) {
  if (!videoOrCategory) {
    return false;
  }

  const category =
    typeof videoOrCategory === 'string' ? videoOrCategory : videoOrCategory.category;

  return normalizeCategory(category) === 'shorts';
}

export function buildVideoHref(
  video: Pick<Video, 'id' | 'category'>,
  options?: {
    playlistId?: string | null;
    sourceContext?: string | null;
    ref?: string | null;
  }
) {
  if (isShortVideo(video)) {
    return `/shorts/${video.id}`;
  }

  const params = new URLSearchParams();

  if (options?.playlistId) {
    params.set('playlist', options.playlistId);
  }

  if (options?.sourceContext) {
    params.set('src', options.sourceContext);
  }

  if (options?.ref) {
    params.set('ref', options.ref);
  }

  const query = params.toString();
  return query ? `/watch/${video.id}?${query}` : `/watch/${video.id}`;
}
