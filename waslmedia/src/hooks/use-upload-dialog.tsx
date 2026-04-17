
'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode, useState } from 'react';
import type { Video } from '@/lib/types';

interface UploadDialogState {
  isOpen: boolean;
  videoToEdit: Video | null;
  pendingFile: File | null;
  onOpen: (video?: Video, pendingFile?: File | null) => void;
  onClose: () => void;
}

const useUploadDialogStore = create<UploadDialogState>((set) => ({
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

const UploadDialogContext = createContext<UploadDialogState | undefined>(undefined);

export const UploadDialogProvider = ({ children }: { children: ReactNode }) => {
    const store = useUploadDialogStore();
    return (
        <UploadDialogContext.Provider value={store}>
            {children}
        </UploadDialogContext.Provider>
    );
};

export const useUploadDialog = () => {
    const context = useContext(UploadDialogContext);
    if (context === undefined) {
        throw new Error('useUploadDialog must be used within an UploadDialogProvider');
    }
    return context;
};
