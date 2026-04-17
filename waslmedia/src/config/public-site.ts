import { appConfig } from '@/config/app';

function normalizePublicValue(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

export const publicSiteConfig = {
  businessName: normalizePublicValue(process.env.NEXT_PUBLIC_PUBLIC_BUSINESS_NAME, appConfig.appName),
  supportEmail: normalizePublicValue(
    process.env.NEXT_PUBLIC_PUBLIC_SUPPORT_EMAIL,
    process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@localhost'
  ),
  supportResponseTime: normalizePublicValue(
    process.env.NEXT_PUBLIC_PUBLIC_SUPPORT_RESPONSE_TIME,
    process.env.PUBLIC_SUPPORT_RESPONSE_TIME || '2-3 days'
  ),
} as const;
