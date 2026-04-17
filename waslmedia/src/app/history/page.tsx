import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getHistoryVideos, isWatchHistoryEnabled } from '@/server/services/videos';
import { HistoryPageClient } from './history-page-client';

function MainContent({children}: {children: React.ReactNode}) {
  return (
     <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}

export default async function HistoryPage() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();

  if (!user) {
    return (
        <MainContent>
            <div className="flex h-full items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-[2rem] border border-border/70 bg-card px-8 py-12 text-center shadow-sm">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/70">
                        <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Keep track of what you watch</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Sign in to review your watch history, remove videos from it, or pause it whenever you want.
                    </p>
                    <Button asChild className="mt-6 rounded-full px-5"><Link href="/login">Sign in</Link></Button>
                </div>
            </div>
        </MainContent>
    )
  }

  const [videos, historyEnabled] = await Promise.all([
    getHistoryVideos(user.id),
    isWatchHistoryEnabled(user.id),
  ]);

  return (
    <MainContent>
      <HistoryPageClient initialVideos={videos} initialHistoryEnabled={historyEnabled} />
    </MainContent>
  );
}
