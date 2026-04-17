'use client';

import { usePathname } from 'next/navigation';
import { VideoWorkbenchShell } from './shell';

export function VideoWorkbenchFrame({
  videoId,
  children,
}: {
  videoId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const isAdvancedAnalytics = pathname.endsWith('/analytics/advanced');

  if (isAdvancedAnalytics) {
    return <>{children}</>;
  }

  return <VideoWorkbenchShell videoId={videoId}>{children}</VideoWorkbenchShell>;
}
