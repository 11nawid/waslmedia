export type UploadMediaKind = 'long' | 'short';

export const LONG_VIDEO_DAILY_LIMIT = 3;
export const SHORT_VIDEO_DAILY_LIMIT = 8;
export const SHORT_VIDEO_MAX_DURATION_SECONDS = 120;
export const LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE = 900;
export const UPLOAD_QUOTA_WINDOW_HOURS = 24;

export type VideoUploadErrorCode =
  | 'LONG_VIDEO_DURATION_LIMIT_EXCEEDED'
  | 'SHORT_DURATION_LIMIT_EXCEEDED'
  | 'LONG_VIDEO_DAILY_LIMIT_REACHED'
  | 'SHORT_DAILY_LIMIT_REACHED'
  | 'UPLOAD_MEDIA_METADATA_MISSING';

export interface UploadConstraintSummary {
  limit: number;
  used: number;
  remaining: number;
  nextAvailableAt: string | null;
}

export interface VideoUploadConstraints {
  longVideos: UploadConstraintSummary & {
    maxDurationSecondsExclusive: number;
  };
  shorts: UploadConstraintSummary & {
    maxDurationSecondsInclusive: number;
  };
}

export function getMediaKindFromCategory(category?: string | null): UploadMediaKind {
  return category === 'Shorts' ? 'short' : 'long';
}

export function getDailyLimitForMediaKind(mediaKind: UploadMediaKind) {
  return mediaKind === 'short' ? SHORT_VIDEO_DAILY_LIMIT : LONG_VIDEO_DAILY_LIMIT;
}

export function getDurationLimitErrorCode(mediaKind: UploadMediaKind): VideoUploadErrorCode {
  return mediaKind === 'short' ? 'SHORT_DURATION_LIMIT_EXCEEDED' : 'LONG_VIDEO_DURATION_LIMIT_EXCEEDED';
}

export function getDailyLimitErrorCode(mediaKind: UploadMediaKind): VideoUploadErrorCode {
  return mediaKind === 'short' ? 'SHORT_DAILY_LIMIT_REACHED' : 'LONG_VIDEO_DAILY_LIMIT_REACHED';
}

export function isDurationAllowed(mediaKind: UploadMediaKind, durationSeconds: number) {
  return mediaKind === 'short'
    ? durationSeconds <= SHORT_VIDEO_MAX_DURATION_SECONDS
    : durationSeconds < LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE;
}

export function formatDurationLabelFromSeconds(durationSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
