'use client';

import { create } from 'zustand';
import { createContext, useContext, type ReactNode } from 'react';

import type { CreateAdStep } from '@/components/create-ad-dialog-config';

type CreateAdDialogMode = 'create' | 'edit';

interface CreateAdDialogState {
  isOpen: boolean;
  mode: CreateAdDialogMode;
  initialStep: CreateAdStep | null;
  campaignId: string | null;
  onOpen: (options?: { mode?: CreateAdDialogMode; initialStep?: CreateAdStep | null; campaignId?: string | null }) => void;
  onClose: () => void;
}

const useCreateAdDialogStore = create<CreateAdDialogState>((set) => ({
  isOpen: false,
  mode: 'create',
  initialStep: null,
  campaignId: null,
  onOpen: (options) =>
    set({
      isOpen: true,
      mode: options?.mode || 'create',
      initialStep: options?.initialStep || null,
      campaignId: options?.campaignId || null,
    }),
  onClose: () =>
    set({
      isOpen: false,
      mode: 'create',
      initialStep: null,
      campaignId: null,
    }),
}));

const CreateAdDialogContext = createContext<CreateAdDialogState | undefined>(undefined);

export const CreateAdDialogProvider = ({ children }: { children: ReactNode }) => {
  const store = useCreateAdDialogStore();
  return <CreateAdDialogContext.Provider value={store}>{children}</CreateAdDialogContext.Provider>;
};

export const useCreateAdDialog = () => {
  const context = useContext(CreateAdDialogContext);
  if (context === undefined) {
    throw new Error('useCreateAdDialog must be used within a CreateAdDialogProvider');
  }
  return context;
};
