import { notFound } from 'next/navigation';
import { getPlaylistById } from '@/server/services/playlists';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, Shuffle } from 'lucide-react';
import { VideoCard } from '@/components/video-card';
import { appConfig } from '@/config/app';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref, isShortVideo } from '@/lib/video-links';

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      </div>
    </div>
  );
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  const playlist = await getPlaylistById(playlistId);

  if (!playlist) {
    notFound();
  }

  const firstVideoId = playlist.videos[0]?.id;
  const firstVideo = playlist.videos[0];
  const randomVideo =
    playlist.videos.length > 0
      ? playlist.videos[Math.floor(Math.random() * playlist.videos.length)]
      : null;

  return (
    <MainContent>
      <div className="flex min-h-full flex-col gap-8 bg-gradient-to-b from-secondary/40 to-background p-4 md:flex-row md:p-8">
        <div className="w-full shrink-0 md:w-1/3 md:max-w-sm">
          <div className="sticky top-20">
            <div className={`relative mb-4 w-full overflow-hidden rounded-lg ${firstVideo && isShortVideo(firstVideo) ? 'aspect-[9/16] max-w-[15rem]' : 'aspect-video'}`}>
              <VideoThumbnail
                thumbnailUrl={playlist.firstVideoThumbnail || appConfig.defaultThumbnailUrl}
                videoUrl={playlist.videos[0]?.videoUrl}
                alt={playlist.name}
                sizes="384px"
              />
            </div>
            <h1 className="mb-2 text-3xl font-bold">{playlist.name}</h1>
            <p className="text-sm text-muted-foreground">{playlist.creatorName}</p>
            <p className="mb-2 text-sm text-muted-foreground">{playlist.videoCount} videos</p>
            <p className="mb-4 text-sm line-clamp-3">{playlist.description}</p>

            <div className="mb-4 flex gap-2">
              <Button className="flex-1 bg-primary hover:bg-primary/90" asChild disabled={!firstVideo}>
                <Link href={firstVideo ? buildVideoHref(firstVideo, { playlistId: playlist.id }) : '#'}>
                  <Play className="mr-2" /> Play all
                </Link>
              </Button>
              <Button variant="secondary" className="flex-1" asChild disabled={!randomVideo}>
                <Link href={randomVideo ? buildVideoHref(randomVideo, { playlistId: playlist.id }) : '#'}>
                  <Shuffle className="mr-2" /> Shuffle
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1">
          {playlist.videos.length > 0 ? (
            <div className="space-y-3">
              {playlist.videos.map((video, index) => (
                <div key={video.id} className="group flex items-center gap-4">
                  <span className="w-6 text-center text-lg text-muted-foreground">{index + 1}</span>
                  <VideoCard video={video} variant="list" playlistId={playlist.id} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-20 text-center text-muted-foreground">This playlist has no videos.</p>
          )}
        </div>
      </div>
    </MainContent>
  );
}
