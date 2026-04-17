import type { MetadataRoute } from 'next';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getSiteOrigin } from '@/lib/seo';
import { helpCenterArticleCollections } from '@/lib/help-center-content';
import { legalPages } from '@/lib/public-site-content';
import { listAllPublicChannelSettings } from '@/server/repositories/channel-settings';
import { listPublicVideoRows } from '@/server/repositories/videos';

export const dynamic = 'force-dynamic';

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureDatabaseSetup();

  const siteOrigin = getSiteOrigin();
  const [videos, channels] = await Promise.all([
    listPublicVideoRows(),
    listAllPublicChannelSettings(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteOrigin}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${siteOrigin}/shorts`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${siteOrigin}/trending`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteOrigin}/help-center`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteOrigin}/help-center/company`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteOrigin}/help-center/docs`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteOrigin}/help-center/legal`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteOrigin}/help-center/contact`, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = (Object.entries(helpCenterArticleCollections) as Array<
    [keyof typeof helpCenterArticleCollections, Record<string, { slug: string; updatedAt: string }>]
  >).flatMap(([section, pages]) =>
    Object.values(pages).map((page) => ({
      url: `${siteOrigin}/help-center/${section}/${page.slug}`,
      lastModified: normalizeDate(page.updatedAt),
      changeFrequency: section === 'legal' ? 'monthly' : 'weekly',
      priority: section === 'docs' ? 0.7 : 0.6,
    }))
  );

  const channelRoutes: MetadataRoute.Sitemap = channels.map((channel) => ({
    url: `${siteOrigin}/${channel.handle}`,
    lastModified: normalizeDate(channel.joined_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const videoRoutes: MetadataRoute.Sitemap = videos.flatMap((video) => {
    const routes: MetadataRoute.Sitemap = [
      {
        url: `${siteOrigin}/watch/${video.id}`,
        lastModified: normalizeDate(video.created_at),
        changeFrequency: 'daily',
        priority: video.category === 'Shorts' ? 0.7 : 0.8,
      },
    ];

    if (video.category === 'Shorts') {
      routes.push({
        url: `${siteOrigin}/shorts/${video.id}`,
        lastModified: normalizeDate(video.created_at),
        changeFrequency: 'daily',
        priority: 0.75,
      });
    }

    return routes;
  });

  return [...staticRoutes, ...articleRoutes, ...channelRoutes, ...videoRoutes];
}
