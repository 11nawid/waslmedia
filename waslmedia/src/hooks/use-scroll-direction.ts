
'use client';

import { useState, useEffect } from 'react';

export function useScrollDirection(scrollableElementId?: string) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    let lastScrollY = 0;
    const scrollElement = scrollableElementId ? document.getElementById(scrollableElementId) : window;

    if (!scrollElement) return;
    
    // Set initial lastScrollY based on the element
    if (scrollableElementId) {
        const element = document.getElementById(scrollableElementId);
        lastScrollY = element ? element.scrollTop : 0;
    } else {
        lastScrollY = window.scrollY;
    }


    const updateScrollDirection = () => {
      let currentScrollY = 0;
      if (scrollableElementId) {
        const element = document.getElementById(scrollableElementId);
        currentScrollY = element ? element.scrollTop : 0;
      } else {
        currentScrollY = window.scrollY;
      }
      
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
    };

    scrollElement.addEventListener('scroll', updateScrollDirection);
    
    return () => {
      scrollElement.removeEventListener('scroll', updateScrollDirection);
    };
  }, [scrollableElementId]);

  return scrollDirection;
}
