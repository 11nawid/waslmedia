'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function HelpCenterThemeLock() {
  const { theme, setTheme } = useTheme();
  const previousThemeRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousThemeRef.current === null) {
      previousThemeRef.current = theme || 'system';
    }

    setTheme('light');

    return () => {
      if (previousThemeRef.current) {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme, theme]);

  return null;
}
