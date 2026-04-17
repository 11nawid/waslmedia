'use client';

import { create } from 'zustand';

type StudioAiTab = 'chat' | 'settings';

type WindowPosition = {
  x: number;
  y: number;
};

type PendingPrompt = {
  id: number;
  text: string;
};

type StudioAiState = {
  isOpen: boolean;
  activeTab: StudioAiTab;
  position: WindowPosition | null;
  pendingPrompt: PendingPrompt | null;
  setOpen: (open: boolean) => void;
  openChat: () => void;
  openSettings: () => void;
  openPrompt: (text: string) => void;
  clearPendingPrompt: () => void;
  setActiveTab: (tab: StudioAiTab) => void;
  setPosition: (position: WindowPosition) => void;
};

export const useStudioAiStore = create<StudioAiState>((set) => ({
  isOpen: false,
  activeTab: 'chat',
  position: null,
  pendingPrompt: null,
  setOpen: (open) => set({ isOpen: open }),
  openChat: () => set({ isOpen: true, activeTab: 'chat' }),
  openSettings: () => set({ isOpen: true, activeTab: 'settings' }),
  openPrompt: (text) =>
    set({
      isOpen: true,
      activeTab: 'chat',
      pendingPrompt: { id: Date.now(), text },
    }),
  clearPendingPrompt: () => set({ pendingPrompt: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPosition: (position) => set({ position }),
}));
