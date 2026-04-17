'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Video } from '@/lib/types';
import type { StudioCollectionSlice } from '@/lib/studio/bootstrap-types';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { bulkDeleteVideos, getPaginatedVideosByAuthorId } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { useSaveToPlaylistDialog } from '@/hooks/use-save-to-playlist-dialog';
import { useStudioStore } from '@/hooks/use-studio-store';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { SaveToPlaylistDialog } from '@/components/save-to-playlist-dialog';
import { cn } from '@/lib/utils';
import { NoContentView } from './no-content-view';
import { StudioContentPagination } from './studio-content-pagination';
import { VideoRow } from './video-row';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';
import type { ApiProgressMode } from '@/hooks/use-global-load-progress';

const DEFAULT_PAGE_SIZE = 30;
const STUDIO_VIDEOS_CACHE_TTL_MS = 30_000;
const studioVideosCache = new Map<string, { items: Video[]; total: number; fetchedAt: number }>();
type VideoVisibilityFilter = 'all' | 'public' | 'private' | 'unlisted';
type VideoAudienceFilter = 'all' | 'madeForKids' | 'notMadeForKids';
type VideoSortFilter = 'newest' | 'oldest' | 'most-viewed';
const DEFAULT_FILTERS = {
  visibility: 'all' as VideoVisibilityFilter,
  audience: 'all' as VideoAudienceFilter,
  sortBy: 'newest' as VideoSortFilter,
};

function VideosTableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`videos-table-skeleton-${index}`}
          className="grid grid-cols-[auto_minmax(300px,4fr)_repeat(6,minmax(100px,1fr))] items-center border-b px-4 py-2"
        >
          <Skeleton className="h-4 w-4 rounded-sm" />
          <div className="pl-4 flex items-center gap-4">
            <Skeleton className="h-20 w-32 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function VideosMobileSkeleton() {
  return (
    <div className="border-t">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={`videos-mobile-skeleton-${index}`} className="flex gap-3 border-b p-3">
          <Skeleton className="mt-1 h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-14 w-24 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideosTab({ initialSlice }: { initialSlice?: StudioCollectionSlice<Video> }) {
  const { user } = useAuth();
  const { searchQuery } = useStudioStore();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { onOpen } = useUploadDialog();
  const { onOpen: openSaveToPlaylistDialog } = useSaveToPlaylistDialog();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [videos, setVideos] = useState<Video[]>(initialSlice?.items || []);
  const [total, setTotal] = useState(initialSlice?.pageInfo?.total || 0);
  const [loading, setLoading] = useState(!initialSlice);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
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
  const isAllSelected = videos.length > 0 && selectedVideos.length === videos.length;
  const hasActiveFilters =
    filters.visibility !== DEFAULT_FILTERS.visibility ||
    filters.audience !== DEFAULT_FILTERS.audience ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy;
  const requestKey = JSON.stringify({
    search: deferredSearchQuery,
    visibility: filters.visibility,
    audience: filters.audience,
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

    const loadVideos = async (progressMode: ApiProgressMode = 'foreground') => {
      const requestId = ++requestSequenceRef.current;

      if (refreshKey === 0) {
        const cached = studioVideosCache.get(`${user.uid}:${requestKey}`);
        if (cached && Date.now() - cached.fetchedAt < STUDIO_VIDEOS_CACHE_TTL_MS) {
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
            contentType: 'videos',
            limit: pageSize,
            offset,
            search: deferredSearchQuery,
            visibility: filters.visibility === 'all' ? undefined : filters.visibility,
            audience: filters.audience === 'all' ? undefined : filters.audience,
            sortBy: filters.sortBy,
          }),
          progressMode
        );

        if (!mountedRef.current || requestId !== requestSequenceRef.current) {
          return;
        }

        setVideos(payload.videos);
        setTotal(payload.pagination.total);
        studioVideosCache.set(`${user.uid}:${requestKey}`, {
          items: payload.videos,
          total: payload.pagination.total,
          fetchedAt: Date.now(),
        });
      } catch (error) {
        console.error('Error fetching videos:', error);
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
      studioVideosCache.set(`${user.uid}:${requestKey}`, {
        items: initialSlice.items,
        total: initialSlice.pageInfo?.total || 0,
        fetchedAt: Date.now(),
      });
      initialRequestKeyRef.current = '__consumed__';
      setLoading(false);
      return;
    }

    loadVideos().catch(console.error);
  }, [deferredSearchQuery, filters, initialSlice, offset, pageSize, refreshKey, requestKey, user]);

  useStudioRealtimeEvent('videos.updated', () => {
    studioVideosCache.clear();
    setRefreshKey((value) => value + 1);
  });

  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedVideos([]);
    }
  }, [isSelectionMode]);

  useEffect(() => {
    setSelectedVideos((current) => current.filter((videoId) => videos.some((video) => video.id === videoId)));
  }, [videos]);

  const handleMasterCheckboxChange = (checked: boolean) => {
    setSelectedVideos(checked ? videos.map((video) => video.id) : []);
  };

  const handleRowSelectionChange = (id: string, checked: boolean) => {
    setSelectedVideos((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((videoId) => videoId !== id);
    });
  };

  const confirmDelete = () => {
    if (!user || selectedVideos.length === 0) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        await bulkDeleteVideos(selectedVideos, user.uid);
        studioVideosCache.clear();
        const shouldGoBack = selectedVideos.length === videos.length && currentPage > 1;

        toast({ title: `${selectedVideos.length} video(s) deleted successfully.` });
        setSelectedVideos([]);
        setVideoToDelete(null);

        if (isMobile) {
          setIsSelectionMode(false);
        }

        if (shouldGoBack) {
          setCurrentPage((page) => Math.max(1, page - 1));
        } else {
          setRefreshKey((value) => value + 1);
        }
      } catch (error) {
        console.error('Failed to delete videos:', error);
        toast({
          title: 'Failed to delete',
          description: 'An error occurred while deleting the selected videos.',
          variant: 'destructive',
        });
      }
    });
  };

  const showEmptyState = !loading && videos.length === 0;
  const selectionSummary = useMemo(() => `${selectedVideos.length} selected`, [selectedVideos.length]);

  return (
    <>
      <SaveToPlaylistDialog />
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {selectedVideos.length > 1 ? `${selectedVideos.length} videos` : `"${videoToDelete?.title}"`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please be aware that deleting videos is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVideoToDelete(null)}>Cancel</AlertDialogCancel>
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
              <span className="font-semibold">{selectionSummary}</span>
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
                <h4 className="font-medium leading-none">Filter content</h4>
                <p className="text-sm text-muted-foreground">Narrow the current video list without loading every item first.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="video-visibility-filter">Visibility</Label>
                <Select
                  value={filters.visibility}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, visibility: value as VideoVisibilityFilter }))
                  }
                >
                  <SelectTrigger id="video-visibility-filter">
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
                <Label htmlFor="video-audience-filter">Restrictions</Label>
                <Select
                  value={filters.audience}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, audience: value as VideoAudienceFilter }))
                  }
                >
                  <SelectTrigger id="video-audience-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All restrictions</SelectItem>
                    <SelectItem value="madeForKids">Made for kids</SelectItem>
                    <SelectItem value="notMadeForKids">Not made for kids</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="video-sort-filter">Sort by</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters((current) => ({ ...current, sortBy: value as VideoSortFilter }))
                  }
                >
                  <SelectTrigger id="video-sort-filter">
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

      {selectedVideos.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md bg-secondary px-4 py-2">
          {!isMobile ? <span className="font-semibold">{selectionSummary}</span> : null}
          <Button variant="ghost" onClick={() => openSaveToPlaylistDialog(selectedVideos)}>
            Add to playlist
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">More actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-red-500" onClick={() => setVideoToDelete({ id: 'bulk-delete' } as Video)}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete forever</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className={cn('border rounded-sm', isMobile && 'border-none')}>
        <div className="overflow-x-auto">
          <div className="hidden min-w-[900px] md:block">
            <div className="grid grid-cols-[auto_minmax(300px,4fr)_repeat(6,minmax(100px,1fr))] items-center px-4 py-2 border-b text-sm font-semibold text-muted-foreground">
              <Checkbox checked={isAllSelected} onCheckedChange={handleMasterCheckboxChange} />
              <div className="pl-4">Video</div>
              <div>Visibility</div>
              <div>Restrictions</div>
              <div>Date</div>
              <div>Views</div>
              <div>Comments</div>
              <div>Likes (vs dislikes)</div>
            </div>

            {loading ? (
              <VideosTableSkeleton />
            ) : showEmptyState ? (
              <div className="overflow-x-hidden">
                <NoContentView onUploadClick={() => onOpen()} />
              </div>
            ) : (
              videos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  isSelected={selectedVideos.includes(video.id)}
                  onSelectionChange={handleRowSelectionChange}
                  onEdit={onOpen}
                  onDelete={(nextVideo) => {
                    setSelectedVideos([nextVideo.id]);
                    setVideoToDelete(nextVideo);
                  }}
                />
              ))
            )}
          </div>

          <div className="md:hidden">
            {loading ? (
              <VideosMobileSkeleton />
            ) : showEmptyState ? (
              <div className="overflow-x-hidden">
                <NoContentView onUploadClick={() => onOpen()} />
              </div>
            ) : (
              <div className="border-t">
                {videos.map((video) => (
                  <VideoRow
                    key={video.id}
                    video={video}
                    isSelected={isSelectionMode ? selectedVideos.includes(video.id) : false}
                    onSelectionChange={handleRowSelectionChange}
                    onEdit={onOpen}
                    onDelete={(nextVideo) => {
                      setSelectedVideos([nextVideo.id]);
                      setVideoToDelete(nextVideo);
                    }}
                    showSelectionControl={isSelectionMode}
                  />
                ))}
              </div>
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
