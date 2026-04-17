'use client';

import { useEffect } from 'react';

export function MediaGuard() {
  useEffect(() => {
    const blockMediaContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('img, video, canvas, [data-protected-media="true"]')) {
        event.preventDefault();
      }
    };

    const blockMediaDrag = (event: DragEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest('img, video, canvas, [data-protected-media="true"]')) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', blockMediaContextMenu);
    document.addEventListener('dragstart', blockMediaDrag);

    return () => {
      document.removeEventListener('contextmenu', blockMediaContextMenu);
      document.removeEventListener('dragstart', blockMediaDrag);
    };
  }, []);

  return null;
}
