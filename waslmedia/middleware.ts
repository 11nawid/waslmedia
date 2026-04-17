import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_FILE_PATTERN =
  /\.(?:png|jpe?g|gif|webp|svg|ico|mp4|webm|ogg|mp3|wav|woff2?|ttf|otf|webmanifest|txt|xml)$/i;
const SEO_PUBLIC_PATHS = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
]);
const NOINDEX_EXACT_PATHS = new Set([
  '/api-docs',
  '/feedback',
  '/help-center/search',
  '/history',
  '/liked',
  '/login',
  '/playlists',
  '/search',
  '/signup',
  '/signup/success',
  '/subscriptions',
  '/watch-later',
  '/your-data',
  '/your-videos',
]);
const NOINDEX_PREFIXES = ['/api-docs/', '/studio/'];

function isDirectAssetNavigation(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  const fetchDest = request.headers.get('sec-fetch-dest') || '';
  const fetchMode = request.headers.get('sec-fetch-mode') || '';

  return (
    fetchDest === 'document' ||
    fetchMode === 'navigate' ||
    accept.includes('text/html')
  );
}

function isPublicAssetPath(pathname: string) {
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return false;
  }

  return PUBLIC_FILE_PATTERN.test(pathname);
}

function isAllowedSeoPath(pathname: string) {
  return SEO_PUBLIC_PATHS.has(pathname);
}

function shouldNoIndexPath(pathname: string) {
  if (NOINDEX_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function blockedAssetPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asset not available</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #07090d;
        color: #f8fafc;
        font-family: Roboto, Arial, sans-serif;
      }
      main {
        width: min(560px, calc(100vw - 40px));
        text-align: center;
      }
      h1 {
        margin: 0 0 14px;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1;
      }
      p {
        margin: 0;
        color: rgba(248, 250, 252, 0.68);
        font-size: 1rem;
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Asset not available</h1>
      <p>This media file is served only to the app experience and is not available as a standalone page.</p>
    </main>
  </body>
</html>`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAllowedSeoPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/ui-assets/') || isPublicAssetPath(pathname)) {
    if (isDirectAssetNavigation(request)) {
      return new NextResponse(blockedAssetPage(), {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    return response;
  }

  const response = NextResponse.next();
  if (shouldNoIndexPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  }

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
