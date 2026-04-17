'use client';

import type { Channel, Video } from '@/lib/types';
import { VideoCard } from '@/components/video-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChannelListCard } from '@/components/channel-list-card';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Youtube } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function SubscriptionsPageClient({
  isAuthenticated,
  initialVideos,
  initialChannels,
}: {
  isAuthenticated: boolean;
  initialVideos: Video[];
  initialChannels: Channel[];
}) {
  if (!isAuthenticated) {
    return (
      <MainContent>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Youtube className="mb-4 h-24 w-24 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Don't miss new videos</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to see updates from your favorite Waslmedia channels.
          </p>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
      <div className="w-full">
        <h1 className="mb-6 text-3xl font-bold">Subscriptions</h1>
        <Tabs defaultValue="latest" className="w-full">
          <TabsList>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>
          <TabsContent value="latest" className="mt-6">
            {initialVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {initialVideos.map((video) => (
                  <VideoCard key={video.id} video={video} sourceContext="subscriptions" />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Youtube}
                title="No new videos"
                description="Check back later for fresh uploads from the channels you follow."
                compact
              />
            )}
          </TabsContent>
          <TabsContent value="channels" className="mt-6">
            {initialChannels.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {initialChannels.map((channel) => (
                  <ChannelListCard key={channel.id} channel={channel} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Youtube}
                title="No subscriptions yet"
                description="Subscribe to your favorite channels and they’ll start showing up here."
                compact
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainContent>
  );
}
