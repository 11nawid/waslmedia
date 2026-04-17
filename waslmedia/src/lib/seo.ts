import type { Metadata } from 'next';
import { appConfig } from '@/config/app';

type OpenGraphType = 'website' | 'article' | 'video.other' | 'profile';

function resolveSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    'http://localhost:9002';

  try {
    return new URL(value);
  } catch {
    return new URL('http://localhost:9002');
  }
}

export function getSiteOrigin() {
  return resolveSiteUrl().origin;
}

export function buildAbsoluteUrl(path = '/') {
  return new URL(path, resolveSiteUrl()).toString();
}

export function buildCanonicalPath(path = '/') {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

export function toSeoDescription(
  value: string | null | undefined,
  fallback = appConfig.appDescription,
  maxLength = 160
) {
  const raw = (value || fallback || '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return fallback;
  }

  if (raw.length <= maxLength) {
    return raw;
  }

  return `${raw.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function parseSeoDate(value: string | Date | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export function buildPublicMetadata(input: {
  title: string;
  description?: string | null;
  path?: string;
  image?: string | null;
  type?: OpenGraphType;
  keywords?: string[];
}) {
  const description = toSeoDescription(input.description);
  const canonicalPath = buildCanonicalPath(input.path || '/');
  const absoluteImage = input.image
    ? input.image.startsWith('http://') || input.image.startsWith('https://')
      ? input.image
      : buildAbsoluteUrl(input.image)
    : undefined;

  return {
    title: input.title,
    description,
    keywords: input.keywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: input.title,
      description,
      url: canonicalPath,
      siteName: appConfig.appName,
      type: input.type || 'website',
      ...(absoluteImage ? { images: [absoluteImage] } : {}),
    },
    twitter: {
      card: absoluteImage ? 'summary_large_image' : 'summary',
      title: input.title,
      description,
      ...(absoluteImage ? { images: [absoluteImage] } : {}),
    },
  } satisfies Metadata;
}

export function buildNoIndexMetadata(input: {
  title: string;
  description?: string | null;
}) {
  const description = toSeoDescription(input.description);

  return {
    title: input.title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        'max-snippet': -1,
      },
    },
  } satisfies Metadata;
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appConfig.appName,
    url: buildAbsoluteUrl('/'),
    description: appConfig.appDescription,
    publisher: {
      '@type': 'Organization',
      name: appConfig.appName,
      url: buildAbsoluteUrl('/'),
      logo: {
        '@type': 'ImageObject',
        url: buildAbsoluteUrl(appConfig.brandLogoUrl),
      },
    },
  };
}

export function buildVideoJsonLd(input: {
  title: string;
  description?: string | null;
  path: string;
  thumbnailUrl?: string | null;
  uploadDate?: string | Date | null;
  authorName?: string | null;
}) {
  const normalizedThumbnailUrl = input.thumbnailUrl
    ? input.thumbnailUrl.startsWith('http://') || input.thumbnailUrl.startsWith('https://')
      ? input.thumbnailUrl
      : buildAbsoluteUrl(input.thumbnailUrl)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: input.title,
    description: toSeoDescription(input.description, input.title),
    url: buildAbsoluteUrl(input.path),
    ...(normalizedThumbnailUrl ? { thumbnailUrl: [normalizedThumbnailUrl] } : {}),
    ...(parseSeoDate(input.uploadDate) ? { uploadDate: parseSeoDate(input.uploadDate)?.toISOString() } : {}),
    ...(input.authorName
      ? {
          author: {
            '@type': 'Person',
            name: input.authorName,
          },
        }
      : {}),
  };
}

export function buildProfileJsonLd(input: {
  name: string;
  description?: string | null;
  path: string;
  image?: string | null;
}) {
  const normalizedImage = input.image
    ? input.image.startsWith('http://') || input.image.startsWith('https://')
      ? input.image
      : buildAbsoluteUrl(input.image)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: buildAbsoluteUrl(input.path),
    name: input.name,
    description: toSeoDescription(input.description, `${input.name} on ${appConfig.appName}`),
    ...(normalizedImage
      ? {
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: normalizedImage,
          },
        }
      : {}),
    mainEntity: {
      '@type': 'Person',
      name: input.name,
      ...(normalizedImage ? { image: normalizedImage } : {}),
    },
  };
}
