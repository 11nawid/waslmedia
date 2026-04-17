import { RouteLoadingSignal } from '@/components/route-loading-signal';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudioLoading() {
  return (
    <>
      <RouteLoadingSignal />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-12 w-[22rem] rounded-full" />
            <Skeleton className="h-4 w-[36rem] rounded-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-[28px]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`studio-panel-loading-${index}`} className="h-40 w-full rounded-[30px]" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[420px] w-full rounded-[34px]" />
      </div>
    </>
  );
}
