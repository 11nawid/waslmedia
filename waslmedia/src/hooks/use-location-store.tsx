
'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode } from 'react';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LocationState {
  location: string;
  isLocationDefault: boolean;
  setLocation: (location: string) => void;
}

const useLocationStoreImpl = create<LocationState>()(
  persist(
    (set) => ({
      location: 'Worldwide',
      isLocationDefault: true,
      setLocation: (location: string) => set({ location, isLocationDefault: location === 'Worldwide' }),
    }),
    {
      name: 'location-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

const LocationContext = createContext<LocationState | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
    const store = useLocationStoreImpl();
    return (
        <LocationContext.Provider value={store}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocationStore = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocationStore must be used within a LocationProvider');
    }
    return context;
};
