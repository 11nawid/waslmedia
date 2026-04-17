import { Skeleton } from '@/components/ui/skeleton';
import { RouteLoadingSignal } from '@/components/route-loading-signal';

export default function WatchLoading() {
  return (
    <>
      <RouteLoadingSignal />
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="hidden h-11 w-full max-w-xl rounded-full md:block" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden w-20 shrink-0 border-r border-border/60 lg:block">
            <div className="space-y-4 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={`watch-sidebar-loading-${index}`} className="h-10 w-10 rounded-xl" />
              ))}
            </div>
          </div>
          <main className="flex-1 p-4 md:p-6">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <Skeleton className="aspect-video w-full rounded-[28px]" />
                <Skeleton className="h-9 w-9/12 rounded-full" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36 rounded-full" />
                    <Skeleton className="h-3 w-24 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-28 w-full rounded-[24px]" />
                <Skeleton className="h-40 w-full rounded-[24px]" />
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={`watch-filter-loading-${index}`} className="h-10 w-24 rounded-full" />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`watch-related-loading-${index}`} className="flex gap-3">
                    <Skeleton className="h-24 w-40 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-11/12 rounded-full" />
                      <Skeleton className="h-4 w-8/12 rounded-full" />
                      <Skeleton className="h-3 w-4/12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
