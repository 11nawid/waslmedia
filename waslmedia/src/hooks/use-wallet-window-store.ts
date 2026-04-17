'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type WalletWindowPosition = {
  x: number;
  y: number;
};

type WalletWindowState = {
  isOpen: boolean;
  position: WalletWindowPosition | null;
  focusedAt: number;
  setOpen: (open: boolean) => void;
  openWallet: () => void;
  closeWallet: () => void;
  setPosition: (position: WalletWindowPosition) => void;
};

export const useWalletWindowStore = create<WalletWindowState>()(
  persist(
    (set) => ({
      isOpen: false,
      position: null,
      focusedAt: 0,
      setOpen: (open) => set({ isOpen: open, focusedAt: open ? Date.now() : 0 }),
      openWallet: () => set({ isOpen: true, focusedAt: Date.now() }),
      closeWallet: () => set({ isOpen: false, focusedAt: 0 }),
      setPosition: (position) => set({ position }),
    }),
    {
      name: 'waslmedia-wallet-window',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isOpen: state.isOpen,
        position: state.position,
      }),
    }
  )
);
