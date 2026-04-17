
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { createPlaylist, updatePlaylist } from '@/lib/data';
import { usePlaylistDialog } from '@/hooks/use-playlist-dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Playlist } from '@/lib/types';


const playlistSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(150, 'Name must be 150 characters or less.'),
  description: z.string().max(5000, 'Description must be 5000 characters or less.').optional(),
  visibility: z.enum(['private', 'public', 'unlisted']).default('private'),
});

type PlaylistSchema = z.infer<typeof playlistSchema>;

export function PlaylistDialog() {
  const { user } = useAuth();
  const { isOpen, onClose, playlistToEdit } = usePlaylistDialog();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isEditing = !!playlistToEdit;

  const { control, register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<PlaylistSchema>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
        name: '',
        description: '',
        visibility: 'private',
    }
  });

  useEffect(() => {
    if (playlistToEdit) {
        reset({
            name: playlistToEdit.name,
            description: playlistToEdit.description,
            visibility: playlistToEdit.visibility,
        });
    } else {
        reset({
            name: '',
            description: '',
            visibility: 'private',
        });
    }
  }, [playlistToEdit, reset]);

  const onSubmit = (data: PlaylistSchema) => {
    if (!user) return;
    startTransition(async () => {
        try {
            if (isEditing) {
                await updatePlaylist(user.uid, playlistToEdit.id, data);
                toast({ title: 'Playlist updated.'});
            } else {
                await createPlaylist(user.uid, data.name, data.visibility, undefined, data.description);
                toast({ title: 'Playlist created.'});
            }
            onClose();
        } catch (error: any) {
             console.error("Failed to save playlist", error);
             toast({ title: `Failed to ${isEditing ? 'update' : 'create'} playlist`, description: 'An unexpected error occurred.', variant: 'destructive' });
        }
    });
  }

  const handleClose = () => {
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-border/80 bg-card text-card-foreground">
        <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit playlist' : 'New playlist'}</DialogTitle>
             <DialogDescription className="sr-only">{isEditing ? 'Edit playlist details' : 'Create a new playlist'}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register('name')} className="mt-1 bg-background/80" />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...register('description')} className="mt-1 bg-background/80" rows={4} />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="visibility">Visibility</Label>
                     <Controller
                        name="visibility"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="visibility" className="mt-1 w-full bg-background/80">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="unlisted">Unlisted</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                        </Select>
                        )}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isPending || !isDirty}>
                    {isPending ? 'Saving...' : 'Save'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
