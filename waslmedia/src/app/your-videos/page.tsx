
import { VideoCard } from '@/components/video-card';
import type { Video } from '@/lib/types';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { PlaySquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getVideosByAuthorId } from '@/server/services/videos';

function MainContent({children}: {children: React.ReactNode}) {
  return (
     <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}

export default async function YourVideosPage() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();
  const videos: Video[] = user ? await getVideosByAuthorId(user.id) : [];

  if (!user) {
    return (
        <MainContent>
             <div className="flex flex-col items-center justify-center h-full text-center">
                <PlaySquare className="w-24 h-24 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Sign in to see your videos</h2>
                <p className="text-muted-foreground mt-2">Sign in to access videos that you've uploaded.</p>
                <Button asChild className="mt-4"><Link href="/login">Sign in</Link></Button>
            </div>
        </MainContent>
    )
  }

  return (
    <MainContent>
        <h1 className="text-3xl font-bold mb-6">Your Videos</h1>
       {videos.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
           {videos.map((video) => (
               <VideoCard key={video.id} video={video} />
           ))}
           </div>
       ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/45">
                <PlaySquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="max-w-xl text-[2rem] font-semibold tracking-tight text-foreground">No videos uploaded yet</h2>
              <p className="mt-2 max-w-xl text-[1.02rem] leading-8 text-muted-foreground">
                Your published and draft uploads will appear here once you start creating content.
              </p>
              <div className="mt-6">
                <Button asChild variant="primary" className="rounded-full px-5">
                  <Link href="/studio/upload">Upload a video</Link>
                </Button>
              </div>
            </div>
       )}
    </MainContent>
  );
}
