'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Edit, ListVideo, Lock, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PlaylistDialog } from '@/components/playlist-dialog';
import { usePlaylistDialog } from '@/hooks/use-playlist-dialog';
import { useStudioStore } from '@/hooks/use-studio-store';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { deletePlaylist, getUserPlaylists } from '@/lib/data';
import type { Playlist } from '@/lib/types';
import { EmptyState } from '@/components/empty-state';
import { useStudioRealtimeEvent } from '@/components/studio/studio-session-provider';
import { useStudioSession } from '@/components/studio/studio-session-provider';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';
import type { ApiProgressMode } from '@/hooks/use-global-load-progress';

const STUDIO_PLAYLISTS_CACHE_TTL_MS = 30_000;
const studioPlaylistsCache = new Map<string, { playlists: Playlist[]; fetchedAt: number }>();

function formatUpdatedAt(value: Playlist['updatedAt']) {
  if (!value) {
    return 'N/A';
  }

  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function PlaylistsTab({
  initialPlaylists = [],
  hasInitialData = false,
}: {
  initialPlaylists?: Playlist[];
  hasInitialData?: boolean;
}) {
  const { viewer } = useStudioSession();
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [loading, setLoading] = useState(false);
  const { searchQuery } = useStudioStore();
  const { onOpen } = usePlaylistDialog();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const consumedInitialRef = useRef(hasInitialData);

  const refreshPlaylists = async (force = false, progressMode: ApiProgressMode = 'foreground') => {
    if (!viewer) {
      setLoading(false);
      return;
    }

    if (!force) {
      const cached = studioPlaylistsCache.get(viewer.id);
      if (cached && Date.now() - cached.fetchedAt < STUDIO_PLAYLISTS_CACHE_TTL_MS) {
        setPlaylists(cached.playlists);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const userPlaylists = await trackGlobalForegroundTask(getUserPlaylists(viewer.id), progressMode);
      studioPlaylistsCache.set(viewer.id, { playlists: userPlaylists, fetchedAt: Date.now() });
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!viewer) {
      setLoading(false);
      return;
    }

    if (consumedInitialRef.current) {
      studioPlaylistsCache.set(viewer.id, { playlists: initialPlaylists, fetchedAt: Date.now() });
      consumedInitialRef.current = false;
      return;
    }

    void refreshPlaylists();
  }, [viewer, hasInitialData, initialPlaylists]);

  useStudioRealtimeEvent('playlists.updated', () => {
    if (!viewer) {
      return;
    }

    studioPlaylistsCache.delete(viewer.id);
    void refreshPlaylists(true, 'silent');
  });

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) return playlists;
    return playlists.filter((playlist) => playlist.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [playlists, searchQuery]);

  const handleDeletePlaylist = () => {
    if (!playlistToDelete || !viewer) return;

    startDeleteTransition(async () => {
      try {
        await deletePlaylist(viewer.id, playlistToDelete.id);
        toast({ title: 'Playlist deleted.' });
        setPlaylists((current) => {
          const nextPlaylists = current.filter((playlist) => playlist.id !== playlistToDelete.id);
          studioPlaylistsCache.set(viewer.id, { playlists: nextPlaylists, fetchedAt: Date.now() });
          return nextPlaylists;
        });
        setPlaylistToDelete(null);
      } catch (error: any) {
        console.error('Error deleting playlist', error);
        toast({ title: 'Error deleting playlist', description: 'An unexpected error occurred.', variant: 'destructive' });
      }
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading playlists...</div>;
  }

  return (
    <>
      <PlaylistDialog />
      <AlertDialog open={!!playlistToDelete} onOpenChange={(open) => !open && setPlaylistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete playlist "{playlistToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this playlist? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlaylist} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={() => onOpen()}>
            NEW PLAYLIST
          </Button>
        </div>
        <div className={cn('border rounded-sm overflow-x-auto', isMobile && 'border-none')}>
          <div className="min-w-[800px] hidden md:block">
            <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center px-4 py-2 border-b text-muted-foreground text-sm font-semibold">
              <div>Playlist</div>
              <div>Visibility</div>
              <div>Last updated</div>
              <div>Video count</div>
              <div>Actions</div>
            </div>
            {filteredPlaylists.length > 0 ? (
              filteredPlaylists.map((playlist) => (
                <div key={playlist.id} className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center px-4 py-2 border-b text-sm group">
                  <Link href={`/playlist/${playlist.id}`} className="flex items-center gap-4 hover:underline">
                    {playlist.firstVideoThumbnail ? (
                      <Image src={playlist.firstVideoThumbnail} alt={playlist.name} width={120} height={68} className="object-cover rounded-md aspect-video" />
                    ) : (
                      <div className="w-[120px] aspect-video bg-secondary rounded-md flex items-center justify-center">
                        <ListVideo className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-semibold">{playlist.name}</p>
                  </Link>
                  <div className="capitalize flex items-center gap-1">
                    {playlist.visibility === 'private' && <Lock className="w-4 h-4" />}
                    {playlist.visibility}
                  </div>
                  <p>{formatUpdatedAt(playlist.updatedAt)}</p>
                  <p>{playlist.videoCount}</p>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpen(playlist)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" onClick={() => setPlaylistToDelete(playlist)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={ListVideo}
                  title="No playlists yet"
                  description="Create playlists to organize your channel content into themed collections."
                  compact
                />
              </div>
            )}
          </div>
          <div className="md:hidden">
            {filteredPlaylists.length > 0 ? (
              <div className="border-t">
                {filteredPlaylists.map((playlist) => (
                  <div key={playlist.id} className="flex items-start gap-3 p-3 border-b">
                    <div className="relative w-24 h-14 shrink-0">
                      {playlist.firstVideoThumbnail ? (
                        <Image src={playlist.firstVideoThumbnail} alt={playlist.name} width={120} height={68} className="object-cover rounded-md aspect-video" />
                      ) : (
                        <div className="w-full h-full aspect-video bg-secondary rounded-md flex items-center justify-center">
                          <ListVideo className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <p className="font-semibold truncate break-words">{playlist.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{playlist.visibility} &bull; {playlist.videoCount} videos</p>
                      <p className="text-xs text-muted-foreground">Updated {formatUpdatedAt(playlist.updatedAt)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpen(playlist)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => setPlaylistToDelete(playlist)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  icon={ListVideo}
                  title="No playlists yet"
                  description="Create playlists to organize your channel content into themed collections."
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
