import { useState, useEffect, useRef } from 'react';

interface UseScrollCollapseOptions {
  threshold?: number;
  restoreThreshold?: number;
  enabled?: boolean;
}

export function useScrollCollapse(options: UseScrollCollapseOptions = {}) {
  const { threshold = 80, restoreThreshold = 20, enabled = true } = options;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const highestScrollY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY > threshold && currentY > lastScrollY.current) {
        setIsCollapsed(true);
        highestScrollY.current = currentY;
      } else if (highestScrollY.current - currentY > restoreThreshold) {
        setIsCollapsed(false);
      }

      if (currentY > highestScrollY.current) {
        highestScrollY.current = currentY;
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, restoreThreshold, enabled]);

  return { isCollapsed };
}
