
'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode } from 'react';

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (isCollapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
}));

const SidebarContext = createContext<SidebarState | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
    const store = useSidebarStore();
    return (
        <SidebarContext.Provider value={store}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};
