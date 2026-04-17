'use client';

import { useStrictDesktopAccess } from '@/hooks/use-strict-desktop-access';

export function useStrictAdsDesktopAccess(serverAllowed: boolean) {
  return useStrictDesktopAccess(serverAllowed);
}
