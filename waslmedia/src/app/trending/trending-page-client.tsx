'use client';

import { VideoCard } from '@/components/video-card';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Flame } from 'lucide-react';
import type { TrendingBootstrapPage } from '@/lib/types';

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

export function TrendingPageClient({ initialPage }: { initialPage: TrendingBootstrapPage }) {
  return (
    <MainContent>
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <Flame className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Trending</h1>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {initialPage.items.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </MainContent>
  );
}
