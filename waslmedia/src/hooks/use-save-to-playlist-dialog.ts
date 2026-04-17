
'use client';

import { create } from 'zustand';
import { createContext, useContext, createElement, type ReactNode } from 'react';

interface SaveToPlaylistDialogState {
  isOpen: boolean;
  videoId?: string;
  videoIds?: string[];
  onOpen: (videoId: string | string[]) => void;
  onClose: () => void;
}

export const useSaveToPlaylistDialog = create<SaveToPlaylistDialogState>((set) => ({
  isOpen: false,
  videoId: undefined,
  videoIds: undefined,
  onOpen: (id) => {
    if (Array.isArray(id)) {
      set({ isOpen: true, videoIds: id, videoId: undefined });
    } else {
      set({ isOpen: true, videoId: id, videoIds: undefined });
    }
  },
  onClose: () => set({ isOpen: false, videoId: undefined, videoIds: undefined }),
}));

const SaveToPlaylistDialogContext = createContext<SaveToPlaylistDialogState | undefined>(undefined);

export const SaveToPlaylistDialogProvider = ({ children }: { children: ReactNode }) => {
  const store = useSaveToPlaylistDialog();

  return createElement(SaveToPlaylistDialogContext.Provider, { value: store }, children);
};

export const useSaveToPlaylistDialogContext = () => {
  const context = useContext(SaveToPlaylistDialogContext);

  if (context === undefined) {
    throw new Error('useSaveToPlaylistDialogContext must be used within a SaveToPlaylistDialogProvider');
  }

  return context;
};
