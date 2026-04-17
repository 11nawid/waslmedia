
'use client';

import { create } from 'zustand';

interface LiveCounterState {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useLiveCounterStore = create<LiveCounterState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
