import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { toggleSubscription } from '@/server/repositories/engagement';
import { publishRealtimeEvent } from '@/server/realtime/events';

type RouteContext = {
  params: Promise<{ channelId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { channelId } = await context.params;
  const payload = await _request.json().catch(() => ({}));
  const subscribed = await toggleSubscription(user.id, channelId, {
    sourceContext: typeof payload.sourceContext === 'string' ? payload.sourceContext : null,
    subscriberCountry:
      (typeof payload.subscriberCountry === 'string' && payload.subscriberCountry) || user.country || null,
  });

  publishRealtimeEvent(`channel:${channelId}`, 'channel.updated');
  publishRealtimeEvent(`analytics:${channelId}`, 'analytics.updated');
  publishRealtimeEvent(`studio:${channelId}`, 'analytics.updated');

  return NextResponse.json({ subscribed });
}
