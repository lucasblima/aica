import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to debounce function calls
 * Prevents excessive API calls by delaying execution until user stops typing
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce(searchFunction, 500);
 *
 * // Use in onChange handler
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
