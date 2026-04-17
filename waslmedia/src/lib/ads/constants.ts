import type { AdNotifyMode, AdRejectionReasonCode } from './types';

export const AD_REJECTION_REASON_LABELS: Record<AdRejectionReasonCode, string> = {
  misleading_claims: 'Misleading or false claims',
  landing_page_mismatch: 'Landing page mismatch',
  invalid_website: 'Broken or invalid website',
  copyright_issue: 'Copyright or stolen creative',
  unsafe_or_prohibited: 'Unsafe or prohibited content',
  low_quality_creative: 'Low-quality or unreadable creative',
  invalid_format: 'Invalid format or technical issue',
  other: 'Other',
};

export const AD_NOTIFY_MODE_LABELS: Record<AdNotifyMode, string> = {
  in_app: 'In-app only',
  email: 'Email only',
  both: 'In-app + email',
};
