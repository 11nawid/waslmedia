'use client';
import { useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';
import { Clapperboard, Globe, Lock, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { Video } from '@/lib/types';
import type { StudioCollectionSlice } from '@/lib/studio/bootstrap-types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { bulkDeleteVideos, getPaginatedVideosByAuthorId } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShortsUploadDialog } from '@/hooks/use-shorts-upload-dialog';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { useStudioStore } from '@/hooks/use-studio-store';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioContentPagination } from './studio-content-pagination';
import { VideoActionsMenu } from './video-actions-menu';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { buildVideoHref } from '@/lib/video-links';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';
import type { ApiProgressMode } from '@/hooks/use-global-load-progress';

const DEFAULT_PAGE_SIZE = 30;
const STUDIO_SHORTS_CACHE_TTL_MS = 30_000;
const studioShortsCache = new Map<string, { items: Video[]; total: number; fetchedAt: number }>();
type ShortVisibilityFilter = 'all' | 'public' | 'private' | 'unlisted';
type ShortSortFilter = 'newest' | 'oldest' | 'most-viewed';
const DEFAULT_FILTERS = {
  visibility: 'all' as ShortVisibilityFilter,
  sortBy: 'newest' as ShortSortFilter,
};

function ShortsTableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`shorts-table-skeleton-${index}`}
          className="grid grid-cols-[auto_minmax(200px,1fr)_repeat(4,minmax(100px,1fr))] items-center border-b px-4 py-2"
        >
          <Skeleton className="h-4 w-4 rounded-sm" />
          <div className="pl-4 flex items-center gap-4">
            <Skeleton className="h-[100px] w-[56px] rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function ShortsMobileSkeleton() {
  return (
    <div className="border-t">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`shorts-mobile-skeleton-${index}`} className="flex items-start gap-3 border-b p-3">
          <Skeleton className="h-28 w-16 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-8/12" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShortsTab({ initialSlice }: { initialSlice?: StudioCollectionSlice<Video> }) {
  const { user } = useAuth();
  const { searchQuery } = useStudioStore();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { onOpen: onCreateUpload } = useUploadDialog();
  const { onOpen: onEditShort } = useShortsUploadDialog();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [videos, setVideos] = useState<Video[]>(initialSlice?.items || []);
  const [total, setTotal] = useState(initialSlice?.pageInfo?.total || 0);
  const [loading, setLoading] = useState(!initialSlice);
  const [selectedShorts, setSelectedShorts] = useState<string[]>([]);
  const [shortToDelete, setShortToDelete] = useState<Video | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const initialRequestKeyRef = useRef<string | null>(null);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(true);

  const offset = (currentPage - 1) * pageSize;
  const isAllSelected = videos.length > 0 && selectedShorts.length === videos.length;
  const hasActiveFilters =
    filters.visibility !== DEFAULT_FILTERS.visibility || filters.sortBy !== DEFAULT_FILTERS.sortBy;
  const requestKey = JSON.stringify({
    search: deferredSearchQuery,
    visibility: filters.visibility,
    sortBy: filters.sortBy,
    offset,
    pageSize,
  });

  if (initialRequestKeyRef.current === null) {
    initialRequestKeyRef.current = requestKey;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, filters, pageSize]);

  useEffect(() => {
    if (!user) {
      setVideos([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const loadShorts = async (progressMode: ApiProgressMode = 'foreground') => {
      const requestId = ++requestSequenceRef.current;

      if (refreshKey === 0) {
        const cached = studioShortsCache.get(`${user.uid}:${requestKey}`);
        if (cached && Date.now() - cached.fetchedAt < STUDIO_SHORTS_CACHE_TTL_MS) {
          if (!mountedRef.current || requestId !== requestSequenceRef.current) {
            return;
          }
          setVideos(cached.items);
          setTotal(cached.total);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      try {
        const payload = await trackGlobalForegroundTask(
          getPaginatedVideosByAuthorId(user.uid, {
            contentType: 'shorts',
            limit: pageSize,
            offset,
            search: deferredSearchQuery,
            visibility: filters.visibility === 'all' ? undefined : filters.visibility,
            sortBy: filters.sortBy,
          }),
          progressMode
        );

        if (!mountedRef.current || requestId !== requestSequenceRef.current) {
          return;
        }

        setVideos(payload.videos);
        setTotal(payload.pagination.total);
        studioShortsCache.set(`${user.uid}:${requestKey}`, {
          items: payload.videos,
          total: payload.pagination.total,
          fetchedAt: Date.now(),
        });
      } catch (error) {
        console.error('Error fetching shorts:', error);
        if (mountedRef.current && requestId === requestSequenceRef.current) {
          setVideos([]);
          setTotal(0);
        }
      } finally {
        if (mountedRef.current && requestId === requestSequenceRef.current) {
          setLoading(false);
        }
      }
    };

    if (initialSlice && refreshKey === 0 && initialRequestKeyRef.current === requestKey) {
      studioShortsCache.set(`${user.uid}:${requestKey}`, {
        items: initialSlice.items,
        total: initialSlice.pageInfo?.total || 0,
        fetchedAt: Date.now(),
      });
      initialRequestKeyRef.current = '__consumed__';
      setLoading(false);
      return;
    }

    loadShorts().catch(console.error);
  }, [deferredSearchQuery, filters, initialSlice, offset, pageSize, refreshKey, requestKey, user]);

  useStudioRealtimeEvent('videos.updated', () => {
    studioShortsCache.clear();
    setRefreshKey((value) => value + 1);
  });

  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedShorts([]);
    }
  }, [isSelectionMode]);

  useEffect(() => {
    setSelectedShorts((current) => current.filter((videoId) => videos.some((video) => video.id === videoId)));
  }, [videos]);

  const handleSelectionChange = (id: string, checked: boolean) => {
    setSelectedShorts((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((videoId) => videoId !== id);
    });
  };

  const handleMasterCheckboxChange = (checked: boolean) => {
    setSelectedShorts(checked ? videos.map((video) => video.id) : []);
  };

  const confirmDelete = () => {
    if (!user || selectedShorts.length === 0) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        await bulkDeleteVideos(selectedShorts, user.uid);
        studioShortsCache.clear();
        const shouldGoBack = selectedShorts.length === videos.length && currentPage > 1;

        toast({ title: `${selectedShorts.length} short(s) deleted successfully.` });
        setSelectedShorts([]);
        setShortToDelete(null);

        if (isMobile) {
          setIsSelectionMode(false);
        }

        if (shouldGoBack) {
          setCurrentPage((page) => Math.max(1, page - 1));
        } else {
          setRefreshKey((value) => value + 1);
        }
      } catch (error) {
        console.error('Failed to delete shorts:', error);
        toast({
          title: 'Failed to delete',
          description: 'An error occurred while deleting the selected shorts.',
          variant: 'destructive',
        });
      }
    });
  };

  const renderEmptyState = (
    <div className="col-span-full overflow-x-hidden">
      <div className="py-20 text-center text-muted-foreground">
        <Clapperboard className="mx-auto mb-4 h-16 w-16" />
        <h3 className="text-xl font-semibold">Create a Short</h3>
        <p className="mt-2">Upload once and we&apos;ll detect whether it belongs in Shorts or standard videos.</p>
        <Button className="mt-4" variant="primary" onClick={() => onCreateUpload()}>
          Create
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <AlertDialog open={!!shortToDelete} onOpenChange={(open) => !open && setShortToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {selectedShorts.length > 1 ? `${selectedShorts.length} shorts` : 'this short'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. The selected short content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShortToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile ? (
        <div className="mb-4">
          {isSelectionMode ? (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setIsSelectionMode(false)}>
                Cancel
              </Button>
              <span className="font-semibold">{selectedShorts.length} selected</span>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsSelectionMode(true)}>
              Select
            </Button>
          )}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <div className="grid gap-4">
              <div className="space-y-1">
                <h4 className="font-medium leading-none">Filter shorts</h4>
                <p className="text-sm text-muted-foreground">Keep the list focused while only loading the current page.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="short-visibility-filter">Visibility</Label>
                <Select
                  value={filters.visibility}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, visibility: value as ShortVisibilityFilter }))
                  }
                >
                  <SelectTrigger id="short-visibility-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visibility</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="short-sort-filter">Sort by</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, sortBy: value as ShortSortFilter }))
                  }
                >
                  <SelectTrigger id="short-sort-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="most-viewed">Most viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters ? (
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Clear filters
                  </Button>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters ? <span className="text-sm text-muted-foreground">Filters are active</span> : null}
      </div>

      {selectedShorts.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-secondary px-4 py-2">
          {!isMobile ? <span className="font-semibold">{selectedShorts.length} selected</span> : null}
          <Button variant="ghost" className="text-red-500 hover:text-red-500" onClick={() => setShortToDelete({ id: 'bulk-delete' } as Video)}>
            Delete forever
          </Button>
        </div>
      ) : null}

      <div className={cn('border rounded-sm', isMobile && 'border-none')}>
        <div className="overflow-x-auto">
          <div className="hidden min-w-[800px] md:block">
            <div className="grid grid-cols-[auto_minmax(200px,1fr)_repeat(4,minmax(100px,1fr))] items-center px-4 py-2 border-b text-sm font-semibold text-muted-foreground">
              <Checkbox checked={isAllSelected} onCheckedChange={handleMasterCheckboxChange} />
              <div className="pl-4">Video</div>
              <div>Visibility</div>
              <div>Date</div>
              <div>Views</div>
              <div>Likes</div>
            </div>

            {loading ? (
              <ShortsTableSkeleton />
            ) : videos.length > 0 ? (
              videos.map((short) => (
                <div key={short.id} className="grid grid-cols-[auto_minmax(200px,1fr)_repeat(4,minmax(100px,1fr))] items-center border-b px-4 py-2 text-sm group">
                  <Checkbox checked={selectedShorts.includes(short.id)} onCheckedChange={(checked) => handleSelectionChange(short.id, !!checked)} />
                  <div className="pl-4 flex items-center gap-4">
                    <div className="relative h-[100px] w-[56px] shrink-0 overflow-hidden rounded-md bg-black">
                      <VideoThumbnail thumbnailUrl={short.thumbnailUrl} videoUrl={short.videoUrl} alt={short.title} sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 break-words hover:text-foreground/80">{short.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <VideoActionsMenu
                          video={short}
                          analyticsHref={`/studio/video/${short.id}/analytics`}
                          shareHref={buildVideoHref(short)}
                          onEdit={onEditShort}
                          onDelete={(nextShort) => {
                            setSelectedShorts([nextShort.id]);
                            setShortToDelete(nextShort);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 capitalize">
                    {short.visibility === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {short.visibility}
                  </div>
                  <div>{short.uploadedAt}</div>
                  <div>{short.viewCount.toLocaleString()}</div>
                  <div>{short.likes.toLocaleString()}</div>
                </div>
              ))
            ) : (
              renderEmptyState
            )}
          </div>

          <div className="md:hidden">
            {loading ? (
              <ShortsMobileSkeleton />
            ) : videos.length > 0 ? (
              <div className="border-t">
                {videos.map((short) => (
                  <div key={short.id} className="flex items-start gap-3 border-b p-3">
                    {isSelectionMode ? (
                      <Checkbox checked={selectedShorts.includes(short.id)} onCheckedChange={(checked) => handleSelectionChange(short.id, !!checked)} className="mt-1 flex-shrink-0" />
                    ) : null}
                    <div className="relative h-28 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <VideoThumbnail thumbnailUrl={short.thumbnailUrl} videoUrl={short.videoUrl} alt={short.title} sizes="64px" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="line-clamp-2 break-words font-medium">{short.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{short.uploadedAt}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{short.viewCount.toLocaleString()} views</p>
                    </div>
                    <div className="flex-shrink-0">
                      <VideoActionsMenu
                        video={short}
                        analyticsHref={`/studio/video/${short.id}/analytics`}
                        shareHref={buildVideoHref(short)}
                        onEdit={onEditShort}
                        onDelete={(nextShort) => {
                          setSelectedShorts([nextShort.id]);
                          setShortToDelete(nextShort);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              renderEmptyState
            )}
          </div>
        </div>

        {!loading && total > 0 ? (
          <StudioContentPagination
            total={total}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </div>
    </>
  );
}
