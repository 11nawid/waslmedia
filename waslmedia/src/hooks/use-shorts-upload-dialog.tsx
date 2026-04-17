
'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode } from 'react';
import type { Video } from '@/lib/types';

interface ShortsUploadDialogState {
  isOpen: boolean;
  videoToEdit: Video | null;
  pendingFile: File | null;
  onOpen: (video?: Video, pendingFile?: File | null) => void;
  onClose: () => void;
}

const useShortsUploadDialogStore = create<ShortsUploadDialogState>((set) => ({
  isOpen: false,
  videoToEdit: null,
  pendingFile: null,
  onOpen: (video, pendingFile) =>
    set({
      isOpen: true,
      videoToEdit: video || null,
      pendingFile: pendingFile || null,
    }),
  onClose: () => set({ isOpen: false, videoToEdit: null, pendingFile: null }),
}));

const ShortsUploadDialogContext = createContext<ShortsUploadDialogState | undefined>(undefined);

export const ShortsUploadDialogProvider = ({ children }: { children: ReactNode }) => {
    const store = useShortsUploadDialogStore();
    return (
        <ShortsUploadDialogContext.Provider value={store}>
            {children}
        </ShortsUploadDialogContext.Provider>
    );
};

export const useShortsUploadDialog = () => {
    const context = useContext(ShortsUploadDialogContext);
    if (context === undefined) {
        throw new Error('useShortsUploadDialog must be used within an ShortsUploadDialogProvider');
    }
    return context;
};
