import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { buildPublicMetadata, toSeoDescription } from '@/lib/seo';
import { ShortsPageClient } from '@/app/shorts/shorts-page-client';
import { getShortsBootstrapForVideo } from '@/server/services/bootstrap';
import { getVideoById } from '@/server/services/videos';

type Props = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { videoId } = await params;
  const video = await getVideoById(videoId);

  if (!video) {
    return buildPublicMetadata({
      title: 'Short not found',
      description: 'This short could not be found.',
      path: '/shorts',
    });
  }

  return buildPublicMetadata({
    title: `${video.title} - Waslmedia Shorts`,
    description: toSeoDescription(video.description, video.title),
    path: `/shorts/${video.id}`,
    image: video.thumbnailUrl,
    type: 'video.other',
    keywords: [video.title, video.channelName, 'Waslmedia short'],
  });
}

export default async function ShortVideoPage({ params }: Props) {
  await ensureDatabaseSetup();
  const { videoId } = await params;
  const bootstrap = await getShortsBootstrapForVideo(videoId);

  if (!bootstrap) {
    notFound();
  }

  return <ShortsPageClient initialPage={bootstrap.page} initialVideoId={videoId} />;
}
