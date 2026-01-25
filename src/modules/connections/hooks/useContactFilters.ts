/**
 * useContactFilters Hook
 * Filter and sort WhatsApp contacts
 *
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import { useState, useMemo, useCallback } from 'react';
import type { ContactNetwork } from '@/types/memoryTypes';

// ============================================================================
// TYPES
// ============================================================================

export type ContactFilterType =
  | 'all'
  | 'favorites'
  | 'recent'
  | 'at_risk'
  | 'inactive';

export type ContactSortField =
  | 'name'
  | 'health_score'
  | 'last_interaction'
  | 'relationship_type';

export type ContactSortOrder = 'asc' | 'desc';

export interface ContactFiltersState {
  /** Active filter tab */
  activeFilter: ContactFilterType;
  /** Search query */
  searchQuery: string;
  /** Relationship type filter */
  relationshipTypes: ContactNetwork['relationship_type'][];
  /** Sort field */
  sortField: ContactSortField;
  /** Sort order */
  sortOrder: ContactSortOrder;
}

export interface UseContactFiltersOptions {
  /** Initial filter state */
  initialState?: Partial<ContactFiltersState>;
  /** Favorite contact IDs */
  favoriteIds?: string[];
}

export interface UseContactFiltersReturn {
  /** Current filter state */
  filters: ContactFiltersState;
  /** Filtered and sorted contacts */
  filteredContacts: ContactNetwork[];
  /** Set active filter tab */
  setActiveFilter: (filter: ContactFilterType) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Toggle relationship type filter */
  toggleRelationshipType: (type: ContactNetwork['relationship_type']) => void;
  /** Set sort field */
  setSortField: (field: ContactSortField) => void;
  /** Toggle sort order */
  toggleSortOrder: () => void;
  /** Reset all filters */
  resetFilters: () => void;
  /** Stats about filtered results */
  stats: {
    total: number;
    filtered: number;
    favorites: number;
    recent: number;
    atRisk: number;
    inactive: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STATE: ContactFiltersState = {
  activeFilter: 'all',
  searchQuery: '',
  relationshipTypes: [],
  sortField: 'name',
  sortOrder: 'asc',
};

/** Days threshold for "recent" contacts */
const RECENT_DAYS = 7;

/** Days threshold for "inactive" contacts */
const INACTIVE_DAYS = 30;

/** Health score threshold for "at risk" contacts */
const AT_RISK_THRESHOLD = 40;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDaysSince(date: string | undefined | null): number {
  if (!date) return Infinity;
  const now = new Date();
  const target = new Date(date);
  if (isNaN(target.getTime())) return Infinity;
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchesSearch(contact: ContactNetwork, query: string): boolean {
  if (!query) return true;

  const normalizedQuery = normalizeString(query);
  const fields = [
    contact.name,
    contact.whatsapp_name,
    contact.phone_number,
    contact.whatsapp_phone,
    contact.email,
  ].filter(Boolean);

  return fields.some((field) =>
    normalizeString(field as string).includes(normalizedQuery)
  );
}

function compareContacts(
  a: ContactNetwork,
  b: ContactNetwork,
  field: ContactSortField,
  order: ContactSortOrder
): number {
  let comparison = 0;

  switch (field) {
    case 'name':
      comparison = (a.name || '').localeCompare(b.name || '', 'pt-BR');
      break;
    case 'health_score':
      comparison = (a.health_score ?? 0) - (b.health_score ?? 0);
      break;
    case 'last_interaction':
      const aDate = a.last_whatsapp_message_at || a.last_interaction_at || '';
      const bDate = b.last_whatsapp_message_at || b.last_interaction_at || '';
      comparison = new Date(bDate).getTime() - new Date(aDate).getTime();
      break;
    case 'relationship_type':
      comparison = (a.relationship_type || '').localeCompare(
        b.relationship_type || ''
      );
      break;
  }

  return order === 'desc' ? -comparison : comparison;
}

// ============================================================================
// HOOK
// ============================================================================

export function useContactFilters(
  contacts: ContactNetwork[],
  options: UseContactFiltersOptions = {}
): UseContactFiltersReturn {
  const { initialState, favoriteIds = [] } = options;

  const [filters, setFilters] = useState<ContactFiltersState>({
    ...DEFAULT_STATE,
    ...initialState,
  });

  // Memoized set of favorite IDs for O(1) lookup
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = contacts.length;
    const favorites = contacts.filter((c) => favoriteSet.has(c.id)).length;
    const recent = contacts.filter((c) => {
      const lastMessage = c.last_whatsapp_message_at || c.last_interaction_at;
      return getDaysSince(lastMessage) <= RECENT_DAYS;
    }).length;
    const atRisk = contacts.filter(
      (c) => (c.health_score ?? 100) < AT_RISK_THRESHOLD
    ).length;
    const inactive = contacts.filter((c) => {
      const lastMessage = c.last_whatsapp_message_at || c.last_interaction_at;
      return getDaysSince(lastMessage) > INACTIVE_DAYS;
    }).length;

    return { total, filtered: 0, favorites, recent, atRisk, inactive };
  }, [contacts, favoriteSet]);

  // Apply filters and sorting
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Apply active filter
    switch (filters.activeFilter) {
      case 'favorites':
        result = result.filter((c) => favoriteSet.has(c.id));
        break;
      case 'recent':
        result = result.filter((c) => {
          const lastMessage = c.last_whatsapp_message_at || c.last_interaction_at;
          return getDaysSince(lastMessage) <= RECENT_DAYS;
        });
        break;
      case 'at_risk':
        result = result.filter(
          (c) => (c.health_score ?? 100) < AT_RISK_THRESHOLD
        );
        break;
      case 'inactive':
        result = result.filter((c) => {
          const lastMessage = c.last_whatsapp_message_at || c.last_interaction_at;
          return getDaysSince(lastMessage) > INACTIVE_DAYS;
        });
        break;
    }

    // Apply relationship type filter
    if (filters.relationshipTypes.length > 0) {
      result = result.filter((c) =>
        filters.relationshipTypes.includes(c.relationship_type)
      );
    }

    // Apply search query
    if (filters.searchQuery) {
      result = result.filter((c) => matchesSearch(c, filters.searchQuery));
    }

    // Apply sorting
    result.sort((a, b) =>
      compareContacts(a, b, filters.sortField, filters.sortOrder)
    );

    return result;
  }, [contacts, filters, favoriteSet]);

  // Update stats with filtered count
  const finalStats = useMemo(
    () => ({
      ...stats,
      filtered: filteredContacts.length,
    }),
    [stats, filteredContacts.length]
  );

  // Actions
  const setActiveFilter = useCallback((filter: ContactFilterType) => {
    setFilters((prev) => ({ ...prev, activeFilter: filter }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleRelationshipType = useCallback(
    (type: ContactNetwork['relationship_type']) => {
      setFilters((prev) => {
        const types = prev.relationshipTypes;
        const newTypes = types.includes(type)
          ? types.filter((t) => t !== type)
          : [...types, type];
        return { ...prev, relationshipTypes: newTypes };
      });
    },
    []
  );

  const setSortField = useCallback((field: ContactSortField) => {
    setFilters((prev) => ({ ...prev, sortField: field }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_STATE);
  }, []);

  return {
    filters,
    filteredContacts,
    setActiveFilter,
    setSearchQuery,
    toggleRelationshipType,
    setSortField,
    toggleSortOrder,
    resetFilters,
    stats: finalStats,
  };
}

export default useContactFilters;
