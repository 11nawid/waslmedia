import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';

type RouteContext = {
  params: Promise<{ channelId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { channelId } = await context.params;
  const decodedChannelId = decodeURIComponent(channelId);
  const channel = await getPublicChannelByHandleOrId(decodedChannelId);

  if (!channel) {
    return NextResponse.json({ error: 'CHANNEL_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ channel });
}
