import { readFile } from 'node:fs/promises';
import { NextResponse, type NextRequest } from 'next/server';
import { uiAssetRegistry } from '@/server/ui-asset-registry';

function isDirectAssetNavigation(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  const fetchDest = request.headers.get('sec-fetch-dest') || '';
  const fetchMode = request.headers.get('sec-fetch-mode') || '';

  return fetchDest === 'document' || fetchMode === 'navigate' || accept.includes('text/html');
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
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

  const { assetId } = await params;
  const asset = uiAssetRegistry[assetId as keyof typeof uiAssetRegistry];

  if (!asset) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const buffer = await readFile(asset.filePath);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': asset.contentType,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
