import { ChannelPageSkeleton } from '@/components/channel-page-primitives';
import { RouteLoadingSignal } from '@/components/route-loading-signal';

export default function ChannelLoading() {
  return (
    <>
      <RouteLoadingSignal />
      <ChannelPageSkeleton />
    </>
  );
}
