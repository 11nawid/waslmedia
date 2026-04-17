import { VideoWorkbenchProvider } from '@/components/studio/video-workbench/provider';
import { VideoWorkbenchFrame } from '@/components/studio/video-workbench/frame';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ videoId: string }>;
};

export default async function VideoWorkbenchLayout({ children, params }: LayoutProps) {
  const { videoId } = await params;

  return (
    <VideoWorkbenchProvider videoId={videoId}>
      <VideoWorkbenchFrame videoId={videoId}>{children}</VideoWorkbenchFrame>
    </VideoWorkbenchProvider>
  );
}
