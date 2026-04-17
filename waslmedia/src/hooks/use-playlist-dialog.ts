
'use client';

import { create } from 'zustand';
import type { Playlist } from '@/lib/types';

interface PlaylistDialogState {
  isOpen: boolean;
  playlistToEdit: Playlist | null;
  onOpen: (playlist?: Playlist) => void;
  onClose: () => void;
}

export const usePlaylistDialog = create<PlaylistDialogState>((set) => ({
  isOpen: false,
  playlistToEdit: null,
  onOpen: (playlist) => set({ isOpen: true, playlistToEdit: playlist || null }),
  onClose: () => set({ isOpen: false, playlistToEdit: null }),
}));
