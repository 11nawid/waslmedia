import path from 'node:path';
import { uiAssetIds, type UiAssetId } from '@/lib/ui-assets';

const privateAssetsRoot = path.join(process.cwd(), 'private', 'ui-assets');

export const uiAssetRegistry: Record<
  UiAssetId,
  {
    filePath: string;
    contentType: string;
  }
> = {
  [uiAssetIds.brandLogo]: {
    filePath: path.join(privateAssetsRoot, 'brand-logo.png'),
    contentType: 'image/png',
  },
  [uiAssetIds.studioLogo]: {
    filePath: path.join(privateAssetsRoot, 'studio-logo.png'),
    contentType: 'image/png',
  },
  [uiAssetIds.aiIcon]: {
    filePath: path.join(privateAssetsRoot, 'ai-icon.png'),
    contentType: 'image/png',
  },
  [uiAssetIds.defaultAvatar]: {
    filePath: path.join(privateAssetsRoot, 'default-avatar.jpg'),
    contentType: 'image/jpeg',
  },
  [uiAssetIds.defaultBanner]: {
    filePath: path.join(privateAssetsRoot, 'default-banner.avif'),
    contentType: 'image/avif',
  },
  [uiAssetIds.defaultThumbnail]: {
    filePath: path.join(privateAssetsRoot, 'default-thumbnail.svg'),
    contentType: 'image/svg+xml',
  },
  [uiAssetIds.authMotionForward]: {
    filePath: path.join(privateAssetsRoot, 'auth-motion-forward.mp4'),
    contentType: 'video/mp4',
  },
  [uiAssetIds.authMotionReverse]: {
    filePath: path.join(privateAssetsRoot, 'auth-motion-reverse.mp4'),
    contentType: 'video/mp4',
  },
  [uiAssetIds.brandVector]: {
    filePath: path.join(privateAssetsRoot, 'brand-mark.svg'),
    contentType: 'image/svg+xml',
  },
};
