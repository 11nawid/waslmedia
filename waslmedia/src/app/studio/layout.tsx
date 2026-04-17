import type { Metadata } from 'next';
import { getCurrentAuthUser } from '@/server/services/auth';
import { createRealtimeScopeToken } from '@/server/realtime/tokens';
import { StudioShell } from '@/components/studio/studio-shell';
import { buildNoIndexMetadata } from '@/lib/seo';
import { canManageStudioAdsOnThisDevice } from '@/lib/server/request-device';

export const metadata: Metadata = buildNoIndexMetadata({
  title: 'Studio | Waslmedia',
  description: 'Private Waslmedia Studio workspace.',
});

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getCurrentAuthUser();
  const canManageAds = await canManageStudioAdsOnThisDevice();
  const studioToken = viewer
    ? createRealtimeScopeToken(`studio:${viewer.id}`, { userId: viewer.id })
    : null;

  return (
    <StudioShell viewer={viewer} studioToken={studioToken} canManageAds={canManageAds}>
      {children}
    </StudioShell>
  );
}
