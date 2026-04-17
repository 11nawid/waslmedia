
'use client';

import { create } from 'zustand';
import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { persist, createJSONStorage } from 'zustand/middleware';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

const translations = { en, es };

type Language = 'en' | 'es';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

type LanguageStore = ReturnType<typeof createLanguageStore>;

const createLanguageStore = () =>
  create<LanguageState>()(
    persist(
      (set, get) => ({
        language: 'en',
        setLanguage: (language: Language) => set({ language }),
        t: (key: string) => {
          const lang = get().language;
          const keys = key.split('.');
          let result: any = translations[lang];
          for (const k of keys) {
              result = result?.[k];
              if (result === undefined) {
                  // Fallback to English if translation is missing
                  let fallbackResult: any = translations.en;
                  for (const fk of keys) {
                      fallbackResult = fallbackResult?.[fk];
                       if (fallbackResult === undefined) return key;
                  }
                  return fallbackResult || key;
              }
          }
          return result || key;
        },
      }),
      {
        name: 'language-storage',
        storage: createJSONStorage(() => localStorage),
      }
    )
  );

const LanguageContext = createContext<LanguageStore | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const storeRef = useRef<LanguageStore | undefined>(undefined);
    if (!storeRef.current) {
        storeRef.current = createLanguageStore();
    }
    
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const lang = storeRef.current!.getState().language;
            document.documentElement.lang = lang;
        }
    }, []);

    return (
        <LanguageContext.Provider value={storeRef.current}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguageStore = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguageStore must be used within a LanguageProvider');
    }
    return context((state) => state);
};
