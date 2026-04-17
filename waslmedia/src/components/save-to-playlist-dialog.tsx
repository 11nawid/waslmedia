

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { createPlaylist, getUserPlaylists, getPlaylistVideoStatus, toggleVideoInPlaylist, getUserInteractionStatus, toggleWatchLater, bulkAddToPlaylists, bulkToggleWatchLater } from '@/lib/data';
import type { Playlist } from '@/lib/types';
import { Plus, Clock } from 'lucide-react';
import { useSaveToPlaylistDialogContext } from '@/hooks/use-save-to-playlist-dialog';

export function SaveToPlaylistDialog() {
  const { isOpen, onClose, videoId, videoIds } = useSaveToPlaylistDialogContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [savedToPlaylists, setSavedToPlaylists] = useState<string[]>([]);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'private' | 'public' | 'unlisted'>('private');
  const [isPending, startTransition] = useTransition();

  const isBulkMode = !!videoIds && videoIds.length > 0;
  const currentVideoId = isBulkMode ? videoIds[0] : videoId;

  useEffect(() => {
    if (user && isOpen && currentVideoId) {
      setLoading(true);
      Promise.all([
        getUserPlaylists(user.uid),
        // For bulk mode, we can't reliably show checkbox state for every video,
        // so we can either disable them or show for the first video.
        // Here, we'll show status for the first video if not in bulk mode.
        isBulkMode ? Promise.resolve([]) : getPlaylistVideoStatus(user.uid, currentVideoId),
        isBulkMode ? Promise.resolve({watchLater: false}) : getUserInteractionStatus(currentVideoId, user.uid)
      ]).then(([userPlaylists, savedStatus, interactionStatus]) => {
        setPlaylists(userPlaylists);
        setSavedToPlaylists(savedStatus);
        setIsInWatchLater(interactionStatus.watchLater);
        setLoading(false);
      }).catch(err => {
        console.error("Error loading playlist data:", err);
        setLoading(false);
        toast({title: "Could not load playlists", variant: "destructive"});
      });
    } else if (!isOpen) {
        setShowCreateForm(false);
        setNewPlaylistName('');
    }
  }, [user, isOpen, currentVideoId, isBulkMode, toast]);

  const handlePlaylistToggle = (playlistId: string, isChecked: boolean) => {
    if (!user) return;
    
    startTransition(async () => {
        try {
            if (isBulkMode) {
                 await bulkAddToPlaylists(user.uid, playlistId, videoIds);
                 toast({ title: `Videos added to playlist` });
            } else if (videoId) {
                await toggleVideoInPlaylist(user.uid, playlistId, videoId, isChecked);
                toast({ title: isChecked ? 'Removed from playlist' : 'Saved to playlist' });
            }
             
            // Optimistically update UI
             if (!isChecked) {
                setSavedToPlaylists(prev => [...prev, playlistId]);
            } else {
                setSavedToPlaylists(prev => prev.filter(id => id !== playlistId));
            }
        } catch (error) {
            console.error("Failed to toggle playlist", error);
            toast({ title: 'Something went wrong', variant: 'destructive' });
        }
    });
  };

   const handleWatchLaterToggle = (isChecked: boolean) => {
    if (!user) return;
    
    startTransition(async () => {
        try {
             if (isBulkMode) {
                await bulkToggleWatchLater(videoIds, user.uid, isChecked);
                toast({ title: `${videoIds.length} videos ${isChecked ? 'saved to' : 'removed from'} Watch Later.` });
            } else if (videoId) {
                await toggleWatchLater(videoId, user.uid);
                toast({ title: isChecked ? 'Saved to Watch Later' : 'Removed from Watch Later' });
            }
            setIsInWatchLater(isChecked);
        } catch (error) {
            console.error("Failed to toggle watch later", error);
            toast({ title: 'Something went wrong', variant: 'destructive' });
        }
    });
  };

  const handleCreatePlaylist = () => {
      if (!user || !newPlaylistName.trim()) return;

      startTransition(async () => {
        try {
            const videoIdToSave = isBulkMode ? undefined : videoId;
            await createPlaylist(user.uid, newPlaylistName, newPlaylistVisibility, videoIdToSave);
            
            if(isBulkMode) {
                // If in bulk mode, we might need an extra step to add all videos to the new playlist.
                // For simplicity, we create an empty playlist here. A more advanced flow would create and then add.
                 toast({title: 'Playlist created.'});
            } else {
                toast({title: 'Playlist created and video saved.'});
            }
            
            setNewPlaylistName('');
            setNewPlaylistVisibility('private');
            setShowCreateForm(false);
            // Refresh playlists
            const userPlaylists = await getUserPlaylists(user.uid);
            setPlaylists(userPlaylists);
            if (videoId) {
                const savedStatus = await getPlaylistVideoStatus(user.uid, videoId);
                setSavedToPlaylists(savedStatus);
            }

        } catch (error) {
             console.error("Failed to create playlist", error);
             toast({ title: 'Failed to create playlist', variant: 'destructive' });
        }
      });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm border-border/80 bg-card p-0 text-card-foreground">
        <DialogHeader className="border-b border-border/80 p-4">
          <DialogTitle>Save to...</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
            {loading ? <p>Loading...</p> : (
              <>
                <div className="flex items-center space-x-3">
                    <Checkbox 
                        id="watch-later" 
                        checked={isInWatchLater}
                        onCheckedChange={(checked) => handleWatchLaterToggle(!!checked)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        disabled={isPending}
                     />
                    <Label htmlFor="watch-later" className="flex-1 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Watch Later
                    </Label>
                </div>
                {playlists.map(playlist => {
                     const isChecked = savedToPlaylists.includes(playlist.id);
                     return (
                        <div key={playlist.id} className="flex items-center space-x-3">
                            <Checkbox 
                                id={`playlist-${playlist.id}`} 
                                checked={isChecked}
                                onCheckedChange={() => handlePlaylistToggle(playlist.id, isChecked)}
                                className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                disabled={isPending || (isBulkMode && isChecked)}
                             />
                            <Label htmlFor={`playlist-${playlist.id}`} className="flex-1">{playlist.name}</Label>
                        </div>
                     )
                })}
                 {playlists.length === 0 && <p className="pl-8 text-sm text-muted-foreground">No other playlists.</p>}
              </>
            )}
        </div>
        
        {showCreateForm ? (
             <div className="space-y-3 border-t border-border/80 p-4">
                <div>
                    <Label htmlFor="new-playlist-name">Name</Label>
                    <Input 
                        id="new-playlist-name" 
                        className="mt-1 bg-background/80" 
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        maxLength={150}
                    />
                </div>
                <div>
                    <Label>Privacy</Label>
                    <Select value={newPlaylistVisibility} onValueChange={(v) => setNewPlaylistVisibility(v as any)}>
                        <SelectTrigger className="mt-1 w-full bg-background/80">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                    <Button onClick={handleCreatePlaylist} disabled={isPending || !newPlaylistName.trim()}>
                        {isPending ? 'Creating...' : 'Create'}
                    </Button>
                 </div>
             </div>
        ) : (
             <DialogFooter className="border-t border-border/80 p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setShowCreateForm(true)}>
                    <Plus className="mr-2" />
                    Create new playlist
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
