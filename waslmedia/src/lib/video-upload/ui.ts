import type { UploadConstraintSummary } from '@/lib/video-upload/rules';

export function formatConstraintNextAvailable(nextAvailableAt: string | null) {
  if (!nextAvailableAt) {
    return null;
  }

  const nextDate = new Date(nextAvailableAt);
  if (Number.isNaN(nextDate.getTime())) {
    return null;
  }

  return nextDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function buildUploadConstraintSummary(
  summary: UploadConstraintSummary,
  totalLabel: string,
  nextAvailablePrefix = 'Next slot opens'
) {
  const nextAvailable = formatConstraintNextAvailable(summary.nextAvailableAt);
  return {
    remainingLabel: `Remaining in the last 24 hours: ${summary.remaining} of ${summary.limit} ${totalLabel}`,
    nextAvailableLabel: nextAvailable ? `${nextAvailablePrefix} ${nextAvailable}.` : null,
  };
}

export function getVideoUploadErrorMessage(errorCode: string, options?: { kind?: 'long' | 'short' }) {
  switch (errorCode) {
    case 'LONG_VIDEO_DURATION_LIMIT_EXCEEDED':
      return 'Long videos must be under 15 minutes.';
    case 'SHORT_DURATION_LIMIT_EXCEEDED':
      return 'Shorts must be 2 minutes or less.';
    case 'LONG_VIDEO_DAILY_LIMIT_REACHED':
      return 'You have reached your long-video limit for the last 24 hours.';
    case 'SHORT_DAILY_LIMIT_REACHED':
      return 'You have reached your Shorts limit for the last 24 hours.';
    case 'UPLOAD_MEDIA_METADATA_MISSING':
      return 'We could not verify the uploaded video. Please upload it again.';
    default:
      return options?.kind === 'short' ? 'Short upload failed. Please try again.' : 'Video upload failed. Please try again.';
  }
}
