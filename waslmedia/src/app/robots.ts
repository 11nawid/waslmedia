import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/help-center/',
          '/watch/',
          '/shorts/',
          '/@',
        ],
        disallow: [
          '/api/',
          '/api-docs',
          '/cdn-cgi/',
          '/feedback',
          '/history',
          '/liked',
          '/login',
          '/playlists',
          '/search',
          '/signup',
          '/studio/',
          '/subscriptions',
          '/ui-assets/',
          '/watch-later',
          '/your-data',
          '/your-videos',
        ],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
