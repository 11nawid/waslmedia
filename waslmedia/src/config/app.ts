import { uiAssetUrls } from '@/lib/ui-assets';

function resolveAssetUrl(envValue: string | undefined, fallback: string) {
  const value = envValue?.trim();

  if (!value) {
    return fallback;
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/ui-assets/')) {
    return value;
  }

  return fallback;
}

export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Waslmedia',
  appDescription:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Sponsored advertising placements and media publishing on Waslmedia.',
  brandLogoUrl: resolveAssetUrl(process.env.NEXT_PUBLIC_BRAND_LOGO_URL, uiAssetUrls.brandLogo),
  studioLogoUrl: uiAssetUrls.studioLogo,
  aiIconUrl: uiAssetUrls.aiIcon,
  defaultProfilePictureUrl: resolveAssetUrl(
    process.env.NEXT_PUBLIC_DEFAULT_PROFILE_PICTURE_URL,
    uiAssetUrls.defaultAvatar,
  ),
  defaultBannerUrl: resolveAssetUrl(process.env.NEXT_PUBLIC_DEFAULT_BANNER_URL, uiAssetUrls.defaultBanner),
  defaultThumbnailUrl: resolveAssetUrl(
    process.env.NEXT_PUBLIC_DEFAULT_THUMBNAIL_URL,
    uiAssetUrls.defaultThumbnail,
  ),
};
