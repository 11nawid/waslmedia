import { appConfig } from '@/config/app';

export const SESSION_COOKIE_NAME = 'waslmedia_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_RENEWAL_INTERVAL_MS = 1000 * 60 * 60 * 12;
export const DEFAULT_PROFILE_PICTURE = appConfig.defaultProfilePictureUrl;
export const DEFAULT_BANNER = appConfig.defaultBannerUrl;
