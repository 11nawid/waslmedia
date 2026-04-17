import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { SeoJsonLd } from '@/components/seo-json-ld';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import ChannelPageClient from '@/app/channel/[channelId]/channel-page-client';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildProfileJsonLd, buildPublicMetadata, toSeoDescription } from '@/lib/seo';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';
import { getChannelBootstrap } from '@/server/services/bootstrap';
import { appConfig } from '@/config/app';

type Props = {
  params: Promise<{ channelSlug: string }>;
};

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
}

async function getChannelFromSlug(channelSlug: string) {
  const decoded = decodeURIComponent(channelSlug);
  if (!decoded.startsWith('@')) {
    return null;
  }

  return getPublicChannelByHandleOrId(decoded);
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { channelSlug } = await params;
  const channel = await getChannelFromSlug(channelSlug);

  if (!channel) {
    return {
      title: 'Channel not found',
      description: 'This channel could not be found.',
    };
  }

  void parent;

  return buildPublicMetadata({
    title: `${channel.name} - ${appConfig.appName}`,
    description: toSeoDescription(channel.description, `${channel.name} on ${appConfig.appName}`),
    path: `/${channel.handle}`,
    image: channel.profilePictureUrl,
    type: 'profile',
    keywords: [channel.name, channel.handle, `${channel.name} Waslmedia`],
  });
}

export default async function ChannelHandlePage({ params }: Props) {
  await ensureDatabaseSetup();
  const { channelSlug } = await params;
  const bootstrap = await getChannelBootstrap(decodeURIComponent(channelSlug));
  const channel = bootstrap?.page.channel;

  if (!channel) {
    notFound();
  }

  return (
    <MainContent>
      <SeoJsonLd
        data={buildProfileJsonLd({
          name: channel.name,
          description: channel.description,
          path: `/${channel.handle}`,
          image: channel.profilePictureUrl,
        })}
      />
      <ChannelPageClient
        channelId={channelSlug}
        initialChannel={channel}
        initialRealtime={bootstrap?.realtime as {
          channel?: import('@/lib/types').RealtimeScopeToken;
          postComments?: Record<string, import('@/lib/types').RealtimeScopeToken>;
        } | undefined}
      />
    </MainContent>
  );
}
