import { Skeleton } from '@/components/ui/skeleton';
import { RouteLoadingSignal } from '@/components/route-loading-signal';

export default function AppLoading() {
  return (
    <>
      <RouteLoadingSignal />
      <div className="flex h-screen flex-col bg-background">
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
          <aside className="hidden w-64 shrink-0 border-r border-border/60 px-4 py-6 lg:block">
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={`sidebar-loading-${index}`} className="h-10 w-full rounded-full" />
              ))}
            </div>
          </aside>
          <main className="flex-1 overflow-hidden p-4 md:p-6">
            <div className="mb-5 flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`filter-loading-${index}`} className="h-10 w-28 rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={`card-loading-${index}`} className="space-y-3">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-11/12 rounded-full" />
                      <Skeleton className="h-4 w-8/12 rounded-full" />
                      <Skeleton className="h-3 w-5/12 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
