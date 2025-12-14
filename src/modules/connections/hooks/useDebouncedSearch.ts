/**
 * useDebouncedSearch Hook
 *
 * Hook para busca com debounce, evitando chamadas excessivas à API
 * Útil para search inputs, autocomplete, etc.
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isSearching } = useDebouncedSearch(
 *   (q) => searchAPI(q),
 *   300
 * );
 *
 * <input value={query} onChange={(e) => setQuery(e.target.value)} />
 * {isSearching && <Spinner />}
 * {results.map(result => <ResultItem key={result.id} {...result} />)}
 * ```
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

interface UseDebouncedSearchOptions {
  minQueryLength?: number;
  delay?: number;
  initialQuery?: string;
}

export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  options: UseDebouncedSearchOptions = {}
) {
  const {
    minQueryLength = 2,
    delay = 300,
    initialQuery = '',
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Abort controller para cancelar requests anteriores
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced setter
  const debouncedSetQuery = useMemo(
    () =>
      debounce((q: string) => {
        setDebouncedQuery(q);
      }, delay),
    [delay]
  );

  // Atualizar query imediatamente e debounced query após delay
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSetQuery(newQuery);
    },
    [debouncedSetQuery]
  );

  // Executar busca quando debounced query muda
  useEffect(() => {
    const executeSearch = async () => {
      // Limpar resultados se query é muito curta
      if (debouncedQuery.length < minQueryLength) {
        setResults([]);
        setIsSearching(false);
        setError(null);
        return;
      }

      // Cancelar request anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Criar novo abort controller
      abortControllerRef.current = new AbortController();

      try {
        setIsSearching(true);
        setError(null);

        const data = await searchFn(debouncedQuery);

        // Só atualizar se não foi abortado
        if (!abortControllerRef.current?.signal.aborted) {
          setResults(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          setResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    executeSearch();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, minQueryLength, searchFn]);

  // Limpar busca
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setError(null);
    setIsSearching(false);
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    debouncedQuery,
    results,
    isSearching,
    error,
    clearSearch,
    hasResults: results.length > 0,
    isEmpty: debouncedQuery.length >= minQueryLength && results.length === 0 && !isSearching,
  };
}

/**
 * useDebouncedValue Hook
 *
 * Hook simples para debounce de qualquer valor
 *
 * @example
 * ```tsx
 * const [value, setValue] = useState('');
 * const debouncedValue = useDebouncedValue(value, 500);
 *
 * useEffect(() => {
 *   // Este effect só roda quando debouncedValue muda
 *   fetchData(debouncedValue);
 * }, [debouncedValue]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle Hook
 *
 * Hook para throttle (limita frequência de execução)
 * Útil para scroll events, resize, etc.
 *
 * @example
 * ```tsx
 * const throttledScroll = useThrottle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * <div onScroll={throttledScroll}>...</div>
 * ```
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  );
}

export default useDebouncedSearch;
