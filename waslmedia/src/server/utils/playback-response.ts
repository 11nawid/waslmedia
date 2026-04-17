import { NextResponse } from 'next/server';

export function createPlaybackDeniedResponse(status = 403) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Playback unavailable</title>
    <style>
      :root {
        color-scheme: dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f1116;
        color: #f4f7fb;
        font-family: Roboto, Arial, sans-serif;
      }
      .wrap {
        width: min(92vw, 420px);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        font-weight: 700;
      }
      p {
        margin: 0;
        color: #aeb7c6;
        line-height: 1.6;
        font-size: 15px;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>Playback unavailable</h1>
      <p>This media can only be played inside the app player.</p>
    </main>
  </body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    }
  );
}

export function createPlaybackNotFoundResponse() {
  return new NextResponse('Playback unavailable.', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
