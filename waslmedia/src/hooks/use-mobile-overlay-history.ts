'use client';

import * as React from 'react';
import { useIsMobile } from './use-mobile';

const MOBILE_OVERLAY_HISTORY_KEY = '__waslmediaMobileOverlay';

type OpenChangeHandler = (open: boolean) => void;

function getOverlayIdFromState(state: unknown) {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const overlayId = (state as Record<string, unknown>)[MOBILE_OVERLAY_HISTORY_KEY];
  return typeof overlayId === 'string' ? overlayId : null;
}

function buildOverlayState(overlayId: string) {
  const currentState = window.history.state;

  if (currentState && typeof currentState === 'object') {
    return {
      ...currentState,
      [MOBILE_OVERLAY_HISTORY_KEY]: overlayId,
    };
  }

  return {
    [MOBILE_OVERLAY_HISTORY_KEY]: overlayId,
  };
}

export function useOverlayOpenState({
  open,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: OpenChangeHandler;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return [resolvedOpen, setOpen] as const;
}

export function useMobileOverlayHistory(open: boolean, onOpenChange: OpenChangeHandler) {
  const isMobile = useIsMobile();
  const overlayIdRef = React.useRef(`mobile-overlay-${Math.random().toString(36).slice(2, 10)}`);
  const hasHistoryEntryRef = React.useRef(false);

  React.useEffect(() => {
    if (!isMobile || !open || typeof window === 'undefined') {
      return;
    }

    if (getOverlayIdFromState(window.history.state) !== overlayIdRef.current) {
      window.history.pushState(buildOverlayState(overlayIdRef.current), '');
    }

    hasHistoryEntryRef.current = true;

    const handlePopState = () => {
      if (getOverlayIdFromState(window.history.state) !== overlayIdRef.current) {
        hasHistoryEntryRef.current = false;
        onOpenChange(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobile, onOpenChange, open]);

  React.useEffect(() => {
    if (!isMobile || open || !hasHistoryEntryRef.current || typeof window === 'undefined') {
      return;
    }

    if (getOverlayIdFromState(window.history.state) === overlayIdRef.current) {
      hasHistoryEntryRef.current = false;
      window.history.back();
    }
  }, [isMobile, open]);
}
