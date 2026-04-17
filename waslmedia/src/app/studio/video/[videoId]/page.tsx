import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ videoId: string }>;
};

export default async function VideoWorkbenchIndexPage({ params }: PageProps) {
  const { videoId } = await params;
  redirect(`/studio/video/${videoId}/analytics`);
}
