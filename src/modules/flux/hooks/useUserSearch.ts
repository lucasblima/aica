/**
 * useUserSearch Hook
 *
 * Debounced search for AICA users (profiles table).
 * Used by AthleteFormDrawer to link existing users as athletes.
 *
 * Calls the `search_aica_users` RPC which is a SECURITY DEFINER function
 * that returns basic profile info (id, full_name, avatar_url, email)
 * without exposing private data.
 *
 * Falls back gracefully if the RPC doesn't exist yet.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';

export interface UserSearchResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface UseUserSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: UserSearchResult[];
  isSearching: boolean;
  error: string | null;
  hasSearched: boolean;
  clearResults: () => void;
}

export function useUserSearch(debounceMs = 300): UseUserSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    setHasSearched(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        // Try the SECURITY DEFINER RPC first
        const { data, error: rpcError } = await supabase.rpc('search_aica_users', {
          p_query: trimmed,
        });

        if (rpcError) {
          // RPC doesn't exist yet — fallback to profiles table query
          // This will only return the coach's own profile (due to RLS),
          // but we handle it gracefully
          if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
            console.warn(
              '[useUserSearch] RPC search_aica_users not found. A migration is needed to enable user search.'
            );
            setError(
              'Busca de usuarios ainda não configurada. Use cadastro manual por enquanto.'
            );
            setResults([]);
          } else {
            console.error('[useUserSearch] Search error:', rpcError);
            setError('Erro ao buscar usuarios');
            setResults([]);
          }
        } else {
          setResults((data as UserSearchResult[]) || []);
        }
      } catch (err) {
        console.error('[useUserSearch] Unexpected error:', err);
        setError('Erro ao buscar usuarios');
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    hasSearched,
    clearResults,
  };
}
