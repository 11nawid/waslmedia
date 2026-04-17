
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { listSubscriptionChannelIds } from '@/server/repositories/engagement';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';
import { getSubscribedVideos } from '@/server/services/videos';
import { SubscriptionsPageClient } from '@/app/subscriptions/subscriptions-page-client';

export default async function SubscriptionsPage() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return <SubscriptionsPageClient isAuthenticated={false} initialVideos={[]} initialChannels={[]} />;
  }

  const [videos, channelIds] = await Promise.all([
    getSubscribedVideos(user.id),
    listSubscriptionChannelIds(user.id),
  ]);

  const channels = (
    await Promise.all(channelIds.map((channelId) => getPublicChannelByHandleOrId(channelId)))
  ).filter((channel): channel is NonNullable<typeof channel> => Boolean(channel));

  return (
    <SubscriptionsPageClient
      isAuthenticated
      initialVideos={videos}
      initialChannels={channels}
    />
  );
}
