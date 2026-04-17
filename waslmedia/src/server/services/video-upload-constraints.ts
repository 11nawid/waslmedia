import type { PoolConnection } from 'mysql2/promise';
import { getRecentUploadUsageByAuthor } from '@/server/repositories/videos';
import {
  getDailyLimitErrorCode,
  getDailyLimitForMediaKind,
  LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE,
  SHORT_VIDEO_MAX_DURATION_SECONDS,
  type UploadConstraintSummary,
  type UploadMediaKind,
  type VideoUploadConstraints,
} from '@/lib/video-upload/rules';

function buildConstraintSummary(input: {
  limit: number;
  used: number;
  oldestCreatedAt: string | null;
}): UploadConstraintSummary {
  const remaining = Math.max(0, input.limit - input.used);
  return {
    limit: input.limit,
    used: input.used,
    remaining,
    nextAvailableAt:
      remaining > 0 || !input.oldestCreatedAt
        ? null
        : new Date(new Date(input.oldestCreatedAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getVideoUploadConstraintSummary(
  userId: string,
  mediaKind: UploadMediaKind,
  executor?: Pick<PoolConnection, 'query'>
) {
  const usage = await getRecentUploadUsageByAuthor(userId, mediaKind, executor);
  return buildConstraintSummary({
    limit: getDailyLimitForMediaKind(mediaKind),
    used: usage.used,
    oldestCreatedAt: usage.oldestCreatedAt,
  });
}

export async function getVideoUploadConstraints(userId: string): Promise<VideoUploadConstraints> {
  const [longVideos, shorts] = await Promise.all([
    getVideoUploadConstraintSummary(userId, 'long'),
    getVideoUploadConstraintSummary(userId, 'short'),
  ]);

  return {
    longVideos: {
      ...longVideos,
      maxDurationSecondsExclusive: LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE,
    },
    shorts: {
      ...shorts,
      maxDurationSecondsInclusive: SHORT_VIDEO_MAX_DURATION_SECONDS,
    },
  };
}

export async function assertVideoUploadQuotaAvailable(
  userId: string,
  mediaKind: UploadMediaKind,
  executor: Pick<PoolConnection, 'query'>
) {
  const summary = await getVideoUploadConstraintSummary(userId, mediaKind, executor);
  if (summary.remaining <= 0) {
    throw new Error(getDailyLimitErrorCode(mediaKind));
  }

  return summary;
}
