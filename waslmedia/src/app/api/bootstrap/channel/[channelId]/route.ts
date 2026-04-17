import { NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getChannelBootstrap } from '@/server/services/bootstrap';

type RouteContext = {
  params: Promise<{ channelId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await ensureDatabaseSetup();
  const { channelId } = await context.params;
  const bootstrap = await getChannelBootstrap(decodeURIComponent(channelId));

  if (!bootstrap) {
    return NextResponse.json({ error: 'CHANNEL_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(bootstrap);
}
