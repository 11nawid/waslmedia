'use client';

import { useEffect, useState } from 'react';

export function detectStrictDesktopAccess() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithUAData = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
      platform?: string;
    };
  };

  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  const uaData = navigatorWithUAData.userAgentData;
  const uaDataPlatform = (uaData?.platform || '').toLowerCase();
  const uaDataMobile = uaData?.mobile === true;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const hoverCapable = window.matchMedia?.('(hover: hover)').matches ?? false;
  const minScreenEdge = Math.min(window.screen?.width || 0, window.screen?.height || 0);

  const mobileOsSignals =
    uaDataMobile ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    ua.includes('mobile') ||
    ua.includes('tablet') ||
    platform.includes('android') ||
    platform.includes('iphone') ||
    platform.includes('ipad') ||
    platform.includes('ipod') ||
    uaDataPlatform.includes('android') ||
    uaDataPlatform.includes('ios');

  if (mobileOsSignals) {
    return false;
  }

  const touchOnlyPhoneLike =
    maxTouchPoints > 1 &&
    coarsePointer &&
    !hoverCapable &&
    !finePointer &&
    minScreenEdge > 0 &&
    minScreenEdge < 1024;

  if (touchOnlyPhoneLike) {
    return false;
  }

  return true;
}

export function useStrictDesktopAccess(serverAllowed = true) {
  const [allowed, setAllowed] = useState(() => false);

  useEffect(() => {
    if (!serverAllowed) {
      setAllowed(false);
      return;
    }

    setAllowed(detectStrictDesktopAccess());
  }, [serverAllowed]);

  return allowed;
}
