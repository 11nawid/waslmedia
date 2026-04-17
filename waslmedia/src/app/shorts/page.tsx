import type { Metadata } from 'next';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildPublicMetadata } from '@/lib/seo';
import { getShortsBootstrap } from '@/server/services/bootstrap';
import { ShortsPageClient } from '@/app/shorts/shorts-page-client';

export const metadata: Metadata = buildPublicMetadata({
  title: 'Waslmedia Shorts',
  description: 'Browse public short-form videos on Waslmedia.',
  path: '/shorts',
  type: 'website',
});

export default async function ShortsPage() {
  await ensureDatabaseSetup();
  const bootstrap = await getShortsBootstrap();
  return <ShortsPageClient initialPage={bootstrap.page} />;
}
