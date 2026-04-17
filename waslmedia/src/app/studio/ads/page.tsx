import { AdsPageClient } from '@/app/studio/ads/ads-page-client';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { canManageStudioAdsOnThisDevice } from '@/lib/server/request-device';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getStudioAdsOverview } from '@/server/services/ads';

export default async function StudioAdsPage() {
  await ensureDatabaseSetup();
  const canManageAds = await canManageStudioAdsOnThisDevice();
  const viewer = await getCurrentAuthUser();
  const overview = canManageAds && viewer ? await getStudioAdsOverview(viewer.id) : null;
  return <AdsPageClient canManageAds={canManageAds} initialOverview={overview} />;
}
