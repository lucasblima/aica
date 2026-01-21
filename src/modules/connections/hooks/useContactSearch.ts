/**
 * useContactSearch Hook
 * Issue #145: Semantic Search for Contacts and Conversations
 *
 * React hook for semantic contact search with debouncing and state management.
 * Provides natural language search capabilities for finding contacts.
 *
 * @example
 * const { query, setQuery, results, isLoading, error } = useContactSearch()
 *
 * // In component
 * <input value={query} onChange={e => setQuery(e.target.value)} />
 * {isLoading ? <Spinner /> : results.map(r => <ContactCard contact={r} />)}
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  searchContacts,
  ContactSearchResult,
  ContactSearchOptions,
} from '@/services/contactSearchService'

// ============================================================================
// TYPES
// ============================================================================

export interface UseContactSearchOptions extends ContactSearchOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** Minimum query length to trigger search (default: 3) */
  minQueryLength?: number
  /** Whether to search immediately on mount if query is provided */
  searchOnMount?: boolean
}

export interface UseContactSearchReturn {
  /** Current search query */
  query: string
  /** Set search query */
  setQuery: (query: string) => void
  /** Search results */
  results: ContactSearchResult[]
  /** Whether search is in progress */
  isLoading: boolean
  /** Error if search failed */
  error: Error | null
  /** Total number of results */
  totalResults: number
  /** Whether there are results */
  hasResults: boolean
  /** Clear search and results */
  clear: () => void
  /** Manually trigger search */
  search: (query?: string) => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function useContactSearch(
  initialQuery = '',
  options?: UseContactSearchOptions
): UseContactSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 3,
    searchOnMount = false,
    ...searchOptions
  } = options || {}

  // State
  const [query, setQueryState] = useState(initialQuery)
  const [results, setResults] = useState<ContactSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalResults, setTotalResults] = useState(0)

  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Search function
  const executeSearch = useCallback(async (searchQuery: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Don't search if query is too short
    if (searchQuery.trim().length < minQueryLength) {
      setResults([])
      setTotalResults(0)
      setError(null)
      return
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await searchContacts(searchQuery, searchOptions)

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (!response.success) {
        throw new Error(response.error || 'Search failed')
      }

      setResults(response.results)
      setTotalResults(response.total_results)
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setResults([])
      setTotalResults(0)
      console.error('[useContactSearch] Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [minQueryLength, searchOptions])

  // Debounced query setter
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      executeSearch(newQuery)
    }, debounceMs)
  }, [debounceMs, executeSearch])

  // Manual search trigger
  const search = useCallback(async (searchQuery?: string) => {
    const q = searchQuery ?? query
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    await executeSearch(q)
  }, [query, executeSearch])

  // Clear function
  const clear = useCallback(() => {
    setQueryState('')
    setResults([])
    setTotalResults(0)
    setError(null)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Search on mount if requested
  useEffect(() => {
    if (searchOnMount && initialQuery.length >= minQueryLength) {
      executeSearch(initialQuery)
    }

    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, []) // Only run on mount

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalResults,
    hasResults: results.length > 0,
    clear,
    search,
  }
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for searching contacts with specific options preset
 */
export function useActionItemSearch(options?: Omit<UseContactSearchOptions, 'embeddingTypes'>) {
  return useContactSearch('', {
    ...options,
    embeddingTypes: ['action_items'],
  })
}

/**
 * Hook for searching contacts by conversation summary
 */
export function useConversationSearch(options?: Omit<UseContactSearchOptions, 'embeddingTypes'>) {
  return useContactSearch('', {
    ...options,
    embeddingTypes: ['conversation_summary'],
  })
}

/**
 * Hook for comprehensive search across all embedding types
 */
export function useFullContactSearch(options?: Omit<UseContactSearchOptions, 'embeddingTypes'>) {
  return useContactSearch('', {
    ...options,
    embeddingTypes: ['profile', 'conversation_summary', 'action_items', 'topics'],
  })
}

export default useContactSearch
