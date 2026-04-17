import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getSubscribedVideos } from '@/server/services/videos';
import {
  countRecentSubscribers,
  listRecentSubscribers,
} from '@/server/repositories/engagement-analytics';
import { listSubscriptionChannelIds } from '@/server/repositories/engagement';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';

export async function GET(request: NextRequest) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get('mode');

  if (mode === 'videos') {
    const videos = await getSubscribedVideos(user.id);
    return NextResponse.json({ videos });
  }

  if (mode === 'recent') {
    const channelId = request.nextUrl.searchParams.get('channelId') || user.id;
    const count = Math.min(Math.max(Number(request.nextUrl.searchParams.get('count') || '20'), 1), 60);
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') || '0'), 0);
    const sortByParam = request.nextUrl.searchParams.get('sort');
    const sortBy = sortByParam === 'oldest' || sortByParam === 'largest' ? sortByParam : 'recent';
    const [channels, total] = await Promise.all([
      listRecentSubscribers(channelId, count, offset, sortBy),
      countRecentSubscribers(channelId),
    ]);

    return NextResponse.json({
      channels,
      pagination: {
        total,
        limit: count,
        offset,
        count: channels.length,
        hasNextPage: offset + channels.length < total,
        hasPreviousPage: offset > 0,
      },
    });
  }

  const channelIds = await listSubscriptionChannelIds(user.id);
  const channels = (
    await Promise.all(channelIds.map((channelId) => getPublicChannelByHandleOrId(channelId)))
  ).filter(Boolean);

  return NextResponse.json({ channels });
}
