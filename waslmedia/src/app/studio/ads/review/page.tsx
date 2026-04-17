import { redirect } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { isInternalToolsEnabled } from '@/server/utils/runtime-config';

export default async function StudioAdsReviewPage() {
  await ensureDatabaseSetup();

  if (!isInternalToolsEnabled()) {
    redirect('/studio/ads');
  }

  redirect('/api-docs');
}
