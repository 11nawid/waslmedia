
import { permanentRedirect } from 'next/navigation';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import ChannelPageClient from './channel-page-client';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getPublicChannelByHandleOrId } from '@/server/services/channels';
import { getChannelBootstrap } from '@/server/services/bootstrap';
 
type Props = {
  params: Promise<{ channelId: string }>
}

function MainContent({children}: {children: React.ReactNode}) {
  return (
     <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default async function ChannelPage({ params }: Props) {
  await ensureDatabaseSetup();
  const { channelId } = await params;
  const handleOrId = decodeURIComponent(channelId);
  const channel = await getPublicChannelByHandleOrId(handleOrId);

  if (channel?.handle) {
    permanentRedirect(`/${channel.handle}`);
  }

  const bootstrap = await getChannelBootstrap(decodeURIComponent(channelId));
  
  return (
    <MainContent>
      <ChannelPageClient
        channelId={channelId}
        initialChannel={bootstrap?.page.channel || null}
        initialRealtime={bootstrap?.realtime as {
          channel?: import('@/lib/types').RealtimeScopeToken;
          postComments?: Record<string, import('@/lib/types').RealtimeScopeToken>;
        } | undefined}
      />
    </MainContent>
  );
}
