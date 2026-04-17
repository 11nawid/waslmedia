import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getWatchBootstrap } from '@/server/services/bootstrap';

type RouteContext = {
  params: Promise<{ videoId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  await ensureDatabaseSetup();
  const { videoId } = await context.params;
  const url = new URL(request.url);
  const bootstrap = await getWatchBootstrap(videoId, {
    isShare: url.searchParams.get('ref') === 'share',
  });

  if (!bootstrap) {
    return NextResponse.json({ error: 'VIDEO_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(bootstrap);
}
