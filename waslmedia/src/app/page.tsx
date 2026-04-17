import type { Metadata } from 'next';
import { HomePageClient } from '@/app/home-page-client';
import { SeoJsonLd } from '@/components/seo-json-ld';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildPublicMetadata, buildWebsiteJsonLd } from '@/lib/seo';
import { getHomeBootstrap } from '@/server/services/bootstrap';

export const metadata: Metadata = buildPublicMetadata({
  title: 'Waslmedia',
  description: 'Discover public videos, Shorts, channels, and sponsored advertising placements on Waslmedia.',
  path: '/',
  type: 'website',
});

export default async function HomePage() {
  await ensureDatabaseSetup();
  const bootstrap = await getHomeBootstrap();
  return (
    <>
      <SeoJsonLd data={buildWebsiteJsonLd()} />
      <HomePageClient initialPage={bootstrap.page} />
    </>
  );
}
