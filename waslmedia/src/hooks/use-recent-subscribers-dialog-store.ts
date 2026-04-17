
'use client';

import { create } from 'zustand';

interface RecentSubscribersDialogState {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useRecentSubscribersDialog = create<RecentSubscribersDialogState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
