
import { VideoCard } from '@/components/video-card';
import type { Video } from '@/lib/types';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { getWatchLaterVideos } from '@/server/services/videos';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { isShortVideo } from '@/lib/video-links';

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

export default async function WatchLaterPage() {
  await ensureDatabaseSetup();
  const user = await getCurrentAuthUser();
  const videos: Video[] = user ? await getWatchLaterVideos(user.id) : [];

  if (!user) {
    return (
        <MainContent>
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Clock className="w-24 h-24 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Sign in to see your Watch Later list</h2>
                <p className="text-muted-foreground mt-2">Sign in to access videos that you've saved for later.</p>
                <Button asChild className="mt-4"><Link href="/login">Sign in</Link></Button>
            </div>
        </MainContent>
    )
  }

  const firstVideo = videos[0];

  return (
    <MainContent>
         <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8 bg-gradient-to-b from-zinc-500/20 to-background min-h-full">
            <div className="w-full md:w-1/4 md:max-w-sm flex-shrink-0">
                <div className="sticky top-20">
                    <div className={`w-full rounded-lg overflow-hidden mb-4 relative bg-secondary ${firstVideo && isShortVideo(firstVideo) ? 'aspect-[9/16] max-w-[15rem]' : 'aspect-video'}`}>
                        {firstVideo ? (
                  <VideoThumbnail thumbnailUrl={firstVideo.thumbnailUrl} videoUrl={firstVideo.videoUrl} alt="Watch Later" sizes="384px" />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Clock className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Watch Later</h1>
                    <p className="text-muted-foreground text-sm">{user.displayName}</p>
                    <p className="text-muted-foreground text-sm mb-2">{videos.length} videos</p>
                </div>
            </div>
            <div className="flex-1">
                {videos.length > 0 ? (
                    <div className="space-y-3">
                        {videos.map((video, index) => (
                            <div key={video.id} className="flex gap-4 items-center group">
                                <span className="text-muted-foreground text-lg w-6 text-center">{index+1}</span>
                                <VideoCard video={video} variant="list" sourceContext="watch-later" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-20">You haven't added any videos to your Watch Later list.</p>
                )}
            </div>
        </div>
    </MainContent>
  );
}
