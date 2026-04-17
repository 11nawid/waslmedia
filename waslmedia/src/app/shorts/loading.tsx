import { ShortsPageSkeleton } from '@/app/shorts/shorts-page-client';
import { RouteLoadingSignal } from '@/components/route-loading-signal';

export default function Loading() {
  return (
    <>
      <RouteLoadingSignal />
      <ShortsPageSkeleton />
    </>
  );
}
