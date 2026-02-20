import { useState, useEffect } from 'react';

/**
 * React hook that tracks a CSS media query match state.
 * Returns true when the query matches, false otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mql.matches);

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True when viewport < 1024px (mobile/tablet) */
export const useIsMobile = () => useMediaQuery('(max-width: 1023px)');

/** True when viewport >= 1024px (desktop) */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
