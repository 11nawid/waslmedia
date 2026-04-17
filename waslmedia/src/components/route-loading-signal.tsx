'use client';

import { useEffect } from 'react';
import { beginLoadingBoundarySignal, endLoadingBoundarySignal } from '@/hooks/use-global-load-progress';

export function RouteLoadingSignal() {
  useEffect(() => {
    beginLoadingBoundarySignal();
    return () => {
      endLoadingBoundarySignal();
    };
  }, []);

  return null;
}
