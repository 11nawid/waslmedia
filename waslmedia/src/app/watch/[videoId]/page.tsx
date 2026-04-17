
import { notFound } from 'next/navigation';
import { SeoJsonLd } from '@/components/seo-json-ld';
import { VideoCard } from '@/components/video-card';
import { WatchLayout } from '@/components/watch-layout';
import { VideoPlayer } from '@/components/video-player';
import { WatchPageContent } from './watch-page-content';
import { Suspense } from 'react';
import { CommentsSection } from '@/components/comments-section';
import { Separator } from '@/components/ui/separator';
import type { Video } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PlaylistPanel } from '@/components/playlist-panel';
import type { Metadata, ResolvingMetadata } from 'next'
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildPublicMetadata, buildVideoJsonLd, toSeoDescription } from '@/lib/seo';
import { getWatchBootstrap } from '@/server/services/bootstrap';
import { getVideoById } from '@/server/services/videos';
import { WatchSuggestionsPanel } from './watch-suggestions-panel';
 
type Props = {
  params: Promise<{ videoId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}
 
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { videoId } = await params;
  const id = videoId;
 
  const video = await getVideoById(id)
 
  if (!video) {
    return {
        title: 'Video not found',
        description: 'This video could not be found.',
    }
  }

  void parent;

  return buildPublicMetadata({
    title: `${video.title} - Waslmedia`,
    description: toSeoDescription(video.description, video.title),
    path: `/watch/${video.id}`,
    image: video.thumbnailUrl,
    type: 'video.other',
    keywords: [video.title, video.channelName, 'Waslmedia video'],
  });
}


function WatchPageSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-0">
      <div className="flex-1">
        <Skeleton className="aspect-video w-full rounded-xl lg:rounded-xl" />
        <Skeleton className="h-7 w-3/4 mt-4" />
        <div className="flex items-center gap-4 mt-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-1/5 mt-1" />
          </div>
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
      <div className="lg:w-[400px] shrink-0">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="w-40 h-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function WatchPage({ params, searchParams }: Props) {
  await ensureDatabaseSetup();
  const { videoId } = await params;
  const resolvedSearchParams = await searchParams;
  const playlistId = resolvedSearchParams.playlist as string | undefined;
  const isShare = resolvedSearchParams.ref === 'share';
  const rawSeek = typeof resolvedSearchParams.t === 'string' ? Number(resolvedSearchParams.t) : 0;
  const initialTimeSeconds = Number.isFinite(rawSeek) && rawSeek > 0 ? rawSeek : 0;
  const sourceContext =
    (typeof resolvedSearchParams.src === 'string' && resolvedSearchParams.src) ||
    (typeof resolvedSearchParams.ref === 'string' && resolvedSearchParams.ref === 'share' ? 'share' : null);
  const bootstrap = await getWatchBootstrap(videoId, { isShare });
  const videoData = bootstrap?.page.video;
  
  if (!videoData) {
      notFound();
  }

  const suggestedData = bootstrap?.page.suggestedVideos || [];
  const initialComments = bootstrap?.page.comments || [];
  const hydratedVideo = videoData;

  return (
    <WatchLayout>
      <SeoJsonLd
        data={buildVideoJsonLd({
          title: hydratedVideo.title,
          description: hydratedVideo.description,
          path: `/watch/${hydratedVideo.id}`,
          thumbnailUrl: hydratedVideo.thumbnailUrl,
          uploadDate: hydratedVideo.rawCreatedAt,
          authorName: hydratedVideo.channelName,
        })}
      />
      <div className="flex flex-col lg:flex-row lg:gap-x-6 lg:py-6 lg:px-6">
        <div className="flex-1 w-full lg:max-w-[calc(100vw-450px)]">
          <div>
             <VideoPlayer video={hydratedVideo} sourceContext={sourceContext} enableMinimize initialTimeSeconds={initialTimeSeconds} />
          </div>
          <div className="p-4 md:p-0">
            <h1 className="text-xl font-bold mt-4 mb-3">{hydratedVideo.title}</h1>
            
            <Suspense fallback={<div>Loading...</div>}>
              <WatchPageContent video={hydratedVideo} />
            </Suspense>
            
            {hydratedVideo.commentsEnabled ? (
              <Suspense fallback={<div>Loading comments...</div>}>
                <CommentsSection
                  videoId={videoId}
                  initialComments={initialComments}
                  realtimeToken={(bootstrap?.realtime?.comments as import('@/lib/types').RealtimeScopeToken | undefined)?.token || null}
                />
              </Suspense>
            ) : (
              <div className="text-center py-8 bg-secondary/50 rounded-xl">
                  <p className="text-muted-foreground">Comments are turned off for this video.</p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:w-[400px] lg:min-w-[400px] shrink-0 space-y-4 px-4 py-6 lg:p-0">
          {playlistId && (
              <Suspense fallback={<Skeleton className="w-full h-auto min-h-[400px] rounded-lg" />}>
                  <PlaylistPanel playlistId={playlistId} currentVideoId={videoId} />
              </Suspense>
          )}

          <WatchSuggestionsPanel currentVideo={hydratedVideo} suggestedVideos={suggestedData} />
        </div>
      </div>
    </WatchLayout>
  );
}
