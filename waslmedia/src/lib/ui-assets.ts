export const uiAssetIds = {
  brandLogo: 'u1x9',
  studioLogo: 'u2k4',
  aiIcon: 'u3n7',
  defaultAvatar: 'u4d2',
  defaultBanner: 'u5q8',
  defaultThumbnail: 'u6v3',
  authMotionForward: 'u7r1',
  authMotionReverse: 'u8r4',
  brandVector: 'u9p2',
} as const;

export type UiAssetId = (typeof uiAssetIds)[keyof typeof uiAssetIds];

export function getUiAssetUrl(assetId: UiAssetId) {
  return `/ui-assets/${assetId}`;
}

export const uiAssetUrls = {
  brandLogo: getUiAssetUrl(uiAssetIds.brandLogo),
  studioLogo: getUiAssetUrl(uiAssetIds.studioLogo),
  aiIcon: getUiAssetUrl(uiAssetIds.aiIcon),
  defaultAvatar: getUiAssetUrl(uiAssetIds.defaultAvatar),
  defaultBanner: getUiAssetUrl(uiAssetIds.defaultBanner),
  defaultThumbnail: getUiAssetUrl(uiAssetIds.defaultThumbnail),
  authMotionForward: getUiAssetUrl(uiAssetIds.authMotionForward),
  authMotionReverse: getUiAssetUrl(uiAssetIds.authMotionReverse),
  brandVector: getUiAssetUrl(uiAssetIds.brandVector),
} as const;
